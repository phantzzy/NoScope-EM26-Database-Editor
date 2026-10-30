# NoScope Feature Catalogue and Version History

This document lists NoScope's current capabilities and the major features introduced across its documented releases. It covers the Windows desktop editor from the older v2 releases through the current v3 beta, including features that were later replaced, hidden, paused, or removed.

## Current product status

- Current app version: **v3.0.0-beta.2**.
- Current supported game version: **Esports Manager 2026 v1.1.4**.
- Platform: Windows desktop application built with Electron.
- Database format: encrypted Esports Manager `.emdb` packages containing CSV tables and roster metadata.
- Release status: beta; automated compatibility and regression tests pass, but complete in-game testing remains pending.
- Distribution: custom Windows installer and uninstaller, with desktop and Start menu shortcuts.
- Project status: unofficial community project; not affiliated with the game's developers or publisher.

## Complete current feature list

### Database opening and package support

- Open encrypted `.emdb` database packages through a native Windows file picker.
- Open unpacked folders containing supported CSV database tables.
- Read and edit Players, Staff, Teams, Sponsors, and Tournaments tables.
- Preserve unknown CSV columns instead of removing fields the editor does not recognize.
- Preserve unknown files contained inside an `.emdb` archive.
- Preserve unchanged table values and files through encrypted save/reopen operations.
- Reject malformed, truncated, or unsupported `.emdb` files before replacing the currently loaded database.
- Keep the current database open when another database fails to load.
- Prevent roster metadata from leaking between separately opened databases.
- Display full-screen loading progress and the current processing stage while opening a database.
- Wait for visible card images before dismissing database-loading feedback.
- Show neutral image placeholders instead of briefly flashing missing-image messages.

### Offline database Library

- Open or download five packaged database snapshots without an internet connection.
- Include the developers' current `default.emdb` database.
- Include `iamgri mod.emdb`.
- Include `luccanetas_GLOBAL_UPDATED.emdb`.
- Include `World_Updated.emdb`.
- Include `Updated Stats: T1-2 & Tier 3 Pros (Mid-Season 2026, before PGL)`.
- Show database information and record counts in the Library.
- Keep Library databases separate from public source control while packaging them into the installer.
- Protect the offline Library from being silently replaced by cloud asset updates.

### Browsing and navigation

- Browse every supported category in a game-style card grid.
- Switch Players, Staff, and Teams to focused list views.
- Use category-specific card sorting.
- Sort list columns in ascending or descending order.
- Search records live by relevant names and values.
- Apply category and attribute-range filters.
- Navigate paginated results with first, previous, next, and last controls.
- Jump to a validated page number.
- Scroll wide list views horizontally without pushing the application outside the viewport.
- Select and deselect records in either card or list view.
- Select multiple records for deletion or bulk operations.
- Deselect all currently selected records.
- Open records from card edit buttons or list pencil buttons.
- Use task-focused list presets instead of one oversized table.
- View delayed hover backs on player and staff cards.
- View team roster information on team-card backs.

### Record creation, editing, and deletion

- Create Players, Staff, Teams, Sponsors, and Tournaments.
- Edit supported identity, status, relationship, and attribute fields.
- Divide larger editor forms into task-specific pages such as Identity, Skills, Details, and Roster.
- Validate required fields before saving a record.
- Show custom missing-field messages instead of browser-native validation bubbles.
- Delete one or multiple selected records after confirmation.
- Maintain relevant roster references when player records are changed or removed.
- Keep changes in memory until the database is explicitly saved.

### Players

