// Runs the actual browser scripts in an isolated, hidden Electron window.
const { app, BrowserWindow, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
app.setPath('userData', path.join(root, 'tmp', 'integration-profile'));
app.whenReady().then(async () => {
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['https://*/*', 'http://*/*'] }, (_details, callback) => callback({ cancel: true }));
    const window = new BrowserWindow({ show: false, width: 1500, height: 1000, webPreferences: { contextIsolation: true, nodeIntegration: false } });
    try {
        await window.loadFile(path.join(root, 'index.html'));
        const source = process.argv[2] ? fs.readFileSync(path.resolve(process.argv[2])).toString('base64') : null;
        await window.webContents.executeJavaScript(`globalThis.testSourceBase64 = ${JSON.stringify(source)}`);
        const result = await window.webContents.executeJavaScript(fs.readFileSync(path.join(__dirname, 'editor-browser.js'), 'utf8'));
        console.log(JSON.stringify(result, null, 2));
        fs.mkdirSync(path.join(root, 'tmp'), { recursive: true });
        fs.writeFileSync(path.join(root, 'tmp', 'compatibility-test.json'), JSON.stringify(result, null, 2));
        await window.webContents.executeJavaScript('switchTab("Teams"); openEditor(0); new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
        fs.writeFileSync(path.join(root, 'tmp', 'team-editor-test.png'), (await window.webContents.capturePage()).toPNG());
        app.exit(0);
    } catch (error) {
        console.error(error);
        app.exit(1);
    }
});
