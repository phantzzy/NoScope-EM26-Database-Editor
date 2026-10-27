/* Shared by the browser editor and the package regression tests. */
(function (root) {
    const TABLES = ["Players.csv", "Sponsors.csv", "Staff.csv", "Teams.csv", "Tournaments.csv"];
    const ROSTER = "roster_order.json";

    async function read(zip, Papa, onProgress = () => {}) {
        const database = { tables: {}, roster_order: {}, packageZip: zip, tableFormats: {} };
        const count = TABLES.filter(name => zip.file(name)).length + (zip.file(ROSTER) ? 1 : 0);
        let completed = 0;
        for (const name of TABLES) {
            const entry = zip.file(name);
            if (!entry) continue;
            const text = await entry.async("string", metadata => onProgress((completed + metadata.percent / 100) / count, name));
            const parsed = Papa.parse(text, { skipEmptyLines: true });
            const header = parsed.data[0] || [];
            const rows = parsed.data.slice(1);
            const errors = parsed.errors.filter(error => error.code !== "UndetectableDelimiter");
            if (!header.length || new Set(header).size !== header.length || errors.length || rows.some(row => row.length !== header.length)) {
                throw new Error(`${name} contains malformed CSV. The current database has not been replaced.`);
            }
            const tableName = name.slice(0, -4);
            database.tables[tableName] = { header, rows };
            database.tableFormats[tableName] = {
                delimiter: parsed.meta.delimiter || ";",
                newline: parsed.meta.linebreak || "\r\n",
                bom: text.startsWith("\uFEFF"),
                original: JSON.stringify({ header, rows })
            };
            onProgress(++completed / count, name);
        }
        if (!Object.keys(database.tables).length) throw new Error("No supported database tables were found.");
        if (zip.file(ROSTER)) {
            const roster = JSON.parse(await zip.file(ROSTER).async("string", metadata => onProgress((completed + metadata.percent / 100) / count, ROSTER)));
            if (!roster || typeof roster !== "object" || Array.isArray(roster) ||
                Object.values(roster).some(order => !Array.isArray(order) || order.some(id => typeof id !== "string" && id !== null))) {
                throw new Error("Invalid roster_order.json: expected team names mapped to player ID arrays.");
            }
            database.roster_order = roster;
        }
        database.originalRoster = JSON.stringify(database.roster_order);
        return database;
    }

    async function write(database, JSZip, Papa, serializeRows = (_name, table) => table.rows) {
        const zip = new JSZip();
        // Preserve unknown files, including future game tables and metadata.
        if (database.packageZip) {
            zip.comment = database.packageZip.comment;
            for (const [name, entry] of Object.entries(database.packageZip.files)) {
                zip.file(name, entry.dir ? null : await entry.async("uint8array"), {
                    dir: entry.dir, date: entry.date, comment: entry.comment,
                    unixPermissions: entry.unixPermissions, dosPermissions: entry.dosPermissions
                });
            }
        }
        for (const name of TABLES) {
            const tableName = name.slice(0, -4);
            const table = database.tables[tableName];
            if (!table) continue;
            const rows = serializeRows(tableName, table);
            const format = database.tableFormats?.[tableName];
            if (zip.file(name) && format?.original === JSON.stringify({ header: table.header, rows })) continue;
            const text = Papa.unparse({ fields: table.header, data: rows }, {
                delimiter: format?.delimiter || ";", newline: format?.newline || "\r\n"
            });
            zip.file(name, (format?.bom === false ? "" : "\uFEFF") + text);
        }
        const roster = database.roster_order || {};
        if (JSON.stringify(roster) !== database.originalRoster || (!zip.file(ROSTER) && Object.keys(roster).length)) {
            zip.file(ROSTER, JSON.stringify(roster, null, 2));
        }
        return zip;
    }

    const api = { read, write };
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    else root.DatabasePackage = api;
})(globalThis);
