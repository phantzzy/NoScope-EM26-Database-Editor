const { spawnSync } = require('node:child_process');
const path = require('node:path');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const result = spawnSync(require('electron'), [path.join(__dirname, 'library.integration.cjs'), ...process.argv.slice(2)], {
    env, stdio: 'inherit', windowsHide: true
});
if (result.error) console.error(result.error);
process.exit(result.status ?? 1);