- Edit nickname, first name, surname, birthday, nationality, gender, team, and internal ID.
- Edit primary and secondary roles, including AWPer support.
- Edit gameplay, mental, and physical attributes on the game's `0-20` scale.
- Edit supported player statuses, retirement, FACEIT origin, content creator state, and profile links.
- Keep FACEIT profile links separate from FACEIT-origin flags and badges.
- Display FACEIT and content creator badges in supported views.
- Filter NoScope content creators.
- Calculate player Rating automatically on a `0.00-5.00` scale.
- Calculate Rating from all supported gameplay, mental, and physical attributes.
- Recalculate Rating after individual or mass edits.
- Display global player leaderboard positions.
- Show gold, silver, and bronze styling for the three highest-rated players.
- Sort players alphabetically, by Rating, Potential, or team ERS where available.
- Filter players by Potential and supported attributes.
- Enter manual Potential on the game's `1-20` scale.
- Use automatic Potential when the stored value is blank or zero.
- Display Potential as fractional `0-5` stars on cards, lists, and editor views.
- Save resolved automatic Potential into `.emdb` and CSV exports without replacing manual values.
- Generate a birthday from a known age.
- Generate a random player age between 16 and 26.
- Clear a birthday before entering a replacement.
- Default a saved blank birthday to age 18 where required by the editor's policy.
- Use FACEIT skill helpers with Base, High, and Elite Level 10 ELO presets.
- Use player tier guides, badge-based skill presets, and similar-profile previews.

### Player comparison

- Compare exactly two selected players side by side.
- Compare identity information, profiles, attributes, ratings, and Potential.
- Display radar charts for the selected players.
- Keep Compare disabled when no valid player selection exists.
- Show a custom warning when more than two players are selected.

### Player Mass Edit (Beta)

- Open Mass Edit when two or more players are selected.
- Choose individual fields or entire attribute sections.
- Apply a fixed value to selected attributes.
- Apply randomized minimum/maximum ranges.
- Apply quick `T1-T5` attribute presets.
- Update supported player statuses in bulk.
- Validate entered ranges before applying changes.
- Recalculate affected player Ratings.
- Leave unselected players and fields unchanged.

### Teams

- Edit team nickname, full name, country, earnings, ERS, academy relationship, internal fields, and status.
- Edit female-team and disbanded states.
- Edit team background color with a color picker, swatch, and hexadecimal value.
- Preview team background colors on team cards and list views.
- Edit Start IGL using players currently assigned to the team.
- Edit academy relationships through team search.
- Edit all six team map preference fields with game-compatible selectors.
- Support Anubis and Cache in the map selectors.
- Display team logos in supported views.
- Sort teams alphabetically or by ERS.
- Use General and Roster list presets.

### Team roster editor

- Manage a dedicated main squad and bench squad.
- Search for players using rich player results with portrait, flag, age, roles, team, and badges.
- Preview player attributes from roster-search results.
- Drag players into the roster.
- Drag existing roster cards to reorder players.
- Move players between main squad and bench.
- Swap occupied roster positions by dropping one player onto another.
- Place a player on the bench even when the main squad contains fewer than five players.
- Preserve explicit main-squad and bench ordering in roster metadata.
- Fall back to the first five players as the main squad when explicit positions are unavailable.
- Create a new player directly from the team roster editor.
- Show roster players on team cards and team list views.
- Maintain roster references through player ID edits, transfers, deletion, merge application, and merge undo.
- Preserve vacant roster slots and the main/bench boundary when saving.

### Staff

- Edit staff identity, nationality, team, role, status, and internal ID.
- Edit role-specific staff attributes.
- Display and edit Staff HLTV and Liquipedia fields when present.
- Calculate role-aware Staff Rating.
- Sort staff alphabetically, by Rating, or by team ERS.
- Use General and role-specific staff list presets.
- Display staff images and nationality flags.

### Sponsors

- Edit sponsor company name, number/internal identifier, tier, type, and description.
- Sort sponsors alphabetically or by tier.
- Show full descriptions on sponsor-card backs.
- Match sponsor logos using numeric identifiers where available.
- Explain that sponsor logos do not automatically appear on in-game shirts.

### Tournaments

- Edit tournament name, identifier, tier, prize fund, event type, country, and city.
- Support tournament tiers 3 and 4.
- Select eligible countries and cities from game-compatible location data.
- Allow a tournament location to remain blank.
- Reject unsupported country/city combinations when a location is supplied.
- Preview the chosen location with a fixed, zoomed-out OpenStreetMap view.
- Display CupID guidance.
- Sort tournaments alphabetically or by prize fund.

### Database Merge (Beta)

