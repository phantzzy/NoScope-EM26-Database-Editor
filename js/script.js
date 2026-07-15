
const AES_KEY_HEX = "E47A2C9F01D85B33A6F27EC4980D4B613EB5792ADF148C506FC3279105E6BA48";
const TABLE_FILES = ["Players.csv", "Sponsors.csv", "Staff.csv", "Teams.csv", "Tournaments.csv"];
const ROSTER_FILE = "roster_order.json";
const PAGE_SIZE = 25;
const DEFAULT_DB_FILE = "MostUpdatedDB.emdb";
const DEFAULT_DB_PATH = `data/${DEFAULT_DB_FILE}`;

// State
let db = {
    tables: {},
    roster_order: null,
    fileName: ""
};
let activeTab = null;
let editingRowIndex = -1;
let editingIsNew = false;
let currentPage = 1;
let searchTerm = "";
let viewMode = "grid";
const filtersByTable = {};
let editorPage = "general";
let statsPage = "gameplay";
let editDraft = [];
let currentAssetKey = null;
let pendingAsset = undefined;

// UI Elements
const btnOpen = document.getElementById("btn-open");
const btnLoadDefault = document.getElementById("btn-load-default");
const btnOpenFolder = document.getElementById("btn-open-folder");
const fileInput = document.getElementById("file-input");
const folderInput = document.getElementById("folder-input");
const btnSave = document.getElementById("btn-save");
const btnExportCsvs = document.getElementById("btn-export-csvs");
const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const emptyState = document.getElementById("empty-state");
const editorArea = document.getElementById("editor-area");
const tabsContainer = document.getElementById("tabs");
const tableContainer = document.getElementById("table-container");
const editModal = document.getElementById("edit-modal");
const editForm = document.getElementById("edit-form");
const editFormFields = document.getElementById("edit-form-fields");
const pagination = document.getElementById("pagination");
const editorNav = document.getElementById("editor-nav");
const statsNav = document.getElementById("stats-nav");
const editorPageTitle = document.getElementById("editor-page-title");
const editorPageDescription = document.getElementById("editor-page-description");
const editorFieldCount = document.getElementById("editor-field-count");
const assetEditor = document.getElementById("asset-editor");
const assetPreview = document.getElementById("asset-preview");
const assetFileInput = document.getElementById("asset-file-input");
const btnRemoveAsset = document.getElementById("btn-remove-asset");
const btnCopyAssetLink = document.getElementById("btn-copy-asset-link");
const btnSubmitEdit = document.getElementById("btn-submit-edit");

// The rest of UI Elements inside editor-area will be handled by IDs directly
const btnAddRow = document.getElementById("btn-add-row");
const btnDeleteRow = document.getElementById("btn-delete-row");
const searchInput = document.getElementById("search-input");
const btnSearch = document.getElementById("btn-search");
const btnGridView = document.getElementById("btn-grid-view");
const btnListView = document.getElementById("btn-list-view");
const btnFilter = document.getElementById("btn-filter");
const filterModal = document.getElementById("filter-modal");
const filterModalContent = document.getElementById("filter-modal-content");
const filterModalTitle = document.getElementById("filter-modal-title");
const btnCloseFilter = document.getElementById("btn-close-filter");
const btnCancelFilter = document.getElementById("btn-cancel-filter");
const btnClearFilters = document.getElementById("btn-clear-filters");
const btnApplyFilters = document.getElementById("btn-apply-filters");
const btnCompare = document.getElementById("btn-compare");
const compareModal = document.getElementById("compare-modal");
const comparePlayerOne = document.getElementById("compare-player-one");
const comparePlayerTwo = document.getElementById("compare-player-two");
const compareSearchOne = document.getElementById("compare-search-one");
const compareSearchTwo = document.getElementById("compare-search-two");
const compareContent = document.getElementById("compare-content");
const btnCloseCompare = document.getElementById("btn-close-compare");
const btnCloseCompareFooter = document.getElementById("btn-close-compare-footer");

// Crypto Helpers
function hexToUint8Array(hexString) {
    const bytes = new Uint8Array(Math.ceil(hexString.length / 2));
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hexString.substr(i * 2, 2), 16);
    }
    return bytes;
}

async function getCryptoKey() {
    const keyBytes = hexToUint8Array(AES_KEY_HEX);
    return await window.crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"]
    );
}

async function decryptEMDB(arrayBuffer) {
    const data = new Uint8Array(arrayBuffer);
    
    const magic = new TextDecoder().decode(data.slice(0, 4));
    if (magic !== "EMDB") {
        throw new Error("Invalid .emdb file (bad magic bytes).");
    }
    
    const iv = data.slice(5, 17);
    const ciphertextAndTag = data.slice(17);
    
    const key = await getCryptoKey();
    
    const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        ciphertextAndTag
    );
    return decryptedBuffer;
}

async function encryptEMDB(zipArrayBuffer) {
    const key = await getCryptoKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const ciphertextAndTagBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        zipArrayBuffer
    );
    
    const ciphertextAndTag = new Uint8Array(ciphertextAndTagBuffer);
    
    const magic = new TextEncoder().encode("EMDB");
    const result = new Uint8Array(4 + 1 + 12 + ciphertextAndTag.length);
    
    result.set(magic, 0);
    result.set([3], 4); 
    result.set(iv, 5);
    result.set(ciphertextAndTag, 17);
    
    return result;
}

// Open EMDB
btnOpen.addEventListener("click", () => {
    fileInput.click();
});

async function loadEMDBFile(file) {
    setStatus("Loading...", "loading");
    db.fileName = file.name;
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        const decryptedZipBuffer = await decryptEMDB(arrayBuffer);
        
        const jszip = new JSZip();
        const zip = await jszip.loadAsync(decryptedZipBuffer);
        
        db.tables = {};
        for (const fname of TABLE_FILES) {
            const tableName = fname.replace(".csv", "");
            const fileObj = zip.file(fname);
            if (fileObj) {
                const text = await fileObj.async("text");
                const parsed = Papa.parse(text, { skipEmptyLines: true });
                db.tables[tableName] = {
                    header: parsed.data[0] || [],
                    rows: parsed.data.slice(1) || []
                };
            }
        }
        
        const rosterObj = zip.file(ROSTER_FILE);
        if (rosterObj) {
            const text = await rosterObj.async("text");
            db.roster_order = JSON.parse(text);
        }
        
        setStatus(`Loaded: ${file.name}`, "success");
        btnSave.disabled = false;
        btnExportCsvs.disabled = false;
        
        buildUI();
        
    } catch (err) {
        console.error(err);
        setStatus("Error opening file.", "error");
        alert(err.message);
    }
    
}

fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await loadEMDBFile(file);
    fileInput.value = "";
});

btnLoadDefault.addEventListener("click", async () => {
    btnLoadDefault.disabled = true;
    try {
        const response = await fetch(DEFAULT_DB_PATH, { cache: "no-store" });
        if (!response.ok) throw new Error(`Default database request failed (${response.status})`);
        const blob = await response.blob();
        await loadEMDBFile(new File([blob], DEFAULT_DB_FILE, { type: "application/octet-stream" }));
    } catch (error) {
        console.error(error);
        setStatus("Unable to load default database.", "error");
        alert("The default database could not be loaded. Run NoScope through its local web server or app runtime, then try again.");
    } finally {
        btnLoadDefault.disabled = false;
    }
});

// Open CSV Folder (Fallback using input type file)
btnOpenFolder.addEventListener("click", () => {
    folderInput.click();
});

folderInput.addEventListener("change", async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setStatus("Loading folder...", "loading");
    db.tables = {};
    
    try {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fname = file.name;
            
            if (TABLE_FILES.includes(fname)) {
                const tableName = fname.replace(".csv", "");
                const text = await file.text();
                const parsed = Papa.parse(text, { skipEmptyLines: true });
                db.tables[tableName] = {
                    header: parsed.data[0] || [],
                    rows: parsed.data.slice(1) || []
                };
            }
            
            if (fname === ROSTER_FILE) {
                const text = await file.text();
                db.roster_order = JSON.parse(text);
            }
        }
        
        const pathParts = files[0].webkitRelativePath.split('/');
        const folderName = pathParts.length > 1 ? pathParts[0] : "Folder";
        
        setStatus(`Loaded folder: ${folderName}`, "success");
        btnSave.disabled = false;
        btnExportCsvs.disabled = false;
        db.fileName = "";
        
        buildUI();
    } catch (err) {
        console.error(err);
        setStatus("Error opening folder.", "error");
        alert(err.message);
    }
    
    folderInput.value = "";
});

function setStatus(text, type) {
    statusText.textContent = text;
    statusDot.className = "status-dot";
    if (type) statusDot.classList.add(type);
}

// UI Building
function buildUI() {
    emptyState.style.display = "none";
    editorArea.style.display = "flex";
    
    tabsContainer.innerHTML = "";
    
    const tableNames = Object.keys(db.tables);
    const tabIcons = { Players: "◎", Teams: "◆", Staff: "◇", Sponsors: "$", Tournaments: "★" };
    tableNames.forEach((name, index) => {
        const tab = document.createElement("div");
        tab.className = "tab";
        const rowCount = db.tables[name].rows.length;
        tab.dataset.table = name;
        const backdrop = document.createElement("span");
        backdrop.className = "tab-backdrop";
        const icon = document.createElement("span");
        icon.className = "tab-icon";
        icon.textContent = tabIcons[name] || "◇";
        const body = document.createElement("span");
        body.className = "tab-body";
        const label = document.createElement("strong");
        label.textContent = name;
        const count = document.createElement("small");
        count.textContent = `${rowCount} records`;
        body.append(label, count);
        const arrow = document.createElement("span");
        arrow.className = "tab-arrow";
        arrow.textContent = "›";
        tab.append(backdrop, icon, body, arrow);
        
        tab.addEventListener("click", () => switchTab(name));
        tabsContainer.appendChild(tab);
        
        if (index === 0) {
            switchTab(name);
        }
    });
}

function switchTab(tableName) {
    activeTab = tableName;
    currentPage = 1;
    
    document.querySelectorAll(".tab").forEach(t => {
        if (t.dataset.table === tableName) t.classList.add("active");
        else t.classList.remove("active");
    });
    updateFilterButton();
    btnCompare.hidden = tableName.toLowerCase() !== "players";
    renderTable(tableName);
}

let selectedRowElement = null;
let selectedRowIndex = -1;

function renderTable(tableName) {
    const tableData = db.tables[tableName];
    tableContainer.innerHTML = "";
    selectedRowElement = null;
    selectedRowIndex = -1;
    
    if(!tableData) return;

    const filteredRows = tableData.rows
        .map((row, originalIndex) => ({ row, originalIndex }))
        .filter(entry => !searchTerm || entry.row.some(value => String(value ?? "").toLowerCase().includes(searchTerm)))
        .filter(entry => rowMatchesFilters(entry.row, filtersByTable[tableName] || {}));
    const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
    currentPage = Math.min(Math.max(currentPage, 1), pageCount);
    const pageStart = (currentPage - 1) * PAGE_SIZE;
    const pageRows = filteredRows.slice(pageStart, pageStart + PAGE_SIZE);
    const content = viewMode === "list" ? createListView(tableName, pageRows) : document.createElement("div");
    if (viewMode === "grid") {
        content.className = "record-grid";
        pageRows.forEach(({ row, originalIndex }) => content.appendChild(createRowElement(row, originalIndex)));
    }
    if (!filteredRows.length) {
        const noResults = document.createElement("div");
        noResults.className = "search-no-results";
        noResults.textContent = searchInput.value.trim()
            ? `No ${tableName.toLowerCase()} match “${searchInput.value.trim()}”.`
            : `No ${tableName.toLowerCase()} match the current filters.`;
        content.appendChild(noResults);
    }
    tableContainer.appendChild(content);
    renderPagination(filteredRows.length);
}

function createListView(tableName, entries) {
    const wrap = document.createElement("div");
    wrap.className = "list-table-wrap";
    if (!entries.length) return wrap;
    const table = document.createElement("table");
    table.className = `entry-list-table${tableName.toLowerCase() === "players" ? " player-list-table" : ""}`;
    if (tableName.toLowerCase() === "players") buildPlayerListTable(table, entries);
    else buildGenericListTable(table, tableName, entries);
    wrap.appendChild(table);
    return wrap;
}

function appendListHeader(table, labels) {
    const head = document.createElement("thead");
    const row = document.createElement("tr");
    labels.forEach(label => {
        const cell = document.createElement("th");
        cell.textContent = label;
        row.appendChild(cell);
    });
    head.appendChild(row);
    table.appendChild(head);
}

function createListStatCell(row, aliases) {
    const cell = document.createElement("td");
    const stat = document.createElement("div");
    stat.className = "list-stat";
    const value = Math.min(20, Math.max(0, Number.parseFloat(getPlayerValue(row, aliases)) || 0));
    const track = document.createElement("span");
    track.className = "list-stat-track";
    const fill = document.createElement("i");
    fill.style.width = `${value * 5}%`;
    track.appendChild(fill);
    const number = document.createElement("b");
    number.textContent = String(value);
    stat.append(track, number);
    cell.appendChild(stat);
    return cell;
}

