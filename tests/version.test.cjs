const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { normalizeVersion, compareVersions } = require('../electron/version.cjs');
const root = path.resolve(__dirname, '..');

test('release tags retain prerelease labels and ignore build metadata', () => {
    assert.equal(normalizeVersion(' v3.0.0-beta.2+build.7 '), '3.0.0-beta.2');
    assert.equal(compareVersions('v3.0.0-beta.2+build.7', '3.0.0-beta.2'), 0);
});

test('the final 3.0.0 release upgrades beta without offering older stable releases', () => {
    assert.equal(compareVersions('3.0.0', '3.0.0-beta.2'), 1);
    assert.equal(compareVersions('3.0.0-beta.2', '3.0.0'), -1);
    assert.equal(compareVersions('2.3.0', '3.0.0-beta.2'), -1);
    assert.equal(compareVersions('3.0.1', '3.0.0-beta.2'), 1);
    assert.equal(compareVersions('3.0.0-beta.2', '3.0.0-beta.1'), 1);
});

test('prereleases follow numeric and identifier precedence', () => {
    const ordered = ['3.0.0-alpha', '3.0.0-alpha.1', '3.0.0-alpha.beta', '3.0.0-beta', '3.0.0-beta.2', '3.0.0-beta.10', '3.0.0-rc.1', '3.0.0'];
    for (let index = 1; index < ordered.length; index++) {
        assert.equal(compareVersions(ordered[index], ordered[index - 1]), 1);
        assert.equal(compareVersions(ordered[index - 1], ordered[index]), -1);
    }
    assert.equal(compareVersions('3.0.0', '3.0.0'), 0);
});

test('Beta 2 version labels stay synchronized across the app and installer', () => {
    const expected = '3.0.0-beta.2';
    const packageMetadata = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const packageLock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
    const changelogIndex = JSON.parse(fs.readFileSync(path.join(root, 'changelogs', 'index.json'), 'utf8'));
    const appSource = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
    const installerSource = fs.readFileSync(path.join(root, 'installer', 'NoScopeInstaller', 'Program.cs'), 'utf8');
    const installerProject = fs.readFileSync(path.join(root, 'installer', 'NoScopeInstaller', 'NoScopeInstaller.csproj'), 'utf8');
    assert.equal(packageMetadata.version, expected);
    assert.equal(packageLock.version, expected);
    assert.equal(packageLock.packages[''].version, expected);
    assert.equal(changelogIndex.find(release => release.current)?.version, `v${expected}`);
    const betaOne = changelogIndex.find(release => release.version === 'v3.0.0-beta.1');
    const betaTwo = changelogIndex.find(release => release.version === 'v3.0.0-beta.2');
    assert.ok(betaOne && betaTwo, 'Beta 1 and Beta 2 must have separate changelog entries');
    assert.notEqual(betaOne.file, betaTwo.file);
    assert.match(fs.readFileSync(path.join(root, betaOne.file), 'utf8'), /v3\.0\.0 Beta 1 App/);
    assert.match(fs.readFileSync(path.join(root, betaTwo.file), 'utf8'), /v3\.0\.0 Beta 2 App/);
    assert.match(appSource, new RegExp(`WHATS_NEW_VERSION = "${expected.replaceAll('.', '\\.')}`));
    assert.match(installerSource, new RegExp(`AppVersion = "${expected.replaceAll('.', '\\.')}`));
    assert.match(installerProject, new RegExp(`<Version>${expected.replaceAll('.', '\\.')}</Version>`));
});