- Use the open database as Database A and another `.emdb` as Database B.
- Choose which tables participate in the merge.
- Choose player field groups that may be applied.
- Choose whether to add missing records, update existing records, and add compatible columns.
- Build a searchable, paginated review before changing Database A.
- Display a full-screen progress indicator while building the review.
- Display a full-screen progress indicator while applying approved changes.
- Process large merges in chunks so progress feedback can repaint.
- Use incrementally maintained lookup indexes for large merges.
- Review proposed additions, updates, transfers, and matching conflicts.
- Approve or skip individual records.
- Approve or skip individual field changes inside a record.
- Approve all currently filtered safe changes.
- Clear selected approvals for the current filter.
- Filter review items by table and action.
- Filter by review status with live counts:
  - All review items.
  - Needs manual review.
  - ID mismatches.
  - Identity changes.
  - Safe changes.
- Search proposed changes by record, table, field, and old/new value.
- Match records by stable internal IDs and supported external profile identifiers.
- Fall back to strong composite player identity details when IDs differ.
- Highlight different internal IDs as suspicious.
- Display both Database A and Database B IDs.
- Leave suspicious ID matches unapproved by default.
- Require explicit manual approval before applying suspicious matches.
- Preserve the Database A internal ID during an approved suspicious update.
- Treat nickname-only matches as conflicts rather than automatic additions.
- Let users resolve ambiguous conflicts by selecting a base record, adding explicitly, or skipping.
- Protect existing non-empty values from blank incoming overwrites.
- Protect existing internal IDs from automatic replacement.
- Normalize legacy false/no values for fields stored as blank-or-`1`.
- Skip incomplete additions missing fields required by the game.
- Recheck additions while applying the merge.
- Block a later alias if another incoming row already added the same player during the operation.
- Preserve roster references during approved transfers and updates.
- Recalculate Ratings for affected players.
- Show applied, added, updated, transferred, and blocked totals.
- Run post-merge health checks.
- Report new suspicious duplicate-player pairs.
- Report suspicious pairs that already existed before the merge.
- Report duplicate IDs, missing required values, blank team Ratings, and unknown team references.
- Never delete Database A records automatically.
- Undo the most recently applied merge in one step.
- Restore the pre-merge snapshot if merge application fails.
- Verified regression coverage for a 5,000-player merge.

### Validator

- Run validation manually at any time.
- Run validation automatically before saving an `.emdb`.
- Check required tables and columns.
- Check important required record fields.
- Detect exact duplicate IDs and primary names.
- Validate Players, Staff, Teams, Sponsors, and Tournaments.
- Detect duplicate player names and duplicate staff names.
- Detect people appearing in both Players and Staff.
- Detect players assigned to nonexistent teams.
- Detect unresolved roster player references.
- Distinguish warnings from invalid/error findings with different styling.
- Group related duplicate findings.
- Search and filter validation findings.
- Expand issue cards to inspect affected samples.
- Preview linked records by hovering.
- Open affected records directly from a validation result.
- Delete affected records using a custom confirmation dialog.
- Rerun validation so resolved findings disappear.
- Continue with **Save anyway** when a finding is expected and intentional.
- Avoid interrupting Save when validation finds no issues.

### Saving and exporting

- Save to a new encrypted `.emdb` through a native Windows Save As dialog.
- Default desktop saves to `Documents\NoScope` where applicable.
- Export every loaded table as CSV files in a ZIP archive.
- Preserve CSV byte-sensitive formatting where possible, including headers, columns, delimiters, and package files.
- Preserve unknown archive entries during Save and export.
- Preserve unfamiliar dropdown values rather than replacing them when a record is opened.
- Preserve existing boolean encodings where the game accepts multiple representations.
- Prompt before replacing a database that contains unsaved changes.
- Prompt to Save or Exit when closing with unsaved changes.
- Keep the original database unchanged until Save As is completed.

### Images and CustomAssets

- Display player portraits, staff images, team logos, sponsor logos, and tournament images.
- Look for assets in the game's `CustomAssets` folders before remote sources.
- Support both `Staff` and `Staffs` CustomAssets folder names.
- Match player assets by internal ID to reduce nickname collisions.
- Match sponsor assets by numeric identifiers.
- Use a remote Cloudflare asset manifest when remote assets are available.
- Cache successfully loaded remote images locally.
- Let desktop users choose a non-default CustomAssets folder.
- Open the configured asset folder from the app.
- Save supported images directly into the game asset folders.
- Paste a clipboard image and save it as a correctly named PNG.
- Download PNG, JPEG, or WebP images from a direct URL.
- Generate database-compatible asset filenames.
- Show the saved path after a desktop image operation.
- Show styled error dialogs when paste or download operations fail.
- Store browser-specific local image overrides in IndexedDB for retained renderer workflows.
- Preview and remove local image overrides.
- Keep the main Assets tab hidden in the current beta while record-level image previews and editing remain available.

