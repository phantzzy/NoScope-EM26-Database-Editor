# NoScope Development Roadmap

This roadmap describes the intended direction for NoScope after v3.0.0 Beta 1. The immediate goal is not to add a large collection of new features. The priority is to make the existing editor smaller, faster, clearer, safer, and easier to maintain.

The roadmap is directional rather than a promise of dates. Priorities may change when Esports Manager updates its database format or testing reveals a more important compatibility problem.

## Guiding principles

- Protect user databases before adding convenience.
- Preserve unknown game data instead of rewriting values the editor does not understand.
- Prefer measurable improvements over cosmetic claims.
- Keep regular installation and use free from command-line requirements.
- Keep the five offline Library databases unless a better distribution method provides the same reliability.
- Treat long-running work as an interface task: show progress, keep the app responsive, and explain failures.
- Finish and stabilize existing tools before expanding the editor's scope.
- Keep optional ideas separate from committed work.

## Current baseline

The following measurements were taken from the v3.0.0 Beta 1 Windows build on 28 October 2026:

| Item | Approximate size |
| --- | ---: |
| `NoScope-Installer.exe` | 287.8 MB |
| Unpacked Electron application | 367.7 MB |
| Self-contained custom uninstaller publish | 68.5 MB |
| Five bundled Library databases | 2.6 MB |
| App assets, flags, branding, and Guide images | 11.2 MB |

The offline databases are not the primary cause of the installer size. Most of the footprint comes from the Electron/Chromium runtime, the compressed application payload, and the self-contained .NET installer/uninstaller runtime.

Current performance coverage includes a 5,000-player merge, encrypted save/reopen tests, packaged Library tests, and compatibility testing against the supplied October 2026 developer database.

## Priority 1: v3 beta stabilization

This work should happen before calling v3.0.0 stable.

### Manual and in-game verification

- Test installation, upgrade, repair, and uninstall on clean Windows user profiles.
- Test opening each bundled Library database from an installed build.
- Test saving under a new filename and importing the result into the game.
- Verify Players, Staff, Teams, Sponsors, Tournaments, and roster changes in game.
- Test databases with missing optional tables, unfamiliar columns, and intentionally blank fields.
- Verify that cancelling native Open and Save dialogs never changes the active database.
- Test upgrades over an existing NoScope installation without removing user settings or cached images.
- Record a small supported-Windows matrix and any known platform limitations.

### Merge reliability

- Continue testing mixed additions, updates, transfers, conflicts, and ID mismatches in one operation.
- Add regression fixtures for every real duplicate or reference bug that is reported.
- Make merge-review generation cancellable when processing unusually large databases.
- Make merge application cancellable only before mutation begins, or provide a guaranteed rollback if cancellation is allowed later.
- Show which matching rule connected two records: internal ID, external profile, name and birthday, or another strong identity combination.
- Improve post-merge links so suspicious records can be opened directly from the health report.
- Keep explicit “Add as new” available while making the risk and result unmistakable.
- Verify that repeated merge and Undo cycles do not leak state into later databases.

### Validator reliability

- Add direct checks for every reference type used by the current game schema.
- Separate definite errors, likely mistakes, and informational findings consistently.
- Improve duplicate-person findings so users can distinguish exact duplicates from legitimate shared names.
- Add clearer guidance for findings that cannot be repaired automatically.
- Ensure destructive validator actions always support a confirmation and a safe recovery path.
- Test validator behavior on large databases and heavily duplicated mod databases.

### Release criteria for v3.0.0 stable

- No known save corruption or data-loss bug.
- No unresolved crash in the normal open, edit, validate, merge, save, and reopen workflow.
- All automated package, editor, Library, and version tests pass.
- All five packaged databases open and round-trip from an installed build.
- At least one edited database completes an in-game import and playthrough check.
- Known limitations are written in the release notes.
- The installer and its checksum are published together.

## Priority 2: interface and workflow polish

### Loading and progress feedback

