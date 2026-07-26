const MERGE_TABLE_ORDER = ["Players", "Teams", "Staff", "Sponsors", "Tournaments"];
const MERGE_PLAYER_GROUPS = [
    ["identity", "Identity and nationality"],
    ["team", "Teams and roster positions"],
    ["roles", "Roles and statuses"],
    ["gameplay", "Gameplay attributes"],
    ["mental", "Mental attributes"],
    ["physical", "Physical attributes"],
    ["potential", "Potential"],
    ["details", "Details, earnings, PR, and links"]
];
const MERGE_REVIEW_PAGE_SIZE = 40;
const MERGE_REQUIRED_FIELD_ALIASES = {
    players: [
        ["nickname", "nick"],
        ["dateofbirth", "birthdate", "dob"],
        ["country", "nationality"],
        ["role1", "primaryrole", "role"],
        ["skill"],
        ["internalid", "playerid", "id"]
    ],
    staff: [
        ["nickname", "nick"],
        ["firstname", "forename", "name"],
        ["surname", "lastname"],
        ["role", "job", "type", "position"],
        ["country", "nationality"],
        ["internalid", "staffid", "id"]
    ],
    staffs: [
        ["nickname", "nick"],
        ["firstname", "forename", "name"],
        ["surname", "lastname"],
        ["role", "job", "type", "position"],
        ["country", "nationality"],
        ["internalid", "staffid", "id"]
    ],
    teams: [
        ["nick", "nickname"],
        ["name", "teamname"],
        ["country", "nationality"],
        ["rating"]
    ],
    tournaments: [
        ["id", "internalid", "tournamentid"],
        ["name", "tournamentname", "title"],
        ["tier"],
        ["prizefund", "prizemoney"],
        ["type", "format"],
        ["country", "nationality"],
        ["city", "hostcity", "locationcity"]
    ],
    sponsors: [
        ["num", "number", "id", "internalid"],
        ["companyname", "name"],
        ["description", "bio", "about"],
        ["tier", "level"],
        ["type", "category"]
    ]
};
const MERGE_INTERNAL_ID_FIELDS = new Set(["id"]);
const MERGE_BLANK_FALSE_FIELDS = new Set(["retired", "fromfaceit", "disbanded"]);

const btnMergeDatabases = document.getElementById("btn-merge-databases");
const btnUndoMerge = document.getElementById("btn-undo-merge");
const mergeFileInput = document.getElementById("merge-file-input");
const mergeModal = document.getElementById("merge-modal");
const mergeContent = document.getElementById("merge-content");
const mergeFeedback = document.getElementById("merge-feedback");
const mergeStepper = document.getElementById("merge-stepper");
const btnCloseMerge = document.getElementById("btn-close-merge");
const btnCancelMerge = document.getElementById("btn-cancel-merge");
const btnMergeBack = document.getElementById("btn-merge-back");
const btnMergeNext = document.getElementById("btn-merge-next");

let mergeState = createEmptyMergeState();
let lastMergeUndo = null;

function createEmptyMergeState() {
    return {
        step: "source",
        incomingDb: null,
        incomingFileName: "",
        incomingLibraryId: "",
        scopes: {
            tables: {},
            playerGroups: Object.fromEntries(MERGE_PLAYER_GROUPS.map(([key]) => [key, true])),
            addMissing: true,
            updateExisting: true,
            addMissingColumns: true
        },
        proposals: [],
        safetyEvents: [],
        unchangedCount: 0,
        reviewFilter: { table: "all", action: "all", search: "" },
        reviewPage: 1,
        result: null
    };
}

function cloneMergeValue(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
}

function updateMergeAvailability() {
    const loaded = Boolean(db?.tables && Object.keys(db.tables).length);
    btnMergeDatabases.disabled = !loaded;
    btnMergeDatabases.title = loaded
        ? `Merge another database into ${db.fileName || "the currently loaded database"}`
        : "Load a base database before merging";
    btnMergeDatabases.setAttribute("aria-disabled", String(!loaded));
}

function clearMergeUndo() {
    lastMergeUndo = null;
    btnUndoMerge.hidden = true;
}

function setMergeFeedback(message = "") {
    mergeFeedback.textContent = message;
    mergeFeedback.hidden = !message;
}

function getMergeTableName(database, requestedName) {
    return Object.keys(database?.tables || {}).find(name => name.toLowerCase() === String(requestedName).toLowerCase()) || "";
}

function getMergeTable(database, requestedName) {
    const tableName = getMergeTableName(database, requestedName);
    return tableName ? database.tables[tableName] : null;
}

function addMergeSafetyEvent(type, tableName, label, detail = "") {
    mergeState.safetyEvents.push({
        type,
        tableName,
        label: label || tableName || "Record",
        detail
    });
}

function getMergeSafetyEventMeta(type) {
    const meta = {
        incompleteAddition: ["Incomplete additions skipped", "Incoming records missing required game fields were not added."],
        blankOverwrite: ["Blank overwrites blocked", "Filled Database A values were protected from empty incoming values."],
        internalIdChange: ["ID changes blocked", "Existing internal IDs were preserved."],
        legacyFalseNormalized: ["Legacy false values normalized", "Incoming False/No values for blank-or-1 fields were treated as blank."]
    };
    return meta[type] || ["Safety action", "No additional details."];
}

function getMergeSafetySummary() {
    const summary = new Map();
    mergeState.safetyEvents.forEach(event => {
        if (!summary.has(event.type)) summary.set(event.type, { type: event.type, count: 0, samples: [] });
        const entry = summary.get(event.type);
        entry.count += 1;
        if (entry.samples.length < 5) entry.samples.push(event);
    });
    return [...summary.values()];
}

function getMergeValue(table, row, aliases) {
    if (!table || !row) return "";
    const normalizedAliases = aliases.map(alias => normalizeFieldName(alias));
    for (const alias of normalizedAliases) {
        const index = table.header.findIndex(header => normalizeFieldName(header) === alias);
        const value = index >= 0 ? String(row[index] ?? "").trim() : "";
        if (value) return value;
    }
    return "";
}

