const fs = require("node:fs/promises");
const path = require("node:path");

const MAX_SELECTED_ASSET_BYTES = 25 * 1024 * 1024;

function cleanAssetFileName(value) {
    const baseName = String(value || "")
        .trim()
        .split(/[\\/]/)
        .pop()
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
        .replace(/[. ]+$/g, "");
    return baseName || "asset.png";
}

function getSupportedImageExtension(buffer) {
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return ".png";
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return ".jpg";
    if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return ".webp";
    return "";
}

function normalizeSelectedAssetFileName(value, buffer) {
    const extension = getSupportedImageExtension(buffer);
    if (!extension) throw new Error("Choose a valid PNG, JPEG, or WebP image.");
    const cleaned = cleanAssetFileName(value);
    const baseName = path.parse(cleaned).name
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
        .replace(/[. ]+$/g, "");
    return `${baseName || "asset"}${extension}`;
}

async function writeSelectedAssetImage({ folderPath, fileName, data }) {
    const buffer = Buffer.from(data || []);
    if (!buffer.length) throw new Error("The selected image was empty.");
    if (buffer.length > MAX_SELECTED_ASSET_BYTES) throw new Error("The selected image is larger than 25 MB.");
    const safeFileName = normalizeSelectedAssetFileName(fileName, buffer);
    const resolvedFolder = path.resolve(folderPath);
    const filePath = path.join(resolvedFolder, safeFileName);
    await fs.mkdir(resolvedFolder, { recursive: true });
    await fs.writeFile(filePath, buffer);
    return { fileName: safeFileName, filePath };
}

module.exports = {
    MAX_SELECTED_ASSET_BYTES,
    getSupportedImageExtension,
    normalizeSelectedAssetFileName,
    writeSelectedAssetImage
};
