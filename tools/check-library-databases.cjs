const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const catalog = require('../js/services/library-catalog.js');
const root = path.resolve(__dirname, '..');
const problems = [];
const packagedFiles = require('../package.json').build.files.filter(file => file.startsWith('data/')).sort();
const expectedFiles = catalog.map(entry => `data/${entry.fileName}`).sort();
if (JSON.stringify(packagedFiles) !== JSON.stringify(expectedFiles)) {
    problems.push('The package file list must include exactly the five catalog snapshots.');
}
for (const entry of catalog) {
    const file = path.join(root, 'data', entry.fileName);
    if (!fs.existsSync(file)) {
        problems.push(`Missing data/${entry.fileName}`);
        continue;
    }
    const hash = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    if (hash !== entry.sha256) problems.push(`Unexpected contents: data/${entry.fileName}`);
}
if (problems.length) {
    console.error(problems.join('\n'));
    console.error('Place the original Library snapshots in data/ before packaging. See CONTRIBUTING.md.');
    process.exitCode = 1;
} else {
    console.log(`Verified all ${catalog.length} bundled Library databases against their SHA-256 hashes.`);
}