### Countries, flags, and maps

- Render consistent SVG flags using `flag-icons`.
- Include the 193 UN member states, Kosovo, and additional game-compatible countries and territories.
- Remove known unsupported nationality choices from selectors.
- Show flags beside countries and nationalities in cards, lists, search results, and roster views.
- Use OpenStreetMap for tournament location previews.

### Appearance and accessibility

- Use NoScope's red, black, and gray visual identity.
- Use dark mode by default.
- Switch between dark and light themes.
- Apply light-theme styling to cards, lists, editors, filters, rosters, modals, and navigation.
- Use inline/vector toolbar and category icons instead of emoji controls.
- Use a smaller theme icon appropriate to the header controls.
- Use custom dialogs for important warnings, confirmations, and failures.
- Retain keyboard focus and pointer protections around card edit controls.
- Use sticky headers and footers where needed in long review dialogs.
- Use full-screen wait feedback for database opening, merge review generation, and merge application.

### Built-in help and reference panels

- Include a task-based Guide inside the app.
- Include eleven workflow screenshots.
- Open Guide screenshots at full size.
- Explain database loading, saving, browsing, sorting, editing, Potential, birthdays, badges, rosters, comparison, Mass Edit, Merge, validation, assets, and themes.
- Include an in-app App Changelog archive with expandable release notes.
- Open the current release notes as What's New after each app update, with a version-specific option to suppress repeat popups until the next update.
- Hide webpage changelogs because a hosted webpage edition is not currently maintained.
- Link to the Esports Manager 2026 Steam page.
- Link to the public NoScope GitHub repository.
- Display the current supported game version in the application header.
- Remove the former Discord link/button.

### Windows desktop application

- Run as a standalone Electron desktop app.
- Use native Open and Save dialogs.
- Use a frameless NoScope window with custom minimize, maximize, and close controls.
- Gate desktop-only features so they do not appear in unsupported browser contexts.
- Check GitHub releases for an installable update.
- Show the title-bar update action only when a newer installable version is available.
- Download and launch an updated installer after NoScope closes.
- Keep the current app version and beta label visible.

### Installer and uninstaller

- Install NoScope without requiring users to enter command-line instructions.
- Use a custom NoScope-branded Windows installer.
- Include a matching custom uninstaller.
- Install per user rather than requiring a machine-wide installation.
- Offer desktop and Start menu shortcuts.
- Use NoScope icons for the app, installer, uninstaller, shortcuts, and metadata.
- Package the five offline Library databases.
- Build as `NoScope-Installer.exe`.

### Testing and data-safety coverage

- Test encrypted database package reads and writes.
- Test preservation of unknown files and CSV columns.
- Test malformed input and unsupported database versions.
- Test roster ordering, vacant slots, and references.
- Test unfamiliar enum values and boolean encodings.
- Test player Rating, Potential, Mass Edit, comparison, and editor workflows.
- Test Merge review, suspicious identities, conflict handling, duplicate-addition blocking, transfers, progress, and Undo.
- Replay the reported MOUZ duplicate-player identities from the supplied database.
- Test mixed add, duplicate-block, and update operations against cached merge indexes.
- Test a 5,000-player merge for correctness and periodic progress updates.
- Test all five packaged Library snapshots and their encrypted round trips.
- Keep user-supplied `.emdb` files and local logs out of the public repository.

## Historical release overview

The repository's detailed public changelogs begin with v2.0.0. Foundational features that existed before that release are listed separately rather than assigned to an undocumented version.

### Pre-v2 / legacy foundation

- Open Esports Manager database content in a visual editor.
- Browse the core Players, Staff, Teams, Sponsors, and Tournaments tables.
- Create, edit, remove, search, filter, save, and export records.
- Display database-linked images and nationality information.
- Provide the base HTML/CSS/JavaScript renderer that later became the Electron desktop interface.

