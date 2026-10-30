# NoScope - Esports Manager Database Editor

NoScope is a community-built Windows desktop editor for Esports Manager `.emdb` database files. It provides a visual interface for browsing, searching, comparing, filtering, creating, editing, validating, and merging database records without manually working with the CSV files stored inside an `.emdb` archive.

NoScope currently targets the database structure used by Esports Manager 2026. The current build is **v3.0.0-beta.2** (game version `1.1.4`); full release notes are available in the built-in What's New panel and under [`changelogs/`](changelogs/).

This beta is awaiting manual testing, and stability is not yet confirmed. Automated checks have passed, but in-game testing remains pending. Keep original databases backed up and save edits under a new filename.

The working tree includes compatibility fixes verified against the developer database supplied on 27 October 2026. See the [compatibility report](docs/compatibility-2026-10-27.md) for supported fields, source-data issues, and repeatable regression tests.

> [!IMPORTANT]
> NoScope is an unofficial community project. It is not affiliated with, endorsed by, or maintained by the developers or publishers of Esports Manager. Always keep a backup of the original database before editing it.

## Features

### Database support

- Open and edit `.emdb` files containing Players, Staff, Teams, Tournaments, and Sponsors.
- Open unpacked CSV table folders.
- Open the developers' bundled `default.emdb` from the **Library**.
- Open or download the five bundled databases from the Library panel, including offline.
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
- Built-in Guide, Library, What's New, Steam, and GitHub links. The Assets tab is temporarily hidden in this beta.

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

- Compare another `.emdb` with the open database before applying selected additions and updates.
- Match players by stable IDs first, then by strong identity details when IDs differ.
- Review ID mismatches manually; suspicious matches are highlighted and left unselected by default.
- Treat nickname-only matches as conflicts instead of silently adding or replacing a player.
- Recheck additions while applying a merge to block duplicate aliases created within the same operation.
- Review post-merge health checks and undo the last merge when the result is not expected.
- Keep source `.emdb` packages backed up and save edited databases under a new filename.

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

- Shared player portraits, staff images, team logos, sponsor logos, and tournament images from the public asset service.
- Consistent SVG country flags from `flag-icons`.
- Nationality selectors covering the 193 UN member states, Kosovo, and additional game-compatible countries and territories.
- Local browser-specific image overrides stored in IndexedDB.
- Direct PNG, JPEG, and WebP URL downloads with database-compatible filenames.
- Dark and light themes, with dark mode used by default.
- Card hover backs for player attributes and team rosters.
- Full-size image previews for all eleven Guide screenshots.

## Getting started

### Install or run the desktop app

