const { app, BrowserWindow, clipboard, dialog, ipcMain, net, protocol, shell } = require("electron");
const { spawn } = require("node:child_process");
const fsSync = require("node:fs");
const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const APP_SCHEME = "noscope";
const REMOTE_ASSET_MANIFEST_URL = "https://noscope-assets.pages.dev/manifest.json";
const REMOTE_ASSET_HOST = "noscope-assets.pages.dev";
const UPDATE_RELEASE_API_URL = "https://api.github.com/repos/phantzzy/NoScope-EM26-Database-Editor/releases/latest";
const UPDATE_REPO_RELEASE_PATH = "/phantzzy/NoScope-EM26-Database-Editor/releases/download/";
const INTERNAL_CUSTOM_ASSET_FOLDERS = new Set(["Players", "Teams", "Sponsors", "Staffs", "Tournaments"]);
const CUSTOM_ASSET_FOLDER_ALIASES = {
    Players: ["Players"],
    Teams: ["Teams"],
    Sponsors: ["Sponsors"],
    Staffs: ["Staff", "Staffs"],
    Tournaments: ["Tournaments"]
};

protocol.registerSchemesAsPrivileged([
    {
        scheme: APP_SCHEME,
        privileges: {
            standard: true,
            secure: true,
            supportFetchAPI: true,
            corsEnabled: true
        }
    }
]);

function getAppRoot() {
    return app.getAppPath();
}

function getAppIconPath() {
    return path.join(getAppRoot(), "assets", "branding", "NoScopeIcon.png");
}

function resolveAppPath(requestUrl) {
    const appRoot = getAppRoot();
    const url = new URL(requestUrl);
    const rawPath = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
    const requestedPath = path.normalize(rawPath);

    if (requestedPath.toLowerCase().startsWith(path.normalize("assets/custom/").toLowerCase())) {
        const customRelativePath = requestedPath.slice(path.normalize("assets/custom/").length);
        const [folder, ...rest] = customRelativePath.split(/[\\/]+/);
        const customAssetRoot = getCustomAssetRoot();
        const requestedFile = rest.join(path.sep);

        if (folder && requestedFile) {
            try {
                for (const candidateFolder of getCustomAssetFolderCandidates(folder)) {
                    const customPath = path.resolve(customAssetRoot, candidateFolder, requestedFile);
                    const customRelative = path.relative(customAssetRoot, customPath);

                    if (!customRelative.startsWith("..") && !path.isAbsolute(customRelative) && fsSync.existsSync(customPath)) {
                        return customPath;
                    }
                }

                const cacheRoot = getRemoteAssetCacheRoot();
                const cachePath = path.resolve(cacheRoot, normalizeCustomAssetFolder(folder), requestedFile);
                const cacheRelative = path.relative(cacheRoot, cachePath);

                if (!cacheRelative.startsWith("..") && !path.isAbsolute(cacheRelative) && fsSync.existsSync(cachePath)) {
                    return cachePath;
                }
            } catch {
                // Fall back to bundled app assets below.
            }
        }
    }

    const absolutePath = path.resolve(appRoot, requestedPath);
    const relativePath = path.relative(appRoot, absolutePath);

    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
        return path.join(appRoot, "index.html");
    }

    return absolutePath;
}

function getDefaultDatabaseDirectory() {
    return path.join(app.getPath("documents"), "NoScope");
}

function getDefaultGameCustomAssetRoot() {
    if (process.platform === "win32") {
        return path.join(app.getPath("home"), "AppData", "LocalLow", "NeuronaGames", "EsportsManager", "CustomAssets");
    }

    return path.join(getDefaultDatabaseDirectory(), "CustomAssets");
}

function getSettingsPath() {
    return path.join(app.getPath("userData"), "settings.json");
}

function loadSettings() {
    try {
        const raw = fsSync.readFileSync(getSettingsPath(), "utf8");
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

async function saveSettings(settings) {
    const settingsPath = getSettingsPath();
    await fs.mkdir(path.dirname(settingsPath), { recursive: true });
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), "utf8");
}

function getCustomAssetRoot() {
    const configuredRoot = String(loadSettings().customAssetRoot || "").trim();
    return configuredRoot || getDefaultGameCustomAssetRoot();
}

function normalizeCustomAssetRootSelection(folderPath) {
    const selectedPath = path.resolve(folderPath);
    const selectedName = path.basename(selectedPath).toLowerCase();
    const subfolderNames = new Set(Object.values(CUSTOM_ASSET_FOLDER_ALIASES).flat().map(name => name.toLowerCase()));

    return subfolderNames.has(selectedName) ? path.dirname(selectedPath) : selectedPath;
}

