const DATABASE_VALIDATION_RULES = {
    Players: {
        labelAliases: ["nickname", "nick", "name", "internalid", "id"],
        duplicates: [
            { label: "Internal ID", aliases: ["internalid", "playerid", "id"] },
            { label: "Nickname", aliases: ["nickname", "nick"] }
        ],
        compositeDuplicates: [
            { label: "Full name", aliases: [["name", "firstname", "forename"], ["surname", "lastname"]] }
        ],
        required: [
            { label: "Nickname", aliases: ["nickname", "nick"] },
            { label: "Date of birth", aliases: ["dateofbirth", "birthdate", "dob"] },
            { label: "Country", aliases: ["country", "nationality"] },
            { label: "Primary role", aliases: ["role1", "primaryrole", "role"] },
            { label: "Skill", aliases: ["skill"] },
            { label: "Internal ID", aliases: ["internalid", "playerid", "id"] }
        ]
    },
    Staff: {
        labelAliases: ["nickname", "nick", "name", "surname", "internalid", "id"],
        duplicates: [
            { label: "Internal ID", aliases: ["internalid", "staffid", "id"] },
            { label: "Nickname", aliases: ["nickname", "nick"] }
        ],
        compositeDuplicates: [
            { label: "Full name", aliases: [["name", "firstname", "forename"], ["surname", "lastname"]] }
        ],
        required: [
            { label: "Nickname", aliases: ["nickname", "nick"] },
            { label: "First name", aliases: ["firstname", "forename", "name"] },
            { label: "Surname", aliases: ["surname", "lastname"] },
            { label: "Role", aliases: ["role", "job", "type", "position"] },
            { label: "Country", aliases: ["country", "nationality"] },
            { label: "Internal ID", aliases: ["internalid", "staffid", "id"] }
        ]
    },
    Teams: {
        labelAliases: ["nick", "nickname", "name"],
        duplicates: [
            { label: "Nickname", aliases: ["nick", "nickname"] },
            { label: "Name", aliases: ["name", "teamname"] }
        ],
        required: [
            { label: "Nickname", aliases: ["nick", "nickname"] },
            { label: "Name", aliases: ["name", "teamname"] },
            { label: "Country", aliases: ["country", "nationality"] },
            { label: "Rating", aliases: ["rating"] }
        ]
    },
    Tournaments: {
        labelAliases: ["name", "title", "id", "cupid"],
        duplicates: [
            { label: "ID", aliases: ["id", "internalid", "tournamentid"] },
            { label: "Cup ID", aliases: ["cupid"] },
            { label: "Name", aliases: ["name", "tournamentname", "title"] }
        ],
        required: [
            { label: "ID", aliases: ["id", "internalid", "tournamentid"] },
            { label: "Name", aliases: ["name", "tournamentname", "title"] },
            { label: "Tier", aliases: ["tier"] },
            { label: "Prize fund", aliases: ["prizefund", "prizemoney"] },
            { label: "Type", aliases: ["type", "format"] },
            { label: "Country", aliases: ["country", "nationality"] },
            { label: "City", aliases: ["city", "hostcity", "locationcity"] }
        ]
    },
    Sponsors: {
        labelAliases: ["companyname", "name", "num", "id"],
        duplicates: [
            { label: "Number", aliases: ["num", "number", "id", "internalid"] },
            { label: "Company name", aliases: ["companyname", "name"] }
        ],
        required: [
            { label: "Number", aliases: ["num", "number", "id", "internalid"] },
            { label: "Company name", aliases: ["companyname", "name"] },
            { label: "Description", aliases: ["description", "bio", "about"] },
            { label: "Tier", aliases: ["tier", "level"] },
            { label: "Type", aliases: ["type", "category"] }
        ]
    }
};

const VALIDATOR_ENTRY_SAMPLE_LIMIT = 14;
const btnValidateDatabase = document.getElementById("btn-validate-database");
const validatorModal = document.getElementById("validator-modal");
const validatorSummary = document.getElementById("validator-summary");
const validatorResults = document.getElementById("validator-results");
const validatorDescription = document.getElementById("validator-modal-description");
const validatorSaveNote = document.getElementById("validator-save-note");
const btnCloseValidator = document.getElementById("btn-close-validator");
const btnRerunValidator = document.getElementById("btn-rerun-validator");
const btnDismissValidator = document.getElementById("btn-dismiss-validator");
const btnSaveAnyway = document.getElementById("btn-save-anyway");