- Use consistent full-screen progress feedback for every operation that can block the interface.
- Add meaningful stages rather than displaying a fake continuously increasing percentage.
- Keep database loading, review building, merge application, validation, saving, exporting, and asset installation visually consistent.
- Add elapsed time only where it helps diagnose an unusually slow operation.
- Restore all buttons and controls after errors or cancellation.
- Prevent Windows busy-pointer states from being mistaken for an application crash.

### Merge review usability

- Make summary counters clickable so they can activate the corresponding filter.
- Preserve filter and scroll position when a conflict is resolved.
- Add a compact “why this matched” explanation to suspicious proposals.
- Make the difference between identity changes and ordinary field changes clearer.
- Add keyboard navigation for moving between proposals and expanding details.
- Improve large-review selection feedback so users always know how many visible and total records are approved.
- Warn before leaving a review that contains unresolved conflicts or unchecked suspicious identities.

### General editor polish

- Standardize wording, capitalization, button order, and error messages across dialogs.
- Review empty states for every category and modal.
- Improve focus visibility and keyboard navigation.
- Add accessible names to icon-only controls and verify screen-reader announcements for progress and errors.
- Review light-theme contrast and high-DPI scaling.
- Test narrow windows without turning the desktop editor into a separate webpage layout.
- Reduce unnecessary animation on large lists and respect reduced-motion preferences.
- Keep the main Assets tab hidden until its desktop workflow is coherent enough to restore.

### Documentation polish

- Keep the Guide, README, feature catalogue, roadmap, and release notes consistent.
- Replace the ignored historical `TODO.md` workflow with public roadmap issues or milestones.
- Add a short troubleshooting section for SmartScreen, failed installation, save permissions, and unsupported databases.
- Add a privacy/network section explaining update checks, remote assets, and local database processing.
- Provide a concise contributor test checklist for changes to each major feature.

## Priority 3: performance and responsiveness

### Establish repeatable benchmarks

- Record reference timings for application startup, database open, first render, search, validation, merge review, merge application, Save As, and export.
- Keep benchmark fixtures synthetic or redistributable.
- Track peak memory as well as elapsed time.
- Add performance warnings to development tests without making tests fail because of small machine-to-machine differences.
- Investigate performance regressions before adding more caching or concurrency.

### Database processing

- Move expensive parsing, validation, comparison, and serialization work to Web Workers where practical.
- Build merge reviews in chunks so the progress screen remains animated throughout the comparison stage.
- Reuse normalized field maps and identity indexes instead of rebuilding them inside row loops.
- Cache schema lookups per table and invalidate them only when columns change.
- Make validation incremental after a single record edit instead of rescanning every table when possible.
- Avoid cloning the complete database more than once for a merge or Undo snapshot.
- Measure whether compressed or structural snapshots can reduce Undo memory without risking recovery.

### Rendering

- Virtualize very large card and list collections instead of creating off-screen DOM nodes.
- Keep pagination while reducing repeated work when switching pages or sort order.
- Update only affected records after edits rather than rebuilding the full active view.
- Cache expensive Rating, roster, asset-key, and search-normalization calculations with clear invalidation rules.
- Batch image requests and cancel work for cards that leave the visible page.
- Profile roster search and team-card previews with databases containing thousands of players.

### Performance targets

- Avoid more than roughly 100-200 ms of uninterrupted main-thread work during normal interactions.
- Keep a 5,000-player merge responsive and covered by automated regression tests.
- Show visible progress for operations that take longer than a brief interaction.
- Prevent search, filtering, and pagination from becoming progressively slower after repeated edits.
- Prevent memory usage from growing after opening and closing multiple databases or merge reviews.

## Priority 4: installer and application size reduction

The first goal is to understand every large component. Removing useful offline databases would save only about 2.6 MB and is not a worthwhile first step.

### Measurement and size budgets

- Add a build-size report listing the largest packaged files and directories.
- Compare installer, installed size, first-run extraction, and update-download size separately.
- Store size measurements with release artifacts so regressions are visible.
- Set an initial installer target below 250 MB without removing current offline functionality.
- Treat a sub-200 MB installer as a stretch goal that requires packaging changes, not unsafe file deletion.

### Electron package