function getRemoteAssetCacheRoot() {
    return path.join(app.getPath("userData"), "RemoteAssetsCache");
}

function normalizeVersion(value) {
    return String(value || "")
        .trim()
        .replace(/^v/i, "")
        .split(/[+-]/)[0];
}

function compareVersions(left, right) {
    const leftParts = normalizeVersion(left).split(".").map(part => Number.parseInt(part, 10) || 0);
    const rightParts = normalizeVersion(right).split(".").map(part => Number.parseInt(part, 10) || 0);
    const maxLength = Math.max(leftParts.length, rightParts.length, 3);

    for (let index = 0; index < maxLength; index++) {
        const delta = (leftParts[index] || 0) - (rightParts[index] || 0);
        if (delta !== 0) return delta > 0 ? 1 : -1;
    }

    return 0;
}

function findInstallerAsset(release) {
    const assets = Array.isArray(release?.assets) ? release.assets : [];
    return assets.find(asset => String(asset?.name || "").toLowerCase() === "noscope-installer.exe")
        || assets.find(asset => /noscope.*installer.*\.exe$/i.test(String(asset?.name || "")))
        || assets.find(asset => /setup.*\.exe$/i.test(String(asset?.name || "")));
}

function validateUpdateDownloadUrl(downloadUrl) {
    let parsed;
    try {
        parsed = new URL(downloadUrl);
    } catch {
        throw new Error("The update download URL was not valid.");
    }

    if (parsed.protocol !== "https:" || parsed.hostname !== "github.com" || !parsed.pathname.startsWith(UPDATE_REPO_RELEASE_PATH)) {
        throw new Error("The update download URL did not come from NoScope GitHub releases.");
    }

    return parsed.toString();
}

async function downloadUpdateInstaller(event, downloadUrl, assetName) {
    const safeName = String(assetName || "NoScope-Installer.exe").replace(/[<>:"/\\|?*\x00-\x1f]/g, "-");
    const installerPath = path.join(app.getPath("temp"), `NoScope-Update-${Date.now()}-${safeName}`);
    const response = await net.fetch(downloadUrl, {
        cache: "no-store",
        headers: { "User-Agent": `NoScope/${app.getVersion()}` }
    });

    if (!response.ok) throw new Error(`Update download failed (${response.status}).`);

    if (!response.body?.getReader) {
        const buffer = Buffer.from(await response.arrayBuffer());
        await fs.writeFile(installerPath, buffer);
        event.sender.send("update:download-progress", { downloaded: buffer.length, total: buffer.length, percent: 100 });
        return installerPath;
    }

    const total = Number(response.headers.get("content-length")) || 0;
    const reader = response.body.getReader();
    const file = await fs.open(installerPath, "w");
    let downloaded = 0;

    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = Buffer.from(value);
            await file.write(chunk);
            downloaded += chunk.length;
            event.sender.send("update:download-progress", {
                downloaded,
                total,
                percent: total ? Math.round(downloaded * 100 / total) : 0
            });
        }
    } finally {
        await file.close();
    }

    event.sender.send("update:download-progress", {
        downloaded,
        total: total || downloaded,
        percent: 100
    });
    return installerPath;
}

function launchInstallerAfterQuit(installerPath) {
    const command = `timeout /t 1 /nobreak >nul & "${installerPath}"`;
    const child = spawn(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", command], {
        detached: true,
        stdio: "ignore",
        windowsHide: true
    });
    child.unref();
    app.quit();
}

function toErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}

function cleanPngFileName(value) {
    const baseName = String(value || "")
        .trim()
        .replace(/\.(png|jpe?g|webp)$/i, "")
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
        .replace(/[. ]+$/g, "");

    return `${baseName || "player-image"}.png`;
}

function cleanAssetFileName(value) {
    const baseName = String(value || "")
        .trim()
        .split(/[\\/]/)
        .pop()
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
        .replace(/[. ]+$/g, "");

    return baseName || "asset.png";
}

function normalizeCustomAssetFolder(folder) {
    const requestedFolder = String(folder || "Players");
    const folderName = requestedFolder.toLowerCase() === "staff" ? "Staffs" : requestedFolder;

    if (!INTERNAL_CUSTOM_ASSET_FOLDERS.has(folderName)) {
        throw new Error("Unsupported asset folder.");
    }

    return folderName;
}

