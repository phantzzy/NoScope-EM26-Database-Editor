# NoScope - Esports Manager Database Editor

NoScope is a community-built, browser-based editor for Esports Manager `.emdb` database files. It provides a visual interface for browsing, searching, comparing, filtering, creating, editing, validating, and merging database records without manually working with the CSV files stored inside an `.emdb` archive.

NoScope currently targets the database structure used by Esports Manager 2026. The current release is `v2.1.0`; full release notes are available in the built-in Changelog panel and under [`changelogs/`](changelogs/).

> [!IMPORTANT]
> NoScope is an unofficial community project. It is not affiliated with, endorsed by, or maintained by the developers or publishers of Esports Manager. Always keep a backup of the original database before editing it.

## Features

### Database support

- Open and edit `.emdb` files containing Players, Staff, Teams, Tournaments, and Sponsors.
- Open unpacked CSV table folders.
- Load the bundled NoScope default database.
- Browse and download five bundled community databases from the Library panel.
- Save the edited database back to an `.emdb` file.
- Export all loaded database tables as CSV files in a ZIP archive.
- View dynamic loading progress while a database is being opened.

### Browsing and navigation

- Game-style card grids for every supported database category.
- Focused list presets for Players, Staff, and Teams.
- Sortable list headers with ascending and descending ordering.
- Category-specific card sorting, including player Rating and Potential, staff Rating, team ERS, sponsor tier, and tournament prize fund.
- Global player leaderboard ranks with gold, silver, and bronze placements.
- Live text search, category filters, and attribute ranges.
- Pagination with first, previous, next, last, and validated page-jump controls.
- Multi-select in card and list views with Deselect all support.
- Horizontal scrolling for wide list views.
- Built-in Guide, Library, Assets, Changelog, Steam, and Discord links.

### Players

- Side-by-side comparison for two selected players with profiles, attributes, and radar charts.
- Automatic player Rating on a `0.00-5.00` scale.
- Manual player Potential on a `1-20` scale.
- Fractional `0-5` Potential stars on cards, lists, and in the player editor.
- Potential sorting, filtering, saving, and CSV export.
- Gameplay, mental, and physical attribute editors.
- Role, nationality, team, gender, retirement, FACEIT, and content creator controls.
- FACEIT and content creator badges across supported player views.
- Birthday generation from a known age or a random age from `16-26`.
- A birthday clear action; saving a blank birthday defaults the player to age `18`.
- NoScope-only content creator filtering.

### Teams and rosters

- Dedicated team roster editor with main-squad and bench sections.
- Searchable player picker with portraits, flags, age, roles, team information, and badges.
- Drag-and-drop ordering, swapping, and explicit main-squad or bench placement.
- Automatic fallback classification when an explicit roster position is unavailable.
- Create a player directly from the team roster editor.
- Roster-aware team cards and team list views.
- Team identity, country, earnings, academy, ERS, disbanded status, and background color editing.
- Team logos and background-color previews in supported card and list views.

### Staff and sponsors

- Staff identity, team, nationality, role, status, and role-specific attribute editing.
- Role-aware Staff Rating calculations and sorting by name, Rating, or team ERS.
- Focused Staff list presets for general and role-specific attributes.
- Sponsor tier, business category, description, and image editing.
- Sponsor sorting by name or tier, with full descriptions available on card backs.

### Tournaments

- Eligible country and city selectors based on locations supported by the game.
- Validation that prevents unsupported country and city combinations.
- Fixed OpenStreetMap preview for the selected city.
- Tournament tier, event type, prize fund, and location editing.

### Mass Edit (Beta)

- Open Mass Edit after selecting two or more players.
- Apply fixed values or randomized ranges to selected attributes.
- Use quick `T1-T5` attribute presets.
- Select individual fields or whole attribute sections.
- Update supported player statuses in bulk.
- Validate ranges and recalculate Rating when changes are applied.

### Database Merge (Beta)

- Use the currently loaded database as Database A and a second uploaded `.emdb` as Database B.
- Choose tables, player field groups, record types, transfers, and compatible missing columns.
- Review additions, updates, identity changes, team transfers, and matching conflicts before applying them.
- Search, filter, and paginate merge proposals.
- Approve or skip individual records and field changes.
- Compare Database A and Database B names when nicknames or identity fields changed.
- Undo the most recently applied merge.
- Preserve all Database A records; merges never delete records automatically.

### Validation and saving