let resolveValidatorReview = null;
let validatorActiveFilter = "all";
let validatorSearchTerm = "";
let validatorCurrentResult = null;
let validatorReviewIntent = "manual";
let validatorHoverCard = null;
let validatorReopenAfterEditor = false;
let validatorReopenIntent = "manual";

function getValidationTableName(requestedName) {
    const names = Object.keys(db?.tables || {});
    if (requestedName === "Staff") {
        return names.find(name => ["staff", "staffs"].includes(name.toLowerCase())) || "";
    }
    return names.find(name => name.toLowerCase() === requestedName.toLowerCase()) || "";
}

function getValidationRulesForTableName(tableName) {
    const normalized = String(tableName || "").toLowerCase();
    if (normalized === "staffs") return DATABASE_VALIDATION_RULES.Staff;
    return DATABASE_VALIDATION_RULES[Object.keys(DATABASE_VALIDATION_RULES).find(name => name.toLowerCase() === normalized)] || null;
}

function getValidationColumnIndex(table, aliases) {
    const normalizedAliases = aliases.map(alias => normalizeFieldName(alias));
    return table.header.findIndex(header => normalizedAliases.includes(normalizeFieldName(header)));
}

function normalizeValidationValue(value) {
    return String(value ?? "").trim();
}

function getValidationEntryLabel(table, row, aliases, rowIndex) {
    const index = getValidationColumnIndex(table, aliases);
    const value = index >= 0 ? String(row[index] ?? "").trim() : "";
    return value || `Row ${rowIndex + 1}`;
}

function collectDuplicateValidationIssues(tableName, table, rules) {
    const issues = [];
    (rules.duplicates || []).forEach(rule => {
        const columnIndex = getValidationColumnIndex(table, rule.aliases);
        if (columnIndex < 0) return;
        const groups = new Map();
        table.rows.forEach((row, rowIndex) => {
            const rawValue = String(row[columnIndex] ?? "").trim();
            const value = normalizeValidationValue(rawValue);
            if (!value) return;
            if (!groups.has(value)) groups.set(value, { value: rawValue, rows: [] });
            groups.get(value).rows.push(rowIndex);
        });
        groups.forEach(group => {
            if (group.rows.length < 2) return;
            issues.push({
                type: "duplicate",
                tableName,
                fieldLabel: rule.label,
                value: group.value,
                count: group.rows.length,
                entries: group.rows.map(rowIndex => ({
                    tableName,
                    rowIndex,
                    label: getValidationEntryLabel(table, table.rows[rowIndex], rules.labelAliases, rowIndex)
                }))
            });
        });
    });
    return issues;
}

function collectCompositeDuplicateValidationIssues(tableName, table, rules) {
    const issues = [];
    (rules.compositeDuplicates || []).forEach(rule => {
        const columns = rule.aliases.map(aliasGroup => getValidationColumnIndex(table, aliasGroup));
        if (columns.some(index => index < 0)) return;
        const groups = new Map();
        table.rows.forEach((row, rowIndex) => {
            const parts = columns.map(index => normalizeValidationValue(row[index]));
            if (parts.some(part => !part)) return;
            const value = parts.join(" ");
            if (!groups.has(value)) groups.set(value, { value, rows: [] });
            groups.get(value).rows.push(rowIndex);
        });
        groups.forEach(group => {
            if (group.rows.length < 2) return;
            issues.push({
                type: "duplicate",
                tableName,
                fieldLabel: rule.label,
                value: group.value,
                count: group.rows.length,
                entries: group.rows.map(rowIndex => ({
                    tableName,
                    rowIndex,
                    label: getValidationEntryLabel(table, table.rows[rowIndex], rules.labelAliases, rowIndex)
                }))
            });
        });
    });
    return issues;
}

function collectMissingValidationIssues(tableName, table, rules) {
    const issues = [];
    rules.required.forEach(rule => {
        const columnIndex = getValidationColumnIndex(table, rule.aliases);
        if (columnIndex < 0) {
            issues.push({
                type: "missing-column",
                tableName,
                fieldLabel: rule.label,
                count: 1,
                entries: []
            });
            return;
        }
        const entries = [];
        table.rows.forEach((row, rowIndex) => {
            if (String(row[columnIndex] ?? "").trim()) return;
            entries.push({
                tableName,
                rowIndex,
                label: getValidationEntryLabel(table, row, rules.labelAliases, rowIndex)
            });
        });
        if (!entries.length) return;
        issues.push({
            type: "missing-value",
            tableName,
            fieldLabel: rule.label,
            count: entries.length,
            entries
        });
    });
    return issues;
}

