const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeVersion, compareVersions } = require('../electron/version.cjs');

test('release tags retain prerelease labels and ignore build metadata', () => {
    assert.equal(normalizeVersion(' v3.0.0-beta.1+build.7 '), '3.0.0-beta.1');
    assert.equal(compareVersions('v3.0.0-beta.1+build.7', '3.0.0-beta.1'), 0);
});

test('the final 3.0.0 release upgrades beta without offering older stable releases', () => {
    assert.equal(compareVersions('3.0.0', '3.0.0-beta.1'), 1);
    assert.equal(compareVersions('3.0.0-beta.1', '3.0.0'), -1);
    assert.equal(compareVersions('2.3.0', '3.0.0-beta.1'), -1);
    assert.equal(compareVersions('3.0.1', '3.0.0-beta.1'), 1);
});

test('prereleases follow numeric and identifier precedence', () => {
    const ordered = ['3.0.0-alpha', '3.0.0-alpha.1', '3.0.0-alpha.beta', '3.0.0-beta', '3.0.0-beta.2', '3.0.0-beta.10', '3.0.0-rc.1', '3.0.0'];
    for (let index = 1; index < ordered.length; index++) {
        assert.equal(compareVersions(ordered[index], ordered[index - 1]), 1);
        assert.equal(compareVersions(ordered[index - 1], ordered[index]), -1);
    }
    assert.equal(compareVersions('3.0.0', '3.0.0'), 0);
});