function getCustomAssetFolderCandidates(folder) {
    const folderName = normalizeCustomAssetFolder(folder);
    return CUSTOM_ASSET_FOLDER_ALIASES[folderName] || [folderName];
}

function getCustomAssetFolder(folder) {
    const [targetFolder] = getCustomAssetFolderCandidates(folder);
    return path.join(getCustomAssetRoot(), targetFolder);
}

function getRemoteAssetCacheFolder(folder) {
    const folderName = normalizeCustomAssetFolder(folder);
    return path.join(getRemoteAssetCacheRoot(), folderName);
}

function normalizeRemoteAssetManifestForInstall(manifest) {
    if (!manifest || typeof manifest !== "object") return null;
    const baseUrl = typeof manifest.baseUrl === "string" && manifest.baseUrl.trim()
        ? manifest.baseUrl.trim().replace(/\/+$/, "")
        : "https://noscope-assets.pages.dev";
    const assets = [];
    const seen = new Set();

    for (const folder of INTERNAL_CUSTOM_ASSET_FOLDERS) {
        const entries = manifest[folder];
        if (!entries || typeof entries !== "object") continue;

        for (const relativePath of Object.values(entries)) {
            if (typeof relativePath !== "string" || !relativePath.trim()) continue;
            let sourceUrl;
            try {
                sourceUrl = new URL(relativePath, `${baseUrl}/`);
            } catch {
                continue;
            }
            if (sourceUrl.protocol !== "https:" || sourceUrl.hostname !== REMOTE_ASSET_HOST) continue;

            const fileName = cleanAssetFileName(decodeURIComponent(sourceUrl.pathname.split("/").pop() || ""));
            const key = `${folder}/${fileName}`.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            assets.push({ folder, fileName, url: sourceUrl.toString() });
        }
    }

    return assets.length ? { baseUrl, assets } : null;
}

async function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1440,
        height: 980,
        minWidth: 1120,
        minHeight: 720,
        backgroundColor: "#10131a",
        frame: false,
        title: "NoScope",
        icon: getAppIconPath(),
        show: false,
        webPreferences: {
            preload: path.join(__dirname, "preload.cjs"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        }
    });

    mainWindow.once("ready-to-show", () => mainWindow.show());

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: "deny" };
    });

    mainWindow.webContents.on("will-navigate", (event, url) => {
        if (!url.startsWith(`${APP_SCHEME}://`)) {
            event.preventDefault();
            shell.openExternal(url);
        }
    });

    await mainWindow.loadURL(`${APP_SCHEME}://app/index.html`);
}

