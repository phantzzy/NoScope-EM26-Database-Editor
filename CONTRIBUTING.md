# Contributing to NoScope

Use `beta` for work on v3.0.0-beta.2 and open pull requests against it. Manual testing and stability confirmation are pending. `main` remains the stable v2.3.0 source; beta changes do not promote features into a stable release.

## Run the desktop editor

Install Node.js with npm, clone the repository, and run these commands in its directory:

```powershell
npm.cmd ci
npm.cmd start
```

No private credentials or developer database are required to start the editor. Supply your own `.emdb` when testing database editing. Installers bundle five Library snapshots for offline use; a source checkout needs these files supplied locally to use the Library. The public repository contains only their catalog metadata, not the database binaries. Shared image downloads, fonts, and map tiles require internet access.

The HTML, CSS, and browser JavaScript are the Electron renderer source. Keep them even though a hosted webpage edition is not currently maintained.

## Validate a change

On `beta`, run the automated suites:

```powershell
npm.cmd test
npm.cmd run test:editor
```

The Electron suite uses synthetic records and an isolated profile. To additionally check a local database, pass its path:

```powershell
npm.cmd run test:editor -- "C:\path\to\default.emdb"
```

Reports and screenshots go into ignored `tmp/`. The stable `main` branch predates these test scripts. On either branch, check the affected workflow manually: open, edit, validate, save under a new filename, and reopen. Test both themes for UI changes. Editor tests do not substitute for importing the result in the game.

Keep changes focused. Preserve unknown fields, archive entries, existing values, and undo behavior. Describe the problem, resulting behavior, and validation in the pull request. Report bugs with reproduction steps, app version, operating system, and relevant errors; redact personal paths and database contents.

## Build on Windows

Install a .NET SDK supporting `net8.0-windows`. Place the five original database snapshots in ignored `data/`, using the exact filenames in [`js/services/library-catalog.js`](js/services/library-catalog.js). Obtain them from the maintainer or a matching installer under `resources/app/data/`. Do not substitute edited copies: the packaging check verifies SHA-256 hashes and the exact file list to avoid bundling unrelated databases.

Then run:

```powershell
npm.cmd run dist
```

The build restores packages from the official NuGet feed and creates `release/NoScope-Installer.exe`. Build scripts and installer source belong in Git; generated binaries, package caches, signing credentials, and payload archives do not. Distribute binaries through GitHub release assets when publishing a release.

With the snapshots present, run `npm.cmd run check:library` to verify their bytes and `npm.cmd run test:library` to check all five databases offline, including load/save/reopen, Library counts, and downloads. To test packaged files, use `npm.cmd run test:library -- release/win-unpacked/resources/app`.

## Assets and repository contents

Keep runtime source, dependency lockfiles, build configuration, regression tests, compatibility documentation, app release notes, required UI assets, and third-party license notices in the repository.

Keep personal working notes, agent state, logs, screenshots from local test runs, `.env` files, credential-bearing configuration, signing keys, and actual game databases out of commits. The ignore rules prevent routine accidental additions; inspect `git diff --cached` before committing. Use synthetic fixtures for regression cases instead of uploading an entire database.

The checked-in `js/generated/asset-manifest.js` is used at runtime. Do not delete it merely because it is generated. Regeneration with `npm.cmd run build:asset-manifest` is only needed when maintaining the separate custom asset library and requires its complete `assets/custom/{Players,Teams,Sponsors,Staffs,Tournaments}` folders. The generated root `manifest.json` is a hosting artifact. A normal desktop checkout does not need to regenerate either index to run or package the app.

The public asset-service URLs and EMDB format constant are required application configuration, not account credentials. Retain them when cleaning the repository.

See the README's license status before redistributing source or contributing third-party assets. Keep the existing vendor license files with their assets.