function normalizeMergeIdentity(value) {
    return String(value ?? "")
        .normalize("NFKC")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function canonicalMergeFieldName(tableName, label) {
    const name = normalizeFieldName(label);
    const aliases = {
        nick: "nickname",
        forename: "firstname",
        surname: "lastname",
        birthdate: "dateofbirth",
        dob: "dateofbirth",
        nationality: "country",
        teamname: "team",
        tactics: "tactic",
        grenade: "grenades",
        leadership: "leader",
        stressresistance: "stress",
        overall: "rating",
        overallrating: "rating",
        bgcolor: "backgroundcolor",
        bgcolour: "backgroundcolor",
        backgroundcolour: "backgroundcolor",
        imageurl: "photourl",
        portraiturl: "photourl"
    };
    if (tableName.toLowerCase() === "players") {
        if (["playerid", "internalid"].includes(name)) return "id";
    } else if (["teamid", "staffid", "sponsorid", "tournamentid", "internalid"].includes(name)) {
        return "id";
    }
    return aliases[name] || name;
}

function getMergePlayerFieldGroup(label) {
    const name = canonicalMergeFieldName("Players", label);
    if (["id", "nickname", "firstname", "lastname", "dateofbirth", "country", "gender"].includes(name)) return "identity";
    if (["team", "teamid", "rosterposition"].includes(name)) return "team";
    if (["role", "role1", "role2", "role3", "status", "retired", "fromfaceit"].includes(name)) return "roles";
    const section = getFieldSection(label);
    if (["gameplay", "mental", "physical", "potential"].includes(section)) return section;
    return "details";
}

function isMergeFieldEnabled(tableName, label) {
    if (tableName.toLowerCase() !== "players") return true;
    return mergeState.scopes.playerGroups[getMergePlayerFieldGroup(label)] !== false;
}

function getMergeStableKeys(tableName, table, row) {
    const normalizedTable = tableName.toLowerCase();
    const aliasesByTable = {
        players: ["internalid", "playerid", "id"],
        teams: ["teamid", "internalid", "id"],
        staff: ["staffid", "internalid", "id"],
        staffs: ["staffid", "internalid", "id"],
        sponsors: ["sponsorid", "internalid", "id"],
        tournaments: ["tournamentid", "cupid", "internalid", "id"]
    };
    const keys = [];
    (aliasesByTable[normalizedTable] || ["internalid", "id"]).forEach(alias => {
        const value = normalizeMergeIdentity(getMergeValue(table, row, [alias]));
        if (value) keys.push(`id:${value}`);
    });
    if (normalizedTable === "players") {
        ["hltv", "liquipedia", "faceit"].forEach(alias => {
            const value = normalizeMergeIdentity(getMergeValue(table, row, [alias]));
            if (value && !/^(true|false|yes|no|0|1)$/.test(value)) keys.push(`external:${alias}:${value}`);
        });
    }
    return [...new Set(keys)];
}

function getMergeFallbackKeys(tableName, table, row) {
    const normalizedTable = tableName.toLowerCase();
    const keys = [];
    if (normalizedTable === "players") {
        const nick = normalizeMergeIdentity(getMergeValue(table, row, ["nickname", "nick"]));
        const first = normalizeMergeIdentity(getMergeValue(table, row, ["firstname", "forename", "name"]));
        const last = normalizeMergeIdentity(getMergeValue(table, row, ["lastname", "surname"]));
        const dob = normalizeMergeIdentity(getMergeValue(table, row, ["dateofbirth", "birthdate", "dob"]));
        if (nick && dob) keys.push(`player:nickdob:${nick}|${dob}`);
        if ((first || last) && dob) keys.push(`player:realdob:${first}|${last}|${dob}`);
        if (nick && (first || last)) keys.push(`player:nickreal:${nick}|${first}|${last}`);
        if (nick) keys.push(`player:nick:${nick}`);
        return keys;
    }
    if (["teams", "sponsors"].includes(normalizedTable)) {
        ["nick", "nickname", "name", "abbreviation", "shortname"].forEach(alias => {
            const value = normalizeMergeIdentity(getMergeValue(table, row, [alias]));
            if (value) keys.push(`${normalizedTable}:name:${value}`);
        });
        return [...new Set(keys)];
    }
    if (["staff", "staffs"].includes(normalizedTable)) {
        const nick = normalizeMergeIdentity(getMergeValue(table, row, ["nickname", "nick"]));
        const first = normalizeMergeIdentity(getMergeValue(table, row, ["firstname", "forename", "name"]));
        const last = normalizeMergeIdentity(getMergeValue(table, row, ["lastname", "surname"]));
        if (nick && (first || last)) keys.push(`staff:nickreal:${nick}|${first}|${last}`);
        if (nick) keys.push(`staff:nick:${nick}`);
        return keys;
    }
    const name = normalizeMergeIdentity(getMergeValue(table, row, ["name", "title", "nick"]));
    const country = normalizeMergeIdentity(getMergeValue(table, row, ["country", "nationality"]));
    if (name && country) keys.push(`${normalizedTable}:namecountry:${name}|${country}`);
    if (name) keys.push(`${normalizedTable}:name:${name}`);
    return keys;
}

function buildMergeKeyIndex(tableName, table, keyGetter) {
    const index = new Map();
    if (!table) return index;
    table.rows.forEach((row, rowIndex) => {
        keyGetter(tableName, table, row).forEach(key => {
            if (!index.has(key)) index.set(key, new Set());
            index.get(key).add(rowIndex);
        });
    });
    return index;
}

function collectMergeCandidates(keys, index) {
    const candidates = new Set();
    keys.forEach(key => index.get(key)?.forEach(rowIndex => candidates.add(rowIndex)));
    return [...candidates];
}

function findMergeMatch(tableName, baseTable, incomingTable, incomingRow, indexes) {
    if (!baseTable) return { type: "new", candidates: [] };
    const stableKeys = getMergeStableKeys(tableName, incomingTable, incomingRow);
    const stableCandidates = collectMergeCandidates(
        stableKeys,
        indexes.stable
    );
    if (stableCandidates.length === 1) return { type: "exact", baseIndex: stableCandidates[0], candidates: stableCandidates };
    if (stableCandidates.length > 1) return { type: "conflict", candidates: stableCandidates };
    if (stableKeys.length && indexes.stable.size) return { type: "new", candidates: [] };
    const fallbackCandidates = collectMergeCandidates(
        getMergeFallbackKeys(tableName, incomingTable, incomingRow),
        indexes.fallback
    );
    if (fallbackCandidates.length === 1) return { type: "strong", baseIndex: fallbackCandidates[0], candidates: fallbackCandidates };
    if (fallbackCandidates.length > 1) return { type: "conflict", candidates: fallbackCandidates };
    return { type: "new", candidates: [] };
}

function getMergeEntityLabel(tableName, table, row, fallbackIndex = 0) {
    const aliases = tableName.toLowerCase() === "players"
        ? ["nickname", "nick", "name", "internalid", "id"]
        : ["nick", "nickname", "name", "title", "internalid", "id"];
    return getMergeValue(table, row, aliases) || `${tableName.replace(/s$/i, "")} ${fallbackIndex + 1}`;
}

function isMergeIdentityDiff(tableName, diff) {
    const normalized = normalizeFieldName(diff.label);
    const canonical = diff.canonical || canonicalMergeFieldName(tableName, diff.label);
    const identityNames = new Set([
        "id", "nickname", "nick", "name", "firstname", "forename", "lastname", "surname",
        "companyname", "teamname", "tournamentname", "title", "cupid"
    ]);
    return identityNames.has(normalized) || identityNames.has(canonical);
}

function getMergeIdentityDiffSummary(identityDiffs) {
    return identityDiffs.slice(0, 2).map(diff => {
        const oldValue = diff.oldValue || "Empty";
        const newValue = diff.newValue || "Empty";
        return `${diff.label}: ${oldValue} > ${newValue}`;
    }).join(" | ");
}

function buildMergeFieldLookup(tableName, table) {
    const exact = new Map();
    const canonical = new Map();
    table?.header.forEach((label, index) => {
        const normalized = normalizeFieldName(label);
        if (!exact.has(normalized)) exact.set(normalized, index);
        const key = canonicalMergeFieldName(tableName, label);
        if (!canonical.has(key)) canonical.set(key, index);
    });
    return { exact, canonical };
}

function getMergeMappedBaseIndex(tableName, incomingLabel, lookup) {
    const exact = lookup.exact.get(normalizeFieldName(incomingLabel));
    if (exact !== undefined) return exact;
    return lookup.canonical.get(canonicalMergeFieldName(tableName, incomingLabel)) ?? -1;
}

function getMergeColumnIndex(table, aliases) {
    const normalizedAliases = aliases.map(alias => normalizeFieldName(alias));
    return table?.header?.findIndex(header => normalizedAliases.includes(normalizeFieldName(header))) ?? -1;
}

function getMergeRequiredFieldAliases(tableName) {
    return MERGE_REQUIRED_FIELD_ALIASES[String(tableName || "").toLowerCase()] || [];
}

function hasMergeRequiredFields(tableName, table, row) {
    return getMergeRequiredFieldAliases(tableName).every(aliases => {
        const index = getMergeColumnIndex(table, aliases);
        return index >= 0 && String(row[index] ?? "").trim();
    });
}

function getMissingMergeRequiredFields(tableName, table, row) {
    return getMergeRequiredFieldAliases(tableName)
        .map(aliases => {
            const index = getMergeColumnIndex(table, aliases);
            const label = index >= 0 ? table.header[index] : aliases[0];
            return index >= 0 && String(row[index] ?? "").trim() ? "" : label;
        })
        .filter(Boolean);
}

function normalizeMergeIncomingValue(tableName, label, value) {
    const canonical = canonicalMergeFieldName(tableName, label);
    const normalized = normalizeFieldName(label);
    const rawValue = String(value ?? "");
    if (
        MERGE_BLANK_FALSE_FIELDS.has(canonical)
        || MERGE_BLANK_FALSE_FIELDS.has(normalized)
    ) {
        const compactValue = normalizeMergeIdentity(rawValue);
        if (["false", "no"].includes(compactValue)) return "";
    }
    return rawValue;
}

function buildMergeFieldDiffs(tableName, baseTable, baseRow, incomingTable, incomingRow, isAddition = false, eventLabel = "") {
    const lookup = buildMergeFieldLookup(tableName, baseTable);
    const seenBaseIndexes = new Set();
    const seenMissingKeys = new Set();
    return incomingTable.header.map((label, incomingIndex) => {
        if (!isMergeFieldEnabled(tableName, label)) return null;
        const baseIndex = getMergeMappedBaseIndex(tableName, label, lookup);
        const canonical = canonicalMergeFieldName(tableName, label);
        if (tableName.toLowerCase() === "players" && canonical === "rating") return null;
        if (baseIndex < 0 && !mergeState.scopes.addMissingColumns && baseTable) return null;
        if (baseIndex >= 0 && seenBaseIndexes.has(baseIndex)) return null;
        if (baseIndex < 0 && seenMissingKeys.has(canonical)) return null;
        if (baseIndex >= 0) seenBaseIndexes.add(baseIndex);
        else seenMissingKeys.add(canonical);
        const oldValue = baseIndex >= 0 && baseRow ? String(baseRow[baseIndex] ?? "") : "";
        const rawNewValue = String(incomingRow[incomingIndex] ?? "");
        const newValue = normalizeMergeIncomingValue(tableName, label, rawNewValue);
        if (!isAddition && rawNewValue !== newValue) {
            addMergeSafetyEvent("legacyFalseNormalized", tableName, eventLabel, `${label}: ${rawNewValue || "Empty"} treated as ${newValue || "blank"}`);
        }
        const oldHasValue = Boolean(oldValue.trim());
        const newHasValue = Boolean(newValue.trim());
        if (!isAddition && oldHasValue && !newHasValue) {
            addMergeSafetyEvent("blankOverwrite", tableName, eventLabel, `${label}: kept ${oldValue}`);
            return null;
        }
        if (!isAddition && MERGE_INTERNAL_ID_FIELDS.has(canonical) && oldHasValue && newHasValue && oldValue !== newValue) {
            addMergeSafetyEvent("internalIdChange", tableName, eventLabel, `${label}: kept ${oldValue}, skipped ${newValue}`);
            return null;
        }
        const isAutomaticIncomingPotential = tableName.toLowerCase() === "players"
            && canonical === "potential"
            && (!newValue.trim() || Number.parseFloat(newValue) <= 0);
        const basePotential = Number.parseFloat(oldValue);
        const baseHasManualPotential = Number.isFinite(basePotential) && basePotential > 0;
        if (!isAddition && isAutomaticIncomingPotential && baseHasManualPotential) return null;
        if (!isAddition && oldValue === newValue) return null;
        return {
            id: `${incomingIndex}:${canonical}`,
            label: label || `Column ${incomingIndex + 1}`,
            canonical,
            group: tableName.toLowerCase() === "players" ? getMergePlayerFieldGroup(label) : "fields",
            baseIndex,
            incomingIndex,
            oldValue,
            newValue,
            missingColumn: baseIndex < 0,
            selected: true
        };
    }).filter(Boolean);
}

function createMergeProposal(tableName, baseTable, incomingTable, incomingRow, incomingIndex, match) {
    const baseIndex = match.baseIndex ?? -1;
    const baseRow = baseIndex >= 0 ? baseTable.rows[baseIndex] : null;
    const incomingLabel = getMergeEntityLabel(tableName, incomingTable, incomingRow, incomingIndex);
    const baseLabel = baseRow ? getMergeEntityLabel(tableName, baseTable, baseRow, baseIndex) : "";
    if (match.type === "conflict") {
        return {
            id: `${tableName}:${incomingIndex}`,
            tableName,
            label: incomingLabel,
            incomingLabel,
            baseLabel: "",
            identityChanged: false,
            identityDiffs: [],
            action: "conflict",
            confidence: "ambiguous",
            incomingIndex,
            baseIndex: -1,
            candidates: match.candidates,
            resolutionChoice: "skip",
            resolvedAsSkip: false,
            selected: false,
            fieldDiffs: []
        };
    }
    const isAddition = match.type === "new";
    if (isAddition && !hasMergeRequiredFields(tableName, incomingTable, incomingRow)) {
        addMergeSafetyEvent("incompleteAddition", tableName, incomingLabel, `Missing ${getMissingMergeRequiredFields(tableName, incomingTable, incomingRow).join(", ")}`);
        return null;
    }
    const fieldDiffs = buildMergeFieldDiffs(tableName, baseTable, baseRow, incomingTable, incomingRow, isAddition, incomingLabel);
    const identityDiffs = isAddition ? [] : fieldDiffs.filter(diff => isMergeIdentityDiff(tableName, diff));
    const hasTransfer = tableName.toLowerCase() === "players"
        && fieldDiffs.some(diff => diff.group === "team");
    return {
        id: `${tableName}:${incomingIndex}`,
        tableName,
        label: incomingLabel,
        incomingLabel,
        baseLabel,
        identityChanged: identityDiffs.length > 0,
        identityDiffs,
        action: isAddition ? "add" : hasTransfer ? "transfer" : "update",
        confidence: isAddition ? "new" : match.type,
        incomingIndex,
        baseIndex,
        candidates: match.candidates || [],
        selected: fieldDiffs.length > 0 && !identityDiffs.length,
        fieldDiffs
    };
}

function buildMergeProposals() {
    const proposals = [];
    let unchangedCount = 0;
    mergeState.safetyEvents = [];
    MERGE_TABLE_ORDER.forEach(requestedTableName => {
        const incomingTableName = getMergeTableName(mergeState.incomingDb, requestedTableName);
        if (!incomingTableName || mergeState.scopes.tables[incomingTableName] === false) return;
        const incomingTable = mergeState.incomingDb.tables[incomingTableName];
        const baseTableName = getMergeTableName(db, requestedTableName);
        const baseTable = baseTableName ? db.tables[baseTableName] : null;
        const indexes = {
            stable: buildMergeKeyIndex(incomingTableName, baseTable, getMergeStableKeys),
            fallback: buildMergeKeyIndex(incomingTableName, baseTable, getMergeFallbackKeys)
        };
        incomingTable.rows.forEach((incomingRow, incomingIndex) => {
            const match = findMergeMatch(incomingTableName, baseTable, incomingTable, incomingRow, indexes);
            if (match.type === "new" && !mergeState.scopes.addMissing) return;
            if (!["new", "conflict"].includes(match.type) && !mergeState.scopes.updateExisting) return;
            const proposal = createMergeProposal(
                incomingTableName,
                baseTable,
                incomingTable,
                incomingRow,
                incomingIndex,
                match
            );
            if (!proposal) {
                unchangedCount += 1;
                return;
            }
            if (proposal.action !== "conflict" && !proposal.fieldDiffs.length) {
                unchangedCount += 1;
                return;
            }
            proposals.push(proposal);
        });
    });
    mergeState.proposals = proposals;
    mergeState.unchangedCount = unchangedCount;
    mergeState.reviewPage = 1;
}

function resolveMergeConflict(proposal, choice) {
    const incomingTable = mergeState.incomingDb.tables[proposal.tableName];
    const incomingRow = incomingTable.rows[proposal.incomingIndex];
    const baseTableName = getMergeTableName(db, proposal.tableName);
    const baseTable = baseTableName ? db.tables[baseTableName] : null;
    if (choice === "skip") {
        proposal.selected = false;
        proposal.resolvedAsSkip = true;
        proposal.resolutionChoice = "skip";
        proposal.resolutionError = "";
        return;
    }
    const match = choice === "add"
        ? { type: "new", candidates: [] }
        : { type: "manual", baseIndex: Number(choice), candidates: [Number(choice)] };
    const replacement = createMergeProposal(
        proposal.tableName,
        baseTable,
        incomingTable,
        incomingRow,
        proposal.incomingIndex,
        match
    );
    if (!replacement) {
        proposal.selected = false;
        proposal.resolutionError = "That resolution was blocked by merge safety rules. Check the safety report for the missing or protected fields.";
        return;
    }
    replacement.id = proposal.id;
    const proposalIndex = mergeState.proposals.findIndex(item => item.id === proposal.id);
    if (proposalIndex >= 0) mergeState.proposals[proposalIndex] = replacement;
}

function getMergeRowSummary(tableName, table, row, fallbackIndex = 0) {
    const normalizedTable = String(tableName || "").toLowerCase();
    const parts = [];
    const id = getMergeValue(table, row, ["internalid", "playerid", "teamid", "staffid", "sponsorid", "tournamentid", "id"]);
    const first = getMergeValue(table, row, ["firstname", "forename", "name"]);
    const last = getMergeValue(table, row, ["lastname", "surname"]);
    const country = getMergeValue(table, row, ["country", "nationality"]);
    const team = normalizedTable === "players" || normalizedTable === "staff" || normalizedTable === "staffs"
        ? getMergeValue(table, row, ["team", "teamname", "teamid"])
        : "";
    const role = getMergeValue(table, row, ["role1", "primaryrole", "role", "type", "tier"]);
    if (id) parts.push(`ID ${id}`);
    if (first || last) parts.push([first, last].filter(Boolean).join(" "));
    if (team) parts.push(team);
    if (country) parts.push(country);
    if (role) parts.push(role);
    return parts.length ? parts.join(" - ") : `Row ${fallbackIndex + 1}`;
}

async function parseIncomingMergeDatabase(file) {
    showDatabaseLoading(`Reading incoming database ${file.name}...`);
    await waitForLoadingPaint();
    try {
        const arrayBuffer = await readFileAsArrayBufferWithProgress(file, progress => {
            updateDatabaseLoading(progress * 0.3, `Reading ${file.name}...`);
        });
        updateDatabaseLoading(36, "Decrypting incoming database...");
        const decryptedZipBuffer = await decryptEMDB(arrayBuffer);
        updateDatabaseLoading(48, "Opening incoming database...");
        const zip = await new JSZip().loadAsync(decryptedZipBuffer);
        const incomingDb = { tables: {}, roster_order: null, fileName: file.name };
        const files = TABLE_FILES.filter(fileName => zip.file(fileName));
        const totalSteps = files.length + (zip.file(ROSTER_FILE) ? 1 : 0);
        let completed = 0;
        for (const fileName of files) {
            const tableName = fileName.replace(".csv", "");
            const text = await zip.file(fileName).async("text", metadata => {
                const progress = (completed + metadata.percent / 100) / Math.max(totalSteps, 1);
                updateDatabaseLoading(50 + progress * 42, `Reading incoming ${tableName}...`);
            });
            const parsed = Papa.parse(text, { skipEmptyLines: true });
            incomingDb.tables[tableName] = {
                header: parsed.data[0] || [],
                rows: parsed.data.slice(1) || []
            };
            completed += 1;
        }
        const rosterFile = zip.file(ROSTER_FILE);
        if (rosterFile) incomingDb.roster_order = JSON.parse(await rosterFile.async("text"));
        updateDatabaseLoading(100, "Incoming database ready.");
        return incomingDb;
    } finally {
        hideDatabaseLoading();
    }
}

function isMergeEmdbFile(file) {
    return Boolean(file?.name && file.name.toLowerCase().endsWith(".emdb"));
}

async function setIncomingMergeDatabaseFromFile(file, options = {}) {
    if (!file) return false;
    if (!isMergeEmdbFile(file)) {
        setMergeFeedback("Choose or drop an .emdb file for Database B.");
        return false;
    }
    try {
        const incomingDb = await parseIncomingMergeDatabase(file);
        mergeState.incomingDb = incomingDb;
        mergeState.incomingFileName = options.label || file.name;
        mergeState.incomingLibraryId = options.libraryEntry?.id || "";
        resetMergeScopes();
        setMergeFeedback();
        renderMergeModal();
        return true;
    } catch (error) {
        console.error(error);
        setMergeFeedback(error.message || "Unable to open the incoming database.");
        return false;
    } finally {
        mergeFileInput.value = "";
    }
}

function bindMergeDropTarget(element) {
    const setDragging = active => element.classList.toggle("drag-over", active);
    ["dragenter", "dragover"].forEach(eventName => {
        element.addEventListener(eventName, event => {
            event.preventDefault();
            event.stopPropagation();
            if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
            setDragging(true);
        });
    });
    element.addEventListener("dragleave", event => {
        if (element.contains(event.relatedTarget)) return;
        setDragging(false);
    });
    element.addEventListener("drop", async event => {
        event.preventDefault();
        event.stopPropagation();
        setDragging(false);
        const file = Array.from(event.dataTransfer?.files || []).find(isMergeEmdbFile);
        if (!file) {
            setMergeFeedback("Drop an .emdb file for Database B.");
            return;
        }
        await setIncomingMergeDatabaseFromFile(file);
    });
}

function getMergeLibraryEntries() {
    return typeof LIBRARY_DATABASES !== "undefined" && Array.isArray(LIBRARY_DATABASES)
        ? LIBRARY_DATABASES
        : [];
}

async function fetchMergeLibraryBlob(entry) {
    if (typeof fetchBundledDatabaseBlob === "function") return fetchBundledDatabaseBlob(entry);
    const response = await fetch(`data/${entry.fileName}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${entry.name} request failed (${response.status})`);
    return response.blob();
}

async function loadIncomingMergeLibraryDatabase(entry, triggerButton) {
    if (!entry) return;
    if (triggerButton) triggerButton.disabled = true;
    try {
        const blob = await fetchMergeLibraryBlob(entry);
        const file = new File([blob], entry.fileName, { type: "application/octet-stream" });
        await setIncomingMergeDatabaseFromFile(file, {
            label: `${entry.name} (${entry.fileName})`,
            libraryEntry: entry
        });
    } catch (error) {
        console.error(error);
        setMergeFeedback(error.message || `Unable to load ${entry.name} from the Library.`);
    } finally {
        if (triggerButton) triggerButton.disabled = false;
    }
}

function resetMergeScopes() {
    mergeState.scopes.tables = {};
    Object.keys(mergeState.incomingDb?.tables || {}).forEach(tableName => {
        mergeState.scopes.tables[tableName] = true;
    });
    mergeState.scopes.playerGroups = Object.fromEntries(MERGE_PLAYER_GROUPS.map(([key]) => [key, true]));
    mergeState.scopes.addMissing = true;
    mergeState.scopes.updateExisting = true;
    mergeState.scopes.addMissingColumns = true;
}

function setMergeStep(step) {
    mergeState.step = step;
    setMergeFeedback();
    renderMergeModal();
}

function renderMergeStepper() {
    const steps = ["source", "scope", "review", "result"];
    const currentIndex = steps.indexOf(mergeState.step);
    mergeStepper.querySelectorAll("[data-merge-step]").forEach(item => {
        const index = steps.indexOf(item.dataset.mergeStep);
        item.classList.toggle("active", index === currentIndex);
        item.classList.toggle("complete", index < currentIndex);
    });
}

function createMergeDatabaseSummary(database, label, fileName) {
    const section = document.createElement("section");
    section.className = "merge-database-summary";
    const heading = document.createElement("div");
    const caption = document.createElement("span");
    caption.textContent = label;
    const title = document.createElement("strong");
    title.textContent = fileName || "Loaded database";
    heading.append(caption, title);
    const counts = document.createElement("div");
    counts.className = "merge-database-counts";
    MERGE_TABLE_ORDER.forEach(requestedName => {
        const table = getMergeTable(database, requestedName);
        if (!table) return;
        const item = document.createElement("span");
        item.innerHTML = `<b>${table.rows.length}</b><small>${requestedName}</small>`;
        counts.appendChild(item);
    });
    section.append(heading, counts);
    return section;
}

function renderMergeSourceStep() {
    const wrap = document.createElement("div");
    wrap.className = "merge-source-step";
    const intro = document.createElement("div");
    intro.className = "merge-step-heading";
    intro.innerHTML = "<h3>Choose the incoming database</h3><p>The currently loaded database stays as the base. The incoming file supplies proposed additions and updates.</p>";
    const databases = document.createElement("div");
    databases.className = "merge-database-pair";
    databases.appendChild(createMergeDatabaseSummary(db, "Database A - Current base", db.fileName || "Loaded CSV database"));
    const arrow = document.createElement("span");
    arrow.className = "merge-pair-arrow";
    arrow.textContent = "+";
    databases.appendChild(arrow);
    if (mergeState.incomingDb) {
        const incoming = createMergeDatabaseSummary(mergeState.incomingDb, "Database B - Incoming state", mergeState.incomingFileName);
        const replace = document.createElement("button");
        replace.type = "button";
        replace.className = "merge-replace-file";
        replace.textContent = "Replace file";
        replace.addEventListener("click", () => mergeFileInput.click());
        incoming.appendChild(replace);
        bindMergeDropTarget(incoming);
        databases.appendChild(incoming);
    } else {
        const picker = document.createElement("button");
        picker.type = "button";
        picker.className = "merge-file-picker";
        picker.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H10l2 2h6.5A2.5 2.5 0 0 1 21 8.5v1H3v-3Zm0 5h18l-1.45 6.08A3 3 0 0 1 16.63 20H6.37a3 3 0 0 1-2.92-2.42L2 11.5h1Z"/></svg><strong>Choose or drop incoming .emdb</strong><span>This file is read temporarily and will not replace Database A.</span>';
        picker.addEventListener("click", () => mergeFileInput.click());
        bindMergeDropTarget(picker);
        databases.appendChild(picker);
    }
    wrap.append(intro, databases);
    const libraryEntries = getMergeLibraryEntries();
    if (libraryEntries.length) {
        const library = document.createElement("section");
        library.className = "merge-library-picker";
        const heading = document.createElement("div");
        heading.className = "merge-library-heading";
        const title = document.createElement("strong");
        title.textContent = "Library databases";
        const note = document.createElement("span");
        note.textContent = "Use one of the bundled Library databases as Database B.";
        heading.append(title, note);
        const grid = document.createElement("div");
        grid.className = "merge-library-grid";
        libraryEntries.forEach(entry => {
            const option = document.createElement("button");
            option.type = "button";
            option.className = "merge-library-option";
            option.classList.toggle("active", mergeState.incomingLibraryId === entry.id);
            const optionTitle = document.createElement("strong");
            optionTitle.textContent = entry.name;
            const optionMeta = document.createElement("span");
            optionMeta.textContent = `by ${entry.owner} - ${entry.fileName}`;
            option.append(optionTitle, optionMeta);
            option.addEventListener("click", () => loadIncomingMergeLibraryDatabase(entry, option));
            grid.appendChild(option);
        });
        library.append(heading, grid);
        wrap.appendChild(library);
    }
    mergeContent.appendChild(wrap);
}

function createMergeScopeToggle(label, description, checked, onChange) {
    const item = document.createElement("label");
    item.className = "merge-scope-toggle";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = checked;
    const indicator = document.createElement("span");
    indicator.className = "merge-toggle-indicator";
    const copy = document.createElement("span");
    const title = document.createElement("strong");
    title.textContent = label;
    const note = document.createElement("small");
    note.textContent = description;
    copy.append(title, note);
    item.append(checkbox, indicator, copy);
    checkbox.addEventListener("change", () => onChange(checkbox.checked));
    return item;
}

function renderMergeScopeStep() {
    const wrap = document.createElement("div");
    wrap.className = "merge-scope-step";
    const intro = document.createElement("div");
    intro.className = "merge-step-heading";
    intro.innerHTML = "<h3>Choose what can change</h3><p>Only selected categories and field groups are included in the review. Nothing is applied yet.</p>";
    const tableSection = document.createElement("section");
    tableSection.className = "merge-scope-section";
    const tableHeading = document.createElement("div");
    tableHeading.className = "merge-scope-heading";
    tableHeading.innerHTML = "<div><span>Database categories</span><strong>Tables</strong></div>";
    const tableActions = document.createElement("div");
    [["Select all", true], ["Select none", false]].forEach(([label, checked]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.addEventListener("click", () => {
            Object.keys(mergeState.scopes.tables).forEach(name => { mergeState.scopes.tables[name] = checked; });
            renderMergeModal();
        });
        tableActions.appendChild(button);
    });
    tableHeading.appendChild(tableActions);
    const tableGrid = document.createElement("div");
    tableGrid.className = "merge-scope-grid";
    MERGE_TABLE_ORDER.forEach(requestedName => {
        const incomingName = getMergeTableName(mergeState.incomingDb, requestedName);
        if (!incomingName) return;
        const table = mergeState.incomingDb.tables[incomingName];
        tableGrid.appendChild(createMergeScopeToggle(
            requestedName,
            `${table.rows.length} incoming records`,
            mergeState.scopes.tables[incomingName] !== false,
            checked => { mergeState.scopes.tables[incomingName] = checked; }
        ));
    });
    tableSection.append(tableHeading, tableGrid);
    const playerTableName = getMergeTableName(mergeState.incomingDb, "Players");
    if (playerTableName && mergeState.scopes.tables[playerTableName] !== false) {
        const playerSection = document.createElement("section");
        playerSection.className = "merge-scope-section";
        const playerHeading = document.createElement("div");
        playerHeading.className = "merge-scope-heading";
        playerHeading.innerHTML = "<div><span>Player categories</span><strong>Field groups</strong></div>";
        const playerGrid = document.createElement("div");
        playerGrid.className = "merge-scope-grid";
        MERGE_PLAYER_GROUPS.forEach(([key, label]) => {
            playerGrid.appendChild(createMergeScopeToggle(
                label,
                key === "team" ? "Incoming team state wins for approved transfers." : "Review changed values before applying.",
                mergeState.scopes.playerGroups[key] !== false,
                checked => { mergeState.scopes.playerGroups[key] = checked; }
            ));
        });
        playerSection.append(playerHeading, playerGrid);
        wrap.append(intro, tableSection, playerSection);
    } else {
        wrap.append(intro, tableSection);
    }
    const behaviorSection = document.createElement("section");
    behaviorSection.className = "merge-scope-section";
    behaviorSection.innerHTML = '<div class="merge-scope-heading"><div><span>Merge behavior</span><strong>Allowed actions</strong></div></div>';
    const behaviorGrid = document.createElement("div");
    behaviorGrid.className = "merge-scope-grid";
    [
        ["Add missing records", "Offer records that only exist in Database B.", "addMissing"],
        ["Update existing records", "Offer changed values for matched records.", "updateExisting"],
        ["Add missing columns", "Offer compatible incoming fields missing from Database A.", "addMissingColumns"]
    ].forEach(([label, note, key]) => {
        behaviorGrid.appendChild(createMergeScopeToggle(
            label,
            note,
            mergeState.scopes[key],
            checked => { mergeState.scopes[key] = checked; }
        ));
    });
    behaviorSection.appendChild(behaviorGrid);
    wrap.appendChild(behaviorSection);
    mergeContent.appendChild(wrap);
}

function getMergeProposalCounts() {
    const counts = { add: 0, update: 0, transfer: 0, conflict: 0, risky: 0 };
    mergeState.proposals.forEach(proposal => {
        if (counts[proposal.action] !== undefined) counts[proposal.action] += 1;
        if (proposal.identityChanged) counts.risky += 1;
    });
    return counts;
}

function getFilteredMergeProposals() {
    const { table, action, search } = mergeState.reviewFilter;
    const query = search.trim().toLowerCase();
    return mergeState.proposals.filter(proposal => {
        if (table !== "all" && proposal.tableName !== table) return false;
        if (action !== "all" && proposal.action !== action) return false;
        const searchable = [
            proposal.label,
            proposal.baseLabel,
            proposal.incomingLabel,
            proposal.tableName,
            ...proposal.fieldDiffs.flatMap(diff => [diff.label, diff.oldValue, diff.newValue])
        ].join(" ").toLowerCase();
        if (query && !searchable.includes(query)) return false;
        return true;
    });
}

function createMergeSummaryBar() {
    const counts = getMergeProposalCounts();
    const bar = document.createElement("div");
    bar.className = "merge-review-summary";
    [
        ["add", "Add"],
        ["update", "Update"],
        ["transfer", "Transfer"],
        ["conflict", "Conflict"],
        ["risky", "Review"],
        ["unchanged", "Unchanged"]
    ].forEach(([key, label]) => {
        const item = document.createElement("span");
        const value = key === "unchanged" ? mergeState.unchangedCount : counts[key];
        item.className = `merge-summary-${key}`;
        item.innerHTML = `<b>${value}</b><small>${label}</small>`;
        bar.appendChild(item);
    });
    return bar;
}

function createMergeSafetyReport(options = {}) {
    const summary = getMergeSafetySummary();
    const section = document.createElement("section");
    section.className = `merge-safety-report${options.compact ? " merge-safety-report-compact" : ""}`;
    const heading = document.createElement("div");
    heading.className = "merge-safety-heading";
    const title = document.createElement("strong");
    title.textContent = summary.length ? "Safety report" : "Safety report clean";
    const note = document.createElement("span");
    note.textContent = summary.length
        ? "NoScope blocked risky incoming values before they reached the review list."
        : "No risky blank overwrites, incomplete additions, or protected ID changes were detected.";
    heading.append(title, note);
    section.appendChild(heading);
    if (!summary.length) return section;

    const grid = document.createElement("div");
    grid.className = "merge-safety-grid";
    summary.forEach(item => {
        const [label, description] = getMergeSafetyEventMeta(item.type);
        const card = document.createElement("article");
        const count = document.createElement("b");
        count.textContent = String(item.count);
        const copy = document.createElement("div");
        const cardTitle = document.createElement("strong");
        cardTitle.textContent = label;
        const cardDescription = document.createElement("span");
        cardDescription.textContent = description;
        copy.append(cardTitle, cardDescription);
        card.append(count, copy);
        if (!options.compact && item.samples.length) {
            const samples = document.createElement("ul");
            item.samples.forEach(sample => {
                const row = document.createElement("li");
                row.textContent = `${sample.tableName}: ${sample.label}${sample.detail ? ` - ${sample.detail}` : ""}`;
                samples.appendChild(row);
            });
            card.appendChild(samples);
        }
        grid.appendChild(card);
    });
    section.appendChild(grid);
    return section;
}

function createMergeReviewToolbar() {
    const toolbar = document.createElement("div");
    toolbar.className = "merge-review-toolbar";
    const tableSelect = document.createElement("select");
    tableSelect.setAttribute("aria-label", "Filter by table");
    const tableNames = [...new Set(mergeState.proposals.map(proposal => proposal.tableName))];
    [["all", "All categories"], ...tableNames.map(name => [name, name])].forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        tableSelect.appendChild(option);
    });
    tableSelect.value = mergeState.reviewFilter.table;
    tableSelect.addEventListener("change", () => {
        mergeState.reviewFilter.table = tableSelect.value;
        mergeState.reviewPage = 1;
        renderMergeModal();
    });
    const actionSelect = document.createElement("select");
    actionSelect.setAttribute("aria-label", "Filter by action");
    [["all", "All actions"], ["add", "Add"], ["update", "Update"], ["transfer", "Transfer"], ["conflict", "Conflict"]].forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        actionSelect.appendChild(option);
    });
    actionSelect.value = mergeState.reviewFilter.action;
    actionSelect.addEventListener("change", () => {
        mergeState.reviewFilter.action = actionSelect.value;
        mergeState.reviewPage = 1;
        renderMergeModal();
    });
    const search = document.createElement("input");
    search.type = "search";
    search.placeholder = "Search review...";
    search.value = mergeState.reviewFilter.search;
    search.addEventListener("input", () => {
        mergeState.reviewFilter.search = search.value;
        mergeState.reviewPage = 1;
        renderMergeModal({ preserveReviewFocus: true });
    });
    const clean = document.createElement("button");
    clean.type = "button";
    clean.textContent = "Approve safe";
    clean.addEventListener("click", () => {
        getFilteredMergeProposals().forEach(proposal => {
            if (proposal.action !== "conflict" && !proposal.identityChanged) proposal.selected = true;
        });
        renderMergeModal();
    });
    const none = document.createElement("button");
    none.type = "button";
    none.textContent = "Select none";
    none.addEventListener("click", () => {
        getFilteredMergeProposals().forEach(proposal => { proposal.selected = false; });
        renderMergeModal();
    });
    toolbar.append(tableSelect, actionSelect, search, clean, none);
    return toolbar;
}