function buildPlayerListTable(table, entries) {
    appendListHeader(table, ["Player", "Name", "Country", "Team", "Skill", "AWP", "Rifle", "Pistol", "React", "Gren", "Clutch", "Roles", "Rating", "Earnings", "Actions"]);
    const body = document.createElement("tbody");
    entries.forEach(({ row, originalIndex }) => {
        const tr = document.createElement("tr");
        tr.dataset.index = originalIndex;
        const nick = getPlayerValue(row, ["nickname", "nick", "internalid", "name"]) || `Player ${originalIndex + 1}`;
        const first = getPlayerValue(row, ["firstname", "forename", "name"]);
        const surname = getPlayerValue(row, ["surname", "lastname"]);
        const country = getPlayerValue(row, ["nationality", "country"]);
        const teamName = getPlayerValue(row, ["team", "teamname", "teamid"]);
        const playerCell = document.createElement("td");
        const player = document.createElement("div");
        player.className = "list-player-cell";
        const thumb = document.createElement("span");
        thumb.className = "list-player-thumb";
        loadCardAsset(thumb, getAssetKey(activeTab, row), getBundledAssetCandidates(activeTab, row));
        const nickText = document.createElement("strong");
        nickText.textContent = nick;
        player.append(thumb, nickText);
        playerCell.appendChild(player);
        const nameCell = document.createElement("td");
        nameCell.textContent = `${first} ${surname}`.trim() || "—";
        const countryCell = document.createElement("td");
        const countryWrap = document.createElement("span");
        countryWrap.className = "list-country-cell";
        const flagPath = getCountryAssetPath(country);
        if (flagPath) {
            const flag = document.createElement("img");
            flag.src = flagPath;
            flag.alt = "";
            countryWrap.appendChild(flag);
        }
        countryWrap.append(document.createTextNode(country || "—"));
        countryCell.appendChild(countryWrap);
        const teamCell = document.createElement("td");
        const teamWrap = document.createElement("span");
        teamWrap.className = "list-team-cell";
        const teamLogo = createTeamLogoBadge(row, true);
        if (teamLogo) teamWrap.appendChild(teamLogo);
        teamWrap.append(document.createTextNode(teamName || "Free agent"));
        teamCell.appendChild(teamWrap);
        tr.append(playerCell, nameCell, countryCell, teamCell);
        [
            ["skill"], ["awp", "awpskill"], ["rifle", "rifleskill"], ["pistol", "pistolskill"],
            ["reaction", "reactions"], ["grenades", "grenade"], ["clutch"]
        ].forEach(aliases => tr.appendChild(createListStatCell(row, aliases)));
        const rolesCell = document.createElement("td");
        const roles = [
            getPlayerValue(row, ["role", "role1", "primaryrole"]),
            getPlayerValue(row, ["role2", "secondaryrole"])
        ].filter((role, index, all) => role && all.indexOf(role) === index);
        roles.forEach(role => {
            const tag = document.createElement("span");
            tag.className = "list-role-tag";
            tag.textContent = role;
            rolesCell.appendChild(tag);
        });
        if (!roles.length) rolesCell.textContent = "—";
        const ratingCell = document.createElement("td");
        const rating = document.createElement("strong");
        rating.className = "list-rating";
        rating.textContent = calculatePlayerRating(row).toFixed(2);
        ratingCell.appendChild(rating);
        const earningsCell = document.createElement("td");
        const earnings = getPlayerValue(row, ["earnings", "prizemoney", "salary", "marketvalue"]);
        earningsCell.textContent = earnings ? `$${earnings}` : "—";
        earningsCell.className = "list-money";
        const actionCell = createListActionCell(tr, originalIndex, nick);
        tr.append(rolesCell, ratingCell, earningsCell, actionCell);
        tr.addEventListener("click", () => selectCard(tr, originalIndex));
        body.appendChild(tr);
    });
    table.appendChild(body);
}

function createListActionCell(rowElement, originalIndex, label) {
    const cell = document.createElement("td");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "list-edit-button";
    button.textContent = "Edit";
    button.setAttribute("aria-label", `Edit ${label}`);
    button.addEventListener("click", event => {
        event.stopPropagation();
        selectCard(rowElement, originalIndex);
        openEditor(originalIndex);
    });
    cell.appendChild(button);
    return cell;
}

function buildGenericListTable(table, tableName, entries) {
    const source = db.tables[tableName];
    const hidden = new Set(["createdby", "createdat", "photourl", "imageurl"]);
    const fields = source.header.map((label, index) => ({ label, index, normalized: normalizeFieldName(label) }))
        .filter(field => !hidden.has(field.normalized)).slice(0, 9);
    appendListHeader(table, [...fields.map(field => field.label), "Actions"]);
    const body = document.createElement("tbody");
    entries.forEach(({ row, originalIndex }) => {
        const tr = document.createElement("tr");
        tr.dataset.index = originalIndex;
        fields.forEach(field => {
            const cell = document.createElement("td");
            cell.textContent = String(row[field.index] ?? "").trim() || "—";
            tr.appendChild(cell);
        });
        const title = String(row[fields[0]?.index] ?? `${tableName} ${originalIndex + 1}`);
        tr.appendChild(createListActionCell(tr, originalIndex, title));
        tr.addEventListener("click", () => selectCard(tr, originalIndex));
        body.appendChild(tr);
    });
    table.appendChild(body);
}

function renderPagination(totalEntries) {
    const pageCount = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE));
    pagination.innerHTML = "";
    const summary = document.createElement("span");
    summary.className = "page-summary";
    const first = totalEntries ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
    const last = Math.min(currentPage * PAGE_SIZE, totalEntries);
    summary.textContent = `${first}-${last} of ${totalEntries}`;
    const controls = document.createElement("div");
    controls.className = "page-controls";
    const previous = createPageButton("Previous", currentPage - 1, currentPage === 1);
    controls.appendChild(previous);
    const start = Math.max(1, Math.min(currentPage - 2, pageCount - 4));
    const end = Math.min(pageCount, Math.max(5, currentPage + 2));
    for (let page = start; page <= end; page++) {
        const button = createPageButton(String(page), page, false);
        if (page === currentPage) button.classList.add("active");
        controls.appendChild(button);
    }
    controls.appendChild(createPageButton("Next", currentPage + 1, currentPage === pageCount));
    pagination.append(summary, controls);
}

function createPageButton(label, page, disabled) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "page-button";
    button.textContent = label;
    button.disabled = disabled;
    button.addEventListener("click", () => {
        currentPage = page;
        renderTable(activeTab);
        tableContainer.scrollTop = 0;
    });
    return button;
}

function createRowElement(rowData, rIndex) {
    if (activeTab.toLowerCase() === "players") return createPlayerCard(rowData, rIndex);
    if (["teams", "sponsors", "staff", "staffs", "tournaments"].includes(activeTab.toLowerCase())) return createEntityCard(rowData, rIndex);
    const card = document.createElement("article");
    card.className = "record-card";
    card.dataset.index = rIndex;
    const headers = db.tables[activeTab].header;
    const fields = rowData.map((value, index) => ({ label: headers[index] || `Column ${index + 1}`, value }))
        .filter(field => String(field.value || "").trim());
    const titleField = fields.find(field => /name|title/i.test(field.label)) || fields[0];
    const cardHeader = document.createElement("div");
    cardHeader.className = "card-header";
    const title = document.createElement("h3");
    title.textContent = titleField?.value || `New ${activeTab.slice(0, -1) || "entry"}`;
    const number = document.createElement("span");
    number.className = "card-number";
    number.textContent = `#${rIndex + 1}`;
    cardHeader.append(title, number);
    const details = document.createElement("dl");
    fields.filter(field => field !== titleField).slice(0, 4).forEach(field => {
        const item = document.createElement("div");
        const label = document.createElement("dt");
        const value = document.createElement("dd");
        label.textContent = field.label;
        value.textContent = field.value;
        item.append(label, value);
        details.appendChild(item);
    });
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "card-edit";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", event => {
        event.stopPropagation();
        selectCard(card, rIndex);
        openEditor(rIndex);
    });
    const supportsImage = ["players", "teams", "sponsors", "staff", "staffs", "tournaments"].includes(activeTab.toLowerCase());
    if (supportsImage) {
        const media = document.createElement("div");
        media.className = "card-media";
        media.innerHTML = "<span>No image</span>";
        card.appendChild(media);
        loadCardAsset(media, getAssetKey(activeTab, rowData), getBundledAssetCandidates(activeTab, rowData));
    }
    card.append(cardHeader, details, editButton);
    card.addEventListener("click", () => {
        if (selectedRowElement) selectedRowElement.classList.remove("selected");
        card.classList.add("selected");
        selectedRowElement = card;
        selectedRowIndex = rIndex;
    });
    return card;
}

function createEntityCard(row, rIndex) {
    const card = document.createElement("article");
    card.className = `record-card player-card entity-card entity-${activeTab.toLowerCase()}`;
    card.dataset.index = rIndex;
    const headers = db.tables[activeTab].header;
    const fields = row.map((value, index) => ({ label: headers[index] || `Column ${index + 1}`, value: String(value ?? "").trim() }))
        .filter(field => field.value && !/(photo|image|portrait|logo).*url/i.test(field.label));
    const titleField = fields.find(field => /^(name|nickname|nick|title)$/i.test(field.label.trim())) || fields[0];
    const title = titleField?.value || `New ${activeTab.replace(/s$/i, "")}`;
    const media = document.createElement("div");
    media.className = "player-card-media";
    media.innerHTML = "<span>No image</span>";
    loadCardAsset(media, getAssetKey(activeTab, row), getBundledAssetCandidates(activeTab, row));
    const shade = document.createElement("div");
    shade.className = "player-card-shade";
    const identity = document.createElement("div");
    identity.className = "player-identity";
    const heading = document.createElement("h3");
    heading.textContent = title;
    const category = document.createElement("p");
    category.className = "player-affiliation";
    category.textContent = activeTab.toUpperCase();
    identity.append(heading, category);
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "player-open";
    edit.title = `Edit ${title}`;
    edit.setAttribute("aria-label", `Edit ${title}`);
    edit.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17.25V20h2.75L17.81 8.94l-2.75-2.75L4 17.25zm15.71-10.04a1 1 0 0 0 0-1.42l-1.5-1.5a1 1 0 0 0-1.42 0l-1.17 1.17 2.75 2.75 1.34-1z"/></svg>';
    edit.addEventListener("click", event => { event.stopPropagation(); selectCard(card, rIndex); openEditor(rIndex); });
    const details = document.createElement("div");
    details.className = "player-stats-panel entity-card-details";
    fields.filter(field => field !== titleField).slice(0, 5).forEach(field => {
        const item = document.createElement("div");
        item.className = "entity-card-detail";
        const label = document.createElement("span");
        label.textContent = field.label;
        const value = document.createElement("strong");
        value.textContent = field.value;
        item.append(label, value);
        details.appendChild(item);
    });
    if (!details.children.length) details.innerHTML = '<span class="entity-card-empty">No additional information</span>';
    const footer = document.createElement("div");
    footer.className = "player-card-footer";
    const summary = document.createElement("span");
    summary.textContent = `${fields.length} populated field${fields.length === 1 ? "" : "s"}`;
    const number = document.createElement("strong");
    number.textContent = `#${rIndex + 1}`;
    footer.append(summary, number);
    const teamLogo = ["staff", "staffs"].includes(activeTab.toLowerCase()) ? createTeamLogoBadge(row, true) : null;
    card.append(media, shade, identity, edit, ...(teamLogo ? [teamLogo] : []), details, footer);
    card.addEventListener("click", () => selectCard(card, rIndex));
    return card;
}

function getRowValue(row, aliases) {
    const headers = db.tables[activeTab].header;
    for (const alias of aliases) {
        const index = headers.findIndex(header => normalizeFieldName(header) === alias);
        if (index >= 0 && String(row[index] ?? "").trim()) return String(row[index]).trim();
    }
    return "";
}

function createTeamLogoBadge(sourceRow, compact = false) {
    const sourceTable = db.tables[activeTab];
    const teamReferenceIndex = sourceTable.header.findIndex(header => ["team", "teamid"].includes(normalizeFieldName(header)));
    const teamReference = teamReferenceIndex >= 0 ? String(sourceRow[teamReferenceIndex] || "").trim() : "";
    if (!teamReference) return null;
    const teamsTableName = Object.keys(db.tables).find(name => name.toLowerCase() === "teams");
    if (!teamsTableName) return null;
    const teamsTable = db.tables[teamsTableName];
    const lookup = teamReference.normalize("NFKC").toLowerCase();
    const matchingColumns = teamsTable.header
        .map((header, index) => ({ name: normalizeFieldName(header), index }))
        .filter(field => ["name", "teamid", "internalid", "id"].includes(field.name));
    const teamRow = teamsTable.rows.find(row => matchingColumns.some(field => String(row[field.index] || "").trim().normalize("NFKC").toLowerCase() === lookup));
    if (!teamRow) return null;
    const badge = document.createElement("div");
    badge.className = `card-team-logo${compact ? " compact" : ""}`;
    badge.title = teamReference;
    badge.innerHTML = "<span>◆</span>";
    loadCardAsset(badge, getAssetKey(teamsTableName, teamRow), getBundledAssetCandidates(teamsTableName, teamRow));
    return badge;
}

