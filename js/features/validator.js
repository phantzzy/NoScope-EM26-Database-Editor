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

const VALIDATOR_ENTRY_SAMPLE_LIMIT = 12;
const btnValidateDatabase = document.getElementById("btn-validate-database");
const validatorModal = document.getElementById("validator-modal");
const validatorSummary = document.getElementById("validator-summary");
const validatorResults = document.getElementById("validator-results");
const validatorDescription = document.getElementById("validator-modal-description");
const validatorSaveNote = document.getElementById("validator-save-note");
const btnCloseValidator = document.getElementById("btn-close-validator");
const btnDismissValidator = document.getElementById("btn-dismiss-validator");
const btnSaveAnyway = document.getElementById("btn-save-anyway");

let resolveValidatorReview = null;

function getValidationTableName(requestedName) {
    const names = Object.keys(db?.tables || {});
    if (requestedName === "Staff") {
        return names.find(name => ["staff", "staffs"].includes(name.toLowerCase())) || "";
    }
    return names.find(name => name.toLowerCase() === requestedName.toLowerCase()) || "";
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
            rowIndex,
            label: getValidationEntryLabel(staffTable, row, DATABASE_VALIDATION_RULES.Staff.labelAliases, rowIndex)
        });
    });

    const matchesByFullName = new Map();
    playersTable.rows.forEach((row, rowIndex) => {
        const fullName = getValidationFullName(playersTable, row);
        if (!fullName || !staffByFullName.has(fullName)) return;
        if (!matchesByFullName.has(fullName)) matchesByFullName.set(fullName, []);
        staffByFullName.get(fullName).forEach(staffEntry => {
            matchesByFullName.get(fullName).push({
                rowIndex,
                label: getValidationEntryLabel(playersTable, row, DATABASE_VALIDATION_RULES.Players.labelAliases, rowIndex),
                value: `${fullName} matches staff ${staffEntry.label} (#${staffEntry.rowIndex + 1})`
            });
        });
    });
    return [...matchesByFullName.entries()].map(([fullName, entries]) => ({
        type: "duplicate",
        tableName: `${playersTableName} / ${staffTableName}`,
        fieldLabel: "Player/staff full name",
        value: fullName,
        count: entries.length,
        entries
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
            const sample = document.createElement("span");
            sample.textContent = entry.value
                ? `${entry.label} -> ${entry.value} (#${entry.rowIndex + 1})`
                : `${entry.label} (#${entry.rowIndex + 1})`;
            entries.appendChild(sample);
        });
        if (issue.entries.length > VALIDATOR_ENTRY_SAMPLE_LIMIT) {
            const remaining = document.createElement("span");
            remaining.className = "validator-entry-more";
            remaining.textContent = `+${issue.entries.length - VALIDATOR_ENTRY_SAMPLE_LIMIT} more`;
            entries.appendChild(remaining);
        }
        body.appendChild(entries);
    }
    item.append(badge, body);
    return item;
}

function renderValidatorResults(result) {
    validatorSummary.replaceChildren(
        createValidatorSummaryItem(result.duplicateIssues.length, "duplicate groups", "is-duplicate"),
        createValidatorSummaryItem(result.missingValueCount, "missing values", "is-missing"),
        createValidatorSummaryItem(result.invalidValueCount, "invalid values", "is-invalid"),
        createValidatorSummaryItem(result.affectedTables, "tables affected")
    );
    validatorResults.innerHTML = "";
    const grouped = new Map();
    result.issues.forEach(issue => {
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
    validatorModal.hidden = true;
    const resolve = resolveValidatorReview;
    resolveValidatorReview = null;
    if (resolve) resolve(continueSaving);
}

function showValidatorReview(result, intent = "manual") {
    const saving = intent === "save";
    renderValidatorResults(result);
    validatorDescription.textContent = saving
        ? "NoScope found possible problems. Review them before deciding whether to save this database."
        : "NoScope found possible duplicate entries or missing important fields.";
    validatorSaveNote.textContent = saving
        ? "Saving anyway keeps every value exactly as it is."
        : "The validator does not change database values.";
    btnDismissValidator.textContent = saving ? "Return to editor" : "Close";
    btnSaveAnyway.hidden = !saving;
    validatorModal.hidden = false;
    btnDismissValidator.focus();
    return new Promise(resolve => {
        resolveValidatorReview = resolve;
    });
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
btnDismissValidator.addEventListener("click", () => closeValidatorReview(false));
btnSaveAnyway.addEventListener("click", () => closeValidatorReview(true));
validatorModal.addEventListener("click", event => {
    if (event.target === validatorModal) closeValidatorReview(false);
});
document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !validatorModal.hidden) closeValidatorReview(false);
});