app.whenReady().then(async () => {
    protocol.handle(APP_SCHEME, request => {
        const absolutePath = resolveAppPath(request.url);
        return net.fetch(pathToFileURL(absolutePath).toString());
    });

    await createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("dialog:open-emdb", async () => {
    const result = await dialog.showOpenDialog({
        title: "Open Esports Manager database",
        properties: ["openFile"],
        filters: [
            { name: "Esports Manager Database", extensions: ["emdb"] },
            { name: "All Files", extensions: ["*"] }
        ]
    });

    if (result.canceled || !result.filePaths.length) {
        return { canceled: true };
    }

    const filePath = result.filePaths[0];
    const data = await fs.readFile(filePath);
    return {
        canceled: false,
        fileName: path.basename(filePath),
        filePath,
        data
    };
});

ipcMain.handle("dialog:save-emdb", async (_event, payload) => {
    const suggestedName = String(payload?.suggestedName || "edited.emdb").trim();
    const defaultName = suggestedName.toLowerCase().endsWith(".emdb") ? suggestedName : `${suggestedName}.emdb`;
    const result = await dialog.showSaveDialog({
        title: "Save Esports Manager database",
        defaultPath: path.join(getDefaultDatabaseDirectory(), defaultName),
        filters: [
            { name: "Esports Manager Database", extensions: ["emdb"] },
            { name: "All Files", extensions: ["*"] }
        ]
    });

    if (result.canceled || !result.filePath) {
        return { canceled: true };
    }

    try {
        await fs.mkdir(path.dirname(result.filePath), { recursive: true });
        await fs.writeFile(result.filePath, Buffer.from(payload.data));
        return {
            canceled: false,
            fileName: path.basename(result.filePath),
            filePath: result.filePath
        };
    } catch (error) {
        return {
            canceled: false,
            error: toErrorMessage(error)
        };
    }
});

ipcMain.handle("app:get-default-save-directory", () => getDefaultDatabaseDirectory());

ipcMain.handle("asset:get-custom-root", () => ({
    rootPath: getCustomAssetRoot(),
    defaultRootPath: getDefaultGameCustomAssetRoot()
}));

ipcMain.handle("asset:choose-custom-root", async () => {
    const result = await dialog.showOpenDialog({
        title: "Choose Esports Manager CustomAssets folder",
        defaultPath: getCustomAssetRoot(),
        properties: ["openDirectory", "createDirectory"]
    });

    if (result.canceled || !result.filePaths.length) {
        return { canceled: true };
    }

    try {
        const rootPath = normalizeCustomAssetRootSelection(result.filePaths[0]);
        const settings = loadSettings();
        settings.customAssetRoot = rootPath;
        await saveSettings(settings);
        await fs.mkdir(rootPath, { recursive: true });
        return { canceled: false, rootPath };
    } catch (error) {
        return { canceled: false, error: toErrorMessage(error) };
    }
});

ipcMain.handle("asset:get-custom-folder", (_event, payload) => {
    try {
        return {
            rootPath: getCustomAssetRoot(),
            folderPath: getCustomAssetFolder(String(payload?.folder || "Players"))
        };
    } catch (error) {
        return { error: toErrorMessage(error) };
    }
});

ipcMain.handle("asset:open-custom-folder", async (_event, payload) => {
    try {
        const folderPath = getCustomAssetFolder(String(payload?.folder || "Players"));
        await fs.mkdir(folderPath, { recursive: true });
        const error = await shell.openPath(folderPath);
        return error ? { error } : { rootPath: getCustomAssetRoot(), folderPath };
    } catch (error) {
        return { error: toErrorMessage(error) };
    }
});

ipcMain.handle("asset:save-clipboard-image", async (_event, payload) => {
    try {
        const folder = String(payload?.folder || "Players");
        const image = clipboard.readImage();

        if (image.isEmpty()) {
            return { error: "No copied image was found on the clipboard." };
        }

        const fileName = cleanPngFileName(payload?.fileName);
        const internalFolder = normalizeCustomAssetFolder(folder);
        const assetFolder = getCustomAssetFolder(folder);
        const filePath = path.join(assetFolder, fileName);
        const png = image.toPNG();

        await fs.mkdir(assetFolder, { recursive: true });
        await fs.writeFile(filePath, png);

        return {
            fileName,
            filePath,
            rootPath: getCustomAssetRoot(),
            folderPath: assetFolder,
            folder: internalFolder,
            assetPath: `assets/custom/${internalFolder}/${encodeURIComponent(fileName)}`,
            data: png
        };
    } catch (error) {
        return { error: toErrorMessage(error) };
    }
});

ipcMain.handle("asset:cache-remote-image", async (_event, payload) => {
    try {
        const folder = normalizeCustomAssetFolder(payload?.folder);
        const fileName = cleanPngFileName(payload?.fileName);
        const sourceUrl = new URL(String(payload?.url || ""));

        if (sourceUrl.protocol !== "https:" || sourceUrl.hostname !== "noscope-assets.pages.dev") {
            return { error: "Unsupported remote asset host." };
        }

        const response = await net.fetch(sourceUrl.toString());
        if (!response.ok) {
            return { error: `Remote image request failed (${response.status}).` };
        }

        const contentType = response.headers.get("content-type") || "";
        if (contentType && !contentType.startsWith("image/")) {
            return { error: "Remote URL did not return an image." };
        }

        const cacheFolder = getRemoteAssetCacheFolder(folder);
        const cachePath = path.join(cacheFolder, fileName);
        const buffer = Buffer.from(await response.arrayBuffer());

        await fs.mkdir(cacheFolder, { recursive: true });
        await fs.writeFile(cachePath, buffer);

        return {
            folder,
            fileName,
            cachePath,
            assetPath: `assets/custom/${folder}/${encodeURIComponent(fileName)}`
        };
    } catch (error) {
        return { error: toErrorMessage(error) };
    }
});

ipcMain.handle("asset:install-cloud-assets", async event => {
    try {
        const manifestResponse = await net.fetch(`${REMOTE_ASSET_MANIFEST_URL}?t=${Date.now()}`, { cache: "no-store" });
        if (!manifestResponse.ok) {
            return { error: `Cloud asset manifest request failed (${manifestResponse.status}).` };
        }

        const manifest = await manifestResponse.json();
        const normalized = normalizeRemoteAssetManifestForInstall(manifest);
        if (!normalized) {
            return { error: "Cloud asset manifest did not contain installable CustomAssets." };
        }

        const total = normalized.assets.length;
        const stats = { completed: 0, installed: 0, failed: 0 };
        const failures = [];
        const customAssetRoot = getCustomAssetRoot();
        const sendProgress = extra => {
            event.sender.send("asset:install-cloud-progress", {
                total,
                completed: stats.completed,
                installed: stats.installed,
                failed: stats.failed,
                rootPath: customAssetRoot,
                ...extra
            });
        };
        const installOne = async asset => {
            const response = await net.fetch(asset.url);
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error("Image was not found on Cloudflare (404). Regenerate and deploy manifest.json after renaming or deleting assets.");
                }
                throw new Error(`Image request failed (${response.status}).`);
            }

            const contentType = response.headers.get("content-type") || "";
            if (contentType && !contentType.startsWith("image/")) {
                throw new Error("Remote URL did not return an image.");
            }

            const assetFolder = getCustomAssetFolder(asset.folder);
            const filePath = path.join(assetFolder, asset.fileName);
            const buffer = Buffer.from(await response.arrayBuffer());

            await fs.mkdir(assetFolder, { recursive: true });
            await fs.writeFile(filePath, buffer);
            return { folderPath: assetFolder, filePath };
        };
        let cursor = 0;
        const worker = async () => {
            while (cursor < normalized.assets.length) {
                const asset = normalized.assets[cursor];
                cursor += 1;

                try {
                    await installOne(asset);
                    stats.installed += 1;
                } catch (error) {
                    stats.failed += 1;
                    failures.push({
                        folder: asset.folder,
                        fileName: asset.fileName,
                        error: toErrorMessage(error)
                    });
                } finally {
                    stats.completed += 1;
                    sendProgress({ folder: asset.folder, fileName: asset.fileName });
                }
            }
        };

        sendProgress({ folder: "", fileName: "" });
        await Promise.all(Array.from({ length: Math.min(6, total) }, worker));

        return {
            rootPath: customAssetRoot,
            total,
            installed: stats.installed,
            failed: stats.failed,
            failures
        };
    } catch (error) {
        return { error: toErrorMessage(error) };
    }
});