- Evaluate enabling ASAR packaging for application source and small assets.
- Confirm that Library databases, native bridges, updater files, and writable resources still work with ASAR enabled.
- Remove unused Chromium locales after deciding which interface languages NoScope will support.
- Audit packaged Electron files before removing GPU, codec, snapshot, or rendering components that may be required on older systems.
- Ensure source maps, development tools, test fixtures, logs, build caches, and duplicate assets never enter the release payload.
- Audit dependency packaging so only production dependencies are included.
- Consider extracting large optional resources only when this improves both download size and user experience.

### Installer architecture

- Compare the custom .NET installer with electron-builder NSIS using equivalent branding and behavior.
- Measure how much of the final installer is the self-contained .NET runtime.
- Investigate NativeAOT and trimming for the installer and uninstaller, with full installation tests before adoption.
- Investigate a smaller native uninstaller instead of embedding a roughly 68.5 MB self-contained runtime.
- Compare ZIP/Deflate payload compression with NSIS LZMA or another well-supported installer format.
- Avoid bundling the same runtime or asset more than once between installer, payload, and uninstaller.
- Preserve per-user installation, shortcut choices, clean uninstall, and upgrade behavior while reducing size.

### Update downloads

- Consider differential updates only after normal release installation is reliable.
- Keep a full installer available as the recovery path.
- Verify downloaded installer hashes before launching an update where feasible.
- Display download size before users approve an update.

## Priority 5: maintainability and code quality

### Modularization

- Continue splitting the main renderer into feature modules with explicit responsibilities.
- Separate database models, schema mapping, UI rendering, and native desktop operations.
- Move shared field aliases and compatibility rules into a versioned schema layer.
- Keep Merge, Validator, roster handling, images, and editors independently testable.
- Reduce global mutable state and document the remaining shared state.
- Prefer small pure functions for normalization, matching, validation, and calculations.

### Schema compatibility

- Record known database format versions and field aliases in one place.
- Produce a compatibility report when a database contains new tables, columns, or enum values.
- Preserve unknown values by default and require an explicit reason before normalizing them.
- Add developer fixtures for older supported databases and the latest developer database.
- Make game-version support visible in both the app and release notes.

### Dependencies

- Review Electron, JSZip, Papa Parse, flag-icons, electron-builder, and .NET dependencies on a regular schedule.
- Upgrade one major dependency at a time with regression testing.
- Keep the lockfile committed and release builds reproducible.
- Audit dependency licenses before selecting a formal project license.
- Remove unused packages and avoid adding a large framework for a small interface feature.

### Error handling

- Replace raw JavaScript errors with actionable user messages while retaining technical details for diagnostics.
- Add an “Export diagnostics” action that excludes database contents and personal paths by default.
- Include app version, game version, operation, and safe stack information in exported diagnostics.
- Ensure failed mutations restore a known-good snapshot.
- Avoid uploading crash or database information automatically.

## Priority 6: testing and release engineering

### Automated tests

- Add focused unit tests for schema aliases, normalization, validation, matching, and roster references.
- Retain full Electron workflow tests for open, edit, merge, validate, save, and reopen.
- Add installer smoke tests on a clean Windows environment.
- Test upgrade and uninstall behavior, not only fresh installation.
- Add regression coverage before closing every reproducible data bug.
- Keep the 5,000-player merge and packaged Library tests.
- Add tests for keyboard use, focus restoration, and loading-screen cleanup.

### Continuous integration

- Run package and JavaScript tests on every pull request.
- Run Electron integration tests on trusted Windows builds.
- Build release candidates from tags in a repeatable workflow.
- Generate checksums automatically.
- Prevent publishing when versions disagree between the app, installer, changelog, and tag.
- Keep private databases, signing material, local logs, and external assets out of build logs and artifacts.

### Releases

- Use prerelease tags such as `v3.0.0-beta.2` instead of moving an existing tag.
- Publish the installer, checksum, release notes, and known limitations together.
- Keep the `beta` branch for ongoing testing and reserve `main` for stable releases.
- Consider code signing when the project can support the certificate cost and secure key handling.
- Retain SmartScreen instructions until a trusted signing and reputation path is available.

