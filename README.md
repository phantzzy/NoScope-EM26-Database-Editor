# NoScope database editor

Browser-based editor for Esports Manager `.emdb` databases.

## Project layout

- `index.html` — application entry point
- `css/` — application styling
- `js/` — application logic, local image storage, and generated asset manifest
- `assets/branding/` — NoScope branding
- `assets/images/` — shared backgrounds and placeholders
- `assets/countries/` — nationality flag images
- `assets/custom/` — entity images grouped by database category
- `data/` — bundled and archived `.emdb` databases
- `tools/` — development and asset-generation scripts

## Regenerating the asset manifest

After changing files under `assets/custom/` or `assets/countries/`, run:

```powershell
.\tools\build-asset-manifest.ps1
```

This regenerates `js/asset-manifest.js` with browser-relative asset paths.

## Running locally

Some browser features, including automatic loading of the bundled default database, require a local web server or the future desktop app runtime rather than opening `index.html` directly through `file://`.