function createPlayerCard(row, rIndex) {
    const card = document.createElement("article");
    card.className = "record-card player-card";
    card.dataset.index = rIndex;
    const nickname = getRowValue(row, ["nickname", "nick", "internalid", "name"]) || `Player ${rIndex + 1}`;
    const firstName = getRowValue(row, ["firstname", "forename", "name"]);
    const surname = getRowValue(row, ["surname", "lastname"]);
    const country = getRowValue(row, ["nationality", "country"]);
    const team = getRowValue(row, ["team", "teamname", "teamid"]);
    const rating = calculatePlayerRating(row).toFixed(2);
    const earnings = getRowValue(row, ["earnings", "prizemoney", "salary", "marketvalue"]);
    const birthDate = getRowValue(row, ["dateofbirth", "birthdate", "dob"]);
    const media = document.createElement("div");
    media.className = "player-card-media";
    media.innerHTML = "<span>No image</span>";
    loadCardAsset(media, getAssetKey(activeTab, row), getBundledAssetCandidates(activeTab, row));
    const shade = document.createElement("div");
    shade.className = "player-card-shade";
    const rank = document.createElement("span");
    rank.className = "player-rank";
    rank.textContent = `#${rIndex + 1}`;
    const ratingBadge = document.createElement("span");
    ratingBadge.className = "player-rating";
    ratingBadge.textContent = `★ ${rating || "—"}`;
    const identity = document.createElement("div");
    identity.className = "player-identity";
    const title = document.createElement("h3");
    title.textContent = nickname;
    const subtitle = document.createElement("p");
    const age = calculateAge(birthDate);
    subtitle.textContent = [ `${firstName} ${surname}`.trim(), age ? `${age} y.o.` : "" ].filter(Boolean).join(" · ");
    const affiliation = document.createElement("p");
    affiliation.className = "player-affiliation";
    const countryFlag = getCountryAssetPath(country);
    if (countryFlag) {
        const flag = document.createElement("img");
        flag.className = "player-country-flag";
        flag.src = countryFlag;
        flag.alt = "";
        affiliation.appendChild(flag);
    }
    const affiliationText = document.createElement("span");
    affiliationText.textContent = [country || "Nationality unknown", team].filter(Boolean).join("  •  ");
    affiliation.appendChild(affiliationText);
    identity.append(title, subtitle, affiliation);
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "player-open";
    edit.title = `Edit ${nickname}`;
    edit.setAttribute("aria-label", `Edit ${nickname}`);
    edit.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 6.5 17.5 10.5 8 20H4v-4L13.5 6.5Zm1.4-1.4 1.6-1.6a1.4 1.4 0 0 1 2 0l2 2a1.4 1.4 0 0 1 0 2l-1.6 1.6-4-4ZM11 4H5a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3v-6h-2v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6V4Z"/></svg>`;
    edit.addEventListener("click", event => {
        event.stopPropagation();
        selectCard(card, rIndex);
        openEditor(rIndex);
    });
    const statNames = [
        ["SKILL", ["skill", "gameplayskill", "overall"]],
        ["AWP", ["awp", "awpskill"]],
        ["RIFLE", ["rifle", "rifleskill"]],
        ["REACT", ["reaction", "reactions"]]
    ];
    const statsPanel = document.createElement("div");
    statsPanel.className = "player-stats-panel";
    const statsList = document.createElement("div");
    statsList.className = "player-stat-list";
    const radarValues = [];
    statNames.forEach(([label, aliases]) => {
        const rawValue = getRowValue(row, aliases);
        const numericValue = Number.parseFloat(rawValue) || 0;
        radarValues.push(numericValue);
        const stat = document.createElement("div");
        stat.className = "player-stat";
        const statLabel = document.createElement("b");
        statLabel.textContent = label;
        const track = document.createElement("span");
        const fill = document.createElement("i");
        fill.style.width = `${Math.min(100, numericValue * 5)}%`;
        track.appendChild(fill);
        const statValue = document.createElement("strong");
        statValue.textContent = rawValue || "—";
        stat.append(statLabel, track, statValue);
        statsList.appendChild(stat);
    });
    radarValues.push(Number.parseFloat(getRowValue(row, ["clutch", "tactic", "teamwork"])) || 0);
    statsPanel.append(statsList, createMiniRadar(radarValues));
    const footer = document.createElement("div");
    footer.className = "player-card-footer";
    const teamLabel = document.createElement("span");
    teamLabel.textContent = team || "No team";
    const money = document.createElement("strong");
    money.textContent = earnings ? `$ ${earnings}` : "—";
    footer.append(teamLabel, money);
    const teamLogo = createTeamLogoBadge(row);
    card.append(media, shade, rank, ratingBadge, identity, edit, ...(teamLogo ? [teamLogo] : []), statsPanel, footer);
    card.addEventListener("click", () => selectCard(card, rIndex));
    return card;
}

function calculateAge(value) {
    if (!value) return "";
    const commonDate = String(value).match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
    const parsed = commonDate
        ? new Date(Number(commonDate[3]), Number(commonDate[2]) - 1, Number(commonDate[1]))
        : new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    const now = new Date();
    let age = now.getFullYear() - parsed.getFullYear();
    if (now < new Date(now.getFullYear(), parsed.getMonth(), parsed.getDate())) age -= 1;
    return age > 0 && age < 100 ? age : "";
}

function calculatePlayerRating(row) {
    const table = db.tables[activeTab];
    if (!table || activeTab.toLowerCase() !== "players") return 0;
    const values = table.header.map((label, index) => ({ section: getFieldSection(label), value: Number.parseFloat(row[index]) }))
        .filter(field => ["gameplay", "mental", "physical"].includes(field.section))
        .map(field => Number.isFinite(field.value) ? Math.min(20, Math.max(0, field.value)) : 0);
    if (!values.length) return 0;
    const stars = values.reduce((sum, value) => sum + value, 0) / values.length / 4;
    return Math.floor(Math.min(5, Math.max(0, stars)) * 100) / 100;
}

function createMiniRadar(values) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "player-radar");
    svg.setAttribute("viewBox", "0 0 100 100");
    const points = values.slice(0, 5).map((value, index) => {
        const angle = -Math.PI / 2 + index * Math.PI * 2 / 5;
        const radius = Math.min(34, Math.max(4, value / 20 * 34));
        return `${50 + Math.cos(angle) * radius},${50 + Math.sin(angle) * radius}`;
    }).join(" ");
    svg.innerHTML = `<polygon class="radar-grid" points="50,10 88,38 74,82 26,82 12,38"></polygon><polygon class="radar-value" points="${points}"></polygon>`;
    return svg;
}

function selectCard(card, index) {
    if (selectedRowElement) selectedRowElement.classList.remove("selected");
    card.classList.add("selected");
    selectedRowElement = card;
    selectedRowIndex = index;
}

function getAssetKey(tableName, row) {
    const table = db.tables[tableName];
    const preferred = ["internalid", "playerid", "teamid", "id", "nickname", "nick", "name"];
    let columnIndex = -1;
    for (const candidate of preferred) {
        columnIndex = table.header.findIndex(label => normalizeFieldName(label) === candidate);
        if (columnIndex >= 0 && String(row[columnIndex] || "").trim()) break;
        columnIndex = -1;
    }
    if (columnIndex < 0) return null;
    return `${tableName.toLowerCase()}:${normalizeFieldName(table.header[columnIndex])}:${String(row[columnIndex]).trim()}`;
}

function getBundledAssetCandidates(tableName, row) {
    const table = db.tables[tableName];
    const normalizedTable = tableName.toLowerCase();
    const folderMap = {
        players: "Players",
        teams: "Teams",
        sponsors: "Sponsors",
        staff: "Staffs",
        staffs: "Staffs",
        tournaments: "Tournaments"
    };
    const fieldPriority = normalizedTable === "sponsors"
        ? ["id", "sponsorid", "internalid", "name"]
        : normalizedTable === "players"
            ? ["nickname", "nick", "internalid", "name", "firstname"]
            : ["name", "nickname", "nick", "internalid", "id"];
    const values = [];
    fieldPriority.forEach(fieldName => {
        const index = table.header.findIndex(label => normalizeFieldName(label) === fieldName);
        const value = index >= 0 ? String(row[index] || "").trim() : "";
        if (value && !values.includes(value)) values.push(value);
    });
    const folder = folderMap[normalizedTable];
    if (!folder) return [];
    const manifest = window.NOSCOPE_ASSETS?.[folder] || {};
    const candidates = [];
    values.forEach(value => {
        const lookupKey = value.normalize("NFKC").toLowerCase();
        const exactAsset = manifest[lookupKey];
        if (exactAsset && !candidates.includes(exactAsset)) candidates.push(exactAsset);
        const conventionalPath = `assets/custom/${folder}/${encodeURIComponent(value)}.png`;
        if (!candidates.includes(conventionalPath)) candidates.push(conventionalPath);
    });
    if (["players", "staff", "staffs"].includes(normalizedTable)) candidates.push("assets/images/placeholder.png");
    return candidates;
}

function loadFirstAvailableImage(container, candidates, alt = "") {
    if (!candidates.length) return false;
    let index = 0;
    const image = document.createElement("img");
    image.alt = alt;
    image.addEventListener("load", () => container.replaceChildren(image), { once: true });
    image.addEventListener("error", () => {
        index += 1;
        if (index < candidates.length) image.src = candidates[index];
    });
    image.src = candidates[0];
    return true;
}

async function loadCardAsset(container, key, bundledCandidates = []) {
    try {
        const blob = key ? await AssetDB.get(key) : null;
        if (blob && container.isConnected) {
            const url = URL.createObjectURL(blob);
            const image = document.createElement("img");
            image.alt = "";
            image.src = url;
            image.addEventListener("load", () => URL.revokeObjectURL(url), { once: true });
            container.replaceChildren(image);
            return;
        }
        if (container.isConnected) loadFirstAvailableImage(container, bundledCandidates);
    } catch (error) {
        console.error("Unable to load local image", error);
        loadFirstAvailableImage(container, bundledCandidates);
    }
}

function openEditor(rowIndex, isNew = false) {
    editingRowIndex = rowIndex;
    editingIsNew = isNew;
    const table = db.tables[activeTab];
    const row = table.rows[rowIndex];
    const isPlayerEditor = activeTab.toLowerCase() === "players";
    const isStaffEditor = ["staff", "staffs"].includes(activeTab.toLowerCase());
    const hasPolishedEditor = ["players", "teams", "sponsors", "staff", "staffs", "tournaments"].includes(activeTab.toLowerCase());
    editDraft = [...row];
    currentAssetKey = getAssetKey(activeTab, row);
    pendingAsset = undefined;
    editorPage = "general";
    statsPage = "gameplay";
    editModal.classList.toggle("player-editor", hasPolishedEditor);
    editModal.classList.toggle("staff-editor", isStaffEditor);
    btnCopyAssetLink.hidden = !(isPlayerEditor || isStaffEditor);
    const entryTypes = { players: "Player", teams: "Team", sponsors: "Sponsor", staff: "Staff", staffs: "Staff", tournaments: "Tournament" };
    const entryType = entryTypes[activeTab.toLowerCase()] || "Entry";
    btnSubmitEdit.textContent = `Save ${entryType.toLowerCase()}`;
    document.getElementById("edit-modal-context").textContent = `${entryType} editor`;
    const titleColumn = table.header.findIndex(label => /^(nick|nickname|name)$/i.test(String(label).trim()));
    const entryName = titleColumn >= 0 ? String(row[titleColumn] || "").trim() : "";
    document.getElementById("edit-modal-title").textContent = row.every(value => !value)
        ? `ADD ${entryType.toUpperCase()}`
        : `EDIT — ${entryName || entryType.toUpperCase()}`;
    updateEditorNavigation();
    renderEditorFields();
    prepareAssetEditor();
    editModal.hidden = false;
    editFormFields.querySelector("input, textarea")?.focus();
}

async function prepareAssetEditor() {
    const normalizedTable = activeTab.toLowerCase();
    const supportsImage = ["players", "teams", "sponsors", "staff", "staffs", "tournaments"].includes(normalizedTable);
    assetEditor.hidden = !supportsImage;
    if (!supportsImage) return;
    const titles = { players: "Player image", teams: "Team logo", sponsors: "Sponsor logo", staff: "Staff image", staffs: "Staff image", tournaments: "Tournament logo" };
    document.getElementById("asset-editor-title").textContent = titles[normalizedTable];
    const assetHelp = assetEditor.querySelector(".asset-editor-copy p");
    const matchingNames = normalizedTable === "players" ? "Internal ID or nickname" : "name or Internal ID";
    assetHelp.textContent = `Use the bundled CustomAssets image or choose a local override. Files are matched using ${matchingNames}.`;
    assetPreview.innerHTML = "<span>No image</span>";
    btnRemoveAsset.disabled = true;
    try {
        const blob = currentAssetKey ? await AssetDB.get(currentAssetKey) : null;
        if (editModal.hidden) return;
        if (blob) {
            showAssetPreview(blob);
            btnRemoveAsset.disabled = false;
            return;
        }
    } catch (error) {
        console.error("Unable to open local image", error);
    }
    loadFirstAvailableImage(assetPreview, getBundledAssetCandidates(activeTab, db.tables[activeTab].rows[editingRowIndex]), "Bundled asset preview");
}

function showAssetPreview(blob) {
    const url = URL.createObjectURL(blob);
    const image = document.createElement("img");
    image.alt = "Selected image preview";
    image.src = url;
    image.addEventListener("load", () => URL.revokeObjectURL(url), { once: true });
    assetPreview.replaceChildren(image);
}