ipcMain.handle("update:check", async () => {
    try {
        const response = await net.fetch(`${UPDATE_RELEASE_API_URL}?t=${Date.now()}`, {
            cache: "no-store",
            headers: { "User-Agent": `NoScope/${app.getVersion()}` }
        });
        if (response.status === 404) {
            return {
                currentVersion: app.getVersion(),
                latestVersion: "",
                hasUpdate: false,
                noRelease: true,
                releaseName: "",
                releaseUrl: "https://github.com/phantzzy/NoScope-EM26-Database-Editor/releases",
                publishedAt: "",
                assetName: "",
                assetSize: 0,
                downloadUrl: "",
                canInstall: false
            };
        }
        if (!response.ok) return { error: `Update check failed (${response.status}).` };

        const release = await response.json();
        const latestVersion = normalizeVersion(release?.tag_name || release?.name || "");
        if (!latestVersion) return { error: "The latest GitHub release did not include a version tag." };

        const asset = findInstallerAsset(release);
        return {
            currentVersion: app.getVersion(),
            latestVersion,
            hasUpdate: compareVersions(latestVersion, app.getVersion()) > 0,
            releaseName: release?.name || `v${latestVersion}`,
            releaseUrl: release?.html_url || "https://github.com/phantzzy/NoScope-EM26-Database-Editor/releases",
            publishedAt: release?.published_at || "",
            assetName: asset?.name || "",
            assetSize: Number(asset?.size) || 0,
            downloadUrl: asset?.browser_download_url || "",
            canInstall: Boolean(asset?.browser_download_url)
        };
    } catch (error) {
        return { error: toErrorMessage(error) };
    }
});

ipcMain.handle("update:download-and-install", async (event, payload) => {
    try {
        const downloadUrl = validateUpdateDownloadUrl(payload?.downloadUrl);
        const installerPath = await downloadUpdateInstaller(event, downloadUrl, payload?.assetName);
        launchInstallerAfterQuit(installerPath);
        return { started: true };
    } catch (error) {
        return { error: toErrorMessage(error) };
    }
});

ipcMain.handle("window:minimize", event => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
});

ipcMain.handle("window:toggle-maximize", event => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return false;
    if (window.isMaximized()) {
        window.unmaximize();
        return false;
    }
    window.maximize();
    return true;
});

ipcMain.handle("window:close", event => {
    BrowserWindow.fromWebContents(event.sender)?.close();
});
