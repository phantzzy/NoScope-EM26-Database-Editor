const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("noscopeDesktop", {
    platform: process.platform,
    getDefaultSaveDirectory: () => ipcRenderer.invoke("app:get-default-save-directory"),
    minimizeWindow: () => ipcRenderer.invoke("window:minimize"),
    toggleMaximizeWindow: () => ipcRenderer.invoke("window:toggle-maximize"),
    closeWindow: () => ipcRenderer.invoke("window:close"),
    openEmdb: () => ipcRenderer.invoke("dialog:open-emdb"),
    saveEmdb: ({ data, suggestedName }) => ipcRenderer.invoke("dialog:save-emdb", {
        data: data instanceof ArrayBuffer ? new Uint8Array(data) : data,
        suggestedName
    }),
    getCustomAssetRoot: () => ipcRenderer.invoke("asset:get-custom-root"),
    chooseCustomAssetRoot: () => ipcRenderer.invoke("asset:choose-custom-root"),
    getCustomAssetFolder: ({ folder }) => ipcRenderer.invoke("asset:get-custom-folder", {
        folder
    }),
    openCustomAssetFolder: ({ folder }) => ipcRenderer.invoke("asset:open-custom-folder", {
        folder
    }),
    saveClipboardImage: ({ folder, fileName }) => ipcRenderer.invoke("asset:save-clipboard-image", {
        folder,
        fileName
    }),
    cacheRemoteAsset: ({ folder, fileName, url }) => ipcRenderer.invoke("asset:cache-remote-image", {
        folder,
        fileName,
        url
    }),
    installCloudAssets: () => ipcRenderer.invoke("asset:install-cloud-assets"),
    onCloudAssetInstallProgress: callback => {
        const listener = (_event, progress) => callback(progress);
        ipcRenderer.on("asset:install-cloud-progress", listener);
        return () => ipcRenderer.removeListener("asset:install-cloud-progress", listener);
    },
    checkForUpdates: () => ipcRenderer.invoke("update:check"),
    downloadAndInstallUpdate: ({ downloadUrl, assetName }) => ipcRenderer.invoke("update:download-and-install", {
        downloadUrl,
        assetName
    }),
    onUpdateDownloadProgress: callback => {
        const listener = (_event, progress) => callback(progress);
        ipcRenderer.on("update:download-progress", listener);
        return () => ipcRenderer.removeListener("update:download-progress", listener);
    }
});