function normalizeFieldName(label) {
    return String(label || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getFieldSection(label) {
    const name = normalizeFieldName(label);
    const general = ["name", "firstname", "forename", "surname", "lastname", "nickname", "nick", "dateofbirth", "birthdate", "dob", "nationality", "country", "team", "teamid", "gender", "rosterposition", "role", "role1", "role2", "role3", "earnings", "pr", "rating", "status", "retired", "faceit", "fromfaceit"];
    const physical = ["physical", "perception", "health", "strength", "endurance", "fitness", "stamina", "physiotherapy", "therapy"];
    const mental = ["mental", "leader", "leadership", "creativity", "teamwork", "conflict", "morale", "loyalty", "productivity", "stress", "pressure", "ambition", "professionalism", "determination", "temperament", "adaptability", "psychology"];
    const gameplay = ["gameplay", "skill", "tactic", "awp", "rifle", "pistol", "reaction", "grenade", "clutch", "attack", "defence", "defense", "aim", "combat", "technique", "accuracy", "aggression", "playerability", "evaluation", "scouting", "coaching"];
    if (general.includes(name) || general.some(key => name === `${key}id`)) return "general";
    if (physical.some(key => name.includes(key))) return "physical";
    if (mental.some(key => name.includes(key))) return "mental";
    if (gameplay.some(key => name.includes(key))) return "gameplay";
    return "details";
}

function captureVisibleFields() {
    editFormFields.querySelectorAll("[data-column]").forEach(input => {
        editDraft[Number(input.dataset.column)] = input.value;
    });
}

function getAssetDisplayName() {
    const table = db.tables[activeTab];
    if (!table) return "";
    const preferredNames = activeTab.toLowerCase() === "players"
        ? ["nickname", "nick"]
        : ["name", "companyname", "tournamentname", "nickname", "nick", "title"];
    for (const preferred of preferredNames) {
        const index = table.header.findIndex(label => normalizeFieldName(label) === preferred);
        if (index >= 0 && String(editDraft[index] || "").trim()) return String(editDraft[index]).trim();
    }
    return "";
}

function makePlayerImageFilename(nickname, file) {
    const cleanNickname = nickname.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "");
    const extensionByType = { "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp" };
    const sourceExtension = file.name?.match(/\.(png|jpe?g|webp)$/i)?.[0].toLowerCase();
    return `${cleanNickname}${extensionByType[file.type] || sourceExtension || ".png"}`;
}

function downloadPlayerImage(file, filename) {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadEntryImageFromUrl(imageUrl, status) {
    captureVisibleFields();
    const displayName = getAssetDisplayName();
    if (!displayName) {
        alert("Enter this entry's name before downloading the image.");
        return;
    }
    if (!imageUrl) {
        alert("Enter a direct image URL first.");
        return;
    }
    try {
        status.textContent = "Downloading image…";
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`Image request failed (${response.status})`);
        const blob = await response.blob();
        if (!blob.type.startsWith("image/")) throw new Error("The URL did not return an image");
        const urlName = new URL(imageUrl).pathname.split("/").pop() || "player-image";
        const image = new File([blob], urlName, { type: blob.type });
        const filename = makePlayerImageFilename(displayName, image);
        pendingAsset = image;
        showAssetPreview(image);
        btnRemoveAsset.disabled = false;
        downloadPlayerImage(image, filename);
        status.textContent = `Downloaded as ${filename}`;
    } catch (error) {
        console.error("Unable to download entry image", error);
        status.textContent = "Download failed. The image host may block browser downloads.";
        alert(`Unable to download the image from that URL. ${error.message}`);
    }
}

function createUrlDownloadControl(urlField) {
    const wrapper = document.createElement("div");
    wrapper.className = "player-game-upload entry-url-download";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "player-game-upload-link";
    button.textContent = "Download and rename image from URL";
    const status = document.createElement("span");
    status.className = "player-game-upload-status";
    const note = document.createElement("p");
    note.className = "details-note entry-url-download-note";
    note.textContent = "Use a direct PNG, JPEG, or WebP URL, or use NoScope's local CustomAssets image library.";
    button.addEventListener("click", async () => {
        const input = urlField.querySelector("input");
        await downloadEntryImageFromUrl(input?.value.trim() || "", status);
    });
    wrapper.append(button, status, note);
    return wrapper;
}

function isImageUrlField(label) {
    return /(photo|image|portrait|logo|asset).*url|url.*(photo|image|portrait|logo|asset)/i.test(String(label || ""));
}

function createStandaloneImageUrlSection() {
    const field = document.createElement("label");
    field.className = "form-field image-url-field standalone-image-url";
    const caption = document.createElement("span");
    caption.textContent = "PhotoURL";
    const input = document.createElement("input");
    input.type = "url";
    input.placeholder = "https://...";
    field.append(caption, input);
    return { field, downloadControl: createUrlDownloadControl(field) };
}

function renderEditorFields() {
    const table = db.tables[activeTab];
    const isPlayerEditor = activeTab.toLowerCase() === "players";
    const isStaffEditor = ["staff", "staffs"].includes(activeTab.toLowerCase());
    const isTabbedEditor = isPlayerEditor || isStaffEditor;
    if (isTabbedEditor && editorPage === "stats") {
        if (isStaffEditor) renderStaffSkillsEditor(table);
        else renderSkillsEditor(table);
        return;
    }
    if (isStaffEditor) {
        renderStaffInfoEditor(table);
        return;
    }
    if (isTabbedEditor && editorPage === "details") {
        renderDetailsEditor(table);
        return;
    }
    editFormFields.className = "form-grid";
    const targetSection = editorPage === "stats" ? statsPage : editorPage;
    const fieldOrder = ["nickname", "nick", "name", "firstname", "forename", "surname", "lastname", "dateofbirth", "birthdate", "dob", "nationality", "country", "gender", "team", "teamid", "rosterposition", "role", "role1", "role2", "role3", "earnings", "pr", "rating", "status"];
    const visibleFields = table.header.map((label, index) => ({ label, index }))
        .filter(field => !isTabbedEditor || getFieldSection(field.label) === targetSection)
        .filter(field => !(isPlayerEditor && normalizeFieldName(field.label) === "faceit"))
        .filter(field => !["createdby", "createdat"].includes(normalizeFieldName(field.label)));
    if (isTabbedEditor && targetSection === "general") {
        visibleFields.sort((a, b) => {
            const aIndex = fieldOrder.indexOf(normalizeFieldName(a.label));
            const bIndex = fieldOrder.indexOf(normalizeFieldName(b.label));
            return (aIndex < 0 ? 999 : aIndex) - (bIndex < 0 ? 999 : bIndex);
        });
    }
    editFormFields.innerHTML = "";
    const statusToggleFields = isPlayerEditor && targetSection === "general"
        ? visibleFields.filter(field => ["retired", "fromfaceit"].includes(normalizeFieldName(field.label)))
        : [];
    const statusToggleIndexes = new Set(statusToggleFields.map(field => field.index));
    visibleFields.filter(field => !statusToggleIndexes.has(field.index)).forEach(({ label, index }) => {
        const field = document.createElement("label");
        const normalizedLabel = normalizeFieldName(label);
        if (normalizedLabel === "gender") {
            editFormFields.appendChild(createGenderField(label, index));
            return;
        }
        if (normalizedLabel === "disbanded") {
            editFormFields.appendChild(createBooleanSegmentedField(label, index, "Yes", "No"));
            return;
        }
        if (activeTab.toLowerCase() === "tournaments" && normalizedLabel === "tier") {
            editFormFields.appendChild(createFixedSelectField(label, index, ["1", "2"]));
            return;
        }
        if (activeTab.toLowerCase() === "tournaments" && normalizedLabel === "type") {
            editFormFields.appendChild(createFixedSelectField(label, index, ["LAN", "ONLINE"]));
            return;
        }
        if (activeTab.toLowerCase() === "sponsors" && normalizedLabel === "tier") {
            editFormFields.appendChild(createFixedSelectField(label, index, ["S", "A", "B", "C", "D"]));
            return;
        }
        if (activeTab.toLowerCase() === "sponsors" && normalizedLabel === "type") {
            editFormFields.appendChild(createFixedSelectField(label, index, [
                "Apparel", "Automotive", "Betting", "Consumables", "Culture", "Finance",
                "Hardware", "Hygiene", "Infrastructure", "Lifestyle", "Logistics", "Media",
                "Onboarding", "Peripherals", "Travel"
            ]));
            return;
        }
        if (activeTab.toLowerCase() === "teams" && ["bgcolor", "bgcolour", "backgroundcolor", "backgroundcolour"].includes(normalizedLabel)) {
            editFormFields.appendChild(createColorPickerField(label, index));
            return;
        }
        if (["team", "teamid"].includes(normalizedLabel)) {
            editFormFields.appendChild(createTeamPickerField(label, index));
            return;
        }
        if (["nationality", "country"].includes(normalizedLabel)) {
            editFormFields.appendChild(createNationalityPickerField(label, index));
            return;
        }
        if (["role", "role1", "role2", "role3", "rosterposition"].includes(normalizedLabel)) {
            editFormFields.appendChild(createRoleField(label, index));
            return;
        }
        field.className = `form-field field-${normalizedLabel}`;
        if (isImageUrlField(label)) field.classList.add("image-url-field");
        const caption = document.createElement("span");
        caption.textContent = label || `Column ${index + 1}`;
        const selectFields = ["gender", "faceit", "status"];
        const input = selectFields.includes(normalizedLabel) ? document.createElement("select") : document.createElement("input");
        if (input.tagName === "INPUT") input.type = ["dateofbirth", "birthdate", "dob"].includes(normalizedLabel) ? "date" : "text";
        input.value = input.type === "date" ? normalizeDateForInput(editDraft[index]) : (editDraft[index] ?? "");
        input.dataset.column = index;
        if (isPlayerEditor && ["rating", "overall", "overallrating"].includes(normalizedLabel)) {
            input.value = calculatePlayerRating(editDraft).toFixed(2);
            input.readOnly = true;
            input.title = "Calculated automatically from all player attributes";
        }
        if (input.tagName === "SELECT") {
            const currentValue = editDraft[index] ?? "";
            const choices = normalizedLabel === "gender" ? [currentValue, "Male", "Female", "Non-binary"] : [currentValue, "", "True", "False"];
            choices.filter((value, optionIndex, values) => optionIndex === 1 || (value && values.indexOf(value) === optionIndex)).forEach(value => {
                const option = document.createElement("option");
                option.value = value;
                option.textContent = value;
                input.appendChild(option);
            });
            input.value = currentValue;
        }
        field.append(caption, input);
        editFormFields.appendChild(field);
        if (!isTabbedEditor && isImageUrlField(label)) {
            editFormFields.appendChild(createUrlDownloadControl(field));
        }
    });
    const normalizedTable = activeTab.toLowerCase();
    const hasImageUrl = visibleFields.some(field => isImageUrlField(field.label));
    if (["sponsors", "tournaments"].includes(normalizedTable) && !hasImageUrl) {
        const imageUrlSection = createStandaloneImageUrlSection();
        editFormFields.append(imageUrlSection.field, imageUrlSection.downloadControl);
    }
    if (statusToggleFields.length) {
        const statusGroup = document.createElement("fieldset");
        statusGroup.className = "player-status-toggles";
        const legend = document.createElement("legend");
        legend.textContent = "Status";
        statusGroup.appendChild(legend);
        const buttons = document.createElement("div");
        buttons.className = "player-status-buttons";
        statusToggleFields.forEach(({ label, index }) => {
            const normalizedLabel = normalizeFieldName(label);
            const button = document.createElement("button");
            button.type = "button";
            button.className = `player-status-button status-${normalizedLabel}`;
            button.dataset.column = index;
            button.value = /^(true|1|yes)$/i.test(String(editDraft[index] ?? "")) ? "True" : "False";
            button.classList.toggle("active", button.value === "True");
            button.setAttribute("aria-pressed", String(button.value === "True"));
            const icon = document.createElement("span");
            icon.className = "player-status-icon";
            icon.textContent = normalizedLabel === "retired" ? "\u25C8" : "F";
            const text = document.createElement("span");
            text.textContent = normalizedLabel === "retired" ? "Retired" : "From Faceit";
            button.append(icon, text);
            button.addEventListener("click", () => {
                const active = button.value !== "True";
                button.value = active ? "True" : "False";
                button.classList.toggle("active", active);
                button.setAttribute("aria-pressed", String(active));
            });
            buttons.appendChild(button);
        });
        statusGroup.appendChild(buttons);
        editFormFields.appendChild(statusGroup);
    }
    if (!visibleFields.length) {
        const empty = document.createElement("div");
        empty.className = "editor-page-empty";
        empty.textContent = "This database does not contain fields for this section.";
        editFormFields.appendChild(empty);
    }
    editorFieldCount.textContent = `${visibleFields.length} field${visibleFields.length === 1 ? "" : "s"}`;
}

function createBoundField(label, index, options = {}) {
    const field = document.createElement("label");
    field.className = `form-field field-${normalizeFieldName(label)} ${options.className || ""}`.trim();
    const caption = document.createElement("span");
    caption.textContent = label || `Column ${index + 1}`;
    const control = options.multiline ? document.createElement("textarea") : document.createElement("input");
    if (!options.multiline) control.type = options.type || "text";
    control.value = editDraft[index] ?? "";
    control.dataset.column = index;
    field.append(caption, control);
    return field;
}

function createFixedSelectField(label, index, choices, className = "") {
    const field = document.createElement("label");
    field.className = `form-field field-${normalizeFieldName(label)} fixed-select-field ${className}`.trim();
    const caption = document.createElement("span");
    caption.textContent = label || `Column ${index + 1}`;
    const select = document.createElement("select");
    select.dataset.column = index;
    const currentValue = String(editDraft[index] ?? "").trim();
    choices.forEach(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    });
    select.value = choices.find(value => value.toLowerCase() === currentValue.toLowerCase()) || choices[0];
    field.append(caption, select);
    return field;
}