function collectInvalidTeamMapValidationIssues(tableName, table, rules) {
    const issues = [];
    table.header
        .map((label, index) => ({ label, index, name: normalizeFieldName(label) }))
        .filter(field => ["fpmap", "fbmap"].includes(field.name))
        .forEach(field => {
            const entries = [];
            table.rows.forEach((row, rowIndex) => {
                const value = String(row[field.index] ?? "").trim();
                if (!value || normalizeTeamMapValue(value)) return;
                entries.push({
                    tableName,
                    rowIndex,
                    label: getValidationEntryLabel(table, row, rules.labelAliases, rowIndex),
                    value
                });
            });
            if (!entries.length) return;
            issues.push({
                type: "invalid-value",
                tableName,
                fieldLabel: field.label,
                value: entries[0].value,
                count: entries.length,
                entries
            });
        });
    return issues;
}

function isValidationFreeAgentValue(value) {
    return /^(free\s*agent|freeagent|fa|none|no team|unsigned)$/i.test(String(value || "").trim());
}

function collectMissingPlayerTeamValidationIssues(tableName, table, rules) {
    const teamsTableName = getValidationTableName("Teams");
    const teamsTable = teamsTableName ? db.tables[teamsTableName] : null;
    if (!teamsTable) return [];

    const teamReferenceIndex = getValidationColumnIndex(table, ["team", "teamname", "teamid"]);
    if (teamReferenceIndex < 0) return [];

    const validTeams = new Set();
    teamsTable.header
        .map((label, index) => ({ index, name: normalizeFieldName(label) }))
        .filter(field => ["nick", "nickname", "name", "teamname", "teamid", "internalid", "id"].includes(field.name))
        .forEach(field => {
            teamsTable.rows.forEach(row => {
                const value = normalizeValidationValue(row[field.index]);
                if (value) validTeams.add(value);
            });
        });

    const entries = [];
    table.rows.forEach((row, rowIndex) => {
        const value = normalizeValidationValue(row[teamReferenceIndex]);
        if (!value || isValidationFreeAgentValue(value) || validTeams.has(value)) return;
        entries.push({
            tableName,
            rowIndex,
            label: getValidationEntryLabel(table, row, rules.labelAliases, rowIndex),
            value
        });
    });
    if (!entries.length) return [];
    return [{
        type: "invalid-reference",
        tableName,
        fieldLabel: "Team",
        count: entries.length,
        entries
    }];
}

function getValidationFullName(table, row) {
    const firstName = getTableValue(table, row, ["name", "firstname", "forename"]);
    const surname = getTableValue(table, row, ["surname", "lastname"]);
    if (!firstName || !surname) return "";
    return `${firstName} ${surname}`;
}

function collectPlayerStaffDuplicateValidationIssues() {
    const playersTableName = getValidationTableName("Players");
    const staffTableName = getValidationTableName("Staff");
    const playersTable = playersTableName ? db.tables[playersTableName] : null;
    const staffTable = staffTableName ? db.tables[staffTableName] : null;
    if (!playersTable || !staffTable) return [];

    const staffByFullName = new Map();
    staffTable.rows.forEach((row, rowIndex) => {
        const fullName = getValidationFullName(staffTable, row);
        if (!fullName) return;
        if (!staffByFullName.has(fullName)) staffByFullName.set(fullName, []);
        staffByFullName.get(fullName).push({
            tableName: staffTableName,
            rowIndex,
            label: getValidationEntryLabel(staffTable, row, DATABASE_VALIDATION_RULES.Staff.labelAliases, rowIndex)
        });
    });

    const matchesByFullName = new Map();
    playersTable.rows.forEach((row, rowIndex) => {
        const fullName = getValidationFullName(playersTable, row);
        if (!fullName || !staffByFullName.has(fullName)) return;
        if (!matchesByFullName.has(fullName)) {
            matchesByFullName.set(fullName, {
                players: [],
                staff: staffByFullName.get(fullName)
            });
        }
        matchesByFullName.get(fullName).players.push({
            tableName: playersTableName,
            rowIndex,
            label: getValidationEntryLabel(playersTable, row, DATABASE_VALIDATION_RULES.Players.labelAliases, rowIndex)
        });
    });
    return [...matchesByFullName.entries()].map(([fullName, group]) => ({
        type: "duplicate",
        tableName: `${playersTableName} / ${staffTableName}`,
        fieldLabel: "Player/staff full name",
        value: fullName,
        count: group.players.length + group.staff.length,
        entries: [...group.players, ...group.staff]
    }));
}