## Priority 7: security, privacy, and data integrity

- Document every network request made by the updater, Library, maps, and remote asset system.
- Keep database parsing and editing local.
- Add archive limits to protect against malformed or unexpectedly large ZIP entries.
- Validate extracted paths and filenames before writing to CustomAssets or temporary locations.
- Restrict remote image downloads to supported image formats and reasonable sizes.
- Review renderer navigation, external-link handling, and Content Security Policy.
- Verify update and remote-manifest origins.
- Never store or publish user database contents without an explicit action.
- Choose and document a formal source-code license.
- Clarify the separate status of game databases, logos, portraits, and other third-party assets.

## Optional feature ideas - no current commitment

These are recommendations for future consideration, not planned v3 work. Each should be evaluated against maintenance cost, database safety, and whether users actually request it.

### Duplicate resolution assistant

- Present likely duplicate players side by side.
- Let the user select the surviving record and choose values field by field.
- Preview roster and asset-reference changes before applying them.
- Create an Undo snapshot before changing anything.

Why it may be useful: Validator and Merge can identify suspicious identities, but resolving duplicates is still manual and error-prone.

### Read-only database difference report

- Compare two databases without preparing a merge.
- Summarize added, removed, and changed records.
- Export the report as Markdown, JSON, or CSV.

Why it may be useful: database authors could inspect game updates or mod changes without risking an accidental mutation.

### Automatic local backups and recovery history

- Save timestamped backups before Save As, Merge, or destructive bulk operations.
- Limit backup count and disk usage.
- Let users restore a previous local snapshot.

Why it may be useful: it adds another recovery layer beyond one-step merge Undo.

### Saved presets

- Save filter layouts, Mass Edit ranges, and safe Merge scope selections.
- Keep presets local and exportable.
- Never auto-apply a destructive preset.

Why it may be useful: database maintainers often repeat the same review and balancing workflows.

### Compatibility inspector

- Show unknown tables, columns, values, and database versions before editing.
- Compare the file against the latest known developer schema.
- Export a compatibility report for bug reports.

Why it may be useful: future game updates could be assessed without waiting for a full editor release.

### Portable build

- Offer a clearly labeled portable package alongside the installer.
- Keep user data and cache behavior predictable.
- Explain that the installer remains the recommended option.

Why it may be useful: testers and contributors could compare beta builds without replacing their installed copy.

### Localization

- Move interface text into translation files.
- Start only after wording stabilizes.
- Add locale-specific testing and fallback rules.

Why it may be useful: the Esports Manager community is international, but translation would add ongoing maintenance work.

### Advanced contributor tools

- Add an optional command-line validator or schema report for automated mod workflows.
- Keep all normal user workflows available in the graphical app.

Why it may be useful: contributors could batch-check databases without turning command-line tools into a requirement for regular users.

## Explicit non-goals for the immediate roadmap

- No hosted webpage edition is currently planned.
- No cloud database editor, account system, or real-time collaboration is planned.
- No automatic deletion or merging of duplicate people without user review is planned.
- No removal of the offline Library solely to save a few megabytes is planned.
- No major redesign that delays v3 stabilization is planned.
- No large feature framework should be added without a specific user need.

## Suggested order of work

1. Complete manual installation and in-game compatibility testing.
2. Fix any data-integrity or crash issues found during beta testing.
3. Finish progress, cancellation, accessibility, and review-workflow polish.
4. Add repeatable performance and package-size reports.
5. Reduce repeated renderer work and move heavy operations off the main thread.
6. Prototype a smaller installer/uninstaller architecture and compare measured results.
7. Modularize high-risk database logic and expand regression coverage.
8. Prepare a stable v3.0.0 release with checksums, limitations, and a tested upgrade path.
9. Reassess optional feature ideas only after the stable release.

## How roadmap items should be accepted

A roadmap item should be considered complete only when:

- The user-visible outcome is documented.
- Data-preservation behavior is understood.
- Relevant automated tests pass.
- Manual testing is proportionate to the risk.
- Performance and package size are measured when relevant.
- Failure and recovery behavior are tested.
- The change does not silently remove an existing feature.