function createGenderField(label, index, className = "") {
    const field = document.createElement("div");
    field.className = `form-field field-gender gender-field ${className}`.trim();
    const caption = document.createElement("span");
    caption.textContent = label || "Gender";
    const input = document.createElement("input");
    input.type = "hidden";
    input.dataset.column = index;
    input.value = editDraft[index] ?? "";
    const control = document.createElement("div");
    control.className = "gender-segmented";
    [["M", "Male"], ["F", "Female"]].forEach(([shortLabel, value]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = shortLabel;
        const selected = input.value.toLowerCase().startsWith(value[0].toLowerCase());
        button.classList.toggle("active", selected);
        button.setAttribute("aria-pressed", String(selected));
        button.addEventListener("click", () => {
            input.value = value;
            control.querySelectorAll("button").forEach(option => {
                const active = option === button;
                option.classList.toggle("active", active);
                option.setAttribute("aria-pressed", String(active));
            });
        });
        control.appendChild(button);
    });
    field.append(caption, input, control);
    return field;
}

function createBooleanSegmentedField(label, index, trueLabel = "Yes", falseLabel = "No", className = "") {
    const field = document.createElement("div");
    field.className = `form-field boolean-segmented-field field-${normalizeFieldName(label)} ${className}`.trim();
    const caption = document.createElement("span");
    caption.textContent = label;
    const input = document.createElement("input");
    input.type = "hidden";
    input.dataset.column = index;
    input.value = /^(true|1|yes)$/i.test(String(editDraft[index] ?? "")) ? "True" : "False";
    const control = document.createElement("div");
    control.className = "gender-segmented boolean-segmented";
    [[trueLabel, "True"], [falseLabel, "False"]].forEach(([buttonLabel, value]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = buttonLabel;
        const selected = input.value === value;
        button.classList.toggle("active", selected);
        button.setAttribute("aria-pressed", String(selected));
        button.addEventListener("click", () => {
            input.value = value;
            control.querySelectorAll("button").forEach(option => {
                const active = option === button;
                option.classList.toggle("active", active);
                option.setAttribute("aria-pressed", String(active));
            });
        });
        control.appendChild(button);
    });
    field.append(caption, input, control);
    return field;
}

function createColorPickerField(label, index, className = "") {
    const field = document.createElement("label");
    field.className = `form-field color-picker-field field-${normalizeFieldName(label)} ${className}`.trim();
    const caption = document.createElement("span");
    caption.textContent = label;
    const input = document.createElement("input");
    input.type = "color";
    input.dataset.column = index;
    const currentValue = String(editDraft[index] ?? "").trim();
    const hexValue = currentValue.match(/^#?([0-9a-f]{6})$/i);
    input.value = hexValue ? `#${hexValue[1]}` : "#202328";
    field.append(caption, input);
    return field;
}

function createRoleField(label, index, className = "") {
    const field = document.createElement("label");
    field.className = `form-field field-${normalizeFieldName(label)} role-field ${className}`.trim();
    const caption = document.createElement("span");
    caption.textContent = label || "Role";
    const select = document.createElement("select");
    select.dataset.column = index;
    const currentValue = String(editDraft[index] ?? "").trim();
    const normalizedLabel = normalizeFieldName(label);
    const isPlayerRole = activeTab.toLowerCase() === "players" && ["role", "role1", "role2", "role3"].includes(normalizedLabel);
    const roles = isPlayerRole
        ? ["Entry fragger", "In-game leader", "Lurker", "Rifler", "Support"]
        : db.tables[activeTab].rows.map(row => String(row[index] ?? "").trim()).filter(Boolean);
    const choices = ["", currentValue, ...roles]
        .filter((value, choiceIndex, values) => values.findIndex(existing => existing.toLowerCase() === value.toLowerCase()) === choiceIndex)
        .sort((a, b) => !a ? -1 : !b ? 1 : a.localeCompare(b));
    choices.forEach(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value || (isPlayerRole ? "None" : "Select role");
        select.appendChild(option);
    });
    select.value = currentValue;
    field.append(caption, select);
    return field;
}

function createSearchablePickerField(label, index, options, className = "") {
    const field = document.createElement("div");
    field.className = `form-field searchable-picker-field ${className}`.trim();
    const caption = document.createElement("span");
    caption.textContent = label;
    const hiddenInput = document.createElement("input");
    hiddenInput.type = "hidden";
    hiddenInput.dataset.column = index;
    hiddenInput.value = editDraft[index] ?? "";
    const picker = document.createElement("div");
    picker.className = "searchable-picker";
    const selectedOption = options.find(option => option.value.toLowerCase() === String(hiddenInput.value).toLowerCase());
    const selectedIcon = document.createElement("img");
    selectedIcon.className = "searchable-picker-selected-icon";
    selectedIcon.alt = "";
    selectedIcon.hidden = !selectedOption?.image;
    if (selectedOption?.image) selectedIcon.src = selectedOption.image;
    const search = document.createElement("input");
    search.type = "search";
    search.autocomplete = "off";
    search.value = selectedOption?.label || hiddenInput.value;
    search.classList.toggle("has-icon", Boolean(selectedOption?.image));
    const menu = document.createElement("div");
    menu.className = "searchable-picker-menu";
    const renderOptions = () => {
        const query = search.value.trim().toLowerCase();
        menu.innerHTML = "";
        options.filter(option => option.label.toLowerCase().includes(query)).slice(0, 60).forEach(option => {
            const button = document.createElement("button");
            button.type = "button";
            if (option.image) {
                const image = document.createElement("img");
                image.src = option.image;
                image.alt = "";
                button.appendChild(image);
            }
            const text = document.createElement("span");
            text.textContent = option.label;
            button.appendChild(text);
            button.addEventListener("click", () => {
                hiddenInput.value = option.value;
                search.value = option.label;
                selectedIcon.hidden = !option.image;
                if (option.image) selectedIcon.src = option.image;
                else selectedIcon.removeAttribute("src");
                search.classList.toggle("has-icon", Boolean(option.image));
                picker.classList.remove("open");
            });
            menu.appendChild(button);
        });
        picker.classList.add("open");
    };
    search.addEventListener("focus", renderOptions);
    search.addEventListener("input", renderOptions);
    document.addEventListener("click", event => { if (!picker.contains(event.target)) picker.classList.remove("open"); });
    picker.append(selectedIcon, search, menu);
    field.append(caption, hiddenInput, picker);
    return field;
}

function createTeamPickerField(label, index, className = "") {
    const teamsTableName = Object.keys(db.tables).find(name => name.toLowerCase() === "teams");
    const teamsTable = teamsTableName ? db.tables[teamsTableName] : null;
    const targetIsId = normalizeFieldName(label) === "teamid";
    const options = teamsTable ? teamsTable.rows.map(row => {
        const nameIndex = teamsTable.header.findIndex(header => normalizeFieldName(header) === "name");
        const idIndex = teamsTable.header.findIndex(header => ["teamid", "internalid", "id"].includes(normalizeFieldName(header)));
        const teamName = String(row[nameIndex] ?? "").trim();
        const teamId = idIndex >= 0 ? String(row[idIndex] ?? "").trim() : teamName;
        return { value: targetIsId ? teamId : teamName, label: teamName || teamId, image: getBundledAssetCandidates(teamsTableName, row)[0] || "" };
    }).filter(option => option.label) : [];
    return createSearchablePickerField(label, index, options, `team-picker ${className}`);
}

function getCountryAssetPath(country) {
    const key = String(country || "").normalize("NFKC").toLowerCase();
    return window.NOSCOPE_ASSETS?.Countries?.[key]?.path || "";
}

function createNationalityPickerField(label, index, className = "") {
    const options = Object.values(window.NOSCOPE_ASSETS?.Countries || {}).map(country => ({ value: country.name, label: country.name, image: country.path }));
    return createSearchablePickerField(label, index, options, `nationality-picker ${className}`);
}