function validateCurrentDatabase() {
    const issues = [];
    Object.entries(DATABASE_VALIDATION_RULES).forEach(([requestedName, rules]) => {
        const tableName = getValidationTableName(requestedName);
        if (!tableName) {
            issues.push({
                type: "missing-table",
                tableName: requestedName,
                fieldLabel: requestedName,
                count: 1,
                entries: []
            });
            return;
        }
        const table = db.tables[tableName];
        issues.push(...collectDuplicateValidationIssues(tableName, table, rules));
        issues.push(...collectCompositeDuplicateValidationIssues(tableName, table, rules));
        issues.push(...collectMissingValidationIssues(tableName, table, rules));
        if (requestedName === "Teams") issues.push(...collectInvalidTeamMapValidationIssues(tableName, table, rules));
        if (requestedName === "Players") issues.push(...collectMissingPlayerTeamValidationIssues(tableName, table, rules));
    });
    issues.push(...collectPlayerStaffDuplicateValidationIssues());
    const duplicateIssues = issues.filter(issue => issue.type === "duplicate");
    const missingIssues = issues.filter(issue => ["missing-column", "missing-table", "missing-value"].includes(issue.type));
    const invalidIssues = issues.filter(issue => ["invalid-value", "invalid-reference"].includes(issue.type));
    return {
        issues,
        duplicateIssues,
        missingIssues,
        invalidIssues,
        duplicateEntryCount: duplicateIssues.reduce((total, issue) => total + issue.count, 0),
        missingValueCount: missingIssues.reduce((total, issue) => total + issue.count, 0),
        invalidValueCount: invalidIssues.reduce((total, issue) => total + issue.count, 0),
        affectedTables: new Set(issues.map(issue => issue.tableName)).size,
        hasIssues: issues.length > 0
    };
}

function createValidatorSummaryItem(value, label, tone = "") {
    const item = document.createElement("span");
    if (tone) item.classList.add(tone);
    const strong = document.createElement("strong");
    strong.textContent = String(value);
    const caption = document.createElement("small");
    caption.textContent = label;
    item.append(strong, caption);
    return item;
}

function getValidatorIssueMessage(issue) {
    if (issue.type === "duplicate") {
        return `${issue.count} entries share ${issue.fieldLabel} "${issue.value}".`;
    }
    if (issue.type === "missing-column") {
        return `The ${issue.fieldLabel} column is missing from this table.`;
    }
    if (issue.type === "missing-table") {
        return `The ${issue.tableName} table is missing from this database.`;
    }
    if (issue.type === "invalid-value") {
        return `${issue.count} ${issue.count === 1 ? "entry has" : "entries have"} an invalid ${issue.fieldLabel} value.`;
    }
    if (issue.type === "invalid-reference") {
        return `${issue.count} ${issue.count === 1 ? "player is" : "players are"} assigned to a non-existent team.`;
    }
    return `${issue.count} ${issue.count === 1 ? "entry is" : "entries are"} missing ${issue.fieldLabel}.`;
}

function getValidatorIssueCategory(issue) {
    if (issue.type === "duplicate") return "duplicates";
    if (["invalid-value", "invalid-reference"].includes(issue.type)) return "invalid";
    return "missing";
}

function getValidatorEntryTableName(issue, entry) {
    if (entry?.tableName && db?.tables?.[entry.tableName]) return entry.tableName;
    if (db?.tables?.[issue.tableName]) return issue.tableName;
    return "";
}

function getValidatorEntryRow(issue, entry) {
    const tableName = getValidatorEntryTableName(issue, entry);
    const table = tableName ? db.tables[tableName] : null;
    if (!table || entry.rowIndex < 0 || entry.rowIndex >= table.rows.length) return null;
    return { tableName, table, row: table.rows[entry.rowIndex] };
}