### v2.0.0 — 17 July 2026

The v2 visual and roster overhaul introduced:

- Game-style cards for Players, Staff, Sponsors, and Teams.
- Delayed hover-flip card backs.
- A complete main-squad and bench roster editor.
- Drag-to-reorder and swap-on-drop roster behavior.
- Rich roster player search cards and previews.
- Player, Staff, and Team list presets.
- Sortable list headers and horizontal wide-table scrolling.
- Multi-selection and Deselect all.
- Global Rating-based player leaderboard ranks.
- Gold, silver, and bronze top-three styling.
- Player, Staff, Team, Sponsor, and Tournament card sorting.
- Role-aware Staff Rating.
- Team roster backs and roster list views.
- Team background-color previews.
- Improved exact team-logo matching.
- The original Guide, Library, and Assets header panels.
- Five Library databases used by that release.
- SVG toolbar controls and revised red-theme styling.
- Major card, search, roster-dragging, and database-loading performance fixes.

### v2.1.0 — 24 July 2026

The editing and safety feature release introduced:

- Mass Edit Beta.
- Database Merge Beta.
- Manual and automatic player Potential.
- Fractional Potential stars, filtering, sorting, saving, and export.
- Player content creator and FACEIT badges.
- Birthday generation and clearing.
- Direct player creation from the roster editor.
- Explicit main-squad and bench drop areas.
- Validated tournament country/city selection.
- OpenStreetMap tournament previews.
- Automatic save-time database validation.
- A standalone Validate action.
- Duplicate and missing-field checks.
- Grouped validation results and Save anyway.
- Dynamic database-loading progress.
- Unsaved-changes prompts.
- Expanded nationality and SVG flag support.
- Dark/light theme switching.
- The built-in Changelog archive.
- Eleven Guide screenshots and full-size previews.
- The original Steam and Discord header links.
- Compare selection fixes and edit-button hover protection.

### v2.1.1 Hotfix — 24 July 2026

The compatibility hotfix added or corrected:

- Game-compatible `.emdb` save normalization.
- Merge preservation of game-sensitive fields.
- Team identity placement for ERS, Academy, BGColor, StartIGL, map preferences, and Disbanded.
- A proper team color picker.
- Academy team search.
- Start IGL player search.
- Fixed map selectors and a Disbanded switch.
- Exact-only duplicate validation instead of fuzzy duplicate warnings.
- Duplicate Staff, Player, and cross-table person checks.
- Nonexistent team-assignment validation.
- Separate warning and error colors.
- A Ukrainian support badge and message, which was a historical header element.

### v2.2.0 — 25 July 2026

The first major desktop distribution release introduced:

- The standalone Electron desktop app.
- Native database Open and Save dialogs.
- The custom frameless title bar.
- Direct game-folder CustomAssets access.
- Configurable CustomAssets folder selection.
- Clipboard image paste and PNG saving.
- Folder-opening actions.
- The custom Windows installer and uninstaller.
- Desktop and Start menu shortcut options.
- Remote Cloudflare asset manifests and image loading.
- Local remote-image caching.
- Game-folder-first image lookup.
- Numeric sponsor-logo matching.
- Removal of the large CustomAssets image library from the installer.
- Styled image-operation errors and clearer saved paths.
- Temporary disabling of Merge Beta while safety problems were investigated.

### v2.3.0 App — 26 July 2026

The desktop updater and restored-merge release introduced:

- GitHub release update checking.
- An update button shown only when an installable update exists.
- Installer launching after the running app closes.
- Desktop-only feature gating.
- The GitHub header link.
- Cloudflare CustomAssets installation with progress and failure reporting.
- A link to the external NoScope Assets repository.
- Player image lookup by internal ID.
- Remote Library and default-database loading used by that release.
- Re-enabled Database Merge.
- Blank-overwrite and internal-ID protections.
- Reduced merge churn for unchanged and empty values.
- A richer Validator with grouping, search, filters, edit/delete actions, rerun, and previews.
- Required-field checks in every record editor.
- Tournament and sponsor guidance.
- FACEIT ELO helpers, skill tier guides, and similar-player previews.
- App and Webpage changelog tabs, of which only the App changelog remains relevant now.
- Image-aware database-loading completion and neutral image placeholders.