function createMergeFieldDiffRow(proposal, diff) {
    const row = document.createElement("label");
    row.className = "merge-field-diff";
    row.classList.toggle("merge-field-diff-identity", isMergeIdentityDiff(proposal.tableName, diff));
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = diff.selected;
    checkbox.disabled = !proposal.selected;
    checkbox.addEventListener("change", () => {
        diff.selected = checkbox.checked;
        updateMergeFooter();
    });
    const field = document.createElement("strong");
    field.textContent = diff.label;
    if (diff.missingColumn) {
        const badge = document.createElement("small");
        badge.textContent = "New column";
        field.appendChild(badge);
    }
    const oldValue = document.createElement("span");
    oldValue.className = "merge-old-value";
    oldValue.textContent = diff.oldValue || "Empty";
    const arrow = document.createElement("b");
    arrow.textContent = ">";
    const newValue = document.createElement("span");
    newValue.className = "merge-new-value";
    newValue.textContent = diff.newValue || "Empty";
    row.append(checkbox, field, oldValue, arrow, newValue);
    return row;
}

function createMergeConflictControl(proposal) {
    const wrap = document.createElement("div");
    wrap.className = "merge-conflict-control";
    const intro = document.createElement("div");
    intro.className = "merge-conflict-intro";
    const title = document.createElement("strong");
    title.textContent = proposal.resolvedAsSkip ? "Skipped ambiguous incoming record" : "Resolve ambiguous match";
    const note = document.createElement("span");
    note.textContent = "Choose a base record to update, add it as new, or keep it skipped. Nothing changes until you apply the resolution.";
    intro.append(title, note);

    const choices = document.createElement("div");
    choices.className = "merge-conflict-choices";
    const preview = document.createElement("div");
    preview.className = "merge-conflict-preview";

    const baseTable = getMergeTable(db, proposal.tableName);
    const incomingTable = mergeState.incomingDb.tables[proposal.tableName];
    const incomingRow = incomingTable.rows[proposal.incomingIndex];
    const options = [{
        value: "skip",
        label: "Skip incoming record",
        detail: "Leave Database A unchanged."
    }];
    if (mergeState.scopes.addMissing) {
        options.push({
            value: "add",
            label: "Add as a new record",
            detail: getMergeRowSummary(proposal.tableName, incomingTable, incomingRow, proposal.incomingIndex)
        });
    }
    proposal.candidates.forEach(baseIndex => {
        const row = baseTable.rows[baseIndex];
        options.push({
            value: String(baseIndex),
            label: `Match ${getMergeEntityLabel(proposal.tableName, baseTable, row, baseIndex)}`,
            detail: getMergeRowSummary(proposal.tableName, baseTable, row, baseIndex)
        });
    });

    const setChoice = value => {
        proposal.resolutionChoice = value;
        choices.querySelectorAll(".merge-conflict-choice").forEach(item => {
            item.classList.toggle("selected", item.dataset.value === value);
            const input = item.querySelector("input");
            if (input) input.checked = item.dataset.value === value;
        });
        const option = options.find(item => item.value === value) || options[0];
        preview.innerHTML = "";
        const previewTitle = document.createElement("strong");
        previewTitle.textContent = option.label;
        const previewDetail = document.createElement("span");
        previewDetail.textContent = option.detail;
        preview.append(previewTitle, previewDetail);
    };

    options.forEach(option => {
        const item = document.createElement("label");
        item.className = "merge-conflict-choice";
        item.dataset.value = option.value;
        const input = document.createElement("input");
        input.type = "radio";
        input.name = `merge-conflict-${proposal.id}`;
        input.value = option.value;
        const copy = document.createElement("span");
        const optionTitle = document.createElement("strong");
        optionTitle.textContent = option.label;
        const optionDetail = document.createElement("small");
        optionDetail.textContent = option.detail;
        copy.append(optionTitle, optionDetail);
        item.append(input, copy);
        input.addEventListener("change", () => setChoice(option.value));
        choices.appendChild(item);
    });

    const actions = document.createElement("div");
    actions.className = "merge-conflict-actions";
    const apply = document.createElement("button");
    apply.type = "button";
    apply.textContent = proposal.resolvedAsSkip ? "Update resolution" : "Apply resolution";
    apply.addEventListener("click", () => {
        resolveMergeConflict(proposal, proposal.resolutionChoice || "skip");
        renderMergeModal();
    });
    actions.appendChild(apply);

    wrap.append(intro, choices, preview, actions);
    if (proposal.resolutionError) {
        const error = document.createElement("p");
        error.className = "merge-conflict-error";
        error.textContent = proposal.resolutionError;
        wrap.appendChild(error);
    }
    setChoice(proposal.resolutionChoice || "skip");
    return wrap;
}

