const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { writeSelectedAssetImage } = require("../electron/asset-files.cjs");

test("chosen images are validated, renamed and written to the requested CustomAssets folder", async t => {
    const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "noscope-assets-"));
    t.after(() => fs.rm(temporaryRoot, { recursive: true, force: true }));
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
    const result = await writeSelectedAssetImage({
        folderPath: path.join(temporaryRoot, "Sponsors"),
        fileName: "401.jpeg",
        data: png
    });
    assert.equal(result.fileName, "401.png");
    assert.deepEqual(await fs.readFile(result.filePath), png);
    assert.equal(path.dirname(result.filePath), path.join(temporaryRoot, "Sponsors"));
});

test("chosen image writer rejects data that is not PNG, JPEG or WebP", async () => {
    const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "noscope-assets-invalid-"));
    try {
        await assert.rejects(
            writeSelectedAssetImage({
                folderPath: path.join(temporaryRoot, "Players"),
                fileName: "player.png",
                data: Buffer.from("not an image")
            }),
            /valid PNG, JPEG, or WebP/
        );
    } finally {
        await fs.rm(temporaryRoot, { recursive: true, force: true });
    }
});
