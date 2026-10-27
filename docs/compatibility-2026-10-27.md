# Developer database compatibility check — 27 October 2026

Tested against the supplied `default.emdb`, without modifying or redistributing the original file.

- File size: 421,986 bytes.
- SHA-256: `6e3e18e8b67bbeafd06b295ea9795f19502ab8f6d7594e1c61f27ef8a535a0ea`.
- Container: EMDB version 3, using the existing AES-GCM encryption and ZIP payload.
- Records: 6,230 Players, 400 Sponsors, 176 Staff, 331 Teams, and 51 Tournaments (7,188 total).

## Editor changes

- Support Anubis and Cache in all six team map preference fields: FPmap, SPmap, TPmap, FBmap, SBmap, and TBmap. All six fields now have selectors and validation.
- Support tournament tiers 3 and 4. Fixed-choice controls retain unfamiliar or blank source values instead of silently choosing the first option.
- Expose the team Female flag as a toggle. Preserve existing blank, numeric, and textual boolean values until edited; changed numeric flags remain numeric, including mass edits and FACEIT presets.
- Include AWPer when assigning a new player role, and expose the current Staff HLTV and Liquipedia columns.
- Keep FACEIT profile links separate from the FromFaceIt origin flag when applying presets and displaying badges.
- Treat blank tournament locations as optional, as in the supplied database. Supplied country/city values still undergo eligibility checks.
- Read roster order for cards, lists, and the team editor, then persist reordered main squads and benches. Update existing roster references when player IDs change, players transfer, records are removed, or a reviewed merge changes a player. Merge undo restores the prior roster too.
- Preserve unknown archive files and unknown CSV columns. Unchanged table and roster entries retain their original bytes; changed CSV tables retain their delimiter, newline style, and BOM convention.
- Keep the existing automatic Potential behavior: blank/zero Potential is resolved during export; manual Potential remains intact. Consequently, saving can intentionally change automatic Potential cells even without other edits.
- Reject malformed CSV, malformed roster metadata, corrupt encrypted data, and unsupported EMDB versions before replacing the current database. Loading a database without roster metadata starts with an empty roster, and remains saveable.
- Preserve extra files when opening a CSV folder or exporting a ZIP. Keep loading progress and the existing save validation workflow.

## Issues already present in the supplied file

These are source-data findings, not changes introduced by the editor:

| Finding | Count |
| --- | ---: |
| Players with blank birthdays | 4,253 |
| Players with blank primary roles | 625 |
| Teams with blank Rating | 1 |
| Roster player references whose IDs do not exist in Players.csv | 97 of 119 |
| Roster team names not found among team names/aliases | 14 of 18 |

The validator reports these issues. The editor does not invent replacement identities or populate missing source values merely on import. Unresolved roster references are retained unless the corresponding roster or record is explicitly edited. Team membership continues to come from the player table; stale roster entries do not transfer players.

## Verification

Run the package tests with:

```powershell
npm.cmd test
```

Run the actual editor scripts in a hidden, isolated Electron window with synthetic regression data:

```powershell
npm.cmd run test:editor
```

Include a local developer database for the full read/save/reopen comparison:

```powershell
npm.cmd run test:editor -- "$env:USERPROFILE\Downloads\default.emdb"
```

Five package tests cover unchanged entry bytes, edited CSV contents and encoding, unknown binary files, missing roster metadata, malformed input, and serialization without mutation.

The Electron suite opens the supplied database, renders all five editors, and compares every exported cell against the expected values after the established Potential policy. It also checks six map controls, Female flags, tiers 3/4, unfamiliar enum preservation, main/bench order, AWPer selection, Rating, manual/automatic Potential, comparison, selected-player mass editing, merge transfer review/apply/undo, the actual Save As code path, encrypted reopening, corrupt-file rejection, and state isolation across loads. External network requests and native file dialogs are disabled during this suite. Test outputs and a team-editor screenshot are written under ignored `tmp/`.

These checks passed against the supplied file. The team-editor screenshot was inspected for layout. An in-game import/playthrough has not been performed; game runtime behavior, particularly handling of vacant roster slots, still requires confirmation in the game. The source database's unresolved identity mappings cannot be safely repaired without authoritative mappings from its developers.