- Run the Validator manually at any time.
- Validate automatically before saving an `.emdb`.
- Check duplicate IDs and primary names across Players, Staff, Teams, Tournaments, and Sponsors.
- Check required tables, columns, and important record fields.
- Review grouped findings and affected record samples in a custom results window.
- Continue with Save anyway when a reported issue is intentional.
- Receive no interruption when automatic validation finds no issues.
- Get a Save or Exit prompt before replacing a database with unsaved changes.
- Use the native Save As picker in browsers that support the File System Access API, with a standard download fallback elsewhere.

### Assets and appearance

- Bundled player portraits, staff images, team logos, sponsor logos, and tournament images.
- Consistent SVG country flags from `flag-icons`.
- Nationality selectors covering the 193 UN member states, Kosovo, and additional game-compatible countries and territories.
- Local browser-specific image overrides stored in IndexedDB.
- Direct PNG, JPEG, and WebP URL downloads with database-compatible filenames.
- Dark and light themes, with dark mode used by default.
- Card hover backs for player attributes and team rosters.
- Full-size image previews for all eleven Guide screenshots.

## Getting started

### Requirements

No build process is required to run NoScope. You need:

- A modern desktop browser.
- An Esports Manager `.emdb` database file, unless using a bundled Library database.
- An internet connection for the externally hosted fonts, JSZip, Papa Parse, and OpenStreetMap tiles.

Chromium-based browsers provide the most complete experience because they support the native Save As API.

### Run with a local web server

Running NoScope through a static server enables bundled database loading and all fetch-based panels.

From the project directory, use any static server. For example:

```powershell
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Opening `index.html` directly still supports most manual open, edit, and save workflows, but browser security restrictions can block bundled databases, release notes, and other local fetches.

## How to use NoScope

### 1. Open a database

Choose one of the following:

- **Open .emdb...** selects a database from your computer.
- **Load Default DB** loads `data/pzy_s_-_NoScope_MEGA_DB.emdb`.
- **Open CSV folder...** loads an unpacked set of supported CSV tables.
- **Library** shows the bundled NoScope, default EM2026, and community databases.

Database processing happens locally in the browser. NoScope does not upload the selected database to a server.

### 2. Browse and select records

1. Select Players, Sponsors, Staff, Teams, or Tournaments from the category navigation.
2. Switch between card and list views.
3. Choose the available list preset or card sort order.
4. Use Search and Filter to narrow the current category.
5. Select one or more cards or rows for Remove, Compare, or Mass Edit actions.

Player and staff cards reveal attribute details after a short hover delay. Team cards reveal roster information.

### 3. Create or edit records

- Use **Add** to create a record.
- Use the pencil button on a card or list row to edit it.
- Move between Identity, Skills, Details, and Roster tabs where available.
- Use **Remove** to delete all selected records after confirmation.
- Save the editor form to update the in-memory database.

These changes are not written to the source file until **Save as .emdb...** is used.

### 4. Edit players and Potential

- Edit player identity, roles, team, nationality, status, links, and attributes.
- Enter Potential manually from `1-20`, or clear it to use the automatic value.
- Potential is shown as fractional stars and does not affect Rating.
- Use the birthday Age input when the age is known.
- Use **Randomize** without an age to generate an age from `16-26`.
- Use **Clear** before replacing an existing birthday.

### 5. Compare or mass edit players

- Select exactly two players and open **Compare** for a side-by-side view.
- Select two or more players and open **Mass Edit Beta**.
- Enable only the fields that should change.
- Enter fixed values, randomized ranges, or a tier preset.
- Review the selected-player count before applying the changes.

### 6. Manage a team roster

1. Create or edit a Team and open its Roster tab.
2. Search for players or use **CREATE PLAYER** to open the player editor.
3. Drag players into Main squad or Bench.
4. Drag existing roster cards to reorder or move them between sections.
5. Save the team to update membership and roster positions where supported by the database schema.

### 7. Merge another database

1. Load the database that should remain the base.
2. Select **Merge Beta** and choose the incoming `.emdb`.
3. Choose the tables, field groups, and action types to compare.
4. Build the review and inspect each proposed addition, update, transfer, rename, or conflict.
5. Approve only the records and fields that should be applied.
6. Apply the merge, review the result, and save it as a new `.emdb`.

The loaded database is always Database A. The uploaded database is Database B. A merge never deletes Database A records automatically.

### 8. Validate and save

- Use **Validate** to inspect the current database before saving.
- Resolve duplicates or missing important values where possible.
- Use **Save anyway** when a warning is expected and intentional.
- Press **Save as .emdb...** and choose a new filename and location.
- Use **Export CSVs (ZIP)** when unpacked table files are needed.

Keep the original database as a backup until the edited version has been tested in game.

### 9. Work with images

NoScope matches bundled images under `assets/custom/` using record identifiers and names. Country flags are rendered from the vendored `flag-icons` package.

The editor can:

- Preview bundled and locally selected images.
- Store a browser-specific image override.
- Remove a local override.
- Download a direct image URL with the identifier-based filename expected by the game.

Remote downloads can fail when an image host blocks cross-origin browser requests. Automatic placement in the game's installation directory remains planned for the future desktop application.

### 10. Use the built-in reference panels

- **Guide** provides task-based instructions and screenshots.
- **Library** provides bundled database downloads and source links.
- **Assets** links to the shared CustomAssets folder.
- **Changelog** contains expandable `v2.1.0` and `v2.0.0` release notes.
- The Steam and Discord buttons open the official Esports Manager 2026 pages.
- The theme button switches between dark and light mode.

## Player Rating and Potential

Player Rating is calculated from all available gameplay, mental, and physical attributes:

1. Every attribute is constrained to the game's `0-20` range.
2. The values are averaged.
3. The average is converted to a `0-5` scale.
4. The result is rounded down to two decimal places.

Blank attribute values count as `0`. Potential is stored separately on a `1-20` scale and is not included in Rating.

When Potential is blank or `0`, NoScope displays an automatic value. The resolved automatic value is written to `Players.csv` when saving an `.emdb` or exporting CSV files, while manually entered values remain unchanged.

## Project structure

```text
NoScope/
|-- index.html                    # Application entry point
|-- README.md                     # Project documentation
|-- assets/
|   |-- badges/                   # FACEIT and other status badges
|   |-- branding/                 # NoScope branding
|   |-- countries/                # Legacy game-provided country images
|   |-- custom/                   # Player, staff, team, sponsor, and tournament assets
|   |-- guide/                    # Guide screenshots
|   |-- ui/                       # Shared backgrounds and placeholders
|   `-- vendor/                   # Vendored third-party visual assets
|-- changelogs/                   # Current and archived release notes
|-- css/
|   `-- styles.css                # Application styling
|-- data/                         # Bundled EMDB databases
|-- docs/
|   `-- announcements/            # Release announcement copy
|-- js/
|   |-- app.js                    # Main application and editor logic
|   |-- features/                 # Merge and validation features
|   |-- generated/                # Generated bundled-asset index
|   `-- services/                 # Browser storage services
`-- tools/
    `-- build-asset-manifest.ps1  # Asset manifest generator