function getValidatorEntryDetailRows(tableName, table, row) {
    const normalizedTable = tableName.toLowerCase();
    const shared = [
        ["Internal ID", ["internalid", "playerid", "staffid", "id"]],
        ["Name", ["nickname", "nick", "name", "companyname", "title"]],
        ["Country", ["country", "nationality"]],
        ["Rating", ["rating", "overall", "ers"]]
    ];
    const byTable = {
        players: [["Full name", ["name", "firstname", "forename"]], ["Surname", ["surname", "lastname"]], ["Team", ["team", "teamname", "teamid"]], ["Role", ["role1", "primaryrole", "role"]]],
        staff: [["Full name", ["name", "firstname", "forename"]], ["Surname", ["surname", "lastname"]], ["Team", ["team", "teamname", "teamid"]], ["Role", ["role", "job", "type", "position"]]],
        staffs: [["Full name", ["name", "firstname", "forename"]], ["Surname", ["surname", "lastname"]], ["Team", ["team", "teamname", "teamid"]], ["Role", ["role", "job", "type", "position"]]],
        teams: [["Nickname", ["nick", "nickname"]], ["Team name", ["name", "teamname"]], ["ERS", ["ers", "erspoints", "rating"]]],
        tournaments: [["Tournament", ["name", "tournamentname", "title"]], ["Tier", ["tier"]], ["Prize", ["prizefund", "prizemoney"]], ["City", ["city", "hostcity"]]],
        sponsors: [["Company", ["companyname", "name"]], ["Tier", ["tier", "level"]], ["Type", ["type", "category"]]]
    };
    return [...(byTable[normalizedTable] || []), ...shared]
        .map(([label, aliases]) => [label, getTableValue(table, row, aliases)])
        .filter(([, value], index, list) => value && list.findIndex(([, other]) => other === value) === index)
        .slice(0, 7);
}

function removeValidatorHoverCard() {
    if (!validatorHoverCard) return;
    validatorHoverCard.remove();
    validatorHoverCard = null;
}

function positionValidatorHoverCard(event) {
    if (!validatorHoverCard) return;
    const margin = 14;
    const rect = validatorHoverCard.getBoundingClientRect();
    let left = event.clientX + margin;
    let top = event.clientY + margin;
    if (left + rect.width > window.innerWidth - margin) left = event.clientX - rect.width - margin;
    if (top + rect.height > window.innerHeight - margin) top = window.innerHeight - rect.height - margin;
    validatorHoverCard.style.left = `${Math.max(margin, left)}px`;
    validatorHoverCard.style.top = `${Math.max(margin, top)}px`;
}

function showValidatorHoverCard(event, issue, entry) {
    const details = getValidatorEntryRow(issue, entry);
    if (!details) return;
    removeValidatorHoverCard();
    const { tableName, table, row } = details;
    const card = document.createElement("aside");
    card.className = "validator-hover-card";
    const portrait = document.createElement("div");
    portrait.className = "validator-hover-portrait";
    portrait.textContent = "No image";
    if (typeof getBundledAssetCandidates === "function" && typeof loadFirstAvailableImage === "function") {
        loadFirstAvailableImage(portrait, getBundledAssetCandidates(tableName, row), "No image");
    }
    const body = document.createElement("div");
    body.className = "validator-hover-body";
    const label = document.createElement("strong");
    label.textContent = getValidationEntryLabel(table, row, getValidationRulesForTableName(tableName)?.labelAliases || ["nickname", "nick", "name"], entry.rowIndex);
    const meta = document.createElement("span");
    meta.textContent = `${tableName} - row ${entry.rowIndex + 1}`;
    const fields = document.createElement("dl");
    getValidatorEntryDetailRows(tableName, table, row).forEach(([fieldLabel, value]) => {
        const dt = document.createElement("dt");
        dt.textContent = fieldLabel;
        const dd = document.createElement("dd");
        dd.textContent = value;
        fields.append(dt, dd);
    });
    body.append(label, meta, fields);
    card.append(portrait, body);
    document.body.appendChild(card);
    validatorHoverCard = card;
    positionValidatorHoverCard(event);
}

function openValidatorEntryEditor(issue, entry) {
    const details = getValidatorEntryRow(issue, entry);
    if (!details) return;
    validatorReopenAfterEditor = true;
    validatorReopenIntent = validatorReviewIntent;
    closeValidatorReview(false);
    switchTab(details.tableName);
    openEditor(entry.rowIndex);
}

async function deleteValidatorEntry(issue, entry) {
    const details = getValidatorEntryRow(issue, entry);
    if (!details) return;
    const { tableName, table, row } = details;
    const label = getValidationEntryLabel(table, row, getValidationRulesForTableName(tableName)?.labelAliases || ["nickname", "nick", "name"], entry.rowIndex);
    const confirmed = typeof requestConfirmation === "function"
        ? await requestConfirmation({
            context: "Validator cleanup",
            title: `DELETE ${label}?`,
            message: `This removes ${label} from ${tableName} row ${entry.rowIndex + 1}. Save the .emdb afterwards to keep the change.`,
            cancelLabel: "Keep record",
            acceptLabel: "Delete record",
            danger: true
        })
        : false;
    if (!confirmed) return;
    removeValidatorHoverCard();
    const assetKey = typeof getAssetKey === "function" ? getAssetKey(tableName, row) : "";
    if (assetKey && typeof AssetDB !== "undefined") {
        await AssetDB.remove(assetKey).catch(error => console.error("Unable to remove local asset for deleted validator entry", error));
    }
    if (tableName.toLowerCase() === "players" && typeof setContentCreatorPlayer === "function") {
        setContentCreatorPlayer(tableName, row, entry.rowIndex, false);
    }
    table.rows.splice(entry.rowIndex, 1);
    invalidatePlayerLeaderboardRanks(tableName);
    updateTabCount(tableName);
    markUnsavedChanges();
    if (activeTab === tableName) renderTable(tableName);
    setStatus(`Deleted ${label} from ${tableName}.`, "success");
    const nextResult = refreshValidatorReview({ announce: false }) || validateCurrentDatabase();
    if (!nextResult.hasIssues) {
        closeValidatorReview(validatorReviewIntent === "save");
        setStatus("Validation passed after cleanup.", "success");
        return;
    }
}