function createMergeProposalRow(proposal) {
    const article = document.createElement("article");
    article.className = `merge-proposal merge-proposal-${proposal.action}`;
    const header = document.createElement("div");
    header.className = "merge-proposal-header";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = proposal.selected;
    checkbox.disabled = proposal.action === "conflict";
    checkbox.setAttribute("aria-label", `Include ${proposal.label}`);
    checkbox.addEventListener("change", () => {
        proposal.selected = checkbox.checked;
        article.classList.toggle("selected", proposal.selected);
        article.querySelectorAll(".merge-field-diff input").forEach(input => { input.disabled = !proposal.selected; });
        updateMergeFooter();
    });
    const action = document.createElement("span");
    action.className = "merge-action-badge";
    action.textContent = proposal.action;
    const identity = document.createElement("div");
    identity.className = "merge-proposal-identity";
    const title = document.createElement("div");
    title.className = "merge-proposal-title";
    const visibleBaseLabel = proposal.baseLabel || "";
    const visibleIncomingLabel = proposal.incomingLabel || proposal.label;
    const labelChanged = Boolean(
        visibleBaseLabel
        && normalizeMergeIdentity(visibleBaseLabel) !== normalizeMergeIdentity(visibleIncomingLabel)
    );
    if (labelChanged) {
        const baseName = document.createElement("span");
        baseName.className = "merge-identity-name merge-identity-name-base";
        const baseCaption = document.createElement("small");
        baseCaption.textContent = "Database A";
        const baseValue = document.createElement("strong");
        baseValue.textContent = visibleBaseLabel;
        baseName.append(baseCaption, baseValue);
        const arrow = document.createElement("b");
        arrow.className = "merge-identity-arrow";
        arrow.textContent = ">";
        const incomingName = document.createElement("span");
        incomingName.className = "merge-identity-name merge-identity-name-incoming";
        const incomingCaption = document.createElement("small");
        incomingCaption.textContent = "Database B";
        const incomingValue = document.createElement("strong");
        incomingValue.textContent = visibleIncomingLabel;
        incomingName.append(incomingCaption, incomingValue);
        const rename = document.createElement("em");
        rename.className = "merge-identity-change-badge";
        rename.textContent = "Rename";
        title.append(baseName, arrow, incomingName, rename);
    } else {
        const titleValue = document.createElement("strong");
        titleValue.textContent = visibleIncomingLabel;
        title.appendChild(titleValue);
        if (proposal.identityChanged) {
            const changed = document.createElement("em");
            changed.className = "merge-identity-change-badge";
            changed.textContent = "Identity changed";
            title.appendChild(changed);
        }
    }
    const meta = document.createElement("span");
    meta.textContent = `${proposal.tableName} - ${proposal.confidence} match - ${proposal.fieldDiffs.length} change${proposal.fieldDiffs.length === 1 ? "" : "s"}`;
    identity.append(title);
    if (proposal.identityChanged) {
        const identitySummary = document.createElement("small");
        identitySummary.className = "merge-identity-change-summary";
        identitySummary.textContent = getMergeIdentityDiffSummary(proposal.identityDiffs);
        identity.appendChild(identitySummary);
    }
    identity.appendChild(meta);
    header.append(checkbox, action, identity);
    article.appendChild(header);
    article.classList.toggle("selected", proposal.selected);
    if (proposal.action === "conflict") {
        article.appendChild(createMergeConflictControl(proposal));
        return article;
    }
    const details = document.createElement("details");
    details.open = proposal.identityChanged;
    const summary = document.createElement("summary");
    summary.textContent = proposal.identityChanged
        ? `Review ${proposal.fieldDiffs.length} field${proposal.fieldDiffs.length === 1 ? "" : "s"} - identity changes shown first`
        : `Review ${proposal.fieldDiffs.length} field${proposal.fieldDiffs.length === 1 ? "" : "s"}`;
    const fields = document.createElement("div");
    fields.className = "merge-field-diffs";
    [...proposal.fieldDiffs]
        .sort((left, right) => Number(isMergeIdentityDiff(proposal.tableName, right)) - Number(isMergeIdentityDiff(proposal.tableName, left)))
        .forEach(diff => fields.appendChild(createMergeFieldDiffRow(proposal, diff)));
    details.append(summary, fields);
    article.appendChild(details);
    return article;
}