Download an installer from [GitHub Releases](https://github.com/phantzzy/NoScope-EM26-Database-Editor/releases). The `beta` branch contains ongoing v3.0.0 work; it does not automatically become an installer release.

To run from source, install Node.js with npm and use:

```powershell
npm.cmd ci
npm.cmd start
```

The Electron app uses native Open and Save dialogs. By default, Save opens in your `Documents\NoScope` folder. The installer includes the five Library snapshots listed below for offline use. Their binary files remain excluded from the public source checkout; contributors can supply them locally as described in [CONTRIBUTING.md](CONTRIBUTING.md). Custom images are hosted separately.

For the custom Windows installer, also install a .NET SDK that supports `net8.0-windows`. The initial build needs internet access to restore packages from the official NuGet feed configured in `NuGet.Config`.

```powershell
npm.cmd run dist
```

The result is `release/NoScope-Installer.exe`, with a matching uninstaller. See [CONTRIBUTING.md](CONTRIBUTING.md) for branch selection, tests, asset tooling, and what belongs in source control. A hosted webpage edition is not currently maintained; the HTML/CSS/JavaScript files remain essential to the desktop renderer.

## How to use NoScope

### 1. Open a database

Choose one of the following:

- **Open .emdb...** selects a database from your computer.
- **Open CSV folder...** loads an unpacked set of supported CSV tables.
- **Library** contains the developers' default, iamgri mod, luccaneta's GLOBAL UPDATED, World Updated, and Updated Stats: T1-2 & Tier 3 Pros (Mid-Season 2026, before PGL).

Database processing happens locally in the app. NoScope does not upload the selected database to a server.

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

### 7. Validate and save

- Use **Validate** to inspect the current database before saving.
- Resolve duplicates or missing important values where possible.
- Use **Save anyway** when a warning is expected and intentional.
- Press **Save as .emdb...** and choose a new filename and location.
- Use **Export CSVs (ZIP)** when unpacked table files are needed.

Keep the original database as a backup until the edited version has been tested in game.

### 8. Work with images

NoScope matches bundled images under `assets/custom/` using record identifiers and names. Country flags are rendered from the vendored `flag-icons` package.

The editor can:

- Preview bundled and locally selected images.
- Store a browser-specific image override.
- Remove a local override.
- Download a direct image URL with the identifier-based filename expected by the game.

The desktop Assets panel is temporarily hidden in this beta. Existing record image previews and editing remain available.

### 9. Use the built-in reference panels

- **Guide** provides task-based instructions and screenshots.
- **Library** provides database downloads, source links, record counts, and a visible Last updated date for every snapshot.
- **What's New** opens automatically after an update, contains expandable app release notes, and can be dismissed until the next version.
- The Steam button opens the official Esports Manager 2026 page; GitHub opens the NoScope source repository.
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

| Path | Purpose |
| --- | --- |
| `index.html`, `css/`, `js/` | Desktop renderer, editor logic, and generated runtime asset index |
| `electron/` | Desktop window, native dialogs, downloads, and updater |
| `installer/`, `tools/` | Installer source and reproducible build tooling |
| `assets/` | Required UI images, guide screenshots, flags, and vendor license notices |
| `changelogs/` | App release notes and historical release documentation |
| `package.json`, `package-lock.json`, `NuGet.Config` | Dependencies and build configuration |
| `tests/`, `docs/` (beta) | Regression suites and database compatibility findings |

`data/`, `assets/custom/`, `tmp/`, and build outputs are local-only and ignored. Keep the checked-in runtime asset index. Regenerating it requires the separately maintained custom asset library; see [the contributor guide](CONTRIBUTING.md#assets-and-repository-contents).

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

1. Read [CONTRIBUTING.md](CONTRIBUTING.md), then fork the repository.
2. Create a branch for the change.
3. Keep changes focused and preserve existing database values.
4. Test opening, editing, validating, and saving an `.emdb`.
5. Follow the contributor guide when changing asset indexes.
6. Open a pull request describing the change and how it was tested.

For bugs, include the affected database category, reproduction steps, app version, operating system, and relevant errors. Use synthetic records for database-specific reproductions; do not commit personal databases or unredacted local logs.

## License status

The source is publicly available and the project is intended to remain open source. A formal open-source license has not yet been added. Until a license is selected, normal copyright restrictions still apply to copying, redistribution, and derivative releases.

Bundled game-related databases and image assets may require separate consideration from the application source code.

## Roadmap

The detailed development direction is maintained in [ROADMAP.md](ROADMAP.md). The immediate focus is stabilization and refinement rather than a large feature expansion:

- Complete manual and in-game v3 compatibility testing.
- Improve responsiveness, progress feedback, accessibility, and error recovery.
- Reduce repeated database and rendering work.
- Reduce installer size without removing the offline Library.
- Improve packaging, automated tests, release builds, and code modularity.
- Treat new feature concepts as optional until the current editor is stable.

## Acknowledgements

NoScope uses:

- [JSZip](https://stuk.github.io/jszip/) for ZIP archive processing.
- [Papa Parse](https://www.papaparse.com/) for CSV parsing and generation.
- [flag-icons](https://flagicons.lipis.dev/) for country flags.
- [Simple Icons](https://simpleicons.org/) for the Steam and GitHub marks.
- [OpenStreetMap](https://www.openstreetmap.org/) for tournament location maps.
- Google Fonts for Manrope and JetBrains Mono.

Thanks to the Esports Manager community for testing, feedback, database research, and asset contributions.