function createValidatorEntryChip(issue, entry) {
    const details = getValidatorEntryRow(issue, entry);
    const rowText = `#${entry.rowIndex + 1}`;
    const item = document.createElement("div");
    item.className = "validator-entry-chip";
    const open = document.createElement("button");
    open.type = "button";
    open.className = "validator-entry-open";
    open.textContent = entry.value
        ? `${entry.label} -> ${entry.value} (${rowText})`
        : `${entry.label} (${rowText})`;
    if (details) {
        open.addEventListener("mouseenter", event => showValidatorHoverCard(event, issue, entry));
        open.addEventListener("mousemove", positionValidatorHoverCard);
        open.addEventListener("mouseleave", removeValidatorHoverCard);
        open.addEventListener("focus", event => showValidatorHoverCard(event, issue, entry));
        open.addEventListener("blur", removeValidatorHoverCard);
        open.addEventListener("click", () => openValidatorEntryEditor(issue, entry));
    } else {
        open.disabled = true;
    }
    const actions = document.createElement("span");
    actions.className = "validator-entry-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "Edit";
    edit.disabled = !details;
    edit.addEventListener("click", () => openValidatorEntryEditor(issue, entry));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Delete";
    remove.disabled = !details;
    remove.addEventListener("click", () => deleteValidatorEntry(issue, entry));
    actions.append(edit, remove);
    item.append(open, actions);
    return item;
}

function createValidatorIssueRow(issue) {
    const item = document.createElement("article");
    item.className = `validator-issue validator-issue-${issue.type}`;
    const badge = document.createElement("span");
    badge.className = "validator-issue-badge";
    badge.textContent = issue.type === "duplicate"
        ? "Duplicate"
        : ["invalid-value", "invalid-reference"].includes(issue.type)
            ? "Invalid"
            : "Missing";
    const body = document.createElement("div");
    const message = document.createElement("strong");
    message.textContent = getValidatorIssueMessage(issue);
    const meta = document.createElement("small");
    meta.textContent = issue.type === "duplicate"
        ? `${issue.fieldLabel} should normally identify one entry.`
        : issue.type === "invalid-reference"
            ? "Player team values must exactly match an existing team nickname or name."
            : issue.type === "invalid-value"
            ? "This value must match one of the game's supported raw values."
            : "This field is important for identifying or using the entry in-game.";
    body.append(message, meta);
    if (issue.entries.length) {
        const entries = document.createElement("div");
        entries.className = "validator-entry-samples";
        issue.entries.slice(0, VALIDATOR_ENTRY_SAMPLE_LIMIT).forEach(entry => {
            entries.appendChild(createValidatorEntryChip(issue, entry));
        });
        if (issue.entries.length > VALIDATOR_ENTRY_SAMPLE_LIMIT) {
            const remaining = document.createElement("span");
            remaining.className = "validator-entry-more";
            const hiddenCount = issue.entries.length - VALIDATOR_ENTRY_SAMPLE_LIMIT;
            remaining.textContent = `Showing ${VALIDATOR_ENTRY_SAMPLE_LIMIT} of ${issue.entries.length} affected records. ${hiddenCount} more are hidden to keep this list usable. Search above to narrow it down.`;
            entries.appendChild(remaining);
        }
        body.appendChild(entries);
    }
    item.append(badge, body);
    return item;
}

function issueMatchesValidatorFilters(issue) {
    if (validatorActiveFilter !== "all" && getValidatorIssueCategory(issue) !== validatorActiveFilter) return false;
    const search = validatorSearchTerm.trim().toLowerCase();
    if (!search) return true;
    const haystack = [
        issue.tableName,
        issue.fieldLabel,
        issue.value,
        getValidatorIssueMessage(issue),
        ...issue.entries.flatMap(entry => [entry.label, entry.value, entry.tableName])
    ].join(" ").toLowerCase();
    return haystack.includes(search);
}

