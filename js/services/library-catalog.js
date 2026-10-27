/* Public catalog metadata; the unchanged database snapshots are bundled separately. */
(function (root) {
    const entries = [
        {
            id: "em2026-default",
            name: "Default EM2026 Database",
            fileName: "default.emdb",
            owner: "EM2026 Developers",
            sourceUrl: "https://emdb.gg/?view=default",
            default: true,
            sha256: "6e3e18e8b67bbeafd06b295ea9795f19502ab8f6d7594e1c61f27ef8a535a0ea"
        },
        {
            id: "iamgri",
            name: "iamgri mod",
            fileName: "iamgri mod.emdb",
            owner: "iamgri",
            sha256: "38683c3700f1366b6de80b8a6669179635b0955a41a98e83b96918150eea33a4"
        },
        {
            id: "luccaneta",
            name: "luccaneta's GLOBAL UPDATED",
            fileName: "luccanetas_GLOBAL_UPDATED.emdb",
            owner: "luccaneta",
            sha256: "661294dea261e140687380565cae9dff20480f6a32f2ebaa2443aafeb9d6cad1"
        },
        {
            id: "world-updated",
            name: "World Updated",
            fileName: "World_Updated.emdb",
            sha256: "676a6795a4535d5ab76e5910eb1414d5f6a125733efaa6d5a00d4a27c4410a7a"
        },
        {
            id: "updated-stats",
            name: "Updated Stats: T1-2 & Tier 3 Pros - Mid-Season 2026 (before PGL)",
            fileName: "Updated_Stats__T1-2___3_Pros___Realistic__Mid-Season_2026__Last_Updated__b4PGL__.emdb",
            sha256: "dafcd7b42d8dc37201bdc2110d1764bfa2c5601450d9405e2062824dd182f04f"
        }
    ].map(Object.freeze);
    const catalog = Object.freeze(entries);
    if (typeof module === "object" && module.exports) module.exports = catalog;
    else root.NOSCOPE_LIBRARY_DATABASES = catalog;
})(typeof globalThis !== "undefined" ? globalThis : this);
