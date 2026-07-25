import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const customFolders = ["Players", "Teams", "Sponsors", "Staffs", "Tournaments"];
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const customRoot = path.join(projectRoot, "assets", "custom");
const countriesRoot = path.join(projectRoot, "assets", "countries");
const remoteBaseUrl = "https://noscope-assets.pages.dev";

function assertDirectory(directory, label) {
    if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
        throw new Error(`${label} was not found at ${directory}`);
    }
}

function listPngFiles(directory) {
    return fs.readdirSync(directory, { withFileTypes: true })
        .filter(entry => entry.isFile() && path.extname(entry.name).toLowerCase() === ".png")
        .map(entry => entry.name)
        .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "variant" }));
}

function manifestKey(fileName) {
    return path.basename(fileName, path.extname(fileName)).normalize("NFKC").toLowerCase();
}

function assetPath(...segments) {
    const [first, ...rest] = segments;
    return [first, ...rest.map(segment => encodeURIComponent(segment))].join("/");
}

function buildCustomAssetManifest() {
    assertDirectory(customRoot, "Custom asset folder");

    const manifest = {};
    for (const folder of customFolders) {
        const folderPath = path.join(customRoot, folder);
        assertDirectory(folderPath, `${folder} asset folder`);

        const entries = {};
        for (const fileName of listPngFiles(folderPath)) {
            entries[manifestKey(fileName)] = assetPath("assets", "custom", folder, fileName);
        }
        manifest[folder] = entries;
    }
    return manifest;
}

function buildCountriesManifest() {
    assertDirectory(countriesRoot, "Country asset folder");

    const countries = {};
    for (const fileName of listPngFiles(countriesRoot)) {
        const countryName = path.basename(fileName, ".png").replace(/ National Team$/, "");
        countries[countryName.normalize("NFKC").toLowerCase()] = {
            name: countryName,
            path: assetPath("assets", "countries", fileName)
        };
    }
    return countries;
}

const customManifest = buildCustomAssetManifest();
const browserManifest = {
    ...customManifest,
    Countries: buildCountriesManifest()
};
const remoteManifest = {
    version: process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || "",
    baseUrl: remoteBaseUrl,
    ...customManifest
};

fs.mkdirSync(path.join(projectRoot, "js", "generated"), { recursive: true });
fs.writeFileSync(
    path.join(projectRoot, "js", "generated", "asset-manifest.js"),
    `window.NOSCOPE_ASSETS = ${JSON.stringify(browserManifest)};\n`,
    "utf8"
);
fs.writeFileSync(
    path.join(projectRoot, "manifest.json"),
    `${JSON.stringify(remoteManifest, null, 2)}\n`,
    "utf8"
);

const browserCount = Object.values(browserManifest).reduce((total, entries) => total + Object.keys(entries).length, 0);
const remoteCount = Object.values(customManifest).reduce((total, entries) => total + Object.keys(entries).length, 0);
console.log(`Generated js/generated/asset-manifest.js with ${browserCount} entries.`);
console.log(`Generated manifest.json with ${remoteCount} installable CustomAssets entries.`);