function createMergeReviewPagination(filtered, pageCount) {
    const nav = document.createElement("div");
    nav.className = "merge-review-pagination";
    const previous = document.createElement("button");
    previous.type = "button";
    previous.textContent = "Previous";
    previous.disabled = mergeState.reviewPage <= 1;
    previous.addEventListener("click", () => {
        mergeState.reviewPage -= 1;
        renderMergeModal();
    });
    const summary = document.createElement("span");
    const first = filtered.length ? (mergeState.reviewPage - 1) * MERGE_REVIEW_PAGE_SIZE + 1 : 0;
    const last = Math.min(mergeState.reviewPage * MERGE_REVIEW_PAGE_SIZE, filtered.length);
    summary.textContent = `${first}-${last} of ${filtered.length}`;
    const next = document.createElement("button");
    next.type = "button";
    next.textContent = "Next";
    next.disabled = mergeState.reviewPage >= pageCount;
    next.addEventListener("click", () => {
        mergeState.reviewPage += 1;
        renderMergeModal();
    });
    nav.append(previous, summary, next);
    return nav;
}

function renderMergeReviewStep() {
    const wrap = document.createElement("div");
    wrap.className = "merge-review-step";
    wrap.append(createMergeSummaryBar(), createMergeSafetyReport(), createMergeReviewToolbar());
    const filtered = getFilteredMergeProposals();
    const pageCount = Math.max(1, Math.ceil(filtered.length / MERGE_REVIEW_PAGE_SIZE));
    mergeState.reviewPage = Math.min(mergeState.reviewPage, pageCount);
    const pageItems = filtered.slice(
        (mergeState.reviewPage - 1) * MERGE_REVIEW_PAGE_SIZE,
        mergeState.reviewPage * MERGE_REVIEW_PAGE_SIZE
    );
    const list = document.createElement("div");
    list.className = "merge-proposal-list";
    if (!pageItems.length) {
        const empty = document.createElement("div");
        empty.className = "merge-review-empty";
        empty.textContent = "No proposed changes match these filters.";
        list.appendChild(empty);
    } else {
        pageItems.forEach(proposal => list.appendChild(createMergeProposalRow(proposal)));
    }
    wrap.append(list, createMergeReviewPagination(filtered, pageCount));
    mergeContent.appendChild(wrap);
}

