
const AES_KEY_HEX = "E47A2C9F01D85B33A6F27EC4980D4B613EB5792ADF148C506FC3279105E6BA48";
const TABLE_FILES = ["Players.csv", "Sponsors.csv", "Staff.csv", "Teams.csv", "Tournaments.csv"];
const ROSTER_FILE = "roster_order.json";
const PAGE_SIZE = 25;
const LIBRARY_DATABASES = [
    {
        id: "noscope",
        name: "NoScope Default DB",
        fileName: "pzy_s_-_NoScope_MEGA_DB.emdb",
        owner: "NoScope",
        sourceUrl: "https://emdb.gg/?clone=user%3A76561198403405269%3A1"
    },
    {
        id: "em2026-default",
        name: "Default EM2026 Database",
        fileName: "database.emdb",
        owner: "EM2026 Developers",
        sourceUrl: "https://emdb.gg/?view=default"
    },
    {
        id: "luca",
        name: "Luca's GLOBAL UPDATED",
        fileName: "luccaneta_s_GLOBAL_UPDATED.emdb",
        owner: "Luca",
        sourceUrl: "https://emdb.gg/?view=user%3A76561199587057820%3A1"
    },
    {
        id: "world-updated",
        name: "4's WorldUpdated",
        fileName: "World_Updated.emdb",
        owner: "4",
        sourceUrl: "https://emdb.gg/?view=user%3A76561199766255887%3A2"
    },
    {
        id: "roy",
        name: "Roy's EMDB Personal Edition",
        fileName: "Roys_EMDB__Personnal_Edition_.emdb",
        owner: "Roy",
        sourceUrl: "https://emdb.gg/?view=user%3A76561198094654818%3A1"
    }
];
const DEFAULT_LIBRARY_DATABASE = LIBRARY_DATABASES[0];
const DEFAULT_DB_FILE = DEFAULT_LIBRARY_DATABASE.fileName;

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
let searchRenderTimer = null;
let viewMode = "grid";
const gridSortStates = {
    players: { key: "leaderboard", direction: "desc" },
    teams: { key: "ers", direction: "desc" },
    staff: { key: "rating", direction: "desc" },
    staffs: { key: "rating", direction: "desc" },
    sponsors: { key: "tier", direction: "desc" },
    tournaments: { key: "prizefund", direction: "desc" }
};
const gridSortOptionsByTable = {
    players: [
        { value: "alphabetical", label: "Alphabetical" },
        { value: "leaderboard", label: "Rating" },
        { value: "teamErs", label: "Team ERS" }
    ],
    teams: [
        { value: "alphabetical", label: "Alphabetical" },
        { value: "ers", label: "ERS" }
    ],
    staff: [
        { value: "alphabetical", label: "Alphabetical" },
        { value: "rating", label: "Rating" },
        { value: "teamErs", label: "Team ERS" }
    ],
    staffs: [
        { value: "alphabetical", label: "Alphabetical" },
        { value: "rating", label: "Rating" },
        { value: "teamErs", label: "Team ERS" }
    ],
    sponsors: [
        { value: "alphabetical", label: "Alphabetical" },
        { value: "tier", label: "Tier" }
    ],
    tournaments: [
        { value: "alphabetical", label: "Alphabetical" },
        { value: "prizefund", label: "Prize Fund" }
    ]
};
const filtersByTable = {};
const listSortByTable = {};
const staffListViewPresets = {
    general: { label: "General" },
    coaching: { label: "Coaching", rolePattern: /coach|manager/, excludePattern: /eventmanager|prmanager|publicrelationsmanager|communicationsmanager/, skillNames: getStaffRoleSkillNames("coach") },
    analyst: { label: "Analysis", rolePattern: /analyst|analysis/, skillNames: getStaffRoleSkillNames("analyst") },
    scout: { label: "Scouting", rolePattern: /scout/, skillNames: getStaffRoleSkillNames("scout") },
    physio: { label: "Physio", rolePattern: /physio|medical|fitness/, skillNames: getStaffRoleSkillNames("physio") },
    psychology: { label: "Psychology", rolePattern: /psych/, skillNames: getStaffRoleSkillNames("psychologist") },
    executive: { label: "Executive", rolePattern: /^(ceo|chiefexecutive|chiefexecutiveofficer)$/, skillNames: getStaffRoleSkillNames("ceo") },
    finance: { label: "Finance", rolePattern: /^(cfo|chieffinancial|chieffinancialofficer)$/, skillNames: getStaffRoleSkillNames("cfo") },
    events: { label: "Events", rolePattern: /eventmanager|eventorganizer|eventcoordinator/, skillNames: getStaffRoleSkillNames("eventmanager") },
    publicrelations: { label: "PR", rolePattern: /^(prmanager|publicrelationsmanager|communicationsmanager)$/, skillNames: getStaffRoleSkillNames("prmanager") },
    legal: { label: "Legal", rolePattern: /lawyer|attorney|legalcounsel|solicitor/, skillNames: getStaffRoleSkillNames("lawyer") }
};
const playerListViewPresets = {
    general: { label: "General" },
    gameplay: { label: "Gameplay Attributes", section: "gameplay" },
    mental: { label: "Mental Attributes", section: "mental" },
    physical: { label: "Physical Attributes", section: "physical" }
};
const teamListViewPresets = {
    general: { label: "General" },
    roster: { label: "Roster" }
};
const listViewStates = {
    players: "general",
    teams: "general",
    staff: "general",
    staffs: "general"
};
const listViewOptionsByTable = {
    players: Object.entries(playerListViewPresets).map(([value, preset]) => ({ value, label: preset.label })),
    teams: Object.entries(teamListViewPresets).map(([value, preset]) => ({ value, label: preset.label })),
    staff: Object.entries(staffListViewPresets).map(([value, preset]) => ({ value, label: preset.label })),
    staffs: Object.entries(staffListViewPresets).map(([value, preset]) => ({ value, label: preset.label }))
};
let editorPage = "general";
let statsPage = "gameplay";
let editDraft = [];
let currentAssetKey = null;
let pendingAsset = undefined;
let teamRosterOriginal = [];
let teamRosterDraft = [];
let teamRosterDragIndex = -1;
let teamRosterDragState = null;
const playerLeaderboardRankCache = new Map();
const SEARCH_RENDER_DELAY_MS = 120;
const TEAM_ROSTER_FLIP_DELAY_MS = 1000;

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
const btnDeselectAll = document.getElementById("btn-deselect-all");
const searchInput = document.getElementById("search-input");
const btnGridView = document.getElementById("btn-grid-view");
const btnListView = document.getElementById("btn-list-view");
const playerGridSort = document.getElementById("player-grid-sort");
const playerGridSortKey = document.getElementById("player-grid-sort-key");
const playerGridSortDirection = document.getElementById("player-grid-sort-direction");
const listViewPresets = document.getElementById("list-view-presets");
const listViewPreset = document.getElementById("list-view-preset");
const btnFilter = document.getElementById("btn-filter");
const filterModal = document.getElementById("filter-modal");
const filterModalContent = document.getElementById("filter-modal-content");
const filterModalTitle = document.getElementById("filter-modal-title");
const btnCloseFilter = document.getElementById("btn-close-filter");
const btnCancelFilter = document.getElementById("btn-cancel-filter");
const btnClearFilters = document.getElementById("btn-clear-filters");
const btnApplyFilters = document.getElementById("btn-apply-filters");
const btnCompare = document.getElementById("btn-compare");
const btnGuide = document.getElementById("btn-guide");
const guideModal = document.getElementById("guide-modal");
const btnCloseGuide = document.getElementById("btn-close-guide");
const btnCloseGuideFooter = document.getElementById("btn-close-guide-footer");
const btnLibrary = document.getElementById("btn-library");
const libraryModal = document.getElementById("library-modal");
const libraryDatabaseList = document.getElementById("library-database-list");
const btnCloseLibrary = document.getElementById("btn-close-library");
const btnAssets = document.getElementById("btn-assets");
const assetsModal = document.getElementById("assets-modal");
const btnCloseAssets = document.getElementById("btn-close-assets");
const btnCloseAssetsFooter = document.getElementById("btn-close-assets-footer");
const compareModal = document.getElementById("compare-modal");
const comparePlayerOne = document.getElementById("compare-player-one");
const comparePlayerTwo = document.getElementById("compare-player-two");
const compareSearchOne = document.getElementById("compare-search-one");
const compareSearchTwo = document.getElementById("compare-search-two");
const compareContent = document.getElementById("compare-content");
const btnCloseCompare = document.getElementById("btn-close-compare");
const btnCloseCompareFooter = document.getElementById("btn-close-compare-footer");
const confirmModal = document.getElementById("confirm-modal");
const confirmModalMessage = document.getElementById("confirm-modal-message");
const btnCancelConfirm = document.getElementById("btn-cancel-confirm");
const btnAcceptConfirm = document.getElementById("btn-accept-confirm");
let resolveConfirmation = null;
const librarySummaryCache = new Map();

function requestConfirmation(message) {
    confirmModalMessage.textContent = message;
    confirmModal.hidden = false;
    btnCancelConfirm.focus();
    return new Promise(resolve => {
        resolveConfirmation = resolve;
    });
}

function closeConfirmation(confirmed) {
    if (confirmModal.hidden) return;
    confirmModal.hidden = true;
    const resolve = resolveConfirmation;
    resolveConfirmation = null;
    if (resolve) resolve(confirmed);
}

btnCancelConfirm.addEventListener("click", () => closeConfirmation(false));
btnAcceptConfirm.addEventListener("click", () => closeConfirmation(true));
confirmModal.addEventListener("click", event => {
    if (event.target === confirmModal) closeConfirmation(false);
});
document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !confirmModal.hidden) closeConfirmation(false);
});

async function getLibraryDatabaseSummary(entry) {
    const cached = librarySummaryCache.get(entry.id);
    if (cached) return cached;
    const path = `data/${entry.fileName}`;
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`${entry.name} request failed (${response.status})`);
    const lastModified = response.headers.get("Last-Modified");
    const blob = await response.blob();
    const decryptedZipBuffer = await decryptEMDB(await blob.arrayBuffer());
    const zip = await JSZip.loadAsync(decryptedZipBuffer);
    const counts = {};
    for (const fname of TABLE_FILES) {
        const tableName = fname.replace(".csv", "");
        const fileObj = zip.file(fname);
        if (!fileObj) {
            counts[tableName] = 0;
            continue;
        }
        const text = await fileObj.async("text");
        const parsed = Papa.parse(text, { skipEmptyLines: true });
        counts[tableName] = Math.max(0, (parsed.data?.length || 0) - 1);
    }
    const summary = {
        ...entry,
        path,
        lastUpdated: lastModified ? new Date(lastModified) : null,
        counts
    };
    librarySummaryCache.set(entry.id, summary);
    return summary;
}

function formatLibraryCount(value) {
    return new Intl.NumberFormat().format(Number(value) || 0);
}

function formatLibraryTimestamp(value) {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) return "Last updated: unknown";
    return `Last updated: ${new Intl.DateTimeFormat(undefined, {
        dateStyle: "full",
        timeStyle: "long"
    }).format(value)}`;
}

function getLibraryStatIcon(label) {
    const icons = {
        Players: '<svg viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 9a7 7 0 0 1 14 0H5Z"/></svg>',
        Teams: '<svg viewBox="0 0 24 24"><path d="M8 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3ZM8 13a5 5 0 0 0-5 5v2h10v-2a5 5 0 0 0-5-5Zm8 0a4.9 4.9 0 0 0-2.2.52A6.9 6.9 0 0 1 15 18v2h6v-2a5 5 0 0 0-5-5Z"/></svg>',
        Staff: '<svg viewBox="0 0 24 24"><path d="M12 3a4 4 0 0 1 4 4 4 4 0 0 1-8 0 4 4 0 0 1 4-4Zm-6 18v-3a6 6 0 0 1 12 0v3H6Zm3-7.5h6l-3 3-3-3Z"/></svg>',
        Sponsors: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15.8V19h-2v-1.2a5.2 5.2 0 0 1-3-1.35l1.1-1.62A4.2 4.2 0 0 0 12 16c1.08 0 1.7-.38 1.7-1.05 0-.73-.78-.98-2.17-1.38-1.65-.48-3.1-1.1-3.1-3.05 0-1.5 1.02-2.62 2.57-2.98V6h2v1.5a4.5 4.5 0 0 1 2.55 1.1l-1.03 1.66A3.45 3.45 0 0 0 12 9.38c-.95 0-1.48.38-1.48 1 0 .67.68.9 2.02 1.28 1.75.5 3.25 1.14 3.25 3.13 0 1.56-1.08 2.68-2.79 3.01Z"/></svg>',
        Tournaments: '<svg viewBox="0 0 24 24"><path d="M7 4h10v3h3v2a5 5 0 0 1-5 5h-.35A5.02 5.02 0 0 1 13 15.9V19h4v2H7v-2h4v-3.1A5.02 5.02 0 0 1 9.35 14H9a5 5 0 0 1-5-5V7h3V4Zm10 5v2.83A3 3 0 0 0 18 9h-1ZM6 9a3 3 0 0 0 1 2.83V9H6Z"/></svg>'
    };
    return icons[label] || "";
}

function createLibraryDatabaseCard(summary) {
    const card = document.createElement("article");
    card.className = "library-db-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Open ${summary.name}`);
    const header = document.createElement("div");
    header.className = "library-db-header";
    const title = document.createElement("div");
    title.className = "library-db-title";
    const name = document.createElement("h3");
    name.textContent = summary.name;
    const meta = document.createElement("p");
    meta.textContent = `by ${summary.owner} · bundled default database · ${summary.fileName}`;
    const updated = document.createElement("p");
    updated.className = "library-db-updated";
    updated.textContent = formatLibraryTimestamp(summary.lastUpdated);
    title.append(name, meta, updated);
    header.appendChild(title);
    const stats = document.createElement("div");
    stats.className = "library-db-stats";
    [
        ["Players", summary.counts.Players],
        ["Teams", summary.counts.Teams],
        ["Staff", summary.counts.Staff],
        ["Tournaments", summary.counts.Tournaments]
    ].forEach(([label, value]) => {
        const stat = document.createElement("span");
        stat.className = "library-db-stat";
        const icon = document.createElement("span");
        icon.className = "library-db-stat-icon";
        icon.innerHTML = getLibraryStatIcon(label);
        const number = document.createElement("strong");
        number.textContent = formatLibraryCount(value);
        const caption = document.createElement("span");
        caption.className = "library-db-stat-label";
        caption.textContent = label;
        stat.append(icon, number, caption);
        stats.appendChild(stat);
    });
    const hint = document.createElement("p");
    hint.className = "library-db-hint";
    hint.textContent = "Click to open this database.";
    const actions = document.createElement("div");
    actions.className = "library-db-actions";
    const download = document.createElement("a");
    download.className = "library-db-action";
    download.href = summary.path;
    download.download = summary.fileName;
    download.innerHTML = '<span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M11 3h2v9l3.3-3.3 1.4 1.4L12 15.8l-5.7-5.7 1.4-1.4L11 12V3Zm-6 14h2v2h10v-2h2v4H5v-4Z"/></svg></span> Download';
    const source = document.createElement("a");
    source.className = "library-db-action";
    source.href = summary.sourceUrl;
    source.target = "_blank";
    source.rel = "noopener";
    source.innerHTML = '<span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M14 3h7v7h-2V6.41l-8.3 8.3-1.4-1.42 8.29-8.29H14V3ZM5 5h6v2H7v10h10v-4h2v6H5V5Z"/></svg></span> EMDB.GG';
    [download, source].forEach(link => link.addEventListener("click", event => event.stopPropagation()));
    actions.append(download, source);
    card.append(header, stats, actions, hint);
    const openDatabase = async () => {
        const loaded = await loadBundledDatabase(summary, card);
        if (loaded) closeLibraryPanel();
    };
    card.addEventListener("click", openDatabase);
    card.addEventListener("keydown", event => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        openDatabase();
    });
    return card;
}