function normalizeDateForInput(value) {
    const text = String(value ?? "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const commonDate = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
    if (!commonDate) return "";
    const [, day, month, year] = commonDate;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function renderStaffInfoEditor(table) {
    editFormFields.className = "staff-info-editor";
    editFormFields.innerHTML = "";
    const infoNames = new Set([
        "nickname", "nick", "name", "firstname", "forename", "surname", "lastname", "gender", "role",
        "team", "teamid", "country", "nationality", "internalid", "id", "type", "rating",
        "liquipediaurl", "hltvurl", "photourl", "imageurl", "portraiturl"
    ]);
    const order = ["nickname", "nick", "name", "firstname", "forename", "surname", "lastname", "gender", "role", "team", "country", "nationality", "internalid", "type", "rating", "liquipediaurl", "hltvurl", "photourl", "imageurl"];
    const fields = table.header.map((label, index) => ({ label, index, name: normalizeFieldName(label) }))
        .filter(field => infoNames.has(field.name))
        .sort((a, b) => {
            const aOrder = order.indexOf(a.name);
            const bOrder = order.indexOf(b.name);
            return (aOrder < 0 ? 999 : aOrder) - (bOrder < 0 ? 999 : bOrder);
        });
    fields.forEach(field => {
        if (field.name === "gender") {
            editFormFields.appendChild(createGenderField(field.label, field.index, `staff-info-${field.name}`));
            return;
        }
        if (field.name === "role") {
            editFormFields.appendChild(createRoleField(field.label, field.index, `staff-info-${field.name}`));
            return;
        }
        if (["team", "teamid"].includes(field.name)) {
            editFormFields.appendChild(createTeamPickerField(field.label, field.index, `staff-info-${field.name}`));
            return;
        }
        if (["country", "nationality"].includes(field.name)) {
            editFormFields.appendChild(createNationalityPickerField(field.label, field.index, `staff-info-${field.name}`));
            return;
        }
        const boundField = createBoundField(field.label, field.index, {
            className: `staff-info-${field.name}`,
            type: /url$/i.test(field.name) ? "url" : "text"
        });
        editFormFields.appendChild(boundField);
        if (isImageUrlField(field.label)) {
            editFormFields.appendChild(createUrlDownloadControl(boundField));
        }
    });
    editorFieldCount.textContent = `${fields.length} info field${fields.length === 1 ? "" : "s"}`;
}

function renderDetailsEditor(table) {
    const isPlayerEditor = activeTab.toLowerCase() === "players";
    editFormFields.className = "details-editor-content";
    editFormFields.innerHTML = "";
    const hiddenMetadataFields = new Set(["createdby", "createdat"]);
    const details = table.header.map((label, index) => ({ label, index }))
        .filter(field => getFieldSection(field.label) === "details" && !hiddenMetadataFields.has(normalizeFieldName(field.label)));
    const biography = details.find(field => /bio|biography|description|about/i.test(field.label));
    const photoUrl = details.find(field => /photo.*url|image.*url|portrait.*url/i.test(field.label));
    const internalId = details.find(field => /internal.*id/i.test(field.label));
    const profiles = details.filter(field => /liquipedia|hltv|profile.*url/i.test(field.label));
    const used = new Set([biography, photoUrl, internalId, ...profiles].filter(Boolean).map(field => field.index));
    if (biography) editFormFields.appendChild(createBoundField(biography.label, biography.index, { multiline: true, className: "details-biography" }));
    const photoUrlField = photoUrl ? createBoundField(photoUrl.label, photoUrl.index, { className: "details-photo-url" }) : null;
    if (photoUrlField) editFormFields.appendChild(photoUrlField);
    if (photoUrlField) editFormFields.appendChild(createUrlDownloadControl(photoUrlField));
    const guide = document.createElement("aside");
    guide.className = "photo-guidelines";
    guide.innerHTML = `<strong>PHOTO FORMAT GUIDELINES</strong><p>• The ${isPlayerEditor ? "player" : "staff member"} must fit clearly within the frame and remain readable on a dark in-game background.</p><p>• Use a bright or transparent background where possible.</p><p>• Recommended image size: approximately 400 × 417 px.</p>`;
    editFormFields.appendChild(guide);
    if (internalId) editFormFields.appendChild(createBoundField(internalId.label, internalId.index, { className: "details-internal-id" }));
    if (profiles.length) {
        const heading = document.createElement("h4");
        heading.className = "details-section-title";
        heading.textContent = "External profiles";
        editFormFields.appendChild(heading);
        const profileGrid = document.createElement("div");
        profileGrid.className = "profile-grid";
        profiles.forEach(field => profileGrid.appendChild(createBoundField(field.label, field.index)));
        editFormFields.appendChild(profileGrid);
    }
    const remaining = details.filter(field => !used.has(field.index));
    if (remaining.length) {
        const extraGrid = document.createElement("div");
        extraGrid.className = "details-extra-grid";
        remaining.forEach(field => extraGrid.appendChild(createBoundField(field.label, field.index)));
        editFormFields.appendChild(extraGrid);
    }
    editorFieldCount.textContent = `${details.length} fields`;
}

function renderStaffSkillsEditor(table) {
    editFormFields.className = "skills-editor-content staff-skills-editor";
    editFormFields.innerHTML = "";
    const roleIndex = table.header.findIndex(label => normalizeFieldName(label) === "role");
    const role = roleIndex >= 0 ? String(editDraft[roleIndex] || "").trim() : "";
    const normalizedRole = normalizeFieldName(role);
    let roleSkills;
    if (/^(cfo|chieffinancial|chieffinancialofficer)$/.test(normalizedRole)) {
        roleSkills = ["financemanagement", "financialmanagement", "financialliteracy"];
    } else if (/^(ceo|chiefexecutive|chiefexecutiveofficer)$/.test(normalizedRole)) {
        roleSkills = ["leadership", "vision", "delegation", "publicimage", "communication", "financialliteracy", "financemanagement"];
    } else if (/eventmanager|eventorganizer|eventcoordinator/.test(normalizedRole)) {
        roleSkills = ["eventorganization", "eventorganisation"];
    } else if (/^(prmanager|publicrelationsmanager|communicationsmanager)$/.test(normalizedRole)) {
        roleSkills = ["publicrelations"];
    } else if (/lawyer|attorney|legalcounsel|solicitor/.test(normalizedRole)) {
        roleSkills = ["legalknowledge", "contractwork"];
    } else if (/analyst|analysis/.test(normalizedRole)) {
        roleSkills = ["analysis", "insight"];
    } else if (/physio|medical|fitness/.test(normalizedRole)) {
        roleSkills = ["physiotherapy", "fitness"];
    } else if (/scout/.test(normalizedRole)) {
        roleSkills = ["playerability", "evaluation", "scouting"];
    } else if (/psych/.test(normalizedRole)) {
        roleSkills = ["psychology"];
    } else if (/coach|manager/.test(normalizedRole)) {
        roleSkills = ["skill", "awp", "rifle", "pistol", "grenade", "grenades", "creativity", "clutch", "tactic", "tactics"];
    } else {
        roleSkills = ["skill", "awp", "rifle", "pistol", "grenade", "grenades", "creativity", "clutch", "tactic", "tactics", "physiotherapy", "fitness", "playerability", "evaluation", "scouting", "psychology"];
    }
    const staffSkillGroups = [
        {
            title: role ? `${role} attributes` : "Role attributes",
            names: roleSkills
        },
        {
            title: "Common attributes",
            names: ["morale", "conflict", "productivity", "loyalty", "stressresistance", "immunity"]
        }
    ];
    const fields = table.header.map((label, index) => ({ label, index, name: normalizeFieldName(label) }));
    let renderedCount = 0;
    staffSkillGroups.forEach(groupDefinition => {
        const groupFields = fields.filter(field => groupDefinition.names.includes(field.name));
        if (!groupFields.length) return;
        const group = document.createElement("section");
        group.className = "skill-group staff-skill-group";
        const heading = document.createElement("h3");
        heading.textContent = groupDefinition.title;
        const grid = document.createElement("div");
        grid.className = "skill-controls-grid";
        groupFields.forEach(field => {
            const item = document.createElement("label");
            item.className = "skill-control";
            const label = document.createElement("span");
            label.textContent = field.label;
            const range = document.createElement("input");
            range.type = "range";
            range.min = "1";
            range.max = "20";
            range.value = Math.min(20, Math.max(1, Number.parseFloat(editDraft[field.index]) || 1));
            const value = document.createElement("output");
            value.textContent = editDraft[field.index] || "1";
            range.addEventListener("input", () => {
                value.textContent = range.value;
                editDraft[field.index] = range.value;
            });
            item.append(label, range, value);
            grid.appendChild(item);
        });
        group.append(heading, grid);
        editFormFields.appendChild(group);
        renderedCount += groupFields.length;
    });
    if (!renderedCount) {
        const empty = document.createElement("div");
        empty.className = "editor-page-empty";
        empty.textContent = "This database does not contain staff skill fields.";
        editFormFields.appendChild(empty);
    }
    editorFieldCount.textContent = `${renderedCount} staff skill${renderedCount === 1 ? "" : "s"}`;
}

function renderSkillsEditor(table) {
    editFormFields.className = "skills-editor-content";
    editFormFields.innerHTML = "";
    const stats = table.header.map((label, index) => ({ label, index, section: getFieldSection(label) }))
        .filter(field => ["gameplay", "physical", "mental"].includes(field.section));
    const controls = document.createElement("div");
    controls.className = "skill-randomizer";
    controls.innerHTML = "<span>RANDOMIZE:</span>";
    [["By skill",1,20],["★ T1",17,20],["◆ T2",13,17],["■ T3",9,13],["● T4",5,9],["? NN",1,5]].forEach(([label,min,max]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.addEventListener("click", () => {
            stats.forEach(field => { editDraft[field.index] = String(Math.floor(Math.random() * (max - min + 1)) + min); });
            renderSkillsEditor(table);
        });
        controls.appendChild(button);
    });
    editFormFields.appendChild(controls);
    const hero = document.createElement("section");
    hero.className = "skills-hero";
    const primary = stats.slice(0, 5);
    const radarValues = primary.map(field => Number.parseFloat(editDraft[field.index]) || 0);
    const radarWrap = document.createElement("div");
    radarWrap.className = "skills-radar-wrap";
    const radar = createMiniRadar(radarValues);
    radar.classList.add("skills-radar");
    radarWrap.appendChild(radar);
    primary.forEach((field, index) => {
        const label = document.createElement("span");
        label.className = `radar-label radar-label-${index + 1}`;
        label.textContent = `${field.label} ${editDraft[field.index] || "—"}`;
        radarWrap.appendChild(label);
    });
    hero.appendChild(radarWrap);
    editFormFields.appendChild(hero);
    const percentile = document.createElement("section");
    percentile.className = "percentile-panel";
    const percentileTitle = document.createElement("h4");
    percentileTitle.textContent = "⊙ WORLD PERCENTILE";
    percentile.appendChild(percentileTitle);
    primary.forEach(field => {
        const value = Number.parseFloat(editDraft[field.index]) || 0;
        const row = document.createElement("div");
        row.className = "percentile-row";
        const percent = Math.round(Math.min(100, value / 20 * 100));
        const label = document.createElement("b");
        label.textContent = field.label;
        const track = document.createElement("span");
        const fill = document.createElement("i");
        fill.style.width = `${percent}%`;
        track.appendChild(fill);
        const score = document.createElement("strong");
        score.textContent = `${percent}%`;
        row.append(label, track, score);
        percentile.appendChild(row);
    });
    editFormFields.appendChild(percentile);
    [["gameplay", "⚡ Combat skills"], ["mental", "◉ Mental"], ["physical", "◆ Physical"]].forEach(([section, title]) => {
        const group = document.createElement("section");
        group.className = "skill-group";
        const heading = document.createElement("h3");
        heading.textContent = title;
        group.appendChild(heading);
        const grid = document.createElement("div");
        grid.className = "skill-controls-grid";
        stats.filter(field => field.section === section).forEach(field => {
            const item = document.createElement("label");
            item.className = "skill-control";
            const label = document.createElement("span");
            label.textContent = field.label;
            const range = document.createElement("input");
            range.type = "range";
            range.min = "1";
            range.max = "20";
            range.value = Math.min(20, Math.max(1, Number.parseFloat(editDraft[field.index]) || 1));
            range.dataset.column = field.index;
            const value = document.createElement("output");
            value.textContent = editDraft[field.index] || "1";
            range.addEventListener("input", () => { value.textContent = range.value; editDraft[field.index] = range.value; });
            item.append(label, range, value);
            grid.appendChild(item);
        });
        group.appendChild(grid);
        editFormFields.appendChild(group);
    });
    editorFieldCount.textContent = `${stats.length} attributes`;
}

function updateEditorNavigation() {
    const isPlayerEditor = activeTab.toLowerCase() === "players";
    const isStaffEditor = ["staff", "staffs"].includes(activeTab.toLowerCase());
    const isTabbedEditor = isPlayerEditor || isStaffEditor;
    editModal.dataset.page = editorPage === "stats" ? statsPage : editorPage;
    editorNav.hidden = !isTabbedEditor;
    const generalTab = editorNav.querySelector('[data-editor-page="general"]');
    const skillsTab = editorNav.querySelector('[data-editor-page="stats"]');
    const detailsTab = editorNav.querySelector('[data-editor-page="details"]');
    generalTab.textContent = isStaffEditor ? "Info" : "Identity";
    skillsTab.textContent = isStaffEditor ? "Attributes" : "Skills";
    detailsTab.hidden = isStaffEditor;
    if (!isTabbedEditor) {
        statsNav.hidden = true;
        editorPageTitle.textContent = `${activeTab.slice(0, -1) || activeTab} information`;
        editorPageDescription.textContent = `Edit all fields for this ${activeTab.slice(0, -1).toLowerCase() || "entry"}.`;
        return;
    }
    document.querySelectorAll("[data-editor-page]").forEach(button => button.classList.toggle("active", button.dataset.editorPage === editorPage));
    document.querySelectorAll("[data-stats-page]").forEach(button => button.classList.toggle("active", button.dataset.statsPage === statsPage));
    statsNav.hidden = true;
    assetEditor.hidden = editorPage !== "general";
    const headings = {
        general: ["General information", isStaffEditor ? "Name, role, country, and team information." : "Name, birth, nationality, and team information."],
        details: [isStaffEditor ? "Staff details" : "Player details", `Extra database information about this ${isStaffEditor ? "staff member" : "player"}.`],
        gameplay: [isStaffEditor ? "Staff skills" : "Gameplay stats", isStaffEditor ? "Coaching, evaluation, scouting, and game knowledge." : "Technical and in-game performance attributes."],
        physical: ["Physical stats", isStaffEditor ? "Fitness and physiotherapy attributes." : "Health, strength, perception, and endurance attributes."],
        mental: ["Mental stats", isStaffEditor ? "Creativity and psychology attributes." : "Personality, teamwork, leadership, and resilience attributes."]
    };
    const key = editorPage === "stats" ? statsPage : editorPage;
    [editorPageTitle.textContent, editorPageDescription.textContent] = headings[key];
}

function closeEditor(cancelled = false) {
    if (cancelled && editingIsNew && editingRowIndex >= 0) {
        db.tables[activeTab].rows.splice(editingRowIndex, 1);
        updateTabCount(activeTab);
        renderTable(activeTab);
    }
    editModal.hidden = true;
    editingRowIndex = -1;
    editingIsNew = false;
    editDraft = [];
    currentAssetKey = null;
    pendingAsset = undefined;
    assetFileInput.value = "";
}

// Toolbar actions
btnAddRow.addEventListener("click", () => {
    if (!activeTab) return;
    const cols = db.tables[activeTab].header.length;
    const newRow = new Array(cols).fill("");
    db.tables[activeTab].rows.push(newRow);
    
    updateTabCount(activeTab);
    currentPage = Math.ceil(db.tables[activeTab].rows.length / PAGE_SIZE);
    renderTable(activeTab);
    openEditor(db.tables[activeTab].rows.length - 1, true);
});

btnDeleteRow.addEventListener("click", async () => {
    if (!activeTab || selectedRowIndex === -1) {
        alert("Please select a row first.");
        return;
    }
    
    if (confirm("Delete selected row?")) {
        const assetKey = getAssetKey(activeTab, db.tables[activeTab].rows[selectedRowIndex]);
        if (assetKey) await AssetDB.remove(assetKey).catch(error => console.error("Unable to remove local image", error));
        db.tables[activeTab].rows.splice(selectedRowIndex, 1);
        updateTabCount(activeTab);
        renderTable(activeTab); 
    }
});

function updateTabCount(tableName) {
    const tab = document.querySelector(`.tab[data-table="${tableName}"]`);
    if (tab) {
        tab.querySelector("small").textContent = `${db.tables[tableName].rows.length} records`;
    }
}

function rowMatchesFilters(row, filters) {
    return Object.entries(filters).every(([column, rule]) => {
        const rawValue = String(row[Number(column)] ?? "").trim();
        if (rule.equals !== undefined && rawValue.toLowerCase() !== rule.equals.toLowerCase()) return false;
        const numericValue = Number.parseFloat(rawValue);
        if (rule.min !== undefined && (Number.isNaN(numericValue) || numericValue < rule.min)) return false;
        if (rule.max !== undefined && (Number.isNaN(numericValue) || numericValue > rule.max)) return false;
        return true;
    });
}

function getPlayerValue(row, aliases) {
    const table = db.tables[activeTab];
    for (const alias of aliases) {
        const index = table.header.findIndex(header => normalizeFieldName(header) === alias);
        if (index >= 0 && String(row[index] ?? "").trim()) return String(row[index]).trim();
    }
    return "";
}

function createCompareProfile(row, side) {
    const profile = document.createElement("article");
    profile.className = `compare-profile compare-profile-${side}`;
    const portrait = document.createElement("div");
    portrait.className = "compare-portrait";
    portrait.innerHTML = "<span>No image</span>";
    loadCardAsset(portrait, getAssetKey(activeTab, row), getBundledAssetCandidates(activeTab, row));
    const info = document.createElement("div");
    const nickname = getPlayerValue(row, ["nickname", "nick", "name"]) || "Unknown player";
    const fullName = `${getPlayerValue(row, ["firstname", "forename"])} ${getPlayerValue(row, ["surname", "lastname"])}`.trim();
    const title = document.createElement("h3");
    title.textContent = nickname;
    const meta = document.createElement("p");
    const age = calculateAge(getPlayerValue(row, ["dateofbirth", "birthdate", "dob"]));
    meta.textContent = [fullName, age ? `${age} y.o.` : ""].filter(Boolean).join(" · ");
    const affiliation = document.createElement("p");
    const country = getPlayerValue(row, ["nationality", "country"]);
    const team = getPlayerValue(row, ["team", "teamname", "teamid"]);
    const flagPath = getCountryAssetPath(country);
    if (flagPath) {
        const flag = document.createElement("img");
        flag.src = flagPath;
        flag.alt = "";
        affiliation.appendChild(flag);
    }
    const affiliationText = document.createElement("span");
    affiliationText.textContent = [team || "Free agent", country || "Unknown nationality"].join(" · ");
    affiliation.appendChild(affiliationText);
    const roles = ["role1", "role2", "role3"].map(role => getPlayerValue(row, [role])).filter(Boolean);
    const roleList = document.createElement("div");
    roleList.className = "compare-roles";
    roles.forEach(role => { const tag = document.createElement("span"); tag.textContent = role; roleList.appendChild(tag); });
    info.append(title, meta, affiliation, roleList);
    profile.append(portrait, info);
    return profile;
}

function createComparisonRadar(stats, leftValues, rightValues) {
    const wrap = document.createElement("div");
    wrap.className = "compare-radar-wrap";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 420 330");
    svg.setAttribute("class", "compare-radar");
    const point = (value, index, radiusScale = 1) => {
        const angle = -Math.PI / 2 + index * Math.PI * 2 / stats.length;
        const radius = (Number(value) || 0) / 20 * 112 * radiusScale;
        return `${210 + Math.cos(angle) * radius},${160 + Math.sin(angle) * radius}`;
    };
    [1, .75, .5, .25].forEach(scale => {
        const grid = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        grid.setAttribute("points", stats.map((_, index) => point(20, index, scale)).join(" "));
        grid.setAttribute("class", "compare-radar-grid");
        svg.appendChild(grid);
    });
    [[leftValues, "compare-radar-left"], [rightValues, "compare-radar-right"]].forEach(([values, className]) => {
        const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        polygon.setAttribute("points", values.map((value, index) => point(value, index)).join(" "));
        polygon.setAttribute("class", className);
        svg.appendChild(polygon);
    });
    stats.forEach((stat, index) => {
        const angle = -Math.PI / 2 + index * Math.PI * 2 / stats.length;
        const label = document.createElement("span");
        label.textContent = stat.label;
        label.style.left = `${50 + Math.cos(angle) * 43}%`;
        label.style.top = `${48 + Math.sin(angle) * 43}%`;
        wrap.appendChild(label);
    });
    wrap.prepend(svg);
    return wrap;
}

function renderPlayerComparison() {
    const table = db.tables[activeTab];
    if (!table || activeTab.toLowerCase() !== "players") return;
    if (!comparePlayerOne.options.length || !comparePlayerTwo.options.length) {
        compareContent.innerHTML = '<div class="filter-empty">No players match one of the comparison searches.</div>';
        return;
    }
    const leftRow = table.rows[Number(comparePlayerOne.value)];
    const rightRow = table.rows[Number(comparePlayerTwo.value)];
    if (!leftRow || !rightRow) return;
    const stats = [
        ["Rating", ["rating", "overall"]], ["Skill", ["skill"]], ["Tactic", ["tactic"]], ["AWP", ["awp"]],
        ["Rifle", ["rifle"]], ["Pistol", ["pistol"]], ["Reaction", ["reaction"]], ["Grenades", ["grenades", "grenade"]],
        ["Clutch", ["clutch"]], ["Leader", ["leader", "leadership"]], ["Creativity", ["creativity"]], ["Teamwork", ["teamwork"]],
        ["Morale", ["morale"]], ["Fitness", ["fitness", "health"]]
    ].map(([label, aliases]) => ({ label, aliases }));
    const leftValues = stats.map((stat, index) => index === 0 ? calculatePlayerRating(leftRow) : (Number.parseFloat(getPlayerValue(leftRow, stat.aliases)) || 0));
    const rightValues = stats.map((stat, index) => index === 0 ? calculatePlayerRating(rightRow) : (Number.parseFloat(getPlayerValue(rightRow, stat.aliases)) || 0));
    compareContent.innerHTML = "";
    const profiles = document.createElement("div");
    profiles.className = "compare-profiles";
    profiles.append(createCompareProfile(leftRow, "left"), createCompareProfile(rightRow, "right"));
    const analysis = document.createElement("section");
    analysis.className = "compare-analysis";
    const radarLeftValues = leftValues.slice(0, 8).map((value, index) => index === 0 ? value * 4 : value);
    const radarRightValues = rightValues.slice(0, 8).map((value, index) => index === 0 ? value * 4 : value);
    analysis.appendChild(createComparisonRadar(stats.slice(0, 8), radarLeftValues, radarRightValues));
    const attributes = document.createElement("div");
    attributes.className = "compare-attributes";
    stats.forEach((stat, index) => {
        const row = document.createElement("div");
        row.className = "compare-attribute-row";
        const left = document.createElement("strong");
        left.textContent = index === 0 ? leftValues[index].toFixed(2) : (leftValues[index] || "—");
        const label = document.createElement("span");
        label.textContent = stat.label;
        const right = document.createElement("strong");
        right.textContent = index === 0 ? rightValues[index].toFixed(2) : (rightValues[index] || "—");
        if (leftValues[index] > rightValues[index]) left.classList.add("winner");
        if (rightValues[index] > leftValues[index]) right.classList.add("winner");
        row.append(left, label, right);
        attributes.appendChild(row);
    });
    analysis.appendChild(attributes);
    compareContent.append(profiles, analysis);
}

function openPlayerComparison() {
    const table = db.tables[activeTab];
    if (!table?.rows.length) return;
    compareSearchOne.value = "";
    compareSearchTwo.value = "";
    populateCompareSelect(comparePlayerOne, "", selectedRowIndex >= 0 ? selectedRowIndex : 0);
    populateCompareSelect(comparePlayerTwo, "", table.rows.length > 1 ? (selectedRowIndex === 1 ? 0 : 1) : 0);
    renderPlayerComparison();
    compareModal.hidden = false;
}

function populateCompareSelect(select, query, preferredIndex) {
    const table = db.tables[activeTab];
    const nicknameIndex = table.header.findIndex(header => ["nickname", "nick", "name"].includes(normalizeFieldName(header)));
    const normalizedQuery = query.trim().toLowerCase();
    select.innerHTML = "";
    table.rows.forEach((row, index) => {
        if (normalizedQuery && !row.some(value => String(value ?? "").toLowerCase().includes(normalizedQuery))) return;
        const option = document.createElement("option");
        option.value = index;
        option.textContent = String(row[nicknameIndex] || `Player ${index + 1}`);
        select.appendChild(option);
    });
    if ([...select.options].some(option => Number(option.value) === preferredIndex)) select.value = String(preferredIndex);
}

function closePlayerComparison() { compareModal.hidden = true; }
btnCompare.addEventListener("click", openPlayerComparison);
comparePlayerOne.addEventListener("change", renderPlayerComparison);
comparePlayerTwo.addEventListener("change", renderPlayerComparison);
compareSearchOne.addEventListener("input", () => { populateCompareSelect(comparePlayerOne, compareSearchOne.value, Number(comparePlayerOne.value)); renderPlayerComparison(); });
compareSearchTwo.addEventListener("input", () => { populateCompareSelect(comparePlayerTwo, compareSearchTwo.value, Number(comparePlayerTwo.value)); renderPlayerComparison(); });
btnCloseCompare.addEventListener("click", closePlayerComparison);
btnCloseCompareFooter.addEventListener("click", closePlayerComparison);
compareModal.addEventListener("click", event => { if (event.target === compareModal) closePlayerComparison(); });

function getFilterDefinitions() {
    const table = db.tables[activeTab];
    if (!table) return [];
    const categoricalNames = new Set(["country", "nationality", "team", "teamid", "role", "role1", "role2", "role3", "gender", "status", "type", "tier", "retired", "fromfaceit", "disbanded"]);
    const numericNames = new Set([
        "rating", "earnings", "pr", "stars", "skill", "tactic", "tactics", "awp", "rifle", "pistol", "reaction", "grenade", "grenades", "clutch",
        "leader", "leadership", "creativity", "teamwork", "conflict", "morale", "loyalty", "productivity", "stress", "stressresistance", "immunity",
        "perception", "health", "strength", "endurance", "fitness", "physiotherapy", "psychology", "evaluation", "scouting", "playerability",
        "analysis", "insight", "vision", "delegation", "communication", "publicimage", "publicrelations", "financemanagement", "legalknowledge", "contractwork", "eventorganization"
    ]);
    return table.header.map((label, index) => ({ label, index, name: normalizeFieldName(label) }))
        .filter(field => categoricalNames.has(field.name) || numericNames.has(field.name))
        .map(field => {
            const values = table.rows.map(row => String(row[field.index] ?? "").trim()).filter(Boolean);
            const group = activeTab.toLowerCase() === "players"
                ? (categoricalNames.has(field.name) || ["rating", "earnings", "pr", "stars"].includes(field.name) ? "Basic" : `${getFieldSection(field.label)[0].toUpperCase()}${getFieldSection(field.label).slice(1)} stats`)
                : "Fields";
            return {
                ...field,
                group,
                type: categoricalNames.has(field.name) ? "select" : "range",
                slider: activeTab.toLowerCase() === "players" && group !== "Basic",
                values: [...new Set(values)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
            };
        });
}

function createFilterSegmented(field, savedValue, options) {
    const wrapper = document.createElement("div");
    wrapper.className = "gender-segmented filter-segmented";
    const hidden = document.createElement("input");
    hidden.type = "hidden";
    hidden.dataset.filterColumn = field.index;
    hidden.dataset.filterType = "equals";
    hidden.value = savedValue || "";
    options.forEach(([label, value]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        const update = () => {
            const active = hidden.value.toLowerCase() === value.toLowerCase();
            button.classList.toggle("active", active);
            button.setAttribute("aria-pressed", String(active));
        };
        update();
        button.addEventListener("click", () => {
            hidden.value = hidden.value.toLowerCase() === value.toLowerCase() ? "" : value;
            wrapper.querySelectorAll("button").forEach(option => option.classList.remove("active"));
            wrapper.querySelectorAll("button").forEach((option, index) => {
                const active = hidden.value.toLowerCase() === options[index][1].toLowerCase();
                option.classList.toggle("active", active);
                option.setAttribute("aria-pressed", String(active));
            });
        });
        wrapper.appendChild(button);
    });
    wrapper.appendChild(hidden);
    return wrapper;
}

function getFilterPickerOptions(field) {
    if (["country", "nationality"].includes(field.name)) {
        return Object.values(window.NOSCOPE_ASSETS?.Countries || {}).map(country => ({ label: country.name, value: country.name, image: country.path }));
    }
    const teamsTableName = Object.keys(db.tables).find(name => name.toLowerCase() === "teams");
    const teamsTable = teamsTableName ? db.tables[teamsTableName] : null;
    if (!teamsTable) return field.values.map(value => ({ label: value, value, image: "" }));
    const nameIndex = teamsTable.header.findIndex(header => normalizeFieldName(header) === "name");
    const idIndex = teamsTable.header.findIndex(header => ["teamid", "internalid", "id"].includes(normalizeFieldName(header)));
    return teamsTable.rows.map(row => {
        const name = String(row[nameIndex] ?? "").trim();
        const id = idIndex >= 0 ? String(row[idIndex] ?? "").trim() : name;
        return { label: name || id, value: field.name === "teamid" ? id : name, image: getBundledAssetCandidates(teamsTableName, row)[0] || "" };
    }).filter(option => option.label);
}

function createFilterSearchPicker(field, savedValue) {
    const options = getFilterPickerOptions(field);
    const picker = document.createElement("div");
    picker.className = "searchable-picker filter-searchable-picker";
    const hidden = document.createElement("input");
    hidden.type = "hidden";
    hidden.dataset.filterColumn = field.index;
    hidden.dataset.filterType = "equals";
    hidden.value = savedValue || "";
    const selected = options.find(option => option.value.toLowerCase() === hidden.value.toLowerCase());
    const icon = document.createElement("img");
    icon.className = "searchable-picker-selected-icon";
    icon.alt = "";
    icon.hidden = !selected?.image;
    if (selected?.image) icon.src = selected.image;
    const search = document.createElement("input");
    search.type = "search";
    search.placeholder = `All ${field.label}`;
    search.value = selected?.label || hidden.value;
    search.classList.toggle("has-icon", Boolean(selected?.image));
    const menu = document.createElement("div");
    menu.className = "searchable-picker-menu";
    const showOptions = () => {
        const query = search.value.trim().toLowerCase();
        menu.innerHTML = "";
        options.filter(option => option.label.toLowerCase().includes(query)).slice(0, 60).forEach(option => {
            const button = document.createElement("button");
            button.type = "button";
            if (option.image) { const image = document.createElement("img"); image.src = option.image; image.alt = ""; button.appendChild(image); }
            const text = document.createElement("span");
            text.textContent = option.label;
            button.appendChild(text);
            button.addEventListener("click", () => {
                hidden.value = option.value;
                search.value = option.label;
                icon.hidden = !option.image;
                if (option.image) icon.src = option.image;
                search.classList.toggle("has-icon", Boolean(option.image));
                picker.classList.remove("open");
            });
            menu.appendChild(button);
        });
        picker.classList.add("open");
    };
    search.addEventListener("focus", showOptions);
    search.addEventListener("input", () => { hidden.value = ""; icon.hidden = true; search.classList.remove("has-icon"); showOptions(); });
    document.addEventListener("click", event => { if (!picker.contains(event.target)) picker.classList.remove("open"); });
    picker.append(hidden, icon, search, menu);
    return picker;
}

function renderFilterModal() {
    const definitions = getFilterDefinitions();
    const savedFilters = filtersByTable[activeTab] || {};
    filterModalTitle.textContent = `FILTER ${activeTab.toUpperCase()}`;
    filterModalContent.innerHTML = "";
    const groups = new Map();
    definitions.forEach(definition => {
        if (!groups.has(definition.group)) groups.set(definition.group, []);
        groups.get(definition.group).push(definition);
    });
    groups.forEach((fields, groupName) => {
        const section = document.createElement("section");
        section.className = "filter-group";
        const heading = document.createElement("h3");
        heading.textContent = groupName;
        const grid = document.createElement("div");
        grid.className = "filter-grid";
        fields.forEach(field => {
            const control = document.createElement("label");
            control.className = "filter-control";
            const caption = document.createElement("span");
            caption.textContent = field.label;
            control.appendChild(caption);
            if (field.type === "select") {
                const savedValue = savedFilters[field.index]?.equals || "";
                if (["team", "teamid", "country", "nationality"].includes(field.name)) {
                    control.appendChild(createFilterSearchPicker(field, savedValue));
                    grid.appendChild(control);
                    return;
                }
                if (field.name === "gender") {
                    control.appendChild(createFilterSegmented(field, savedValue, [["M", "Male"], ["F", "Female"]]));
                    grid.appendChild(control);
                    return;
                }
                if (["retired", "fromfaceit", "disbanded"].includes(field.name)) {
                    control.appendChild(createFilterSegmented(field, savedValue, [["Yes", "True"], ["No", "False"]]));
                    grid.appendChild(control);
                    return;
                }
                const select = document.createElement("select");
                select.dataset.filterColumn = field.index;
                select.dataset.filterType = "equals";
                const all = document.createElement("option");
                all.value = "";
                all.textContent = `All ${field.label}`;
                select.appendChild(all);
                field.values.forEach(value => {
                    const option = document.createElement("option");
                    option.value = value;
                    option.textContent = value;
                    select.appendChild(option);
                });
                select.value = savedValue;
                control.appendChild(select);
            } else {
                const range = document.createElement("div");
                range.className = field.slider ? "attribute-filter-range" : "filter-range";
                if (field.slider) {
                    const savedMin = savedFilters[field.index]?.min;
                    const savedMax = savedFilters[field.index]?.max;
                    const isActive = savedMin !== undefined || savedMax !== undefined;
                    const dual = document.createElement("div");
                    dual.className = `dual-range-filter${isActive ? " active" : ""}`;
                    const minOutput = document.createElement("output");
                    const maxOutput = document.createElement("output");
                    const track = document.createElement("div");
                    track.className = "dual-range-track";
                    const inputs = {};
                    [["min", savedMin ?? 0], ["max", savedMax ?? 20]].forEach(([type, value]) => {
                        const input = document.createElement("input");
                        input.type = "range";
                        input.min = "0";
                        input.max = "20";
                        input.step = "1";
                        input.value = value;
                        input.dataset.filterColumn = field.index;
                        input.dataset.filterType = type;
                        input.dataset.filterActive = String(isActive);
                        input.className = `dual-range-${type}`;
                        inputs[type] = input;
                        track.appendChild(input);
                    });
                    const updateDualRange = changedType => {
                        if (Number(inputs.min.value) > Number(inputs.max.value)) {
                            if (changedType === "min") inputs.max.value = inputs.min.value;
                            else inputs.min.value = inputs.max.value;
                        }
                        minOutput.textContent = inputs.min.value;
                        maxOutput.textContent = inputs.max.value;
                        track.style.setProperty("--range-min", `${Number(inputs.min.value) / 20 * 100}%`);
                        track.style.setProperty("--range-max", `${Number(inputs.max.value) / 20 * 100}%`);
                    };
                    Object.entries(inputs).forEach(([type, input]) => input.addEventListener("input", () => {
                        inputs.min.dataset.filterActive = "true";
                        inputs.max.dataset.filterActive = "true";
                        dual.classList.add("active");
                        updateDualRange(type);
                    }));
                    updateDualRange();
                    dual.append(minOutput, track, maxOutput);
                    range.appendChild(dual);
                } else {
                    [["min", "Min"], ["max", "Max"]].forEach(([type, placeholder]) => {
                        const input = document.createElement("input");
                        input.dataset.filterColumn = field.index;
                        input.dataset.filterType = type;
                        input.type = "number";
                        input.placeholder = placeholder;
                        input.value = savedFilters[field.index]?.[type] ?? "";
                        range.appendChild(input);
                    });
                }
                control.appendChild(range);
            }
            grid.appendChild(control);
        });
        section.append(heading, grid);
        filterModalContent.appendChild(section);
    });
    if (!definitions.length) {
        filterModalContent.innerHTML = '<div class="filter-empty">No filterable fields are available for this category.</div>';
    }
}

function closeFilterModal() {
    filterModal.hidden = true;
}

function updateFilterButton() {
    const count = activeTab ? Object.keys(filtersByTable[activeTab] || {}).length : 0;
    btnFilter.classList.toggle("active", count > 0);
    btnFilter.textContent = count ? `Filter (${count})` : "Filter";
}

btnFilter.addEventListener("click", () => {
    if (!activeTab) return;
    renderFilterModal();
    filterModal.hidden = false;
});
btnCloseFilter.addEventListener("click", closeFilterModal);
btnCancelFilter.addEventListener("click", closeFilterModal);
filterModal.addEventListener("click", event => { if (event.target === filterModal) closeFilterModal(); });
btnClearFilters.addEventListener("click", () => {
    filtersByTable[activeTab] = {};
    updateFilterButton();
    renderFilterModal();
    currentPage = 1;
    renderTable(activeTab);
});
btnApplyFilters.addEventListener("click", () => {
    const filters = {};
    filterModalContent.querySelectorAll("[data-filter-column]").forEach(control => {
        if (control.value === "") return;
        if (control.type === "range" && control.dataset.filterActive !== "true") return;
        const column = control.dataset.filterColumn;
        const type = control.dataset.filterType;
        filters[column] ||= {};
        filters[column][type] = type === "equals" ? control.value : Number(control.value);
    });
    filtersByTable[activeTab] = filters;
    updateFilterButton();
    currentPage = 1;
    renderTable(activeTab);
    closeFilterModal();
});

btnSearch.addEventListener("click", doSearch);
function setViewMode(mode) {
    viewMode = mode;
    btnGridView.classList.toggle("active", mode === "grid");
    btnListView.classList.toggle("active", mode === "list");
    btnGridView.setAttribute("aria-pressed", String(mode === "grid"));
    btnListView.setAttribute("aria-pressed", String(mode === "list"));
    if (activeTab) renderTable(activeTab);
}
btnGridView.addEventListener("click", () => setViewMode("grid"));
btnListView.addEventListener("click", () => setViewMode("list"));
searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doSearch();
});
searchInput.addEventListener("input", doSearch);

function doSearch() {
    if (!activeTab) return;
    searchTerm = searchInput.value.toLowerCase().trim();
    currentPage = 1;
    renderTable(activeTab);
}

editForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (editingRowIndex < 0) return;
    captureVisibleFields();
    if (activeTab.toLowerCase() === "players") {
        const ratingIndex = db.tables[activeTab].header.findIndex(label => ["rating", "overall", "overallrating"].includes(normalizeFieldName(label)));
        if (ratingIndex >= 0) editDraft[ratingIndex] = calculatePlayerRating(editDraft).toFixed(2);
    }
    const nextAssetKey = getAssetKey(activeTab, editDraft);
    if (pendingAsset instanceof Blob && !nextAssetKey) {
        alert("Enter an Internal ID, ID, nickname, or name before saving an image.");
        return;
    }
    db.tables[activeTab].rows[editingRowIndex] = [...editDraft];
    if (nextAssetKey) {
        if (pendingAsset instanceof Blob) {
            await AssetDB.put(nextAssetKey, pendingAsset);
        } else if (pendingAsset === null) {
            await AssetDB.remove(currentAssetKey || nextAssetKey);
        } else if (currentAssetKey && currentAssetKey !== nextAssetKey) {
            const existingAsset = await AssetDB.get(currentAssetKey);
            if (existingAsset) {
                await AssetDB.put(nextAssetKey, existingAsset);
                await AssetDB.remove(currentAssetKey);
            }
        }
    }
    closeEditor();
    renderTable(activeTab);
});
assetFileInput.addEventListener("change", () => {
    const file = assetFileInput.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
        alert("Please choose a PNG, JPEG, or WebP image.");
        assetFileInput.value = "";
        return;
    }
    pendingAsset = file;
    showAssetPreview(file);
    btnRemoveAsset.disabled = false;
});
btnRemoveAsset.addEventListener("click", () => {
    pendingAsset = null;
    assetFileInput.value = "";
    assetPreview.innerHTML = "<span>No image</span>";
    btnRemoveAsset.disabled = true;
});
btnCopyAssetLink.addEventListener("click", async () => {
    const candidates = editingRowIndex >= 0 ? getBundledAssetCandidates(activeTab, db.tables[activeTab].rows[editingRowIndex]) : [];
    const value = candidates[0] || currentAssetKey || "No asset link is available yet.";
    try {
        await navigator.clipboard.writeText(value);
        btnCopyAssetLink.textContent = "Copied";
        setTimeout(() => { btnCopyAssetLink.innerHTML = '<span aria-hidden="true">&#128279;</span> LINK'; }, 1200);
    } catch {
        prompt("Asset reference", value);
    }
});
document.querySelectorAll("[data-editor-page]").forEach(button => button.addEventListener("click", () => {
    captureVisibleFields();
    editorPage = button.dataset.editorPage;
    updateEditorNavigation();
    renderEditorFields();
}));
document.querySelectorAll("[data-stats-page]").forEach(button => button.addEventListener("click", () => {
    captureVisibleFields();
    statsPage = button.dataset.statsPage;
    updateEditorNavigation();
    renderEditorFields();
}));
document.getElementById("btn-close-editor").addEventListener("click", () => closeEditor(true));
document.getElementById("btn-cancel-edit").addEventListener("click", () => closeEditor(true));
editModal.addEventListener("click", event => { if (event.target === editModal) closeEditor(true); });
document.addEventListener("keydown", event => { if (event.key === "Escape" && !editModal.hidden) closeEditor(true); });

