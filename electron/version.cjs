function normalizeVersion(value) {
    return String(value || "").trim().replace(/^v/i, "").split("+")[0];
}

function splitVersion(value) {
    const normalized = normalizeVersion(value);
    const separator = normalized.indexOf("-");
    const core = separator < 0 ? normalized : normalized.slice(0, separator);
    return {
        core: core.split(".").map(part => Number.parseInt(part, 10) || 0),
        prerelease: separator < 0 ? [] : normalized.slice(separator + 1).split(".")
    };
}

function compareVersions(left, right) {
    const a = splitVersion(left);
    const b = splitVersion(right);
    for (let index = 0; index < Math.max(a.core.length, b.core.length, 3); index++) {
        const delta = (a.core[index] || 0) - (b.core[index] || 0);
        if (delta !== 0) return delta > 0 ? 1 : -1;
    }
    // A stable release follows every prerelease of the same core version.
    if (!a.prerelease.length || !b.prerelease.length) {
        return a.prerelease.length ? -1 : b.prerelease.length ? 1 : 0;
    }
    for (let index = 0; index < Math.max(a.prerelease.length, b.prerelease.length); index++) {
        const x = a.prerelease[index];
        const y = b.prerelease[index];
        if (x === y) continue;
        if (x === undefined) return -1;
        if (y === undefined) return 1;
        const xNumeric = /^\d+$/.test(x);
        const yNumeric = /^\d+$/.test(y);
        if (xNumeric && yNumeric) {
            const delta = BigInt(x) - BigInt(y);
            if (delta !== 0n) return delta > 0n ? 1 : -1;
        } else if (xNumeric !== yNumeric) {
            return xNumeric ? -1 : 1;
        } else {
            return x > y ? 1 : -1;
        }
    }
    return 0;
}

module.exports = { normalizeVersion, compareVersions };