async function renderLibraryPanel() {
    libraryDatabaseList.innerHTML = '<div class="library-loading">Loading database library...</div>';
    try {
        const summaries = await Promise.all(LIBRARY_DATABASES.map(entry => getLibraryDatabaseSummary(entry)));
        libraryDatabaseList.replaceChildren(...summaries.map(summary => createLibraryDatabaseCard(summary)));
    } catch (error) {
        console.error(error);
        libraryDatabaseList.innerHTML = '<div class="library-error">Unable to read the bundled databases. Open NoScope through localhost to use the library.</div>';
    }
}

async function openLibraryPanel() {
    libraryModal.hidden = false;
    btnCloseLibrary.focus();
    await renderLibraryPanel();
}

function closeLibraryPanel() {
    libraryModal.hidden = true;
}

btnLibrary.addEventListener("click", openLibraryPanel);
btnCloseLibrary.addEventListener("click", closeLibraryPanel);
libraryModal.addEventListener("click", event => {
    if (event.target === libraryModal) closeLibraryPanel();
});
document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !libraryModal.hidden) closeLibraryPanel();
});

function openGuidePanel() {
    guideModal.hidden = false;
    btnCloseGuide.focus();
}

function closeGuidePanel() {
    guideModal.hidden = true;
}

btnGuide.addEventListener("click", openGuidePanel);
btnCloseGuide.addEventListener("click", closeGuidePanel);
btnCloseGuideFooter.addEventListener("click", closeGuidePanel);
guideModal.addEventListener("click", event => {
    if (event.target === guideModal) closeGuidePanel();
});
document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !guideModal.hidden) closeGuidePanel();
});

function openAssetsPanel() {
    assetsModal.hidden = false;
    btnCloseAssets.focus();
}

function closeAssetsPanel() {
    assetsModal.hidden = true;
}

btnAssets.addEventListener("click", openAssetsPanel);
btnCloseAssets.addEventListener("click", closeAssetsPanel);
btnCloseAssetsFooter.addEventListener("click", closeAssetsPanel);
assetsModal.addEventListener("click", event => {
    if (event.target === assetsModal) closeAssetsPanel();
});
document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !assetsModal.hidden) closeAssetsPanel();
});

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
        invalidatePlayerLeaderboardRanks();
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
        return true;
        
    } catch (err) {
        console.error(err);
        setStatus("Error opening file.", "error");
        alert(err.message);
        return false;
    }
    
}

async function fetchBundledDatabaseBlob(entry = DEFAULT_LIBRARY_DATABASE) {
    const response = await fetch(`data/${entry.fileName}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${entry.name} request failed (${response.status})`);
    return response.blob();
}

async function loadBundledDatabase(entry = DEFAULT_LIBRARY_DATABASE, triggerButton = btnLoadDefault) {
    if (triggerButton) triggerButton.disabled = true;
    if (triggerButton !== btnLoadDefault) btnLoadDefault.disabled = true;
    try {
        const blob = await fetchBundledDatabaseBlob(entry);
        return await loadEMDBFile(new File([blob], entry.fileName, { type: "application/octet-stream" }));
    } catch (error) {
        console.error(error);
        setStatus(`Unable to load ${entry.name}.`, "error");
        alert(`${entry.name} could not be loaded. Run NoScope through its local web server or app runtime, then try again.`);
        return false;
    } finally {
        if (triggerButton) triggerButton.disabled = false;
        btnLoadDefault.disabled = false;
    }
}

async function loadDefaultDatabase(triggerButton = btnLoadDefault) {
    return loadBundledDatabase(DEFAULT_LIBRARY_DATABASE, triggerButton);
}

fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await loadEMDBFile(file);
    fileInput.value = "";
});

