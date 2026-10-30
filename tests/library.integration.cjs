// Optional real-snapshot test: requires the locally supplied Library files.
const { app, BrowserWindow, session, protocol, net } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const appRoot = process.argv[2] ? path.resolve(process.argv[2]) : root;
protocol.registerSchemesAsPrivileged([{ scheme: 'noscope', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);
app.setPath('userData', path.join(root, 'tmp', 'library-test-profile'));
app.whenReady().then(async () => {
    await session.defaultSession.clearCache();
    protocol.handle('noscope', request => {
        const file = path.resolve(appRoot, decodeURIComponent(new URL(request.url).pathname).replace(/^\/+/, ''));
        if (!file.startsWith(appRoot + path.sep)) throw new Error('Path outside application');
        if (!fs.existsSync(file)) return new Response(null, { status: 404 });
        return net.fetch(pathToFileURL(file).toString());
    });
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['https://*/*', 'http://*/*'] }, (_details, callback) => callback({ cancel: true }));
    const window = new BrowserWindow({ show: false, width: 1440, height: 1000, webPreferences: { backgroundThrottling: false } });
    try {
        await window.loadURL('noscope://app/index.html');
        const report = await window.webContents.executeJavaScript(`(async () => {
            const assert = (condition, message) => { if (!condition) throw new Error(message); };
            const equal = (actual, expected, message) => assert(JSON.stringify(actual) === JSON.stringify(expected), message);
            window.alert = message => { throw new Error(message); };
            const entries = getLibraryDatabaseEntries();
            assert(entries.length === 5, 'Expected exactly five supplied snapshots');
            entries.forEach(entry => assert(/^\\d{4}-\\d{2}-\\d{2}$/.test(entry.updatedAt), 'Library entry is missing a stable Last updated date: ' + entry.fileName));
            assert(!document.getElementById('btn-load-default'), 'Removed toolbar button remains');
            assert(entries[0].fileName === 'default.emdb', 'Developers database missing from Library');
            applyRemoteAssetManifest({ Players: {}, Databases: [{ fileName: 'old-default.emdb', default: true, url: 'https://example.invalid/old.emdb' }] });
            equal(getLibraryDatabaseEntries(), entries, 'Cloud manifest changed the bundled Library');
            const report = [];
            for (const entry of entries) {
                const blob = await fetchBundledDatabaseBlob(entry);
                const bytes = await blob.arrayBuffer();
                const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
                assert(hash === entry.sha256, 'Bundled bytes changed: ' + entry.fileName);
                assert(await loadBundledDatabase(entry), 'Failed to load: ' + entry.fileName);
                assert(db.fileName === entry.fileName, 'Wrong file loaded');
                const expected = Object.fromEntries(Object.entries(db.tables).map(([name, table]) => [name, { header: table.header, rows: getSerializableTableRows(name, table) }]));
                const saved = await DatabasePackage.write(db, JSZip, Papa, getSerializableTableRows);
                const reopened = await DatabasePackage.read(await JSZip.loadAsync(await decryptEMDB(await encryptEMDB(await saved.generateAsync({ type: 'arraybuffer' })))), Papa);
                equal(reopened.tables, expected, 'Unexpected exported cell changes: ' + entry.fileName);
                equal(reopened.roster_order, db.roster_order, 'Roster changed: ' + entry.fileName);
                const summary = await getLibraryDatabaseSummary(entry);
                equal(summary.counts, Object.fromEntries(Object.entries(db.tables).map(([name, table]) => [name, table.rows.length])), 'Library counts mismatch');
                report.push({ file: entry.fileName, counts: summary.counts, roundTrip: 'passed', validatorFindings: validateCurrentDatabase().issues.length });
            }
            await openLibraryPanel();
            const cards = [...document.querySelectorAll('.library-db-card')];
            assert(cards.length === 5, 'Library cards missing');
            cards.forEach((card, index) => {
                const download = card.querySelector('a[download]');
                assert(download.download === entries[index].fileName, 'Incorrect download filename');
                assert(decodeURIComponent(new URL(download.href).pathname).endsWith('/data/' + entries[index].fileName), 'Incorrect download path');
                assert(!card.querySelector('a[href="undefined"]'), 'Invented source link');
                const updated = card.querySelector('.library-db-updated');
                assert(updated?.textContent.startsWith('Last updated: '), 'Library card is missing its Last updated label');
                assert(updated.textContent.includes(formatChangelogDate(entries[index].updatedAt)), 'Library card displays the wrong update date');
            });
            assert(libraryDatabaseList.scrollWidth <= libraryDatabaseList.clientWidth + 1, 'Library overflows horizontally');
            await waitForLoadingPaint();
            return report;
        })()`);
        fs.mkdirSync(path.join(root, 'tmp'), { recursive: true });
        fs.writeFileSync(path.join(root, 'tmp', 'library-test.json'), JSON.stringify(report, null, 2));
        await new Promise(resolve => setTimeout(resolve, 150));
        fs.writeFileSync(path.join(root, 'tmp', 'library-test.png'), (await window.webContents.capturePage()).toPNG());
        await window.webContents.executeJavaScript(`document.querySelector('.library-modal-content').scrollTop = document.querySelector('.library-modal-content').scrollHeight; waitForLoadingPaint()`);
        await new Promise(resolve => setTimeout(resolve, 150));
        fs.writeFileSync(path.join(root, 'tmp', 'library-test-last.png'), (await window.webContents.capturePage()).toPNG());
        const catalog = require(path.join(appRoot, 'js', 'services', 'library-catalog.js'));
        const downloadDirectory = path.join(root, 'tmp', 'library-downloads');
        fs.mkdirSync(downloadDirectory, { recursive: true });
        for (let index = 0; index < catalog.length; index++) {
            const entry = catalog[index];
            const savedPath = path.join(downloadDirectory, entry.fileName);
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Download timed out: ' + entry.fileName)), 15000);
                session.defaultSession.once('will-download', (_event, item) => {
                    item.setSavePath(savedPath);
                    item.once('done', (_doneEvent, state) => {
                        clearTimeout(timeout);
                        if (state !== 'completed') return reject(new Error('Download failed: ' + state));
                        const hash = createHash('sha256').update(fs.readFileSync(savedPath)).digest('hex');
                        if (hash !== entry.sha256) return reject(new Error('Download contents changed'));
                        resolve();
                    });
                });
                window.webContents.executeJavaScript(`document.querySelectorAll('.library-db-card a[download]')[${index}].click()`).catch(reject);
            });
        }
        console.log('All five native Library downloads match the supplied snapshots.');
        console.log(JSON.stringify(report, null, 2));
        app.exit(0);
    } catch (error) {
        console.error(error);
        app.exit(1);
    }
});