function createValidatorToolbar(result, filteredIssues) {
    const toolbar = document.createElement("div");
    toolbar.className = "validator-toolbar";
    const filters = document.createElement("div");
    filters.className = "validator-filter-tabs";
    [
        ["all", "All", result.issues.length],
        ["duplicates", "Duplicates", result.duplicateIssues.length],
        ["missing", "Missing", result.missingIssues.length],
        ["invalid", "Invalid", result.invalidIssues.length]
    ].forEach(([value, label, count]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.classList.toggle("active", validatorActiveFilter === value);
        button.textContent = `${label} ${count}`;
        button.addEventListener("click", () => {
            validatorActiveFilter = value;
            renderValidatorResults(result);
        });
        filters.appendChild(button);
    });
    const search = document.createElement("input");
    search.type = "search";
    search.placeholder = "Search findings...";
    search.value = validatorSearchTerm;
    search.addEventListener("input", () => {
        validatorSearchTerm = search.value;
        const cursorPosition = search.selectionStart ?? validatorSearchTerm.length;
        renderValidatorResults(result);
        const nextSearch = validatorResults.querySelector(".validator-toolbar input");
        nextSearch?.focus();
        nextSearch?.setSelectionRange(cursorPosition, cursorPosition);
    });
    const tools = document.createElement("div");
    tools.className = "validator-toolbar-actions";
    const collapse = document.createElement("button");
    collapse.type = "button";
    collapse.textContent = "Collapse all";
    collapse.addEventListener("click", () => validatorResults.querySelectorAll(".validator-table-group").forEach(group => { group.open = false; }));
    const expand = document.createElement("button");
    expand.type = "button";
    expand.textContent = "Expand all";
    expand.addEventListener("click", () => validatorResults.querySelectorAll(".validator-table-group").forEach(group => { group.open = true; }));
    const status = document.createElement("span");
    status.textContent = `${filteredIssues.length} visible`;
    tools.append(status, collapse, expand);
    toolbar.append(filters, search, tools);
    return toolbar;
}

function renderValidatorResults(result) {
    removeValidatorHoverCard();
    validatorCurrentResult = result;
    validatorSummary.replaceChildren(
        createValidatorSummaryItem(result.duplicateIssues.length, "duplicate groups", "is-duplicate"),
        createValidatorSummaryItem(result.missingValueCount, "missing values", "is-missing"),
        createValidatorSummaryItem(result.invalidValueCount, "invalid values", "is-invalid"),
        createValidatorSummaryItem(result.affectedTables, "tables affected")
    );
    validatorResults.innerHTML = "";
    const filteredIssues = result.issues.filter(issueMatchesValidatorFilters);
    validatorResults.appendChild(createValidatorToolbar(result, filteredIssues));
    if (!filteredIssues.length) {
        const empty = document.createElement("div");
        empty.className = "validator-empty";
        empty.textContent = result.hasIssues
            ? "No findings match the current filter."
            : "Validation is clean for the loaded database.";
        validatorResults.appendChild(empty);
        return;
    }
    const grouped = new Map();
    filteredIssues.forEach(issue => {
        if (!grouped.has(issue.tableName)) grouped.set(issue.tableName, []);
        grouped.get(issue.tableName).push(issue);
    });
    grouped.forEach((issues, tableName) => {
        const section = document.createElement("details");
        section.className = "validator-table-group";
        section.open = true;
        const heading = document.createElement("summary");
        const label = document.createElement("strong");
        label.textContent = tableName;
        const count = document.createElement("span");
        count.textContent = `${issues.length} ${issues.length === 1 ? "finding" : "findings"}`;
        heading.append(label, count);
        const list = document.createElement("div");
        list.className = "validator-issue-list";
        issues
            .sort((a, b) => a.type.localeCompare(b.type) || a.fieldLabel.localeCompare(b.fieldLabel))
            .forEach(issue => list.appendChild(createValidatorIssueRow(issue)));
        section.append(heading, list);
        validatorResults.appendChild(section);
    });
}

function closeValidatorReview(continueSaving = false) {
    if (validatorModal.hidden) return;
    removeValidatorHoverCard();
    validatorModal.hidden = true;
    const resolve = resolveValidatorReview;
    resolveValidatorReview = null;
    if (resolve) resolve(continueSaving);
}