btnLoadDefault.addEventListener("click", async () => {
    await loadDefaultDatabase(btnLoadDefault);
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
    invalidatePlayerLeaderboardRanks();
    
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
    updatePlayerGridSortControls();
    updateListViewControls();
    btnCompare.hidden = tableName.toLowerCase() !== "players";
    renderTable(tableName);
}

function getGridSortOptions(tableName = activeTab) {
    return gridSortOptionsByTable[String(tableName || "").toLowerCase()] || [];
}

function getGridSortState(tableName = activeTab) {
    return gridSortStates[String(tableName || "").toLowerCase()] || null;
}

function getDefaultGridSortDirectionForKey(key) {
    return key === "alphabetical" ? "asc" : "desc";
}

function updatePlayerGridSortControls() {
    const options = getGridSortOptions();
    const visible = options.length > 0 && viewMode === "grid";
    playerGridSort.hidden = !visible;
    if (!visible) return;
    const sortState = getGridSortState();
    if (!options.some(option => option.value === sortState.key)) sortState.key = options[0].value;
    playerGridSortKey.replaceChildren(...options.map(option => {
        const item = document.createElement("option");
        item.value = option.value;
        item.textContent = option.label;
        return item;
    }));
    playerGridSortKey.value = sortState.key;
    const isAscending = sortState.direction === "asc";
    playerGridSortDirection.textContent = isAscending ? "↑" : "↓";
    playerGridSortDirection.setAttribute("aria-label", `Sort ${isAscending ? "ascending" : "descending"}`);
}

function getListViewOptions(tableName = activeTab) {
    return listViewOptionsByTable[String(tableName || "").toLowerCase()] || [];
}

function getListViewState(tableName = activeTab) {
    const normalizedTable = String(tableName || "").toLowerCase();
    return listViewStates[normalizedTable] || "";
}

function updateListViewControls() {
    const options = getListViewOptions();
    const visible = options.length > 0 && viewMode === "list";
    listViewPresets.hidden = !visible;
    if (!visible) return;
    const normalizedTable = activeTab.toLowerCase();
    if (!options.some(option => option.value === listViewStates[normalizedTable])) {
        listViewStates[normalizedTable] = options[0].value;
    }
    listViewPreset.replaceChildren(...options.map(option => {
        const item = document.createElement("option");
        item.value = option.value;
        item.textContent = option.label;
        return item;
    }));
    listViewPreset.value = listViewStates[normalizedTable];
}

function filterRowsByListView(tableName, entries) {
    const normalizedTable = tableName.toLowerCase();
    if (!["staff", "staffs"].includes(normalizedTable)) return entries;
    const table = db.tables[tableName];
    const presetKey = getListViewState(tableName) || "general";
    return entries.filter(entry => staffRowMatchesListView(table, entry.row, presetKey));
}

let selectedRowElement = null;
let selectedRowElements = new Map();
let selectedRowIndex = -1;
let rosterPreviewTimer = null;
let rosterPreview = null;

function renderTable(tableName) {
    const tableData = db.tables[tableName];
    tableContainer.innerHTML = "";
    selectedRowElement = null;
    selectedRowElements = new Map();
    selectedRowIndex = -1;
    updateSelectionActions();
    
    if(!tableData) return;

    const filteredRows = tableData.rows
        .map((row, originalIndex) => ({ row, originalIndex }))
        .filter(entry => !searchTerm || entry.row.some(value => String(value ?? "").toLowerCase().includes(searchTerm)))
        .filter(entry => rowMatchesFilters(entry.row, filtersByTable[tableName] || {}));
    const presetRows = viewMode === "list" ? filterRowsByListView(tableName, filteredRows) : filteredRows;
    const viewRows = viewMode === "list" ? sortListEntries(tableName, presetRows) : sortGridEntries(tableName, presetRows);
    const pageCount = Math.max(1, Math.ceil(viewRows.length / PAGE_SIZE));
    currentPage = Math.min(Math.max(currentPage, 1), pageCount);
    const pageStart = (currentPage - 1) * PAGE_SIZE;
    const pageRows = viewRows.slice(pageStart, pageStart + PAGE_SIZE);
    const content = viewMode === "list" ? createListView(tableName, pageRows) : document.createElement("div");
    if (viewMode === "grid") {
        content.className = "record-grid";
        pageRows.forEach(({ row, originalIndex }) => content.appendChild(createRowElement(row, originalIndex)));
    }
    if (!viewRows.length) {
        const noResults = document.createElement("div");
        noResults.className = "search-no-results";
        noResults.textContent = searchInput.value.trim()
            ? `No ${tableName.toLowerCase()} match “${searchInput.value.trim()}”.`
            : `No ${tableName.toLowerCase()} match the current filters.`;
        content.appendChild(noResults);
    }
    tableContainer.appendChild(content);
    renderPagination(viewRows.length);
}

function compareGridSortValues(left, right, direction, comparator) {
    const leftMissing = left === null || left === undefined || left === "";
    const rightMissing = right === null || right === undefined || right === "";
    if (leftMissing || rightMissing) {
        if (leftMissing && rightMissing) return 0;
        return leftMissing ? 1 : -1;
    }
    return comparator(left, right) * (direction === "desc" ? -1 : 1);
}

function getPlayerDisplayNameForSort(table, row) {
    return getTableValue(table, row, ["nickname", "nick", "internalid", "name", "firstname", "surname"]).toLocaleLowerCase();
}

function getPlayerTeamErsForSort(table, row, teamErsCache = new Map()) {
    const teamReference = getTableValue(table, row, ["team", "teamname", "teamid"]);
    const cacheKey = String(teamReference || "").trim().toLowerCase();
    if (teamErsCache.has(cacheKey)) return teamErsCache.get(cacheKey);
    const match = findTeamRowByReference(teamReference);
    if (!match) {
        teamErsCache.set(cacheKey, null);
        return null;
    }
    const value = getTableValue(match.table, match.row, ["ers", "erspoints", "ersrating", "rating"]);
    const numericValue = Number.parseFloat(String(value).replace(/[$,\s]/g, ""));
    const result = Number.isFinite(numericValue) ? numericValue : null;
    teamErsCache.set(cacheKey, result);
    return result;
}

function getSponsorDisplayNameForSort(table, row) {
    return getTableValue(table, row, ["name", "sponsorname", "companyname", "brand", "internalid", "id"]).toLocaleLowerCase();
}

function getSponsorTierForSort(table, row) {
    const tier = normalizeFieldName(getTableValue(table, row, ["tier", "rank", "level"]));
    const tierOrder = { d: 1, c: 2, b: 3, a: 4, s: 5 };
    return tierOrder[tier.charAt(0)] || null;
}

function getStaffDisplayNameForSort(table, row) {
    return getTableValue(table, row, ["nickname", "nick", "name", "firstname", "forename", "surname", "lastname", "internalid", "id"]).toLocaleLowerCase();
}

function getTeamDisplayNameForSort(table, row) {
    return getTableValue(table, row, ["nick", "nickname", "name", "abbreviation", "shortname", "teamid", "internalid", "id"]).toLocaleLowerCase();
}

function getTeamErsForSort(table, row) {
    const value = getTableValue(table, row, ["ers", "erspoints", "ersrating", "rating"]);
    const numericValue = Number.parseFloat(String(value).replace(/[$,\s]/g, ""));
    return Number.isFinite(numericValue) ? numericValue : null;
}

function getTournamentDisplayNameForSort(table, row) {
    return getTableValue(table, row, ["name", "title", "shortname", "abbreviation", "internalid", "id"]).toLocaleLowerCase();
}

function getTournamentPrizeFundForSort(table, row) {
    const value = getTableValue(table, row, ["prizefund", "prizepool", "prizemoney", "prize", "fund"]);
    const numericValue = Number.parseFloat(String(value).replace(/[$,\s]/g, ""));
    return Number.isFinite(numericValue) ? numericValue : null;
}

function sortGridEntries(tableName, entries) {
    const normalizedTable = tableName.toLowerCase();
    const sortState = getGridSortState(tableName);
    if (!sortState) return entries;
    const table = db.tables[tableName];
    const { key, direction } = sortState;
    const teamErsCache = new Map();
    return entries.map(entry => {
        let sortValue = "";
        if (normalizedTable === "players") {
            if (key === "leaderboard") sortValue = getPlayerLeaderboardRank(tableName, entry.originalIndex);
            else if (key === "teamErs") sortValue = getPlayerTeamErsForSort(table, entry.row, teamErsCache);
            else sortValue = getPlayerDisplayNameForSort(table, entry.row);
        } else if (normalizedTable === "sponsors") {
            if (key === "tier") sortValue = getSponsorTierForSort(table, entry.row);
            else sortValue = getSponsorDisplayNameForSort(table, entry.row);
        } else if (["staff", "staffs"].includes(normalizedTable)) {
            if (key === "rating") sortValue = calculateStaffRatingForTable(table, entry.row);
            else if (key === "teamErs") sortValue = getPlayerTeamErsForSort(table, entry.row, teamErsCache);
            else sortValue = getStaffDisplayNameForSort(table, entry.row);
        } else if (normalizedTable === "teams") {
            if (key === "ers") sortValue = getTeamErsForSort(table, entry.row);
            else sortValue = getTeamDisplayNameForSort(table, entry.row);
        } else if (normalizedTable === "tournaments") {
            if (key === "prizefund") sortValue = getTournamentPrizeFundForSort(table, entry.row);
            else sortValue = getTournamentDisplayNameForSort(table, entry.row);
        }
        return { ...entry, sortValue };
    }).sort((a, b) => {
        const result = key === "alphabetical"
            ? compareGridSortValues(a.sortValue, b.sortValue, direction, (left, right) => String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" }))
            : key === "leaderboard"
                ? compareGridSortValues(a.sortValue, b.sortValue, direction, (left, right) => Number(right) - Number(left))
                : compareGridSortValues(a.sortValue, b.sortValue, direction, (left, right) => Number(left) - Number(right));
        return result || a.originalIndex - b.originalIndex;
    }).map(({ sortValue, ...entry }) => entry);
}

function getGenericListFields(tableName) {
    const source = db.tables[tableName];
    const normalizedTable = tableName.toLowerCase();
    const fields = source.header.map((label, index) => ({ label, index, normalized: normalizeFieldName(label) }));
    if (normalizedTable === "teams") {
        const order = ["nick", "name", "country", "earnings", "rating", "ers", "academy", "bgcolor"];
        return fields
            .filter(field => order.includes(field.normalized))
            .sort((a, b) => order.indexOf(a.normalized) - order.indexOf(b.normalized));
    }
    const hidden = new Set(["num", "createdby", "createdat", "photourl", "imageurl"]);
    if (normalizedTable === "tournaments") hidden.add("name").add("description").add("desc").add("cupid");
    return fields
        .filter(field => !hidden.has(field.normalized))
        .sort((a, b) => Number(b.normalized === "companyname") - Number(a.normalized === "companyname"))
        .slice(0, 9);
}

function isPlayerAttributeField(label) {
    return ["gameplay", "mental", "physical"].includes(getFieldSection(label));
}

function getPlayerGeneralFields(table) {
    const hidden = new Set([
        "createdby", "createdat", "pr", "role3",
        "nick", "nickname",
        "bio", "biography", "id", "hltv", "liquipedia",
        "faceit", "retired", "fromfaceit", "gender"
    ]);
    return table.header.map((label, index) => ({ label, index, normalized: normalizeFieldName(label) }))
        .filter(field => !isPlayerAttributeField(field.label))
        .filter(field => !hidden.has(field.normalized) && !isImageUrlField(field.label));
}

function getPlayerAttributeFields(table, section) {
    const sectionOrder = { gameplay: 0, mental: 1, physical: 2 };
    const selectedSection = sectionOrder[section] !== undefined ? section : null;
    return table.header.map((label, index) => ({
        label,
        index,
        normalized: normalizeFieldName(label),
        section: getFieldSection(label)
    }))
        .filter(field => selectedSection ? field.section === selectedSection : sectionOrder[field.section] !== undefined)
        .sort((a, b) => sectionOrder[a.section] - sectionOrder[b.section] || a.index - b.index);
}

function createPlayerFieldColumn(field) {
    return {
        label: field.label,
        sortKey: `field-${field.index}`,
        normalized: field.normalized,
        index: field.index,
        section: field.section,
        getSortValue: row => row[field.index]
    };
}

function getPlayerListColumns(tableName) {
    const table = db.tables[tableName];
    const currentView = getListViewState(tableName) || "general";
    const currentPreset = playerListViewPresets[currentView];
    const playerColumn = { label: "Player", sortKey: "player", getSortValue: row => getTableValue(table, row, ["nickname", "nick", "internalid", "name"]) };
    const actionColumn = { label: "Actions", sortable: false };
    if (currentPreset?.section) {
        return [
            playerColumn,
            { label: "Rating", sortKey: "rating", getSortValue: row => calculatePlayerRating(row) },
            ...getPlayerAttributeFields(table, currentPreset.section).map(createPlayerFieldColumn),
            actionColumn
        ];
    }
    return [
        playerColumn,
        ...getPlayerGeneralFields(table).map(createPlayerFieldColumn),
        actionColumn
    ];
}

function getStaffAttributeFields(table, presetKey = getListViewState()) {
    const preset = staffListViewPresets[presetKey];
    const attributeNames = new Set(preset?.skillNames || []);
    const hidden = new Set(["generated", "rating", "overall", "overallrating"]);
    return table.header.map((label, index) => ({ label, index, normalized: normalizeFieldName(label) }))
        .filter(field => attributeNames.has(field.normalized) && !hidden.has(field.normalized));
}

function staffRowMatchesListView(table, row, presetKey = getListViewState()) {
    const preset = staffListViewPresets[presetKey];
    if (!preset || presetKey === "general" || !preset.rolePattern) return true;
    const role = normalizeFieldName(getTableValue(table, row, ["role", "job", "type", "position"]));
    if (preset.excludePattern?.test(role)) return false;
    return preset.rolePattern.test(role);
}

function getStaffListColumns(tableName) {
    const table = db.tables[tableName];
    const currentView = getListViewState(tableName) || "general";
    const staffColumn = { label: "Staff", sortKey: "staff", getSortValue: row => getTableValue(table, row, ["nickname", "nick", "name", "internalid", "id"]) };
    const roleColumn = { label: "Role", sortKey: "role", getSortValue: row => getTableValue(table, row, ["role", "job", "type", "position"]) };
    const actionColumn = { label: "Actions", sortable: false };
    if (currentView !== "general") {
        return [
            staffColumn,
            roleColumn,
            { label: "Rating", sortKey: "rating", getSortValue: row => calculateStaffRatingForTable(table, row) },
            ...getStaffAttributeFields(table, currentView).map(field => ({
                label: field.label,
                sortKey: field.normalized,
                normalized: field.normalized,
                index: field.index,
                getSortValue: row => Number.parseFloat(row[field.index]) || 0
            })),
            actionColumn
        ];
    }
    return [
        staffColumn,
        { label: "Name", sortKey: "firstname", getSortValue: row => getTableValue(table, row, ["firstname", "forename", "name"]) },
        { label: "Surname", sortKey: "surname", getSortValue: row => getTableValue(table, row, ["surname", "lastname"]) },
        roleColumn,
        { label: "Country", sortKey: "country", getSortValue: row => getTableValue(table, row, ["country", "nationality"]) },
        { label: "Team", sortKey: "team", getSortValue: row => getTableValue(table, row, ["team", "teamname", "teamid"]) },
        actionColumn
    ];
}

function getTeamListColumns(tableName) {
    const table = db.tables[tableName];
    const currentView = getListViewState(tableName) || "general";
    if (currentView !== "roster") {
        return [
            ...getGenericListFields(tableName).map(field => ({
                label: field.label,
                sortKey: field.normalized,
                normalized: field.normalized,
                getSortValue: row => String(row[field.index] ?? "").trim()
            })),
            { label: "Actions", sortable: false }
        ];
    }
    const rosterCache = new WeakMap();
    const getRoster = row => {
        if (!rosterCache.has(row)) rosterCache.set(row, getTeamRosterEntriesForList(table, row));
        return rosterCache.get(row);
    };
    return [
        { label: "Team", sortKey: "team", getSortValue: row => getTableValue(table, row, ["nick", "nickname", "name", "abbreviation", "shortname", "teamid", "internalid", "id"]) },
        { label: "Main Squad", sortKey: "main", getSortValue: row => getRoster(row).filter(entry => !entry.isBench).length },
        { label: "Bench", sortKey: "bench", getSortValue: row => getRoster(row).filter(entry => entry.isBench).length },
        { label: "Total", sortKey: "total", getSortValue: row => getRoster(row).length },
        { label: "Actions", sortable: false }
    ];
}

function getListColumns(tableName) {
    const normalizedTable = tableName.toLowerCase();
    if (normalizedTable === "players") return getPlayerListColumns(tableName);
    if (normalizedTable === "teams") return getTeamListColumns(tableName);
    if (["staff", "staffs"].includes(normalizedTable)) return getStaffListColumns(tableName);
    return [
        ...getGenericListFields(tableName).map(field => ({
            label: field.label,
            sortKey: field.normalized,
            normalized: field.normalized,
            getSortValue: row => String(row[field.index] ?? "").trim()
        })),
        { label: "Actions", sortable: false }
    ];
}

function normalizeSortValue(value) {
    const text = String(value ?? "").trim();
    const numeric = Number.parseFloat(text.replace(/[$,\s]/g, ""));
    if (text && Number.isFinite(numeric) && /^[$,\s]*-?\d+(\.\d+)?[$,\s]*$/.test(text)) return numeric;
    return text.toLocaleLowerCase();
}

function compareSortValues(a, b) {
    const left = normalizeSortValue(a);
    const right = normalizeSortValue(b);
    if (typeof left === "number" && typeof right === "number") return left - right;
    return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
}

function sortListEntries(tableName, entries) {
    const sortState = listSortByTable[tableName];
    if (!sortState) return entries;
    const column = getListColumns(tableName).find(item => item.sortKey === sortState.key && item.sortable !== false);
    if (!column) return entries;
    const direction = sortState.direction === "desc" ? -1 : 1;
    return [...entries].sort((a, b) => {
        const result = compareSortValues(column.getSortValue(a.row), column.getSortValue(b.row));
        return result ? result * direction : a.originalIndex - b.originalIndex;
    });
}

function createListView(tableName, entries) {
    const wrap = document.createElement("div");
    wrap.className = "list-table-wrap";
    if (!entries.length) return wrap;
    const table = document.createElement("table");
    const normalizedTable = tableName.toLowerCase();
    table.className = `entry-list-table${normalizedTable === "players" ? " player-list-table" : ""}${["staff", "staffs"].includes(normalizedTable) ? " staff-list-table" : ""}`;
    if (normalizedTable === "players") buildPlayerListTable(table, entries, tableName);
    else if (normalizedTable === "teams") buildTeamListTable(table, entries, tableName);
    else if (["staff", "staffs"].includes(normalizedTable)) buildStaffListTable(table, entries, tableName);
    else buildGenericListTable(table, tableName, entries);
    wrap.appendChild(table);
    return wrap;
}

function getListColumnWidth(column, tableName) {
    const key = column.sortKey?.startsWith("field-")
        ? (column.normalized || normalizeFieldName(column.label))
        : (column.sortKey || column.normalized || normalizeFieldName(column.label));
    if (column.sortable === false) return "104px";
    if (tableName.toLowerCase() === "players") {
        const widths = {
            player: "220px", name: "180px", firstname: "180px", forename: "180px", surname: "180px", lastname: "180px",
            nickname: "170px", nick: "170px", country: "160px", nationality: "160px", team: "190px", teamname: "190px", teamid: "190px",
            role: "170px", role1: "170px", role2: "170px", role3: "170px", roles: "250px", rating: "96px",
            earnings: "130px", prizemoney: "130px", salary: "130px", marketvalue: "130px",
            dateofbirth: "150px", birthdate: "150px", dob: "150px"
        };
        if (["gameplay", "mental", "physical"].includes(column.section)) return "132px";
        return widths[key] || (key.startsWith("field-") ? "160px" : "150px");
    }
    if (["staff", "staffs"].includes(tableName.toLowerCase())) {
        const widths = {
            staff: "260px", firstname: "210px", surname: "210px", role: "190px",
            country: "190px", team: "190px", rating: "96px"
        };
        return widths[key] || "120px";
    }
    if (tableName.toLowerCase() === "teams") {
        const widths = {
            team: "260px", main: "560px", bench: "360px", total: "110px",
            nick: "220px", name: "260px", country: "190px", earnings: "130px",
            rating: "120px", ers: "120px", academy: "120px", bgcolor: "170px"
        };
        return widths[key] || "170px";
    }
    if (key === "companyname" || key === "name" || key === "nickname" || key === "nick" || key === "title") return "260px";
    if (key === "country" || key === "nationality") return "190px";
    if (key === "description" || key === "desc") return "360px";
    if (key === "bgcolor" || key === "bgcolour" || key === "backgroundcolor" || key === "backgroundcolour") return "170px";
    if (["earnings", "rating", "ers", "academy", "tier", "rank"].includes(key)) return "120px";
    return "170px";
}

function appendListColGroup(table, columns, tableName) {
    const group = document.createElement("colgroup");
    columns.forEach(column => {
        const col = document.createElement("col");
        col.style.width = getListColumnWidth(column, tableName);
        group.appendChild(col);
    });
    table.appendChild(group);
}

function appendListHeader(table, columns, tableName) {
    appendListColGroup(table, columns, tableName);
    const head = document.createElement("thead");
    const row = document.createElement("tr");
    const sortState = listSortByTable[tableName];
    columns.forEach(column => {
        const cell = document.createElement("th");
        if (column.sortable === false) {
            cell.textContent = column.label;
        } else {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "list-sort-button";
            button.textContent = column.label;
            const isActive = sortState?.key === column.sortKey;
            const indicator = document.createElement("span");
            indicator.className = "list-sort-indicator";
            if (isActive) {
                cell.setAttribute("aria-sort", sortState.direction === "desc" ? "descending" : "ascending");
                button.classList.add("active", sortState.direction);
                indicator.textContent = sortState.direction === "desc" ? "v" : "^";
            }
            button.appendChild(indicator);
            button.addEventListener("click", () => {
                const current = listSortByTable[tableName];
                listSortByTable[tableName] = {
                    key: column.sortKey,
                    direction: current?.key === column.sortKey && current.direction === "asc" ? "desc" : "asc"
                };
                currentPage = 1;
                renderTable(tableName);
            });
            cell.appendChild(button);
        }
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
    fill.className = getPlayerStatLevel(value);
    fill.style.width = `${value * 5}%`;
    track.appendChild(fill);
    const number = document.createElement("b");
    number.textContent = String(value);
    stat.append(track, number);
    cell.appendChild(stat);
    return cell;
}

function createListStatCellFromValue(rawValue) {
    const cell = document.createElement("td");
    const stat = document.createElement("div");
    stat.className = "list-stat";
    const value = Math.min(20, Math.max(0, Number.parseFloat(rawValue) || 0));
    const track = document.createElement("span");
    track.className = "list-stat-track";
    const fill = document.createElement("i");
    fill.className = getPlayerStatLevel(value);
    fill.style.width = `${value * 5}%`;
    track.appendChild(fill);
    const number = document.createElement("b");
    number.textContent = String(value);
    stat.append(track, number);
    cell.appendChild(stat);
    return cell;
}

function buildLegacyPlayerListTable(table, entries, tableName) {
    appendListHeader(table, getPlayerListColumns(tableName), tableName);
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

function createPlayerIdentityCell(tableName, row, label) {
    const cell = document.createElement("td");
    const player = document.createElement("div");
    player.className = "list-player-cell";
    const thumb = document.createElement("span");
    thumb.className = "list-player-thumb";
    loadCardAsset(thumb, getAssetKey(tableName, row), getBundledAssetCandidates(tableName, row));
    const nickText = document.createElement("strong");
    nickText.textContent = label || "Player";
    player.append(thumb, nickText);
    cell.appendChild(player);
    return cell;
}

function createPlayerGeneralCell(tableName, row, field) {
    const value = String(row[field.index] ?? "").trim();
    if (["country", "nationality"].includes(field.normalized)) return createListCountryCell(value);
    if (["team", "teamname", "teamid"].includes(field.normalized)) return createListTeamCell(tableName, row, value || "Free agent");
    if (["role", "role1", "role2", "role3", "primaryrole", "secondaryrole"].includes(field.normalized)) {
        const cell = document.createElement("td");
        if (value) {
            const tag = document.createElement("span");
            tag.className = "list-role-tag";
            tag.textContent = value;
            cell.appendChild(tag);
        } else {
            cell.textContent = "â€”";
        }
        return cell;
    }
    const cell = createListTextCell(value);
    if (["earnings", "prizemoney", "salary", "marketvalue"].includes(field.normalized)) {
        cell.textContent = value ? `$${String(value).replace(/^\$\s*/, "")}` : "â€”";
        cell.className = "list-money";
    }
    return cell;
}

function buildPlayerListTable(table, entries, tableName) {
    const source = db.tables[tableName];
    const columns = getPlayerListColumns(tableName);
    const currentView = getListViewState(tableName) || "general";
    const currentPreset = playerListViewPresets[currentView];
    appendListHeader(table, columns, tableName);
    const body = document.createElement("tbody");
    entries.forEach(({ row, originalIndex }) => {
        const tr = document.createElement("tr");
        tr.dataset.index = originalIndex;
        const nick = getTableValue(source, row, ["nickname", "nick", "internalid", "name"]) || `Player ${originalIndex + 1}`;
        tr.appendChild(createPlayerIdentityCell(tableName, row, nick));
        if (currentPreset?.section) {
            const ratingCell = document.createElement("td");
            const rating = document.createElement("strong");
            rating.className = "list-rating";
            rating.textContent = calculatePlayerRating(row).toFixed(2);
            ratingCell.appendChild(rating);
            tr.appendChild(ratingCell);
            getPlayerAttributeFields(source, currentPreset.section).forEach(field => tr.appendChild(createListStatCellFromValue(row[field.index])));
        } else {
            getPlayerGeneralFields(source).forEach(field => tr.appendChild(createPlayerGeneralCell(tableName, row, field)));
        }
        tr.appendChild(createListActionCell(tr, originalIndex, nick));
        tr.addEventListener("click", () => selectCard(tr, originalIndex));
        body.appendChild(tr);
    });
    table.appendChild(body);
}

function createStaffIdentityCell(tableName, row, label) {
    const cell = document.createElement("td");
    const content = document.createElement("span");
    content.className = "list-player-cell";
    const thumb = document.createElement("span");
    thumb.className = "list-player-thumb";
    loadCardAsset(thumb, getAssetKey(tableName, row), getBundledAssetCandidates(tableName, row));
    const name = document.createElement("strong");
    name.textContent = label || "Staff";
    content.append(thumb, name);
    cell.appendChild(content);
    return cell;
}

function createListTextCell(value) {
    const cell = document.createElement("td");
    cell.textContent = value || "—";
    return cell;
}

function createListCountryCell(value) {
    const cell = document.createElement("td");
    const content = document.createElement("span");
    content.className = "list-country-cell";
    const flagPath = getCountryAssetPath(value);
    if (flagPath) {
        const flag = document.createElement("img");
        flag.src = flagPath;
        flag.alt = "";
        content.appendChild(flag);
    }
    content.append(document.createTextNode(value || "—"));
    cell.appendChild(content);
    return cell;
}

function createListTeamCell(tableName, row, value) {
    const cell = document.createElement("td");
    const content = document.createElement("span");
    content.className = "list-team-cell";
    const teamLogo = createTeamLogoBadge(row, true, tableName);
    if (teamLogo) content.appendChild(teamLogo);
    content.append(document.createTextNode(value || "—"));
    cell.appendChild(content);
    return cell;
}

function getTeamAliasSetForList(table, row) {
    return new Set(table.header.map((header, index) => ({
        name: normalizeFieldName(header),
        value: String(row[index] ?? "").trim()
    }))
        .filter(field => ["name", "nickname", "nick", "abbreviation", "shortname", "teamid", "internalid", "id"].includes(field.name) && field.value)
        .flatMap(field => [field.value.normalize("NFKC").toLowerCase(), normalizeFieldName(field.value)]));
}

function getTeamRosterEntriesForList(teamTable, teamRow) {
    const playersTableName = Object.keys(db.tables).find(name => name.toLowerCase() === "players");
    const playersTable = playersTableName ? db.tables[playersTableName] : null;
    if (!playersTable) return [];
    const aliases = getTeamAliasSetForList(teamTable, teamRow);
    if (!aliases.size) return [];
    const teamColumns = playersTable.header.map((header, index) => ({ name: normalizeFieldName(header), index }))
        .filter(field => ["team", "teamname", "teamid"].includes(field.name));
    if (!teamColumns.length) return [];
    const positionIndex = playersTable.header.findIndex(header => normalizeFieldName(header) === "rosterposition");
    const roster = playersTable.rows.map((row, index) => {
        const position = positionIndex >= 0 ? String(row[positionIndex] || "").toLowerCase() : "";
        return { row, index, position };
    }).filter(entry => teamColumns.some(field => {
        const value = String(entry.row[field.index] || "").trim();
        return aliases.has(value.normalize("NFKC").toLowerCase()) || aliases.has(normalizeFieldName(value));
    })).sort((a, b) => Number(a.position.includes("bench")) - Number(b.position.includes("bench")) || a.index - b.index);
    return roster.map((entry, rosterIndex) => ({
        row: entry.row,
        index: entry.index,
        isBench: rosterIndex >= 5
    }));
}

function createTeamListIdentityCell(tableName, row, label) {
    const cell = document.createElement("td");
    const content = document.createElement("span");
    content.className = "list-team-identity";
    const logo = document.createElement("span");
    logo.className = "list-team-logo";
    loadCardAsset(logo, getAssetKey(tableName, row), getBundledAssetCandidates(tableName, row));
    content.append(logo, document.createTextNode(label || "Team"));
    cell.appendChild(content);
    return cell;
}

function createRosterPlayerChip(playersTableName, entry) {
    const playersTable = db.tables[playersTableName];
    const chip = document.createElement("span");
    chip.className = "list-roster-player-chip";
    const portrait = document.createElement("span");
    portrait.className = "list-roster-player-portrait";
    loadCardAsset(portrait, getAssetKey(playersTableName, entry.row), getBundledAssetCandidates(playersTableName, entry.row));
    const name = document.createElement("strong");
    name.textContent = getTableValue(playersTable, entry.row, ["nickname", "nick", "name"]) || `Player ${entry.index + 1}`;
    chip.append(portrait, name);
    enableTeamRosterPreview(chip, playersTableName, entry.index);
    return chip;
}

function createTeamRosterListCell(entries, emptyLabel) {
    const cell = document.createElement("td");
    cell.className = "list-roster-cell";
    const content = document.createElement("div");
    content.className = "list-roster-players";
    const playersTableName = Object.keys(db.tables).find(name => name.toLowerCase() === "players");
    if (!entries.length || !playersTableName) {
        const empty = document.createElement("span");
        empty.className = "list-roster-empty";
        empty.textContent = emptyLabel;
        content.appendChild(empty);
    } else {
        entries.forEach(entry => content.appendChild(createRosterPlayerChip(playersTableName, entry)));
    }
    cell.appendChild(content);
    return cell;
}

function buildTeamListTable(table, entries, tableName) {
    const source = db.tables[tableName];
    const currentView = getListViewState(tableName) || "general";
    if (currentView !== "roster") {
        buildGenericListTable(table, tableName, entries);
        return;
    }
    appendListHeader(table, getTeamListColumns(tableName), tableName);
    const body = document.createElement("tbody");
    entries.forEach(({ row, originalIndex }) => {
        const tr = document.createElement("tr");
        tr.dataset.index = originalIndex;
        const label = getTableValue(source, row, ["nick", "nickname", "name", "abbreviation", "shortname", "teamid", "internalid", "id"]) || `Team ${originalIndex + 1}`;
        const roster = getTeamRosterEntriesForList(source, row);
        const main = roster.filter(entry => !entry.isBench).slice(0, 5);
        const bench = roster.filter(entry => entry.isBench);
        tr.appendChild(createTeamListIdentityCell(tableName, row, label));
        tr.appendChild(createTeamRosterListCell(main, "No main squad"));
        tr.appendChild(createTeamRosterListCell(bench, "No bench"));
        tr.appendChild(createListTextCell(String(roster.length)));
        tr.appendChild(createListActionCell(tr, originalIndex, label));
        tr.addEventListener("click", () => selectCard(tr, originalIndex));
        body.appendChild(tr);
    });
    table.appendChild(body);
}

function buildStaffListTable(table, entries, tableName) {
    const source = db.tables[tableName];
    const columns = getStaffListColumns(tableName);
    const currentView = getListViewState(tableName) || "general";
    appendListHeader(table, columns, tableName);
    const body = document.createElement("tbody");
    entries.forEach(({ row, originalIndex }) => {
        const tr = document.createElement("tr");
        tr.dataset.index = originalIndex;
        const nickname = getTableValue(source, row, ["nickname", "nick", "name", "internalid", "id"]) || `Staff ${originalIndex + 1}`;
        const role = getTableValue(source, row, ["role", "job", "type", "position"]);
        tr.appendChild(createStaffIdentityCell(tableName, row, nickname));
        if (currentView !== "general") {
            tr.appendChild(createListTextCell(role));
            const ratingCell = document.createElement("td");
            const rating = document.createElement("strong");
            rating.className = "list-rating";
            rating.textContent = calculateStaffRatingForTable(source, row).toFixed(2);
            ratingCell.appendChild(rating);
            tr.appendChild(ratingCell);
            getStaffAttributeFields(source, currentView).forEach(field => tr.appendChild(createListStatCellFromValue(row[field.index])));
        } else {
            tr.appendChild(createListTextCell(getTableValue(source, row, ["firstname", "forename", "name"])));
            tr.appendChild(createListTextCell(getTableValue(source, row, ["surname", "lastname"])));
            tr.appendChild(createListTextCell(role));
            tr.appendChild(createListCountryCell(getTableValue(source, row, ["country", "nationality"])));
            tr.appendChild(createListTeamCell(tableName, row, getTableValue(source, row, ["team", "teamname", "teamid"])));
        }
        tr.appendChild(createListActionCell(tr, originalIndex, nickname));
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
    button.title = `Edit ${label}`;
    button.setAttribute("aria-label", `Edit ${label}`);
    button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 6.5 17.5 10.5 8 20H4v-4L13.5 6.5Zm1.4-1.4 1.6-1.6a1.4 1.4 0 0 1 2 0l2 2a1.4 1.4 0 0 1 0 2l-1.6 1.6-4-4ZM11 4H5a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3v-6h-2v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6V4Z"/></svg>`;
    button.addEventListener("click", event => {
        event.stopPropagation();
        selectCard(rowElement, originalIndex, true);
        openEditor(originalIndex);
    });
    cell.appendChild(button);
    return cell;
}

function buildGenericListTable(table, tableName, entries) {
    const source = db.tables[tableName];
    const isTeamsTable = tableName.toLowerCase() === "teams";
    const supportsImage = ["teams", "sponsors", "staff", "staffs", "tournaments"].includes(tableName.toLowerCase());
    const fields = getGenericListFields(tableName);
    appendListHeader(table, getListColumns(tableName), tableName);
    const body = document.createElement("tbody");
    entries.forEach(({ row, originalIndex }) => {
        const tr = document.createElement("tr");
        tr.dataset.index = originalIndex;
        fields.forEach((field, fieldIndex) => {
            const cell = document.createElement("td");
            const value = String(row[field.index] ?? "").trim();
            if (fieldIndex === 0 && supportsImage) {
                const content = document.createElement("span");
                content.className = "list-entity-identity";
                const logo = document.createElement("span");
                logo.className = "list-entity-logo";
                loadCardAsset(logo, getAssetKey(tableName, row), getBundledAssetCandidates(tableName, row));
                content.append(logo, document.createTextNode(value || "—"));
                cell.appendChild(content);
            } else if (["country", "nationality"].includes(field.normalized)) {
                const content = document.createElement("span");
                content.className = "list-country-cell";
                const flagPath = getCountryAssetPath(value);
                if (flagPath) {
                    const flag = document.createElement("img");
                    flag.src = flagPath;
                    flag.alt = "";
                    content.appendChild(flag);
                }
                content.append(document.createTextNode(value || "—"));
                cell.appendChild(content);
            } else if (isTeamsTable && ["bgcolor", "bgcolour", "backgroundcolor", "backgroundcolour"].includes(field.normalized)) {
                const content = document.createElement("span");
                content.className = "list-color-cell";
                const hex = value.match(/^#?([0-9a-f]{6})$/i);
                if (hex) {
                    const swatch = document.createElement("span");
                    swatch.className = "list-color-swatch";
                    swatch.style.backgroundColor = `#${hex[1]}`;
                    content.appendChild(swatch);
                }
                content.append(document.createTextNode(value || "—"));
                cell.appendChild(content);
            } else {
                cell.textContent = value || "—";
            }
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

    const visiblePages = new Set([1, pageCount]);
    const intermediateCount = Math.min(3, Math.max(0, pageCount - 2));
    const intermediateStart = Math.max(2, Math.min(currentPage - 1, pageCount - intermediateCount));
    for (let page = intermediateStart; page < intermediateStart + intermediateCount; page++) {
        visiblePages.add(page);
    }
    let previousPage = 0;
    [...visiblePages].sort((a, b) => a - b).forEach(page => {
        if (previousPage && page - previousPage > 1) {
            const ellipsis = document.createElement("span");
            ellipsis.className = "page-ellipsis";
            ellipsis.textContent = "…";
            ellipsis.setAttribute("aria-hidden", "true");
            controls.appendChild(ellipsis);
        }
        const button = createPageButton(String(page), page, false);
        if (page === currentPage) {
            button.classList.add("active");
            button.setAttribute("aria-current", "page");
        }
        controls.appendChild(button);
        previousPage = page;
    });
    controls.appendChild(createPageButton("Next", currentPage + 1, currentPage === pageCount));

    const jumpForm = document.createElement("form");
    jumpForm.className = "page-jump";
    jumpForm.noValidate = true;
    const jumpLabel = document.createElement("label");
    jumpLabel.textContent = "Go to page";
    const jumpInput = document.createElement("input");
    jumpInput.type = "number";
    jumpInput.min = "1";
    jumpInput.max = String(pageCount);
    jumpInput.step = "1";
    jumpInput.required = true;
    jumpInput.inputMode = "numeric";
    jumpInput.setAttribute("aria-label", `Page number, 1 to ${pageCount}`);
    jumpInput.placeholder = String(currentPage);
    const validateJump = () => {
        const page = Number(jumpInput.value);
        const isValid = jumpInput.value !== "" && Number.isInteger(page) && page >= 1 && page <= pageCount;
        jumpInput.setCustomValidity(isValid ? "" : `Enter a whole page number from 1 to ${pageCount}.`);
        jumpInput.classList.toggle("user-invalid", !isValid);
        return isValid;
    };
    jumpInput.addEventListener("input", validateJump);
    const jumpButton = document.createElement("button");
    jumpButton.type = "submit";
    jumpButton.className = "page-button page-go-button";
    jumpButton.textContent = "Go";
    jumpForm.addEventListener("submit", event => {
        event.preventDefault();
        if (!validateJump()) {
            jumpInput.reportValidity();
            return;
        }
        currentPage = Number(jumpInput.value);
        renderTable(activeTab);
        tableContainer.scrollTop = 0;
    });
    jumpLabel.appendChild(jumpInput);
    jumpForm.append(jumpLabel, jumpButton);
    pagination.append(summary, controls, jumpForm);
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
        selectCard(card, rIndex, true);
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
    card.addEventListener("click", () => selectCard(card, rIndex));
    return card;
}

function createEntityCard(row, rIndex) {
    const card = document.createElement("article");
    const normalizedTable = activeTab.toLowerCase();
    const isStaffCard = ["staff", "staffs"].includes(normalizedTable);
    const isTeamCard = normalizedTable === "teams";
    const table = db.tables[activeTab];
    const descriptionField = getEntityDescriptionField(table, row);
    const canFlipCard = isStaffCard || isTeamCard || Boolean(descriptionField);
    card.className = `record-card player-card entity-card entity-${normalizedTable}${canFlipCard ? " player-flip-card" : ""}`;
    card.dataset.index = rIndex;
    const headers = table.header;
    if (normalizedTable === "teams") {
        const bgColor = getTableValue(db.tables[activeTab], row, ["bgcolor", "bgcolour", "backgroundcolor", "backgroundcolour"]);
        const hex = String(bgColor || "").match(/^#?([0-9a-f]{6})$/i);
        if (hex) card.style.setProperty("--entity-bg-color", `#${hex[1]}`);
    }
    const hiddenFields = new Set(["num", "createdby", "createdat", "photourl", "imageurl", "portraiturl", "logourl"]);
    if (descriptionField) hiddenFields.add(descriptionField.normalized);
    if (isStaffCard) hiddenFields.add("rating").add("overall").add("overallrating");
    const titleAliasesByTable = {
        teams: ["nick", "nickname", "name", "abbreviation", "shortname", "teamid", "internalid", "id"],
        sponsors: ["companyname", "sponsorname", "name", "brand", "title", "internalid", "id"],
        staff: ["nickname", "nick", "name", "firstname", "forename", "surname", "lastname", "internalid", "id"],
        staffs: ["nickname", "nick", "name", "firstname", "forename", "surname", "lastname", "internalid", "id"],
        tournaments: ["name", "title", "shortname", "abbreviation", "internalid", "id"]
    };
    const fields = row.map((value, index) => ({
        label: headers[index] || `Column ${index + 1}`,
        normalized: normalizeFieldName(headers[index] || `Column ${index + 1}`),
        value: String(value ?? "").trim()
    })).filter(field => field.value && !hiddenFields.has(field.normalized) && !/(photo|image|portrait|logo).*url/i.test(field.label));
    const titleAliases = titleAliasesByTable[normalizedTable] || ["name", "nickname", "nick", "title", "internalid", "id"];
    const titleField = titleAliases.map(alias => fields.find(field => field.normalized === alias)).find(Boolean) || fields[0];
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
    if (normalizedTable === "sponsors") {
        const tier = getTableValue(table, row, ["tier", "rank", "level"]);
        const type = getTableValue(table, row, ["type", "category"]);
        category.textContent = [tier ? `Tier ${tier}` : "", type].filter(Boolean).join(" · ") || "SPONSOR";
    } else if (isStaffCard) {
        category.textContent = getTableValue(table, row, ["role", "job", "type", "position"]) || "STAFF";
    } else {
        category.textContent = activeTab.toUpperCase();
    }
    identity.append(heading, category);
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "player-open";
    edit.title = `Edit ${title}`;
    edit.setAttribute("aria-label", `Edit ${title}`);
    edit.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17.25V20h2.75L17.81 8.94l-2.75-2.75L4 17.25zm15.71-10.04a1 1 0 0 0 0-1.42l-1.5-1.5a1 1 0 0 0-1.42 0l-1.17 1.17 2.75 2.75 1.34-1z"/></svg>';
    edit.addEventListener("click", event => { event.stopPropagation(); selectCard(card, rIndex, true); openEditor(rIndex); });
    const staffRating = isStaffCard ? document.createElement("span") : null;
    if (staffRating) {
        staffRating.className = "player-rating staff-rating";
        staffRating.innerHTML = `<span class="player-rating-star" aria-hidden="true">⭐</span>${calculateStaffRatingForTable(table, row).toFixed(2)}`;
    }
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
    const teamLogo = isStaffCard ? createTeamLogoBadge(row, true) : null;
    const frontItems = [media, shade, identity, ...(staffRating ? [staffRating] : []), edit, ...(teamLogo ? [teamLogo] : []), details, footer];
    if (canFlipCard) {
        const front = document.createElement("div");
        front.className = "team-roster-card-face team-roster-card-front";
        front.append(...frontItems);
        const inner = document.createElement("div");
        inner.className = "team-roster-card-inner";
        const back = isStaffCard
            ? createStaffCardBack(table, row, title)
            : isTeamCard
                ? createTeamCardRosterBack(table, row, title)
                : createDescriptionCardBack(title, descriptionField);
        inner.append(front, back);
        card.appendChild(inner);
        enableRosterCardFlip(card);
    } else {
        card.append(...frontItems);
    }
    card.addEventListener("click", () => selectCard(card, rIndex));
    return card;
}

function getEntityDescriptionField(table, row) {
    const descriptionNames = new Set(["description", "desc", "about", "bio", "biography"]);
    return table.header.map((label, index) => ({
        label,
        normalized: normalizeFieldName(label),
        value: String(row[index] ?? "").trim()
    })).find(field => descriptionNames.has(field.normalized) && field.value) || null;
}

function createDescriptionCardBack(title, descriptionField) {
    const back = document.createElement("div");
    back.className = "team-roster-card-face team-roster-card-back entity-description-back";
    const heading = document.createElement("h3");
    heading.textContent = title;
    const subtitle = document.createElement("p");
    subtitle.textContent = descriptionField?.label || "Description";
    const body = document.createElement("div");
    body.className = "entity-description-back-body";
    body.textContent = descriptionField?.value || "No description found.";
    back.append(heading, subtitle, body);
    return back;
}

function createTeamCardRosterPlayer(playersTableName, entry) {
    const playersTable = db.tables[playersTableName];
    const country = getTableValue(playersTable, entry.row, ["nationality", "country"]);
    const role = getTableValue(playersTable, entry.row, ["role", "role1", "primaryrole"]) || "Player";
    const item = document.createElement("span");
    item.className = "team-card-roster-player";
    const portrait = document.createElement("span");
    portrait.className = "team-card-roster-portrait";
    loadCardAsset(portrait, getAssetKey(playersTableName, entry.row), getBundledAssetCandidates(playersTableName, entry.row));
    const info = document.createElement("span");
    info.className = "team-card-roster-info";
    const name = document.createElement("strong");
    name.textContent = getTableValue(playersTable, entry.row, ["nickname", "nick", "name"]) || `Player ${entry.index + 1}`;
    const meta = document.createElement("span");
    meta.className = "team-card-roster-meta";
    const flagPath = getCountryAssetPath(country);
    if (flagPath) {
        const flag = document.createElement("img");
        flag.src = flagPath;
        flag.alt = "";
        meta.appendChild(flag);
    }
    meta.append(document.createTextNode(role));
    info.append(name, meta);
    item.append(portrait, info);
    enableTeamRosterPreview(item, playersTableName, entry.index);
    return item;
}

function createTeamCardRosterBack(table, row, title) {
    const back = document.createElement("div");
    back.className = "team-roster-card-face team-roster-card-back team-card-roster-back";
    const heading = document.createElement("h3");
    heading.textContent = title;
    const roster = getTeamRosterEntriesForList(table, row);
    const subtitle = document.createElement("p");
    subtitle.textContent = `${Math.min(5, roster.length)} main · ${Math.max(0, roster.length - 5)} bench`;
    const body = document.createElement("div");
    body.className = "team-card-roster-body";
    const playersTableName = Object.keys(db.tables).find(name => name.toLowerCase() === "players");
    [
        ["Main Squad", roster.filter(entry => !entry.isBench).slice(0, 5), "No main squad"],
        ["Bench", roster.filter(entry => entry.isBench), "No bench"]
    ].forEach(([label, entries, emptyText]) => {
        const group = document.createElement("section");
        group.className = "team-card-roster-group";
        const groupHeading = document.createElement("h4");
        groupHeading.textContent = label;
        const players = document.createElement("div");
        players.className = "team-card-roster-players";
        if (entries.length && playersTableName) {
            entries.forEach(entry => players.appendChild(createTeamCardRosterPlayer(playersTableName, entry)));
        } else {
            const empty = document.createElement("span");
            empty.className = "team-card-roster-empty";
            empty.textContent = emptyText;
            players.appendChild(empty);
        }
        group.append(groupHeading, players);
        body.appendChild(group);
    });
    back.append(heading, subtitle, body);
    return back;
}

function createStaffCardBack(table, row, title) {
    const back = document.createElement("div");
    back.className = "team-roster-card-face team-roster-card-back staff-card-back";
    const heading = document.createElement("h3");
    heading.textContent = title;
    const subtitle = document.createElement("p");
    subtitle.textContent = "Staff attributes";
    const role = getTableValue(table, row, ["role", "job", "type", "position"]);
    const roleNames = getStaffRoleSkillNames(role);
    const commonNames = getStaffCommonSkillNames();
    const usedNames = new Set([
        "rating", "overall", "overallrating", "num", "createdby", "createdat",
        "id", "internalid", "staffid", "teamid", "dateofbirth", "birthdate", "dob",
        "photourl", "imageurl", "portraiturl", "liquipediaurl", "hltvurl"
    ]);
    const allNumericFields = table.header.map((label, index) => ({
        label,
        name: normalizeFieldName(label),
        value: Number.parseFloat(row[index])
    })).filter(field => Number.isFinite(field.value) && !usedNames.has(field.name));
    const body = document.createElement("div");
    body.className = "team-roster-card-back-body";
    const appendGroup = (groupTitle, names) => {
        const wanted = new Set(names);
        const fields = allNumericFields.filter(field => wanted.has(field.name) && !usedNames.has(field.name));
        if (!fields.length) return;
        const group = document.createElement("section");
        group.className = "team-roster-attribute-group";
        const groupHeading = document.createElement("h4");
        groupHeading.textContent = groupTitle;
        group.appendChild(groupHeading);
        fields.forEach(field => {
            usedNames.add(field.name);
            group.appendChild(createAttributeRow(field.label, field.value));
        });
        body.appendChild(group);
    };
    appendGroup(role ? `${role} attributes` : "Role attributes", roleNames);
    appendGroup("Common attributes", commonNames);
    if (!body.children.length) {
        const empty = document.createElement("div");
        empty.className = "team-roster-card-back-empty";
        empty.textContent = "No staff attributes found.";
        body.appendChild(empty);
    }
    back.append(heading, subtitle, body);
    return back;
}

function createAttributeRow(labelText, numericValue) {
    const value = Math.min(20, Math.max(0, numericValue));
    const item = document.createElement("div");
    item.className = "team-roster-attribute-row";
    const label = document.createElement("b");
    label.textContent = labelText;
    const track = document.createElement("span");
    const fill = document.createElement("i");
    fill.className = getPlayerStatLevel(value);
    fill.style.width = `${Math.min(100, value * 5)}%`;
    track.appendChild(fill);
    const score = document.createElement("strong");
    score.textContent = String(numericValue);
    item.append(label, track, score);
    return item;
}

function getRowValue(row, aliases) {
    const headers = db.tables[activeTab].header;
    for (const alias of aliases) {
        const index = headers.findIndex(header => normalizeFieldName(header) === alias);
        if (index >= 0 && String(row[index] ?? "").trim()) return String(row[index]).trim();
    }
    return "";
}

function findTeamRowByReference(teamReference) {
    if (!teamReference || isFreeAgentValue(teamReference)) return null;
    const teamsTableName = Object.keys(db.tables).find(name => name.toLowerCase() === "teams");
    if (!teamsTableName) return null;
    const teamsTable = db.tables[teamsTableName];
    const lookup = String(teamReference).trim().normalize("NFKC").toLowerCase();
    const looseLookup = normalizeFieldName(teamReference);
    const matchingColumns = teamsTable.header
        .map((header, index) => ({ name: normalizeFieldName(header), index }))
        .filter(field => ["name", "nickname", "nick", "abbreviation", "shortname", "teamid", "internalid", "id"].includes(field.name));
    const candidates = teamsTable.rows.map(row => {
        let bestScore = 0;
        let bestExtraLength = Number.POSITIVE_INFINITY;
        matchingColumns.forEach(field => {
            const value = String(row[field.index] || "").trim();
            const normalizedValue = value.normalize("NFKC").toLowerCase();
            const looseValue = normalizeFieldName(value);
            if (normalizedValue === lookup || looseValue === looseLookup) {
                bestScore = Math.max(bestScore, 3);
                bestExtraLength = Math.min(bestExtraLength, Math.abs(looseValue.length - looseLookup.length));
                return;
            }
            const canUseLooseContains = looseLookup.length >= 4 && looseValue.length >= 4;
            if (canUseLooseContains && (looseValue.includes(looseLookup) || looseLookup.includes(looseValue))) {
                bestScore = Math.max(bestScore, 1);
                bestExtraLength = Math.min(bestExtraLength, Math.abs(looseValue.length - looseLookup.length));
            }
        });
        return { row, score: bestScore, extraLength: bestExtraLength };
    }).filter(candidate => candidate.score > 0)
        .sort((a, b) => b.score - a.score || a.extraLength - b.extraLength);
    const teamRow = candidates[0]?.row;
    return teamRow ? { tableName: teamsTableName, table: teamsTable, row: teamRow } : null;
}

function createTeamLogoBadge(sourceRow, compact = false, sourceTableName = activeTab) {
    const sourceTable = db.tables[sourceTableName];
    if (!sourceTable) return null;
    const teamReferenceIndex = sourceTable.header.findIndex(header => ["team", "teamname", "teamid"].includes(normalizeFieldName(header)));
    const teamReference = teamReferenceIndex >= 0 ? String(sourceRow[teamReferenceIndex] || "").trim() : "";
    if (!teamReference || isFreeAgentValue(teamReference)) return null;
    const teamsTableName = Object.keys(db.tables).find(name => name.toLowerCase() === "teams");
    if (!teamsTableName) return null;
    const teamsTable = db.tables[teamsTableName];
    const lookup = teamReference.normalize("NFKC").toLowerCase();
    const looseLookup = normalizeFieldName(teamReference);
    const matchingColumns = teamsTable.header
        .map((header, index) => ({ name: normalizeFieldName(header), index }))
        .filter(field => ["name", "nickname", "nick", "abbreviation", "shortname", "teamid", "internalid", "id"].includes(field.name));
    const candidates = teamsTable.rows.map(row => {
        let bestScore = 0;
        let bestExtraLength = Number.POSITIVE_INFINITY;
        matchingColumns.forEach(field => {
            const value = String(row[field.index] || "").trim();
            const normalizedValue = value.normalize("NFKC").toLowerCase();
            const looseValue = normalizeFieldName(value);
            if (normalizedValue === lookup || looseValue === looseLookup) {
                bestScore = Math.max(bestScore, 3);
                bestExtraLength = Math.min(bestExtraLength, Math.abs(looseValue.length - looseLookup.length));
                return;
            }
            const canUseLooseContains = looseLookup.length >= 4 && looseValue.length >= 4;
            if (canUseLooseContains && (looseValue.includes(looseLookup) || looseLookup.includes(looseValue))) {
                bestScore = Math.max(bestScore, 1);
                bestExtraLength = Math.min(bestExtraLength, Math.abs(looseValue.length - looseLookup.length));
            }
        });
        return { row, score: bestScore, extraLength: bestExtraLength };
    }).filter(candidate => candidate.score > 0)
        .sort((a, b) => b.score - a.score || a.extraLength - b.extraLength);
    const teamRow = candidates[0]?.row;
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
    card.className = "record-card player-card player-flip-card";
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
    const leaderboardRank = getPlayerLeaderboardRank(activeTab, rIndex);
    rank.textContent = `#${leaderboardRank}`;
    applyPlayerRankBadgeClass(rank, leaderboardRank);
    const ratingBadge = document.createElement("span");
    ratingBadge.className = "player-rating";
    const faceitBadge = hasFaceitTag(db.tables[activeTab], row) ? createFaceitBadge("player-faceit-badge") : null;
    ratingBadge.innerHTML = `<span class="player-rating-star" aria-hidden="true">⭐</span>${rating || "-"}`;
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
    const countryText = document.createElement("span");
    countryText.textContent = country || "Nationality unknown";
    affiliation.appendChild(countryText);
    if (team) {
        const separator = document.createElement("span");
        separator.className = "player-affiliation-separator";
        separator.textContent = "•";
        affiliation.appendChild(separator);
        const teamAffiliation = document.createElement("span");
        teamAffiliation.className = "player-team-affiliation";
        const teamText = document.createElement("span");
        teamText.textContent = team;
        const affiliationTeamLogo = createTeamLogoBadge(row, true);
        if (affiliationTeamLogo) {
            affiliationTeamLogo.classList.add("affiliation-team-logo");
            teamAffiliation.appendChild(affiliationTeamLogo);
        }
        teamAffiliation.appendChild(teamText);
        affiliation.appendChild(teamAffiliation);
    }
    identity.append(title, subtitle, affiliation);
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "player-open";
    edit.title = `Edit ${nickname}`;
    edit.setAttribute("aria-label", `Edit ${nickname}`);
    edit.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 6.5 17.5 10.5 8 20H4v-4L13.5 6.5Zm1.4-1.4 1.6-1.6a1.4 1.4 0 0 1 2 0l2 2a1.4 1.4 0 0 1 0 2l-1.6 1.6-4-4ZM11 4H5a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3v-6h-2v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6V4Z"/></svg>`;
    edit.addEventListener("click", event => {
        event.stopPropagation();
        selectCard(card, rIndex, true);
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
        fill.className = getPlayerStatLevel(numericValue);
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
    const money = document.createElement("strong");
    money.textContent = earnings ? `Earnings: $ ${String(earnings).replace(/^\$\s*/, "")}` : "Earnings: —";
    footer.appendChild(money);
    const front = document.createElement("div");
    front.className = "team-roster-card-face team-roster-card-front";
    front.append(media, shade, rank, ratingBadge, ...(faceitBadge ? [faceitBadge] : []), identity, edit, statsPanel, footer);
    const inner = document.createElement("div");
    inner.className = "team-roster-card-inner";
    inner.append(front, createTeamRosterCardBack(db.tables[activeTab], row, nickname, rIndex, statNames.map(([, aliases]) => aliases), false));
    card.appendChild(inner);
    enableRosterCardFlip(card);
    card.addEventListener("click", () => selectCard(card, rIndex));
    return card;
}

function getPlayerStatLevel(value) {
    if (value === 20) return "stat-level-blue";
    if (value > 15) return "stat-level-green";
    if (value > 10) return "stat-level-yellow";
    if (value > 5) return "stat-level-orange";
    return "stat-level-red";
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

function getStaffRoleSkillNames(role) {
    const normalizedRole = normalizeFieldName(role);
    if (/^(cfo|chieffinancial|chieffinancialofficer)$/.test(normalizedRole)) {
        return ["financemanagement", "financialmanagement", "financialliteracy"];
    }
    if (/^(ceo|chiefexecutive|chiefexecutiveofficer)$/.test(normalizedRole)) {
        return ["leadership", "vision", "delegation", "publicimage", "communication", "financialliteracy", "financemanagement"];
    }
    if (/eventmanager|eventorganizer|eventcoordinator/.test(normalizedRole)) {
        return ["eventorganization", "eventorganisation"];
    }
    if (/^(prmanager|publicrelationsmanager|communicationsmanager)$/.test(normalizedRole)) {
        return ["publicrelations"];
    }
    if (/lawyer|attorney|legalcounsel|solicitor/.test(normalizedRole)) {
        return ["legalknowledge", "contractwork"];
    }
    if (/analyst|analysis/.test(normalizedRole)) {
        return ["analysis", "insight"];
    }
    if (/physio|medical|fitness/.test(normalizedRole)) {
        return ["physiotherapy", "fitness"];
    }
    if (/scout/.test(normalizedRole)) {
        return ["playerability", "evaluation", "scouting"];
    }
    if (/psych/.test(normalizedRole)) {
        return ["psychology"];
    }
    if (/coach|manager/.test(normalizedRole)) {
        return ["skill", "awp", "rifle", "pistol", "grenade", "grenades", "creativity", "clutch", "tactic", "tactics"];
    }
    return ["skill", "awp", "rifle", "pistol", "grenade", "grenades", "creativity", "clutch", "tactic", "tactics", "physiotherapy", "fitness", "playerability", "evaluation", "scouting", "psychology"];
}

function getStaffCommonSkillNames() {
    return ["morale", "conflict", "productivity", "loyalty", "stressresistance", "immunity"];
}

function getStaffSkillValues(table, row, names) {
    const wanted = new Set(names);
    return table.header.map((label, index) => ({
        name: normalizeFieldName(label),
        value: Number.parseFloat(row[index])
    })).filter(field => wanted.has(field.name) && Number.isFinite(field.value))
        .map(field => Math.min(20, Math.max(0, field.value)));
}

function averageValues(values) {
    if (!values.length) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calculateStaffRatingForTable(table, row) {
    const role = getTableValue(table, row, ["role", "job", "type", "position"]);
    const roleAverage = averageValues(getStaffSkillValues(table, row, getStaffRoleSkillNames(role)));
    const commonAverage = averageValues(getStaffSkillValues(table, row, getStaffCommonSkillNames()));
    let attributeScore = null;
    if (roleAverage !== null && commonAverage !== null) attributeScore = roleAverage * 0.75 + commonAverage * 0.25;
    else attributeScore = roleAverage ?? commonAverage;
    if (attributeScore === null) {
        const fallbackNames = [...new Set([...getStaffRoleSkillNames(""), ...getStaffCommonSkillNames()])];
        attributeScore = averageValues(getStaffSkillValues(table, row, fallbackNames)) ?? 0;
    }
    const stars = attributeScore / 4;
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

function selectCard(card, index, forceSelected = false) {
    if (!forceSelected && selectedRowElements.get(index) === card) {
        card.classList.remove("selected");
        selectedRowElements.delete(index);
        const selections = Array.from(selectedRowElements.entries());
        const lastSelection = selections.length ? selections[selections.length - 1] : null;
        selectedRowIndex = lastSelection ? lastSelection[0] : -1;
        selectedRowElement = lastSelection ? lastSelection[1] : null;
        updateSelectionActions();
        return;
    }
    card.classList.add("selected");
    selectedRowElements.set(index, card);
    selectedRowElement = card;
    selectedRowIndex = index;
    updateSelectionActions();
}

function clearSelection() {
    selectedRowElements.forEach(element => element.classList.remove("selected"));
    selectedRowElements.clear();
    selectedRowElement = null;
    selectedRowIndex = -1;
    updateSelectionActions();
}

function updateSelectionActions() {
    btnDeselectAll.hidden = selectedRowElements.size < 2;
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
        if (blob) {
            const url = URL.createObjectURL(blob);
            const image = document.createElement("img");
            image.alt = "";
            image.src = url;
            image.addEventListener("load", () => URL.revokeObjectURL(url), { once: true });
            container.replaceChildren(image);
            return;
        }
        loadFirstAvailableImage(container, bundledCandidates);
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
    if (activeTab.toLowerCase() === "teams") initializeTeamRoster(row);
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
    const isTeamEditor = activeTab.toLowerCase() === "teams";
    const isTabbedEditor = isPlayerEditor || isStaffEditor || isTeamEditor;
    if (isTeamEditor && editorPage === "roster") {
        renderTeamRosterEditor();
        return;
    }
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
            editFormFields.appendChild(createFixedSelectField(label, index, ["1", "2", "MAJOR"]));
            return;
        }
        if (activeTab.toLowerCase() === "tournaments" && normalizedLabel === "type") {
            editFormFields.appendChild(createFixedSelectField(label, index, ["LAN", "ONLINE", "MAJOR"]));
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
        if ((isPlayerEditor || isStaffEditor) && ["rating", "overall", "overallrating"].includes(normalizedLabel)) {
            input.value = isStaffEditor ? calculateStaffRatingForTable(table, editDraft).toFixed(2) : calculatePlayerRating(editDraft).toFixed(2);
            input.readOnly = true;
            input.title = `Calculated automatically from ${isStaffEditor ? "role-relevant staff" : "all player"} attributes`;
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
    control.value = options.value ?? editDraft[index] ?? "";
    control.dataset.column = index;
    if (options.readOnly) control.readOnly = true;
    if (options.title) control.title = options.title;
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
    const key = String(country || "").normalize("NFKC").trim().toLowerCase();
    const aliases = {
        "united kingdom": "united kindom",
        "uk": "united kindom",
        "great britain": "united kindom",
        "north macedonia": "macedonia"
    };
    const assetKey = aliases[key] || key;
    return window.NOSCOPE_ASSETS?.Countries?.[assetKey]?.path || "";
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
        if (["rating", "overall", "overallrating"].includes(field.name)) {
            const boundField = createBoundField(field.label, field.index, {
                className: `staff-info-${field.name}`,
                value: calculateStaffRatingForTable(table, editDraft).toFixed(2),
                readOnly: true,
                title: "Calculated automatically from role-relevant staff attributes"
            });
            editFormFields.appendChild(boundField);
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
    const roleSkills = getStaffRoleSkillNames(role);
    const staffSkillGroups = [
        {
            title: role ? `${role} attributes` : "Role attributes",
            names: roleSkills
        },
        {
            title: "Common attributes",
            names: getStaffCommonSkillNames()
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

function getTableValue(table, row, aliases) {
    for (const alias of aliases) {
        const index = table.header.findIndex(header => normalizeFieldName(header) === alias);
        if (index >= 0 && String(row[index] ?? "").trim()) return String(row[index]).trim();
    }
    return "";
}

function getTeamAliases(teamRow = editDraft) {
    const table = db.tables[activeTab];
    return table.header.map((header, index) => ({ name: normalizeFieldName(header), value: String(teamRow[index] ?? "").trim() }))
        .filter(field => ["name", "nickname", "nick", "abbreviation", "shortname", "teamid", "internalid", "id"].includes(field.name) && field.value)
        .map(field => field.value.normalize("NFKC").toLowerCase());
}

function createFreeAgentIcon() {
    const icon = document.createElement("span");
    icon.className = "team-roster-free-agent";
    icon.title = "Free agent";
    icon.setAttribute("aria-label", "Free agent");
    const image = document.createElement("img");
    image.src = "assets/images/freeagent.png";
    image.alt = "";
    icon.appendChild(image);
    return icon;
}

function isFreeAgentValue(value) {
    return /^(free\s*agent|freeagent|fa|none|no team|unsigned)$/i.test(String(value || "").trim());
}

function hasFaceitTag(table, row) {
    const value = getTableValue(table, row, ["faceit", "fromfaceit", "faceittag"]);
    return Boolean(value) && !/^(false|0|no|none|n\/a)$/i.test(value);
}

function createFaceitBadge(extraClass = "") {
    const badge = document.createElement("span");
    badge.className = `team-roster-faceit-badge${extraClass ? ` ${extraClass}` : ""}`;
    badge.title = "FACEIT";
    badge.setAttribute("aria-label", "FACEIT");
    const image = document.createElement("img");
    image.src = "assets/images/FACEIT_Pro_League_icon_allmode.png";
    image.alt = "";
    badge.appendChild(image);
    return badge;
}

function createTeamInitialBadge(teamName) {
    const badge = document.createElement("span");
    badge.className = "team-roster-team-fallback";
    badge.title = teamName;
    badge.textContent = String(teamName || "Team").trim().slice(0, 2).toUpperCase();
    return badge;
}

function getPlayerRoles(table, row) {
    return ["role", "role1", "role2", "role3", "primaryrole", "secondaryrole"]
        .map(role => getTableValue(table, row, [role]))
        .filter((role, index, list) => role && list.indexOf(role) === index);
}

function calculatePlayerRatingForTable(table, row) {
    const values = table.header.map((label, index) => ({ section: getFieldSection(label), value: Number.parseFloat(row[index]) }))
        .filter(field => ["gameplay", "mental", "physical"].includes(field.section))
        .map(field => Number.isFinite(field.value) ? Math.min(20, Math.max(0, field.value)) : 0);
    if (!values.length) return 0;
    const stars = values.reduce((sum, value) => sum + value, 0) / values.length / 4;
    return Math.floor(Math.min(5, Math.max(0, stars)) * 100) / 100;
}

function invalidatePlayerLeaderboardRanks(tableName = "") {
    if (!tableName || tableName.toLowerCase() === "players") {
        playerLeaderboardRankCache.clear();
    }
}

function getPlayerLeaderboardRanks(playersTableName) {
    if (!playersTableName) return null;
    const table = db.tables[playersTableName];
    if (!table || playersTableName.toLowerCase() !== "players") return null;
    const cached = playerLeaderboardRankCache.get(playersTableName);
    if (cached?.table === table && cached.rowCount === table.rows.length) return cached.ranks;
    const ranking = table.rows.map((row, index) => ({
        index,
        rating: calculatePlayerRatingForTable(table, row)
    })).sort((a, b) => b.rating - a.rating || a.index - b.index);
    const ranks = new Map();
    ranking.forEach((entry, rankIndex) => ranks.set(entry.index, rankIndex + 1));
    playerLeaderboardRankCache.set(playersTableName, { table, rowCount: table.rows.length, ranks });
    return ranks;
}

function getPlayerLeaderboardRank(playersTableName, playerIndex) {
    if (playerIndex < 0) return playerIndex + 1;
    const ranks = getPlayerLeaderboardRanks(playersTableName);
    return ranks?.get(playerIndex) || playerIndex + 1;
}

function applyPlayerRankBadgeClass(rankElement, rankValue) {
    rankElement.classList.remove("rank-gold", "rank-silver", "rank-bronze");
    if (rankValue === 1) rankElement.classList.add("rank-gold");
    else if (rankValue === 2) rankElement.classList.add("rank-silver");
    else if (rankValue === 3) rankElement.classList.add("rank-bronze");
}

function createTeamRosterRemoveButton(nickname, playerIndex) {
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "team-roster-card-remove";
    remove.textContent = "Remove";
    remove.title = `Remove ${nickname}`;
    remove.setAttribute("aria-label", `Remove ${nickname}`);
    remove.addEventListener("click", event => {
        event.stopPropagation();
        removeRosterPlayer(playerIndex);
    });
    return remove;
}

function createTeamRosterCardBack(table, row, nickname, playerIndex, frontStatAliases = [], showRemove = true) {
    const back = document.createElement("div");
    back.className = "team-roster-card-face team-roster-card-back";
    const title = document.createElement("h3");
    title.textContent = nickname;
    const subtitle = document.createElement("p");
    subtitle.textContent = "Player attributes";
    const hiddenFrontStats = new Set(frontStatAliases.flat());
    const groups = [
        ["Gameplay", "gameplay"],
        ["Mental", "mental"],
        ["Physical", "physical"]
    ];
    const body = document.createElement("div");
    body.className = "team-roster-card-back-body";
    groups.forEach(([groupLabel, section]) => {
        const fields = table.header.map((label, index) => ({
            label,
            name: normalizeFieldName(label),
            value: Number.parseFloat(row[index])
        })).filter(field => getFieldSection(field.label) === section && Number.isFinite(field.value) && !hiddenFrontStats.has(field.name));
        if (!fields.length) return;
        const group = document.createElement("section");
        group.className = "team-roster-attribute-group";
        const heading = document.createElement("h4");
        heading.textContent = groupLabel;
        group.appendChild(heading);
        fields.forEach(field => {
            const item = document.createElement("div");
            item.className = "team-roster-attribute-row";
            const label = document.createElement("b");
            label.textContent = field.label;
            const track = document.createElement("span");
            const fill = document.createElement("i");
            fill.className = getPlayerStatLevel(field.value);
            fill.style.width = `${Math.min(100, Math.max(0, field.value) * 5)}%`;
            track.appendChild(fill);
            const value = document.createElement("strong");
            value.textContent = String(field.value);
            item.append(label, track, value);
            group.appendChild(item);
        });
        body.appendChild(group);
    });
    if (!body.children.length) {
        const empty = document.createElement("div");
        empty.className = "team-roster-card-back-empty";
        empty.textContent = "No extra attributes found.";
        body.appendChild(empty);
    }
    back.append(title, subtitle, body);
    if (showRemove) {
        const actions = document.createElement("div");
        actions.className = "team-roster-card-back-actions";
        actions.appendChild(createTeamRosterRemoveButton(nickname, playerIndex));
        back.appendChild(actions);
    }
    return back;
}

function removeRosterPlayer(playerIndex) {
    teamRosterDraft = teamRosterDraft.filter(index => index !== playerIndex);
    renderTeamRosterEditor();
}

function moveRosterDraftItem(fromIndex, toIndex) {
    if (fromIndex === toIndex || fromIndex < 0 || fromIndex >= teamRosterDraft.length) return;
    const [playerIndex] = teamRosterDraft.splice(fromIndex, 1);
    const targetIndex = Math.max(0, Math.min(toIndex, teamRosterDraft.length));
    teamRosterDraft.splice(targetIndex, 0, playerIndex);
    renderTeamRosterEditor();
}

function swapRosterDraftItems(fromIndex, toIndex) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= teamRosterDraft.length || toIndex >= teamRosterDraft.length) return;
    [teamRosterDraft[fromIndex], teamRosterDraft[toIndex]] = [teamRosterDraft[toIndex], teamRosterDraft[fromIndex]];
    renderTeamRosterEditor();
}

function clearRosterDropHighlights() {
    document.querySelectorAll(".team-roster-card.drag-over,.team-roster-empty-slot.drag-over,.team-roster-bench-empty.drag-over")
        .forEach(element => element.classList.remove("drag-over"));
}

function getRosterDropTargetAtPoint(x, y) {
    const element = document.elementFromPoint(x, y)?.closest(".team-roster-card,.team-roster-empty-slot,.team-roster-bench-empty");
    return element?.dataset.rosterDropIndex ? element : null;
}

function updateRosterPointerDrag(event) {
    if (!teamRosterDragState) return;
    const { card, offsetX, offsetY } = teamRosterDragState;
    card.style.left = `${event.clientX - offsetX}px`;
    card.style.top = `${event.clientY - offsetY}px`;
    const target = getRosterDropTargetAtPoint(event.clientX, event.clientY);
    if (teamRosterDragState.dropTarget === target) return;
    teamRosterDragState.dropTarget?.classList.remove("drag-over");
    target?.classList.add("drag-over");
    teamRosterDragState.dropTarget = target;
}

function finishRosterPointerDrag(event) {
    if (!teamRosterDragState) return;
    const { card, placeholder, rosterIndex } = teamRosterDragState;
    const target = getRosterDropTargetAtPoint(event.clientX, event.clientY);
    const targetIndex = target ? Number(target.dataset.rosterDropIndex) : -1;
    teamRosterDragIndex = -1;
    teamRosterDragState = null;
    document.removeEventListener("pointermove", updateRosterPointerDrag);
    document.removeEventListener("pointerup", finishRosterPointerDrag);
    document.removeEventListener("pointercancel", cancelRosterPointerDrag);
    clearRosterDropHighlights();
    placeholder.remove();
    card.classList.remove("dragging");
    card.style.left = "";
    card.style.top = "";
    card.style.width = "";
    card.style.height = "";
    if (Number.isInteger(targetIndex) && targetIndex >= 0) {
        if (target?.classList.contains("team-roster-card")) swapRosterDraftItems(rosterIndex, targetIndex);
        else moveRosterDraftItem(rosterIndex, targetIndex);
    }
}

function cancelRosterPointerDrag() {
    if (!teamRosterDragState) return;
    const { card, placeholder } = teamRosterDragState;
    teamRosterDragIndex = -1;
    teamRosterDragState = null;
    document.removeEventListener("pointermove", updateRosterPointerDrag);
    document.removeEventListener("pointerup", finishRosterPointerDrag);
    document.removeEventListener("pointercancel", cancelRosterPointerDrag);
    clearRosterDropHighlights();
    placeholder.remove();
    card.classList.remove("dragging");
    card.style.left = "";
    card.style.top = "";
    card.style.width = "";
    card.style.height = "";
}

function enableRosterCardFlip(card) {
    let flipTimer = null;
    const cancelFlip = () => {
        clearTimeout(flipTimer);
        flipTimer = null;
        card.classList.remove("is-flipped");
    };
    card.addEventListener("mouseenter", () => {
        clearTimeout(flipTimer);
        flipTimer = setTimeout(() => {
            if (!card.classList.contains("dragging")) card.classList.add("is-flipped");
        }, TEAM_ROSTER_FLIP_DELAY_MS);
    });
    card.addEventListener("mouseleave", cancelFlip);
    card.addEventListener("pointerdown", cancelFlip);
}

function enableRosterDropTarget(element, targetIndex) {
    element.dataset.rosterDropIndex = String(targetIndex);
}

function enableRosterCardDrag(card, rosterIndex) {
    card.draggable = false;
    card.dataset.rosterIndex = String(rosterIndex);
    card.addEventListener("pointerdown", event => {
        if (event.button !== 0 || event.target.closest("button")) return;
        event.preventDefault();
        card.classList.remove("is-flipped");
        const rect = card.getBoundingClientRect();
        const placeholder = document.createElement("article");
        placeholder.className = `team-roster-drag-placeholder team-roster-drag-placeholder-${card.classList.contains("team-roster-card-bench") ? "bench" : "main"}`;
        placeholder.style.height = `${rect.height}px`;
        card.before(placeholder);
        teamRosterDragIndex = rosterIndex;
        teamRosterDragState = {
            card,
            placeholder,
            rosterIndex,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
            dropTarget: null
        };
        card.classList.add("dragging");
        card.style.left = `${rect.left}px`;
        card.style.top = `${rect.top}px`;
        card.style.width = `${rect.width}px`;
        card.style.height = `${rect.height}px`;
        document.addEventListener("pointermove", updateRosterPointerDrag);
        document.addEventListener("pointerup", finishRosterPointerDrag, { once: true });
        document.addEventListener("pointercancel", cancelRosterPointerDrag, { once: true });
    });
    enableRosterDropTarget(card, rosterIndex);
}

function positionRosterPreview(point) {
    if (!rosterPreview) return;
    const previewRect = rosterPreview.getBoundingClientRect();
    const gap = 14;
    let left = point.x + gap;
    if (left + previewRect.width > window.innerWidth - gap) left = point.x - previewRect.width - gap;
    left = Math.max(gap, Math.min(left, window.innerWidth - previewRect.width - gap));
    let top = point.y - previewRect.height - gap;
    if (top < gap) top = point.y + gap;
    top = Math.max(gap, Math.min(top, window.innerHeight - previewRect.height - gap));
    rosterPreview.style.left = `${left}px`;
    rosterPreview.style.top = `${top}px`;
}

function hideRosterPreview() {
    clearTimeout(rosterPreviewTimer);
    rosterPreviewTimer = null;
    rosterPreview?.remove();
    rosterPreview = null;
}

function showRosterPreview(point, playersTableName, playerIndex) {
    hideRosterPreview();
    const table = db.tables[playersTableName];
    const row = table?.rows[playerIndex];
    if (!row) return;
    const previousTab = activeTab;
    activeTab = playersTableName;
    const card = createPlayerCard(row, playerIndex);
    activeTab = previousTab;
    card.classList.add("team-roster-preview-card");
    const preview = document.createElement("div");
    preview.className = "team-roster-preview";
    preview.appendChild(card);
    document.body.appendChild(preview);
    rosterPreview = preview;
    positionRosterPreview(point);
}

function enableTeamRosterPreview(anchor, playersTableName, playerIndex) {
    let pointer = null;
    const pointFromAnchor = () => {
        const rect = anchor.getBoundingClientRect();
        return { x: rect.right, y: rect.top + rect.height / 2 };
    };
    anchor.addEventListener("mouseenter", event => {
        pointer = { x: event.clientX, y: event.clientY };
        clearTimeout(rosterPreviewTimer);
        rosterPreviewTimer = setTimeout(() => showRosterPreview(pointer || pointFromAnchor(), playersTableName, playerIndex), 1000);
    });
    anchor.addEventListener("mousemove", event => {
        pointer = { x: event.clientX, y: event.clientY };
        positionRosterPreview(pointer);
    });
    anchor.addEventListener("mouseleave", hideRosterPreview);
    anchor.addEventListener("focus", () => {
        clearTimeout(rosterPreviewTimer);
        rosterPreviewTimer = setTimeout(() => showRosterPreview(pointFromAnchor(), playersTableName, playerIndex), 1000);
    });
    anchor.addEventListener("blur", hideRosterPreview);
}

function initializeTeamRoster(teamRow) {
    const playersTableName = Object.keys(db.tables).find(name => name.toLowerCase() === "players");
    const playersTable = playersTableName ? db.tables[playersTableName] : null;
    if (!playersTable) {
        teamRosterOriginal = [];
        teamRosterDraft = [];
        return;
    }
    const aliases = new Set(getTeamAliases(teamRow));
    const teamColumns = playersTable.header.map((header, index) => ({ name: normalizeFieldName(header), index }))
        .filter(field => ["team", "teamname", "teamid"].includes(field.name));
    const positionIndex = playersTable.header.findIndex(header => normalizeFieldName(header) === "rosterposition");
    teamRosterOriginal = playersTable.rows.map((row, index) => ({
        index,
        position: positionIndex >= 0 ? String(row[positionIndex] || "").toLowerCase() : ""
    })).filter(entry => teamColumns.some(field => aliases.has(String(playersTable.rows[entry.index][field.index] || "").trim().normalize("NFKC").toLowerCase())))
        .sort((a, b) => Number(a.position.includes("bench")) - Number(b.position.includes("bench")))
        .map(entry => entry.index);
    teamRosterDraft = [...teamRosterOriginal];
}

function createTeamRosterPlayer(playersTableName, playerIndex, rosterIndex) {
    const table = db.tables[playersTableName];
    const row = table.rows[playerIndex];
    const country = getTableValue(table, row, ["nationality", "country"]);
    const team = getTableValue(table, row, ["team", "teamname", "teamid"]);
    const isFreeAgent = !team || isFreeAgentValue(team);
    const age = calculateAge(getTableValue(table, row, ["dateofbirth", "birthdate", "dob"]));
    const roles = getPlayerRoles(table, row);
    const item = document.createElement("article");
    item.className = "team-roster-player";
    const portrait = document.createElement("span");
    portrait.className = "team-roster-portrait";
    loadCardAsset(portrait, getAssetKey(playersTableName, row), getBundledAssetCandidates(playersTableName, row));
    const info = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = getTableValue(table, row, ["nickname", "nick", "name"]) || `Player ${playerIndex + 1}`;
    const meta = document.createElement("span");
    meta.className = "team-roster-meta";
    const flagPath = getCountryAssetPath(country);
    if (flagPath) {
        const flag = document.createElement("img");
        flag.className = "team-roster-flag";
        flag.src = flagPath;
        flag.alt = "";
        meta.appendChild(flag);
    }
    const countryText = document.createElement("span");
    countryText.textContent = country || "Unknown nationality";
    meta.appendChild(countryText);
    const role = getTableValue(table, row, ["role", "role1", "primaryrole"]);
    if (role) {
        const roleText = document.createElement("span");
        roleText.textContent = role;
        meta.appendChild(roleText);
    }
    if (hasFaceitTag(table, row)) meta.appendChild(createFaceitBadge());
    info.append(name, meta);
    const affiliation = document.createElement("span");
    affiliation.className = "team-roster-affiliation";
    const teamLogo = isFreeAgent ? null : createTeamLogoBadge(row, true, playersTableName);
    affiliation.appendChild(isFreeAgent ? createFreeAgentIcon() : (teamLogo || createTeamInitialBadge(team)));
    const teamText = document.createElement("span");
    teamText.textContent = isFreeAgent ? "Free agent" : team;
    affiliation.appendChild(teamText);
    const status = document.createElement("b");
    status.className = rosterIndex < 5 ? "roster-main" : "roster-bench";
    status.textContent = rosterIndex < 5 ? "Main" : "Bench";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "team-roster-remove";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => {
        teamRosterDraft = teamRosterDraft.filter(index => index !== playerIndex);
        renderTeamRosterEditor();
    });
    item.append(portrait, info, affiliation, status, remove);
    return item;
}

function createTeamRosterPlayerCard(playersTableName, playerIndex, rosterIndex, variant = "main") {
    const table = db.tables[playersTableName];
    const row = table.rows[playerIndex];
    const nickname = getTableValue(table, row, ["nickname", "nick", "internalid", "name"]) || `Player ${playerIndex + 1}`;
    const firstName = getTableValue(table, row, ["firstname", "forename", "name"]);
    const surname = getTableValue(table, row, ["surname", "lastname"]);
    const country = getTableValue(table, row, ["nationality", "country"]);
    const team = getTableValue(table, row, ["team", "teamname", "teamid"]);
    const earnings = getTableValue(table, row, ["earnings", "prizemoney", "salary", "marketvalue"]);
    const birthDate = getTableValue(table, row, ["dateofbirth", "birthdate", "dob"]);
    const rating = calculatePlayerRatingForTable(table, row).toFixed(2);

    const card = document.createElement("article");
    card.className = `record-card player-card team-roster-card team-roster-card-${variant}`;
    card.dataset.index = playerIndex;

    const media = document.createElement("div");
    media.className = "player-card-media";
    media.innerHTML = "<span>No image</span>";
    loadCardAsset(media, getAssetKey(playersTableName, row), getBundledAssetCandidates(playersTableName, row));

    const shade = document.createElement("div");
    shade.className = "player-card-shade";

    const rank = document.createElement("span");
    rank.className = "player-rank";
    const leaderboardRank = getPlayerLeaderboardRank(playersTableName, playerIndex);
    rank.textContent = `#${leaderboardRank}`;
    applyPlayerRankBadgeClass(rank, leaderboardRank);

    const ratingBadge = document.createElement("span");
    ratingBadge.className = "player-rating";
    ratingBadge.innerHTML = `<span class="player-rating-star" aria-hidden="true">⭐</span>${rating || "-"}`;

    const faceitBadge = hasFaceitTag(table, row) ? createFaceitBadge("player-faceit-badge") : null;

    const identity = document.createElement("div");
    identity.className = "player-identity";
    const title = document.createElement("h3");
    title.textContent = nickname;
    const subtitle = document.createElement("p");
    const age = calculateAge(birthDate);
    subtitle.textContent = [`${firstName} ${surname}`.trim(), age ? `${age} y.o.` : ""].filter(Boolean).join(" · ");
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
    const countryText = document.createElement("span");
    countryText.textContent = country || "Nationality unknown";
    affiliation.appendChild(countryText);
    if (team) {
        const separator = document.createElement("span");
        separator.className = "player-affiliation-separator";
        separator.textContent = "•";
        affiliation.appendChild(separator);
        const teamAffiliation = document.createElement("span");
        teamAffiliation.className = "player-team-affiliation";
        const affiliationTeamLogo = createTeamLogoBadge(row, true, playersTableName);
        if (affiliationTeamLogo) {
            affiliationTeamLogo.classList.add("affiliation-team-logo");
            teamAffiliation.appendChild(affiliationTeamLogo);
        }
        const teamText = document.createElement("span");
        teamText.textContent = team;
        teamAffiliation.appendChild(teamText);
        affiliation.appendChild(teamAffiliation);
    }
    identity.append(title, subtitle, affiliation);

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
        const rawValue = getTableValue(table, row, aliases);
        const numericValue = Number.parseFloat(rawValue) || 0;
        radarValues.push(numericValue);
        const stat = document.createElement("div");
        stat.className = "player-stat";
        const statLabel = document.createElement("b");
        statLabel.textContent = label;
        const track = document.createElement("span");
        const fill = document.createElement("i");
        fill.className = getPlayerStatLevel(numericValue);
        fill.style.width = `${Math.min(100, numericValue * 5)}%`;
        track.appendChild(fill);
        const statValue = document.createElement("strong");
        statValue.textContent = rawValue || "—";
        stat.append(statLabel, track, statValue);
        statsList.appendChild(stat);
    });
    radarValues.push(Number.parseFloat(getTableValue(table, row, ["clutch", "tactic", "teamwork"])) || 0);
    statsPanel.append(statsList, createMiniRadar(radarValues));

    const footer = document.createElement("div");
    footer.className = "player-card-footer";
    const money = document.createElement("strong");
    money.textContent = earnings ? `Earnings: $ ${String(earnings).replace(/^\$\s*/, "")}` : "Earnings: —";
    footer.appendChild(money);

    const rosterActions = document.createElement("div");
    rosterActions.className = "team-roster-card-actions";
    const dragHint = document.createElement("span");
    dragHint.className = "team-roster-drag-hint";
    dragHint.textContent = "Drag to reorder";
    rosterActions.append(dragHint, createTeamRosterRemoveButton(nickname, playerIndex));

    const front = document.createElement("div");
    front.className = "team-roster-card-face team-roster-card-front";
    front.append(media, shade, rank, ratingBadge, ...(faceitBadge ? [faceitBadge] : []), identity, statsPanel, footer, rosterActions);
    const inner = document.createElement("div");
    inner.className = "team-roster-card-inner";
    inner.append(front, createTeamRosterCardBack(table, row, nickname, playerIndex, statNames.map(([, aliases]) => aliases)));
    card.appendChild(inner);
    enableRosterCardFlip(card);
    enableRosterCardDrag(card, rosterIndex);
    return card;
}

function createTeamRosterEmptySlot(slotIndex, onAdd) {
    const slot = document.createElement("article");
    slot.className = "team-roster-empty-slot";
    slot.tabIndex = 0;
    slot.setAttribute("role", "button");
    slot.setAttribute("aria-label", `Focus player search for slot ${slotIndex + 1}`);
    const number = document.createElement("b");
    number.textContent = `Slot ${slotIndex + 1}`;
    const label = document.createElement("span");
    label.textContent = "Open main squad slot";
    slot.addEventListener("click", onAdd);
    slot.addEventListener("keydown", event => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onAdd();
    });
    slot.append(number, label);
    enableRosterDropTarget(slot, slotIndex);
    return slot;
}

function createTeamRosterSearchOption(playersTableName, playerIndex, onSelect) {
    const table = db.tables[playersTableName];
    const row = table.rows[playerIndex];
    const country = getTableValue(table, row, ["nationality", "country"]);
    const team = getTableValue(table, row, ["team", "teamname", "teamid"]);
    const isFreeAgent = !team || isFreeAgentValue(team);
    const age = calculateAge(getTableValue(table, row, ["dateofbirth", "birthdate", "dob"]));
    const roles = getPlayerRoles(table, row);
    const option = document.createElement("button");
    option.type = "button";
    option.className = "team-roster-option";
    const portrait = document.createElement("span");
    portrait.className = "team-roster-portrait";
    loadCardAsset(portrait, getAssetKey(playersTableName, row), getBundledAssetCandidates(playersTableName, row));
    const info = document.createElement("span");
    info.className = "team-roster-option-info";
    const name = document.createElement("strong");
    name.textContent = getTableValue(table, row, ["nickname", "nick", "name"]) || `Player ${playerIndex + 1}`;
    const meta = document.createElement("span");
    meta.className = "team-roster-meta";
    const flagPath = getCountryAssetPath(country);
    if (flagPath) {
        const flag = document.createElement("img");
        flag.className = "team-roster-flag";
        flag.src = flagPath;
        flag.alt = "";
        meta.appendChild(flag);
    }
    const countryText = document.createElement("span");
    countryText.textContent = country || "Unknown nationality";
    meta.appendChild(countryText);
    if (age) {
        const ageText = document.createElement("span");
        ageText.textContent = `${age} y.o.`;
        meta.appendChild(ageText);
    }
    if (roles.length) {
        const roleText = document.createElement("span");
        roleText.textContent = roles.join(" / ");
        meta.appendChild(roleText);
    }
    if (hasFaceitTag(table, row)) meta.appendChild(createFaceitBadge());
    info.append(name, meta);
    const affiliation = document.createElement("span");
    affiliation.className = "team-roster-affiliation";
    const teamLogo = isFreeAgent ? null : createTeamLogoBadge(row, true, playersTableName);
    affiliation.appendChild(isFreeAgent ? createFreeAgentIcon() : (teamLogo || createTeamInitialBadge(team)));
    const teamText = document.createElement("span");
    teamText.textContent = isFreeAgent ? "Free agent" : team;
    affiliation.appendChild(teamText);
    option.append(portrait, info, affiliation);
    option.addEventListener("click", onSelect);
    enableTeamRosterPreview(option, playersTableName, playerIndex);
    return option;
}

function renderTeamRosterEditor() {
    hideRosterPreview();
    editFormFields.className = "team-roster-editor";
    editFormFields.innerHTML = "";
    const playersTableName = Object.keys(db.tables).find(name => name.toLowerCase() === "players");
    if (!playersTableName) {
        editFormFields.innerHTML = '<div class="editor-page-empty">A Players table is required to build a roster.</div>';
        return;
    }
    const table = db.tables[playersTableName];
    const heading = document.createElement("div");
    heading.className = "team-roster-heading";
    const title = document.createElement("h3");
    title.textContent = `Squad — ${teamRosterDraft.length} player${teamRosterDraft.length === 1 ? "" : "s"}`;
    const note = document.createElement("span");
    note.textContent = teamRosterDraft.length > 5 ? `${teamRosterDraft.length - 5} on bench` : `${Math.max(0, 5 - teamRosterDraft.length)} main slot${5 - teamRosterDraft.length === 1 ? "" : "s"} open`;
    heading.append(title, note);
    const search = document.createElement("input");
    search.type = "search";
    search.className = "team-roster-search";
    search.placeholder = "Search players by nick, name, country, or current team…";
    const results = document.createElement("div");
    results.className = "team-roster-results";
    const renderResults = () => {
        const term = search.value.trim().toLowerCase();
        results.innerHTML = "";
        if (!term) return;
        table.rows.map((row, index) => ({ row, index })).filter(entry => !teamRosterDraft.includes(entry.index))
            .filter(entry => entry.row.some(value => String(value ?? "").toLowerCase().includes(term))).slice(0, 8).forEach(entry => {
                const option = createTeamRosterSearchOption(playersTableName, entry.index, () => {
                    teamRosterDraft.push(entry.index);
                    renderTeamRosterEditor();
                });
                results.appendChild(option);
            });
        if (!results.children.length) results.innerHTML = '<span>No matching available players.</span>';
    };
    search.addEventListener("input", renderResults);
    const picker = document.createElement("section");
    picker.className = "team-roster-picker";
    picker.append(search, results);
    const stage = document.createElement("div");
    stage.className = "team-roster-stage";

    const mainSection = document.createElement("section");
    mainSection.className = "team-roster-section";
    const mainTitle = document.createElement("h3");
    mainTitle.className = "team-roster-section-title";
    mainTitle.textContent = "Main squad";
    const mainGrid = document.createElement("div");
    mainGrid.className = "team-roster-main-grid";
    for (let slotIndex = 0; slotIndex < 5; slotIndex += 1) {
        const playerIndex = teamRosterDraft[slotIndex];
        mainGrid.appendChild(Number.isInteger(playerIndex)
            ? createTeamRosterPlayerCard(playersTableName, playerIndex, slotIndex, "main")
            : createTeamRosterEmptySlot(slotIndex, () => search.focus()));
    }
    mainSection.append(mainTitle, mainGrid);

    const benchSection = document.createElement("section");
    benchSection.className = "team-roster-section";
    const benchTitle = document.createElement("h3");
    benchTitle.className = "team-roster-section-title";
    benchTitle.textContent = "Bench squad";
    const benchGrid = document.createElement("div");
    benchGrid.className = "team-roster-bench-grid";
    teamRosterDraft.slice(5).forEach((playerIndex, benchIndex) => {
        benchGrid.appendChild(createTeamRosterPlayerCard(playersTableName, playerIndex, benchIndex + 5, "bench"));
    });
    if (!benchGrid.children.length) {
        const empty = document.createElement("div");
        empty.className = "team-roster-empty team-roster-bench-empty";
        empty.textContent = "No bench players signed. Add a sixth player to start the bench.";
        benchGrid.appendChild(empty);
    }
    benchSection.append(benchTitle, benchGrid);
    stage.append(mainSection, benchSection);

    editFormFields.append(heading, picker, stage);
    editorFieldCount.textContent = `${Math.min(5, teamRosterDraft.length)} main · ${Math.max(0, teamRosterDraft.length - 5)} bench`;
}

function applyTeamRosterDraft() {
    const playersTableName = Object.keys(db.tables).find(name => name.toLowerCase() === "players");
    if (!playersTableName) return;
    const playersTable = db.tables[playersTableName];
    const teamTable = db.tables[activeTab];
    const valueFor = aliases => getTableValue(teamTable, editDraft, aliases);
    const teamName = valueFor(["nick", "nickname", "abbreviation", "shortname", "name"]);
    const teamId = valueFor(["teamid", "internalid", "id"]) || teamName;
    const affected = new Set([...teamRosterOriginal, ...teamRosterDraft]);
    const teamFields = playersTable.header.map((header, index) => ({ name: normalizeFieldName(header), index }))
        .filter(field => ["team", "teamname", "teamid", "rosterposition"].includes(field.name));
    affected.forEach(playerIndex => {
        const rosterIndex = teamRosterDraft.indexOf(playerIndex);
        teamFields.forEach(field => {
            if (field.name === "rosterposition") playersTable.rows[playerIndex][field.index] = rosterIndex < 0 ? "" : rosterIndex < 5 ? "Main" : "Bench";
            else if (rosterIndex < 0) playersTable.rows[playerIndex][field.index] = "";
            else playersTable.rows[playerIndex][field.index] = field.name === "teamid" ? teamId : teamName;
        });
    });
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
    const isTeamEditor = activeTab.toLowerCase() === "teams";
    const isTabbedEditor = isPlayerEditor || isStaffEditor || isTeamEditor;
    editModal.dataset.page = editorPage === "stats" ? statsPage : editorPage;
    editorNav.hidden = !isTabbedEditor;
    const generalTab = editorNav.querySelector('[data-editor-page="general"]');
    const skillsTab = editorNav.querySelector('[data-editor-page="stats"]');
    const detailsTab = editorNav.querySelector('[data-editor-page="details"]');
    const rosterTab = editorNav.querySelector('[data-editor-page="roster"]');
    generalTab.textContent = isStaffEditor ? "Info" : "Identity";
    skillsTab.textContent = isStaffEditor ? "Attributes" : "Skills";
    skillsTab.hidden = isTeamEditor;
    detailsTab.hidden = isStaffEditor;
    detailsTab.textContent = isTeamEditor ? "Description" : "Details";
    rosterTab.hidden = !isTeamEditor;
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
        mental: ["Mental stats", isStaffEditor ? "Creativity and psychology attributes." : "Personality, teamwork, leadership, and resilience attributes."],
        roster: ["Team roster", "Manage the five-player main roster and bench."]
    };
    const key = editorPage === "stats" ? statsPage : editorPage;
    [editorPageTitle.textContent, editorPageDescription.textContent] = headings[key];
}

function closeEditor(cancelled = false) {
    hideRosterPreview();
    if (cancelled && editingIsNew && editingRowIndex >= 0) {
        db.tables[activeTab].rows.splice(editingRowIndex, 1);
        invalidatePlayerLeaderboardRanks(activeTab);
        updateTabCount(activeTab);
        renderTable(activeTab);
    }
    editModal.hidden = true;
    editingRowIndex = -1;
    editingIsNew = false;
    editDraft = [];
    currentAssetKey = null;
    pendingAsset = undefined;
    teamRosterOriginal = [];
    teamRosterDraft = [];
    assetFileInput.value = "";
}

// Toolbar actions
btnAddRow.addEventListener("click", () => {
    if (!activeTab) return;
    const cols = db.tables[activeTab].header.length;
    const newRow = new Array(cols).fill("");
    db.tables[activeTab].rows.push(newRow);
    invalidatePlayerLeaderboardRanks(activeTab);
    
    updateTabCount(activeTab);
    currentPage = Math.ceil(db.tables[activeTab].rows.length / PAGE_SIZE);
    renderTable(activeTab);
    openEditor(db.tables[activeTab].rows.length - 1, true);
});

btnDeselectAll.addEventListener("click", clearSelection);

btnDeleteRow.addEventListener("click", async () => {
    const selectedIndexes = selectedRowElements.size
        ? Array.from(selectedRowElements.keys())
        : selectedRowIndex >= 0 ? [selectedRowIndex] : [];
    if (!activeTab || !selectedIndexes.length) {
        alert("Please select a row first.");
        return;
    }
    
    const tableLabel = activeTab.replace(/s$/i, "").toLowerCase();
    const count = selectedIndexes.length;
    const message = count === 1
        ? `This ${tableLabel} will be permanently removed from the database.`
        : `${count} selected ${activeTab.toLowerCase()} will be permanently removed from the database.`;
    if (await requestConfirmation(message)) {
        const uniqueIndexes = [...new Set(selectedIndexes)].sort((a, b) => b - a);
        for (const rowIndex of uniqueIndexes) {
            const row = db.tables[activeTab].rows[rowIndex];
            const assetKey = row ? getAssetKey(activeTab, row) : null;
            if (assetKey) await AssetDB.remove(assetKey).catch(error => console.error("Unable to remove local image", error));
            if (row) db.tables[activeTab].rows.splice(rowIndex, 1);
        }
        invalidatePlayerLeaderboardRanks(activeTab);
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

function setViewMode(mode) {
    viewMode = mode;
    btnGridView.classList.toggle("active", mode === "grid");
    btnListView.classList.toggle("active", mode === "list");
    btnGridView.setAttribute("aria-pressed", String(mode === "grid"));
    btnListView.setAttribute("aria-pressed", String(mode === "list"));
    updatePlayerGridSortControls();
    updateListViewControls();
    if (activeTab) renderTable(activeTab);
}
btnGridView.addEventListener("click", () => setViewMode("grid"));
btnListView.addEventListener("click", () => setViewMode("list"));
listViewPreset.addEventListener("change", () => {
    const normalizedTable = activeTab?.toLowerCase();
    if (!normalizedTable || !listViewStates[normalizedTable]) return;
    listViewStates[normalizedTable] = listViewPreset.value;
    listSortByTable[activeTab] = undefined;
    currentPage = 1;
    renderTable(activeTab);
});
playerGridSortKey.addEventListener("change", () => {
    const sortState = getGridSortState();
    if (sortState) {
        sortState.key = playerGridSortKey.value;
        sortState.direction = getDefaultGridSortDirectionForKey(sortState.key);
        updatePlayerGridSortControls();
    }
    currentPage = 1;
    if (activeTab) renderTable(activeTab);
});
playerGridSortDirection.addEventListener("click", () => {
    const sortState = getGridSortState();
    if (sortState) sortState.direction = sortState.direction === "asc" ? "desc" : "asc";
    updatePlayerGridSortControls();
    currentPage = 1;
    if (activeTab) renderTable(activeTab);
});
searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doSearch();
});
searchInput.addEventListener("input", () => {
    clearTimeout(searchRenderTimer);
    searchRenderTimer = setTimeout(doSearch, SEARCH_RENDER_DELAY_MS);
});

function doSearch() {
    if (!activeTab) return;
    clearTimeout(searchRenderTimer);
    searchRenderTimer = null;
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
    if (["staff", "staffs"].includes(activeTab.toLowerCase())) {
        const ratingIndex = db.tables[activeTab].header.findIndex(label => ["rating", "overall", "overallrating"].includes(normalizeFieldName(label)));
        if (ratingIndex >= 0) editDraft[ratingIndex] = calculateStaffRatingForTable(db.tables[activeTab], editDraft).toFixed(2);
    }
    const nextAssetKey = getAssetKey(activeTab, editDraft);
    if (pendingAsset instanceof Blob && !nextAssetKey) {
        alert("Enter an Internal ID, ID, nickname, or name before saving an image.");
        return;
    }
    db.tables[activeTab].rows[editingRowIndex] = [...editDraft];
    invalidatePlayerLeaderboardRanks(activeTab);
    if (activeTab.toLowerCase() === "teams") applyTeamRosterDraft();
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