function renderMergeResultStep() {
    const result = mergeState.result;
    const wrap = document.createElement("div");
    wrap.className = "merge-result-step";
    const icon = document.createElement("div");
    icon.className = "merge-result-icon";
    icon.textContent = "OK";
    const heading = document.createElement("div");
    heading.innerHTML = `<span>Merge applied to Database A</span><h3>${result.total} approved record${result.total === 1 ? "" : "s"} processed</h3><p>The merged database has unsaved changes. Save it as a new .emdb when the result looks right.</p>`;
    const counts = document.createElement("div");
    counts.className = "merge-result-counts";
    [["added", "Added"], ["updated", "Updated"], ["transferred", "Transferred"], ["warnings", "Warnings"]].forEach(([key, label]) => {
        const item = document.createElement("span");
        item.innerHTML = `<b>${result[key]}</b><small>${label}</small>`;
        counts.appendChild(item);
    });
    const undo = document.createElement("button");
    undo.type = "button";
    undo.className = "btn btn-secondary";
    undo.textContent = "Undo merge";
    undo.addEventListener("click", undoLastMerge);
    wrap.append(icon, heading, counts, createMergeSafetyReport({ compact: true }), createMergeHealthSummary(result.healthChecks), undo);
    mergeContent.appendChild(wrap);
}