```

## Updating bundled assets

After adding, renaming, or removing images under `assets/custom/` or `assets/countries/`, regenerate the browser asset index:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\build-asset-manifest.ps1
```

The script writes the new index to `js/generated/asset-manifest.js`. Commit the regenerated manifest together with the asset changes.

## Open-source development

NoScope is developed openly so users can inspect how database files are handled, report problems, propose improvements, and contribute code or assets. Community contributions are especially useful for:

- Database compatibility testing.
- Missing editor fields and staff roles.
- Merge and validation edge cases.
- User-interface and accessibility improvements.
- Image matching and asset tooling.
- Desktop application packaging.
- Documentation and translations.

### Contributing

1. Fork the repository.
2. Create a branch for the change.
3. Keep changes focused and preserve existing database values.
4. Test opening, editing, validating, and saving an `.emdb`.
5. Regenerate the asset manifest when bundled record or country images change.
6. Open a pull request describing the change and how it was tested.

For bugs, include the affected database category, reproduction steps, browser version, and any console error. For database-specific problems, include the source `.emdb` only when you have permission to share it.

## License status

The source is publicly available and the project is intended to remain open source. A formal open-source license has not yet been added. Until a license is selected, normal copyright restrictions still apply to copying, redistribution, and derivative releases.

Bundled game-related databases and image assets may require separate consideration from the application source code.

## Roadmap

Planned areas of development include:

- Desktop application packaging.
- Direct image installation into the game's CustomAssets folders.
- Additional database-schema compatibility checks.
- Automated tests and release builds.
- Further modularization of the main browser application.

## Acknowledgements

NoScope uses:

- [JSZip](https://stuk.github.io/jszip/) for ZIP archive processing.
- [Papa Parse](https://www.papaparse.com/) for CSV parsing and generation.
- [flag-icons](https://flagicons.lipis.dev/) for country flags.
- [Simple Icons](https://simpleicons.org/) for the Steam and Discord marks.
- [OpenStreetMap](https://www.openstreetmap.org/) for tournament location maps.
- Google Fonts for Manrope and JetBrains Mono.

Thanks to the Esports Manager community for testing, feedback, database research, and asset contributions.
