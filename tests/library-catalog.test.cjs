const test = require('node:test');
const assert = require('node:assert/strict');
const catalog = require('../js/services/library-catalog.js');

test('every bundled Library database has a valid stable update date', () => {
    assert.equal(catalog.length, 5);
    catalog.forEach(entry => {
        assert.match(entry.updatedAt, /^\d{4}-\d{2}-\d{2}$/, `${entry.fileName} is missing an ISO update date`);
        const parsed = new Date(`${entry.updatedAt}T00:00:00Z`);
        assert.equal(Number.isNaN(parsed.getTime()), false, `${entry.fileName} has an invalid update date`);
        assert.equal(parsed.toISOString().slice(0, 10), entry.updatedAt, `${entry.fileName} update date was normalized unexpectedly`);
    });
});