function getSelectedMergeProposalCount() {
    return mergeState.proposals.filter(proposal =>
        proposal.action !== "conflict"
        && proposal.selected
        && proposal.fieldDiffs.some(diff => diff.selected)
    ).length;
}

function updateMergeFooter() {
    btnMergeBack.hidden = mergeState.step === "source" || mergeState.step === "result";
    btnCancelMerge.textContent = mergeState.step === "result" ? "Close" : "Cancel";
    btnMergeNext.hidden = false;
    if (mergeState.step === "source") {
        btnMergeNext.textContent = mergeState.incomingDb ? "Continue" : "Choose incoming .emdb";
        btnMergeNext.disabled = false;
    } else if (mergeState.step === "scope") {
        btnMergeNext.textContent = "Build review";
        btnMergeNext.disabled = !Object.entries(mergeState.scopes.tables).some(([, checked]) => checked);
    } else if (mergeState.step === "review") {
        const count = getSelectedMergeProposalCount();
        btnMergeNext.textContent = `Apply ${count} approved`;
        btnMergeNext.disabled = count === 0;
    } else {
        btnMergeNext.textContent = "Done";
        btnMergeNext.disabled = false;
    }
}

function renderMergeModal(options = {}) {
    renderMergeStepper();
    mergeContent.innerHTML = "";
    if (mergeState.step === "source") renderMergeSourceStep();
    if (mergeState.step === "scope") renderMergeScopeStep();
    if (mergeState.step === "review") renderMergeReviewStep();
    if (mergeState.step === "result") renderMergeResultStep();
    updateMergeFooter();
    if (options.preserveReviewFocus && mergeState.step === "review") {
        const search = mergeContent.querySelector('.merge-review-toolbar input[type="search"]');
        search?.focus();
        search?.setSelectionRange(search.value.length, search.value.length);
    }
}

function openMergeModal() {
    if (!db?.tables || !Object.keys(db.tables).length) return;
    mergeState = createEmptyMergeState();
    mergeModal.hidden = false;
    renderMergeModal();
    btnCloseMerge.focus();
}

function closeMergeModal() {
    mergeModal.hidden = true;
    mergeFileInput.value = "";
    mergeState = createEmptyMergeState();
    setMergeFeedback();
}

function ensureMergeTargetTable(proposal) {
    let tableName = getMergeTableName(db, proposal.tableName);
    if (tableName) return { tableName, table: db.tables[tableName] };
    tableName = proposal.tableName;
    db.tables[tableName] = { header: [], rows: [] };
    return { tableName, table: db.tables[tableName] };
}

function ensureMergeTargetColumn(tableName, table, diff) {
    const lookup = buildMergeFieldLookup(tableName, table);
    const existingIndex = getMergeMappedBaseIndex(tableName, diff.label, lookup);
    if (existingIndex >= 0) return existingIndex;
    table.header.push(diff.label);
    table.rows.forEach(row => {
        while (row.length < table.header.length) row.push("");
    });
    return table.header.length - 1;
}

function countMergeTeamWarnings(affectedPlayerIndexes) {
    const playersTable = getMergeTable(db, "Players");
    const teamsTable = getMergeTable(db, "Teams");
    if (!playersTable || !teamsTable) return 0;
    const teamAliases = new Set();
    teamsTable.rows.forEach(row => {
        ["teamid", "internalid", "id", "nick", "nickname", "name", "abbreviation", "shortname"].forEach(alias => {
            const value = normalizeMergeIdentity(getMergeValue(teamsTable, row, [alias]));
            if (value) teamAliases.add(value);
        });
    });
    let warnings = 0;
    affectedPlayerIndexes.forEach(index => {
        const team = normalizeMergeIdentity(getMergeValue(playersTable, playersTable.rows[index], ["team", "teamname", "teamid"]));
        if (team && !isFreeAgentValue(team) && !teamAliases.has(team)) warnings += 1;
    });
    return warnings;
}

