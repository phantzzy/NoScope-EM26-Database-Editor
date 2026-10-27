const { test } = require('node:test');
const assert = require('node:assert/strict');
const JSZip = require('jszip');
const Papa = require('papaparse');
const { read, write } = require('../js/services/database-package');

function fixture() {
    return new JSZip()
        .file('Players.csv', '\uFEFFNick;Id;Potential;FutureField\r\nTest;test;18;"A;B"\r\n')
        .file('future/table.csv', 'Key,Value\n1,new\n')
        .file('metadata.bin', Uint8Array.from([0, 255, 128, 1]));
}

test('unchanged package entries retain their exact bytes, including unknown files', async () => {
    const original = fixture().file('roster_order.json', '{ "Team": ["test"] }');
    const database = await read(original, Papa);
    const saved = await write(database, JSZip, Papa);
    for (const name of Object.keys(original.files).filter(name => !original.files[name].dir)) {
        assert.deepEqual(await saved.file(name).async('uint8array'), await original.file(name).async('uint8array'));
    }
});

test('edited tables preserve columns, quoted values, BOM, delimiter and extra files', async () => {
    const database = await read(fixture(), Papa);
    database.tables.Players.rows[0][0] = 'Edited; "nickname"';
    const saved = await write(database, JSZip, Papa);
    const reopened = await read(await JSZip.loadAsync(await saved.generateAsync({ type: 'nodebuffer' })), Papa);
    assert.deepEqual(reopened.tables, database.tables);
    assert.equal(reopened.tableFormats.Players.bom, true);
    assert.equal(reopened.tableFormats.Players.delimiter, ';');
    assert.deepEqual(await saved.file('metadata.bin').async('uint8array'), Uint8Array.from([0, 255, 128, 1]));
});

test('CSV folders without roster metadata start empty and remain saveable', async () => {
    const first = await read(fixture().file('roster_order.json', '{"OldTeam":["old"]}'), Papa);
    const second = await read(fixture(), Papa);
    assert.deepEqual(second.roster_order, {});
    assert.notDeepEqual(first.roster_order, second.roster_order);
    const saved = await write(second, JSZip, Papa);
    assert.equal(saved.file('roster_order.json'), null);
    second.roster_order.Team = ['test'];
    assert.deepEqual((await read(await write(second, JSZip, Papa), Papa)).roster_order, second.roster_order);
});

test('malformed CSV and roster data fail instead of silently losing data', async () => {
    for (const text of ['Nick;Id\nA;1;extra', 'Nick;Nick\nA;B', 'Nick;Id\n"unterminated;1']) {
        await assert.rejects(read(new JSZip().file('Players.csv', text), Papa), /malformed CSV/);
    }
    for (const text of ['null', '[]', '{"Team":42}', '{"Team":[{}]}']) {
        await assert.rejects(read(fixture().file('roster_order.json', text), Papa), /Invalid roster/);
    }
    await assert.rejects(read(new JSZip(), Papa), /No supported/);
});

test('serialization applies the existing potential policy without mutating rows', async () => {
    const database = await read(fixture(), Papa);
    const original = JSON.stringify(database.tables);
    const saved = await write(database, JSZip, Papa, (_name, table) => table.rows.map(row => row.map((value, index) => index === 2 ? '20' : value)));
    assert.equal((await read(saved, Papa)).tables.Players.rows[0][2], '20');
    assert.equal(JSON.stringify(database.tables), original);
});