async function saveEmdbBlob(blob, suggestedName) {
    const cleanName = String(suggestedName || "edited.emdb").trim();
    const fileName = cleanName.toLowerCase().endsWith(".emdb") ? cleanName : `${cleanName}.emdb`;
    if (typeof window.showSaveFilePicker === "function") {
        const handle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [{
                description: "Esports Manager Database",
                accept: { "application/octet-stream": [".emdb"] }
            }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return handle.name || fileName;
    }

    // Firefox and Safari do not currently expose the native Save As API.
    // Their standard download flow is used as a compatibility fallback.
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return fileName;
}

// Save as EMDB
btnSave.addEventListener("click", async () => {
    if (!db.roster_order) return;
    setStatus("Saving...", "loading");
    
    try {
        const jszip = new JSZip();
        
        for (const fname of TABLE_FILES) {
            const tableName = fname.replace(".csv", "");
            if (db.tables[tableName]) {
                const csvContent = Papa.unparse({
                    fields: db.tables[tableName].header,
                    data: db.tables[tableName].rows
                }, { delimiter: ";" });
                jszip.file(fname, "\uFEFF" + csvContent);
            }
        }
        
        jszip.file(ROSTER_FILE, JSON.stringify(db.roster_order, null, 2));
        const zipArrayBuffer = await jszip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
        const emdbBytes = await encryptEMDB(zipArrayBuffer);
        
        const blob = new Blob([emdbBytes], { type: "application/octet-stream" });
        const savedName = await saveEmdbBlob(blob, db.fileName || "edited.emdb");
        db.fileName = savedName;
        setStatus("Saved: " + savedName, "success");
        
    } catch (err) {
        if (err?.name === "AbortError") {
            setStatus("Save cancelled.", "");
            return;
        }
        console.error(err);
        setStatus("Error saving file.", "error");
        alert(err.message);
    }
});

// Export CSVs as ZIP (Fallback for browsers that don't support showDirectoryPicker)
btnExportCsvs.addEventListener("click", async () => {
    if (!db.roster_order) return;
    setStatus("Zipping CSVs...", "loading");
    
    try {
        const jszip = new JSZip();
        
        for (const fname of TABLE_FILES) {
            const tableName = fname.replace(".csv", "");
            if (db.tables[tableName]) {
                const csvContent = Papa.unparse({
                    fields: db.tables[tableName].header,
                    data: db.tables[tableName].rows
                }, { delimiter: ";" });
                
                jszip.file(fname, "\uFEFF" + csvContent);
            }
        }
        
        jszip.file(ROSTER_FILE, JSON.stringify(db.roster_order, null, 2));
        
        const zipBlob = await jszip.generateAsync({ type: "blob", compression: "DEFLATE" });
        
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "exported_csvs.zip";
        a.click();
        
        URL.revokeObjectURL(url);
        setStatus(`Exported CSVs as ZIP`, "success");
    } catch (err) {
        console.error(err);
        setStatus("Error exporting CSVs.", "error");
        alert(err.message);
    }
});