function countMergeDuplicateIdWarnings() {
    let warnings = 0;
    Object.entries(db.tables).forEach(([tableName, table]) => {
        const seen = new Set();
        const duplicates = new Set();
        table.rows.forEach(row => {
            getMergeStableKeys(tableName, table, row)
                .filter(key => key.startsWith("id:"))
                .forEach(key => {
                    if (seen.has(key)) duplicates.add(key);
                    else seen.add(key);
                });
        });
        warnings += duplicates.size;
    });
    return warnings;
}

function getMergeTeamAliasSet() {
    const teamsTable = getMergeTable(db, "Teams");
    const aliases = new Set();
    teamsTable?.rows?.forEach(row => {
        ["teamid", "internalid", "id", "nick", "nickname", "name", "abbreviation", "shortname"].forEach(alias => {
            const value = normalizeMergeIdentity(getMergeValue(teamsTable, row, [alias]));
            if (value) aliases.add(value);
        });
    });
    return aliases;
}

function countMissingRequiredRecords(tableName, table) {
    return table.rows.reduce((count, row) => {
        return hasMergeRequiredFields(tableName, table, row) ? count : count + 1;
    }, 0);
}

function getMergePostValidationSummary() {
    const checks = [];
    Object.entries(db.tables).forEach(([tableName, table]) => {
        const missingRequired = countMissingRequiredRecords(tableName, table);
        if (missingRequired) {
            checks.push({
                tone: "danger",
                label: `${tableName} missing required fields`,
                count: missingRequired,
                detail: "These records may fail strict game loading."
            });
        }
    });

    const duplicateIds = countMergeDuplicateIdWarnings();
    if (duplicateIds) {
        checks.push({
            tone: "danger",
            label: "Duplicate internal IDs",
            count: duplicateIds,
            detail: "Duplicate IDs can break identity and asset lookups."
        });
    }

    const teamsTable = getMergeTable(db, "Teams");
    if (teamsTable) {
        const ratingIndex = getMergeColumnIndex(teamsTable, ["rating"]);
        const blankRatings = ratingIndex >= 0
            ? teamsTable.rows.filter(row => !String(row[ratingIndex] ?? "").trim()).length
            : teamsTable.rows.length;
        if (blankRatings) {
            checks.push({
                tone: "danger",
                label: "Teams with blank Rating",
                count: blankRatings,
                detail: "Blank team ratings matched the zero-teams failure."
            });
        }
    }

    const teamAliases = getMergeTeamAliasSet();
    [["Players", ["team", "teamname", "teamid"]], ["Staff", ["team", "teamname", "teamid"]]].forEach(([requestedName, aliases]) => {
        const table = getMergeTable(db, requestedName);
        if (!table || !teamAliases.size) return;
        const missingRefs = table.rows.filter(row => {
            const team = normalizeMergeIdentity(getMergeValue(table, row, aliases));
            return team && !isFreeAgentValue(team) && !teamAliases.has(team);
        }).length;
        if (missingRefs) {
            checks.push({
                tone: "warning",
                label: `${requestedName} with unknown team`,
                count: missingRefs,
                detail: "Team references should match a Teams row."
            });
        }
    });

    return checks;
}

function createMergeHealthSummary(checks = []) {
    const section = document.createElement("section");
    section.className = "merge-health-summary";
    const heading = document.createElement("div");
    heading.className = "merge-safety-heading";
    const title = document.createElement("strong");
    title.textContent = checks.length ? "Post-merge checks" : "Post-merge checks passed";
    const note = document.createElement("span");
    note.textContent = checks.length
        ? "Review these before saving the merged database."
        : "No missing required fields, duplicate IDs, blank team ratings, or unknown team references were found.";
    heading.append(title, note);
    section.appendChild(heading);
    if (!checks.length) return section;

    const grid = document.createElement("div");
    grid.className = "merge-health-grid";
    checks.forEach(check => {
        const card = document.createElement("article");
        card.dataset.tone = check.tone || "warning";
        card.innerHTML = `<b>${check.count}</b><div><strong>${check.label}</strong><span>${check.detail}</span></div>`;
        grid.appendChild(card);
    });
    section.appendChild(grid);
    return section;
}

function applyApprovedMerge() {
    const approved = mergeState.proposals.filter(proposal =>
        proposal.action !== "conflict"
        && proposal.selected
        && proposal.fieldDiffs.some(diff => diff.selected)
    );
    if (!approved.length) return;
    lastMergeUndo = {
        tables: cloneMergeValue(db.tables),
        roster_order: cloneMergeValue(db.roster_order),
        fileName: db.fileName,
        activeTab,
        hasUnsavedChanges
    };
    const result = { total: approved.length, added: 0, updated: 0, transferred: 0, warnings: 0 };
    const affectedPlayerIndexes = new Set();
    approved.forEach(proposal => {
        const { tableName, table } = ensureMergeTargetTable(proposal);
        let row;
        let rowIndex;
        if (proposal.action === "add") {
            row = new Array(table.header.length).fill("");
            table.rows.push(row);
            rowIndex = table.rows.length - 1;
            result.added += 1;
        } else {
            rowIndex = proposal.baseIndex;
            row = table.rows[rowIndex];
            if (!row) return;
            if (proposal.action === "transfer") result.transferred += 1;
            else result.updated += 1;
        }
        proposal.fieldDiffs.filter(diff => diff.selected).forEach(diff => {
            const targetIndex = ensureMergeTargetColumn(tableName, table, diff);
            while (row.length < table.header.length) row.push("");
            row[targetIndex] = diff.newValue;
        });
        if (tableName.toLowerCase() === "players") affectedPlayerIndexes.add(rowIndex);
    });
    const playersTable = getMergeTable(db, "Players");
    if (playersTable) {
        const ratingIndex = playersTable.header.findIndex(label => ["rating", "overall", "overallrating"].includes(normalizeFieldName(label)));
        if (ratingIndex >= 0) {
            affectedPlayerIndexes.forEach(index => {
                playersTable.rows[index][ratingIndex] = calculatePlayerRatingForTable(playersTable, playersTable.rows[index]).toFixed(2);
            });
        }
    }
    result.warnings = countMergeTeamWarnings(affectedPlayerIndexes) + countMergeDuplicateIdWarnings();
    result.healthChecks = getMergePostValidationSummary();
    invalidatePlayerLeaderboardRanks();
    markUnsavedChanges({ preserveMergeUndo: true });
    btnUndoMerge.hidden = false;
    mergeState.result = result;
    const previousTab = activeTab;
    buildUI();
    if (previousTab && db.tables[previousTab]) switchTab(previousTab);
    setStatus(`Merged ${result.total} approved record${result.total === 1 ? "" : "s"} into ${db.fileName || "Database A"}.`, "success");
    setMergeStep("result");
}

function undoLastMerge() {
    if (!lastMergeUndo) return;
    const snapshot = lastMergeUndo;
    db.tables = cloneMergeValue(snapshot.tables);
    db.roster_order = cloneMergeValue(snapshot.roster_order);
    db.fileName = snapshot.fileName;
    hasUnsavedChanges = snapshot.hasUnsavedChanges;
    clearMergeUndo();
    buildUI();
    if (snapshot.activeTab && db.tables[snapshot.activeTab]) switchTab(snapshot.activeTab);
    setStatus("Merge undone.", "success");
    if (!mergeModal.hidden) closeMergeModal();
}

async function handleMergeNext() {
    if (mergeState.step === "source") {
        if (!mergeState.incomingDb) {
            mergeFileInput.click();
            return;
        }
        setMergeStep("scope");
        return;
    }
    if (mergeState.step === "scope") {
        btnMergeNext.disabled = true;
        btnMergeNext.textContent = "Building review...";
        await waitForLoadingPaint();
        buildMergeProposals();
        setMergeStep("review");
        if (!mergeState.proposals.length) setMergeFeedback("No mergeable differences were found for the selected scope.");
        return;
    }
    if (mergeState.step === "review") {
        applyApprovedMerge();
        return;
    }
    closeMergeModal();
}

btnMergeDatabases.addEventListener("click", openMergeModal);
btnUndoMerge.addEventListener("click", undoLastMerge);
btnCloseMerge.addEventListener("click", closeMergeModal);
btnCancelMerge.addEventListener("click", closeMergeModal);
btnMergeBack.addEventListener("click", () => {
    if (mergeState.step === "scope") setMergeStep("source");
    else if (mergeState.step === "review") setMergeStep("scope");
});
btnMergeNext.addEventListener("click", handleMergeNext);
mergeFileInput.addEventListener("change", async () => {
    const file = mergeFileInput.files[0];
    await setIncomingMergeDatabaseFromFile(file);
});
mergeModal.addEventListener("click", event => {
    if (event.target === mergeModal) closeMergeModal();
});
document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !mergeModal.hidden) closeMergeModal();
});