### v3.0.0 Beta 2 — October 2026 to present

The compatibility, offline Library, roster, and merge-safety update includes:

- Compatibility with the supplied October 2026 developer database.
- Visible v3.0.0 beta labeling and supported game version 1.1.4.
- Anubis and Cache in all six team map selectors.
- Tournament tiers 3 and 4.
- Female-team editing.
- AWPer role selection.
- Preservation of unfamiliar dropdown values and existing booleans.
- Correct separation of FACEIT links and FACEIT-origin fields.
- Staff HLTV and Liquipedia fields.
- Optional blank tournament locations.
- Correct saved roster ordering throughout cards, lists, and the editor.
- Reference-safe player ID edits, transfers, deletion, and merge undo.
- Preservation of unknown package files, CSV columns, and unchanged content.
- Strict rejection of malformed or unsupported packages.
- Validation of unresolved roster references without guessing replacements.
- Five installer-bundled offline Library databases.
- Removal of the obsolete personal **Load Default DB** action.
- Removal of the Discord link.
- Hiding of the main Assets tab while it is not ready for the beta.
- Hiding/removal of webpage changelog presentation.
- A smaller, cleaner theme icon.
- Removal of obsolete welcome copy such as “Let's get editing!” while retaining the v3 welcome-back release introduction.
- Expanded package, Electron, Library, and compatibility regression tests.
- A version-aware What's New popup with the current release expanded and a per-version dismissal preference.

#### v3 merge-safety and performance additions

- Strong player-identity fallback when internal IDs differ.
- Suspicious ID mismatch cards with both IDs visible.
- Manual approval requirements for suspicious identities.
- Review-status filters with live counts.
- Nickname-only conflict handling.
- Apply-time duplicate alias blocking.
- Post-merge duplicate-identity health checks.
- Incremental cached lookup indexes for large merges.
- Chunked merge application with progress updates.
- Full-screen progress while building and applying reviews.
- Automatic restoration after a failed application.
- Regression coverage for reported duplicate players and a 5,000-player merge.

## Features that changed, were replaced, or are currently hidden

- **Hosted webpage edition:** not currently maintained. The renderer files remain part of the desktop app.
- **Webpage changelogs:** hidden/removed from the current UI; the App changelog remains.
- **Assets tab:** temporarily hidden in v3 beta. Record-level images and desktop asset support remain.
- **Discord button:** removed from the current header.
- **Ukrainian support badge:** historical v2 header feature, not part of the current streamlined header.
- **Load Default DB button:** removed because the former personal default database is no longer supported.
- **Cloud-only Library:** replaced in v3 by installer-bundled offline snapshots.
- **Older Library contents:** replaced by the five databases selected for v3.
- **Merge availability:** introduced in v2.1, paused in v2.2, re-enabled in v2.3, and substantially hardened in v3.
- **Bundled CustomAssets library:** removed from the installer in v2.2 in favor of game-folder, remote-host, and cache lookup.

## Current limitations

- v3.0.0 remains a beta pending complete manual and in-game testing.
- Always preserve the original `.emdb` and save edits under a new filename.
- Existing duplicate records are reported but are not automatically deleted because the editor cannot safely guess which record should survive.
- Remote assets and updater checks require internet access unless the required images are already available locally.
- The updater requires a published GitHub release containing a compatible installer asset.
- The application currently targets Windows and Esports Manager 2026 database version 3.
- The source repository does not include private/local databases or the external CustomAssets collection.
- A formal open-source license has not yet been selected.

## Source documents

This catalogue consolidates the current README, built-in app behavior, compatibility documentation, and these release changelogs:

- `v2.0.0` — 17 July 2026.
- `v2.1.0` — 24 July 2026.
- `v2.1.1 Hotfix` — 24 July 2026.
- `v2.2.0` — 25 July 2026.
- `v2.3.0 App` — 26 July 2026.
- `v3.0.0 Beta 1` — 27 October 2026.
- `v3.0.0 Beta 2` — 30 October 2026 onward.
