# NoScope — Esports Manager Database Editor

NoScope is a community-built, browser-based editor for Esports Manager `.emdb` database files. It provides a visual interface for browsing, searching, comparing, filtering, creating, and editing database records without manually working with the CSV files stored inside an `.emdb` archive.

The project currently focuses on the database structure used by Esports Manager 2026 and is being developed with a future desktop application in mind.

> [!IMPORTANT]
> NoScope is an unofficial community project. It is not affiliated with, endorsed by, or maintained by the developers or publishers of Esports Manager. Always keep a backup of the original database before editing it.

## Features

### Database support

NoScope can open and edit the primary database categories:

- Players
- Staff
- Teams
- Tournaments
- Sponsors

It can also open a folder containing the corresponding CSV files and export the current database tables as a ZIP archive.

### Browsing and navigation

- Visual card grid for every database category
- Dense list view for quickly reviewing larger datasets
- Live text search that filters matching records
- Pagination for large databases
- Category-specific filter window
- Searchable team and nationality selectors
- Country flags, team logos, portraits, and other bundled images

### Player tools

- Football Manager-inspired player comparison window
- Side-by-side player profiles and attribute values
- Radar-chart comparison
- Automatically calculated player rating on a `0.00–5.00` scale
- Attribute range filters with dual-ended sliders
- Player roles, nationality, team, gender, status, and birthdate controls

### Editors

Each category has an editor designed around the fields it actually needs:

- Player identity, roles, team, nationality, status, and attributes
- Staff information and role-specific staff attributes
- Team information, disbanded status, and background color picker
- Tournament tier and event type controls
- Sponsor tier and business category controls
- Image previews and local image overrides
- Direct image-URL download with automatic database-compatible renaming

### Saving and exporting

- Save the edited database back to an encrypted `.emdb` file
- Native **Save As** dialog in browsers that support the File System Access API
- Standard browser download fallback elsewhere
- Export all database tables as CSV files in a ZIP archive

## Getting started

### Requirements

No build process or package installation is currently required. You need:

- A modern desktop browser
- An Esports Manager `.emdb` database file
- An internet connection for the externally hosted fonts, JSZip, and Papa Parse libraries

Chromium-based browsers provide the most complete experience because they support the native Save As API.

### Run with a local web server

Some browser security restrictions prevent features such as loading the bundled default database when `index.html` is opened directly through `file://`. Running a small local server is recommended.

From the project directory, use any static server. For example, with Python installed:

```powershell
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Opening `index.html` directly is still suitable for most manual open/edit/save workflows, but the bundled default database cannot be loaded automatically in that mode.

## How to use NoScope

### 1. Open a database

Choose one of the following options in the header:

- **Open .emdb...** — select an existing database from your computer.
- **Load Default DB** — load `data/MostUpdatedDB.emdb` when NoScope is running through a local server or app runtime.
- **Open CSV folder...** — load an unpacked set of supported CSV tables.

The database is processed locally in the browser. NoScope does not upload the selected database to a server.

### 2. Browse records

Select Players, Staff, Teams, Tournaments, or Sponsors from the category navigation.

- Use the grid/list buttons to change the current layout.
- Type in the search box to show only matching records.
- Open **Filter** for category-specific selectors and attribute ranges.
- In Players, use **Compare** to inspect two players side by side.

### 3. Edit or create a record

- Select a record and press its **Edit** button.
- Change the required information in the editor window.
- Use the editor tabs to move between information and attributes where available.
- Press **Save changes** to update the in-memory database.
- Use **Add** to create a new record.
- Select a record and use **Remove** to delete it.

Changes are not written to the original `.emdb` file automatically.

### 4. Work with images

NoScope checks the bundled image library in `assets/custom/` and matches images using database identifiers or names. Nationality flags come from `assets/countries/`.

The editor can also:

- Preview a bundled or locally selected image
- Store a local browser-specific override
- Download a direct PNG, JPEG, or WebP URL
- Rename the downloaded image to the entry identifier expected by the game

Remote image downloads may fail when an image host blocks cross-origin browser requests. Automatic placement into the game's installation directory is planned for the desktop application and is not available in the browser version.

### 5. Save your work

Press **Save as .emdb...** and choose a filename and location. Keep the original database as a backup and save edited versions under a different name until they have been tested in game.

## Player rating calculation

The displayed player rating is calculated from all available gameplay, mental, and physical player attributes:

1. Every attribute is constrained to the game's `0–20` range.
2. The values are averaged.
3. The average is converted to a `0–5` scale.
4. The result is rounded down to two decimal places.

Blank attribute values currently count as `0`, matching the editor's explicit numeric interpretation.

## Project structure

```text
NoScope/
├── index.html                  # Application entry point
├── README.md                   # Project documentation
├── assets/
│   ├── branding/               # NoScope logo and branding
│   ├── countries/              # Nationality flag images
│   ├── custom/                 # Players, staff, teams, sponsors, tournaments
│   └── images/                 # Shared backgrounds and placeholders
├── css/
│   └── styles.css              # Application styling
├── data/
│   ├── MostUpdatedDB.emdb      # Bundled default database
│   └── MostUpdatedDB_150726.emdb
├── js/
│   ├── script.js               # Main application and editor logic
│   ├── asset-db.js             # IndexedDB image override storage
│   └── asset-manifest.js       # Generated bundled-asset index
└── tools/
    └── build-asset-manifest.ps1
```

## Updating bundled assets

After adding, renaming, or removing images under `assets/custom/` or `assets/countries/`, regenerate the browser asset index:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\build-asset-manifest.ps1
```

The script writes the new index to `js/asset-manifest.js`. Commit the regenerated manifest together with the asset changes.

## Open-source development

NoScope is developed openly on GitHub so users can inspect how database files are handled, report problems, propose improvements, and contribute code or assets. Community contributions are welcome, particularly for:

- Database compatibility testing
- Missing editor fields and staff roles
- User-interface and accessibility improvements
- Image matching and asset tooling
- Desktop application packaging
- Documentation and translations after the English interface stabilizes

### Contributing

1. Fork the repository.
2. Create a branch for the change.
3. Keep changes focused and preserve existing database values.
4. Test opening, editing, and saving an `.emdb` file.
5. Regenerate the asset manifest if bundled images changed.
6. Open a pull request describing the change and how it was tested.

For bugs, open a GitHub issue with the affected database category, reproduction steps, browser version, and any console error. Do not attach private or copyrighted database files unless you have permission to share them.

## License status

The source is publicly available and the project is intended to remain open source. A formal open-source license has not yet been added. Until a license is selected, normal copyright restrictions still apply to copying, redistribution, and derivative releases.

Before a stable public release, the project should add an explicit license such as MIT, Apache-2.0, or another license chosen by the repository owner. Bundled game-related database and image assets may require separate consideration from the application source code.

## Roadmap

Planned areas of development include:

- Desktop application packaging
- Direct image installation into the game's CustomAssets folders
- Reliable bundled-default loading in the application runtime
- Further database validation and compatibility checks
- Modularization of the current browser application code
- Automated tests and release builds

## Acknowledgements

NoScope uses:

- [JSZip](https://stuk.github.io/jszip/) for ZIP archive processing
- [Papa Parse](https://www.papaparse.com/) for CSV parsing and generation
- Google Fonts for Manrope and JetBrains Mono

Thanks to the Esports Manager community for testing, feedback, database research, and asset contributions.