function showValidatorReview(result, intent = "manual") {
    const saving = intent === "save";
    validatorReviewIntent = intent;
    validatorActiveFilter = "all";
    validatorSearchTerm = "";
    renderValidatorResults(result);
    if (!result.hasIssues) {
        validatorDescription.textContent = "NoScope did not find duplicate entries or missing important fields.";
        validatorSaveNote.textContent = "The loaded database is clean according to the current validator rules.";
    } else {
        validatorDescription.textContent = saving
            ? "NoScope found possible problems. Review them before deciding whether to save this database."
            : "NoScope found possible duplicate entries or missing important fields.";
        validatorSaveNote.textContent = saving
            ? "Use record actions to clean up issues, or save anyway to keep every value exactly as it is."
            : "Record actions apply to the loaded database immediately and still require saving.";
    }
    btnDismissValidator.textContent = saving ? "Return to editor" : "Close";
    btnSaveAnyway.hidden = !saving || !result.hasIssues;
    validatorModal.hidden = false;
    btnDismissValidator.focus();
    return new Promise(resolve => {
        resolveValidatorReview = resolve;
    });
}

function refreshValidatorReview(options = {}) {
    if (!db?.tables || !Object.keys(db.tables).length) return null;
    const { announce = true } = options;
    const result = validateCurrentDatabase();
    renderValidatorResults(result);
    const saving = validatorReviewIntent === "save";
    if (!result.hasIssues) {
        validatorDescription.textContent = "NoScope did not find duplicate entries or missing important fields.";
        validatorSaveNote.textContent = "The loaded database is clean according to the current validator rules.";
        btnSaveAnyway.hidden = true;
    } else {
        validatorDescription.textContent = saving
            ? "NoScope found possible problems. Review them before deciding whether to save this database."
            : "NoScope found possible duplicate entries or missing important fields.";
        validatorSaveNote.textContent = saving
            ? "Use record actions to clean up issues, or save anyway to keep every value exactly as it is."
            : "Record actions apply to the loaded database immediately and still require saving.";
        btnSaveAnyway.hidden = !saving;
    }
    if (announce) {
        if (result.hasIssues) {
            const findingCount = result.issues.length;
            setStatus(`Validation rerun found ${findingCount} ${findingCount === 1 ? "issue" : "issues"}.`, "error");
        } else {
            setStatus("Validation passed. No duplicate entries or missing important fields found.", "success");
        }
    }
    return result;
}

function resumeValidatorAfterEditor(options = {}) {
    if (!validatorReopenAfterEditor) return false;
    const { rerun = false } = options;
    const intent = validatorReopenIntent;
    validatorReopenAfterEditor = false;
    validatorReopenIntent = "manual";
    if (rerun) {
        const result = validateCurrentDatabase();
        if (!result.hasIssues) {
            setStatus("Validation passed after edit.", "success");
            showValidatorReview(result, "manual");
            return true;
        }
        const findingCount = result.issues.length;
        setStatus(`Validation found ${findingCount} ${findingCount === 1 ? "issue" : "issues"} after edit.`, "error");
        showValidatorReview(result, intent);
        return true;
    }
    if (validatorCurrentResult) {
        showValidatorReview(validatorCurrentResult, intent);
        return true;
    }
    const result = validateCurrentDatabase();
    showValidatorReview(result, intent);
    return true;
}

async function validateDatabaseBeforeSave() {
    const result = validateCurrentDatabase();
    if (!result.hasIssues) return true;
    const findingCount = result.issues.length;
    setStatus(`Validation found ${findingCount} ${findingCount === 1 ? "issue" : "issues"}.`, "error");
    return showValidatorReview(result, "save");
}

function updateValidatorAvailability() {
    btnValidateDatabase.disabled = !Boolean(db?.tables && Object.keys(db.tables).length);
}

btnValidateDatabase.addEventListener("click", async () => {
    const result = validateCurrentDatabase();
    if (!result.hasIssues) {
        setStatus("Validation passed. No duplicate entries or missing important fields found.", "success");
        return;
    }
    const findingCount = result.issues.length;
    setStatus(`Validation found ${findingCount} ${findingCount === 1 ? "issue" : "issues"}.`, "error");
    await showValidatorReview(result, "manual");
});

btnCloseValidator.addEventListener("click", () => closeValidatorReview(false));
btnRerunValidator.addEventListener("click", () => refreshValidatorReview());
btnDismissValidator.addEventListener("click", () => closeValidatorReview(false));
btnSaveAnyway.addEventListener("click", () => closeValidatorReview(true));
validatorModal.addEventListener("click", event => {
    if (event.target === validatorModal) closeValidatorReview(false);
});
document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !validatorModal.hidden) closeValidatorReview(false);
});
