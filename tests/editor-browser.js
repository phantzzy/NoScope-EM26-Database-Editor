(async () => {
    const checks = [];
    const assert = (condition, message) => { if (!condition) throw new Error(message); };
    const equal = (actual, expected, message) => assert(JSON.stringify(actual) === JSON.stringify(expected), message);
    const check = (message) => checks.push(message);
    const fileFromZip = async (zip, name = 'test.emdb') => new File([await encryptEMDB(await zip.generateAsync({ type: 'arraybuffer' }))], name);
    const report = { checks };
    const alerts = [];
    window.alert = message => alerts.push(message);

    if (globalThis.testSourceBase64) {
        const bytes = Uint8Array.from(atob(testSourceBase64), char => char.charCodeAt(0));
        const source = await new JSZip().loadAsync(await decryptEMDB(bytes));
        assert(await loadEMDBFile(new File([bytes], 'developer-default.emdb')), 'Developer database failed to open');
        report.sourceCounts = Object.fromEntries(Object.entries(db.tables).map(([name, table]) => [name, table.rows.length]));
        const expected = Object.fromEntries(Object.entries(db.tables).map(([name, table]) => [name, { header: table.header, rows: getSerializableTableRows(name, table) }]));
        const saved = await DatabasePackage.write(db, JSZip, Papa, getSerializableTableRows);
        const reopened = await DatabasePackage.read(await new JSZip().loadAsync(await decryptEMDB(await encryptEMDB(await saved.generateAsync({ type: 'arraybuffer' })))) , Papa);
        equal(reopened.tables, expected, 'Developer database round-trip changed unexpected cell values');
        equal(reopened.roster_order, db.roster_order, 'Developer roster changed without edits');
        for (const name of Object.keys(source.files).filter(name => name !== 'Players.csv')) {
            equal(Array.from(await source.file(name).async('uint8array')), Array.from(await saved.file(name).async('uint8array')), `Unedited ${name} bytes changed`);
        }
        const validation = validateCurrentDatabase();
        report.sourceValidation = validation.issues.map(issue => ({ table: issue.tableName, field: issue.fieldLabel, type: issue.type, count: issue.count }));
        assert(!validation.issues.some(issue => issue.type === 'invalid-value' && /map/i.test(issue.fieldLabel)), 'Developer map values rejected');
        const ids = new Set(db.tables.Players.rows.map(row => getRosterPlayerId(db.tables.Players, row)));
        report.sourceRoster = {
            teams: Object.keys(db.roster_order).length,
            references: Object.values(db.roster_order).flat().length,
            unresolvedPlayerIds: Object.values(db.roster_order).flat().filter(id => id && !ids.has(id)).length,
            unresolvedTeams: Object.keys(db.roster_order).filter(key => !db.tables.Teams.rows.some(row => getTeamAliasSetForList(db.tables.Teams, row).has(key.toLowerCase()))).length
        };
        for (const name of Object.keys(db.tables)) {
            switchTab(name);
            openEditor(0);
            if (['Players', 'Staff', 'Teams'].includes(name)) {
                for (const page of name === 'Teams' ? ['roster', 'details'] : name === 'Staff' ? ['stats'] : ['stats', 'details']) {
                    captureVisibleFields(); editorPage = page; renderEditorFields();
                }
            }
            closeEditor();
        }
        check('Developer database opens, all five editors render, and encrypted round-trip preserves all expected cells and roster metadata');

        const sourcePlayers = db.tables.Players;
        const reportedDuplicateIds = new Set(['torzii', 'spixen', 'xerotn', 'xillex']);
        const reportedDuplicateRows = sourcePlayers.rows.filter(row => reportedDuplicateIds.has(getMergeInternalId(sourcePlayers, row).toLowerCase()));
        if (reportedDuplicateRows.length === reportedDuplicateIds.size) {
            const originalRows = sourcePlayers.rows;
            sourcePlayers.rows = originalRows.filter(row => !reportedDuplicateIds.has(getMergeInternalId(sourcePlayers, row).toLowerCase()));
            mergeState = createEmptyMergeState();
            mergeState.incomingDb = {
                tables: {
                    Players: {
                        header: [...sourcePlayers.header],
                        rows: reportedDuplicateRows.map(row => [...row])
                    }
                }
            };
            buildMergeProposals();
            equal(mergeState.proposals.length, reportedDuplicateIds.size, 'Reported MOUZ duplicates did not all reach merge review');
            assert(mergeState.proposals.every(proposal => proposal.action !== 'add'), 'Reported MOUZ duplicate was offered as an automatic addition');
            assert(mergeState.proposals.every(proposal => proposal.identityWarning && !proposal.selected), 'Reported MOUZ ID mismatch was not held for manual review');
            mergeState.reviewFilter.attention = 'id-mismatch';
            equal(getFilteredMergeProposals().length, reportedDuplicateIds.size, 'ID mismatch filter did not isolate all four reported MOUZ players');
            sourcePlayers.rows = originalRows;
            mergeState = createEmptyMergeState();
            check('The four reported MOUZ duplicate identities are matched, highlighted and left unselected instead of being added again');
        }
    }

    const zip = new JSZip();
    const tables = {
        Players: {
            header: ['Nick', 'Name', 'Surname', 'Birthdate', 'Country', 'Team', 'Skill', 'Potential', 'AWP', 'Rifle', 'Role1', 'Role2', 'Role3', 'Id', 'FromFaceIt', 'Retired', 'Gender'],
            rows: Array.from({ length: 7 }, (_, i) => [`Player${i}`, 'Name', `${i}`, '01.01.2005', 'Latvia', 'Alpha', '12', i ? '18' : '', '12', '12', 'AWPer', '', '', `p${i}`, '0', '', 'MALE'])
        },
        Teams: { header: ['Nick', 'Name', 'Country', 'Rating', 'FPmap', 'SPmap', 'TPmap', 'FBmap', 'SBmap', 'TBmap', 'Female'], rows: [['Alpha', 'Alpha Team', 'Latvia', '10', 'anubis', 'cache', 'ancient', 'cache', 'dust', 'nuke', '1'], ['Beta', 'Beta Team', 'Latvia', '10', '', '', '', '', '', '', '']] },
        Tournaments: { header: ['id', 'Name', 'Tier', 'Rating', 'Prizefund', 'Type', 'Country', 'City'], rows: [['cup', 'Test cup', '4', '1', '100', 'LAN', '', '']] },
        Staff: { header: ['Nick', 'Name', 'Surname', 'Role', 'Country', 'Team', 'Id', 'Leadership', 'Vision'], rows: [['staff', 'Staff', 'Member', 'CEO', 'Latvia', 'Alpha', 'staff', '10', '10']] },
        Sponsors: { header: ['Num', 'CompanyName', 'Description', 'Tier', 'Type'], rows: [['1', 'Sponsor', 'Description', 'S', 'Hardware']] }
    };
    for (const [name, table] of Object.entries(tables)) zip.file(`${name}.csv`, '\uFEFF' + Papa.unparse({ fields: table.header, data: table.rows }, { delimiter: ';' }));
    zip.file('roster_order.json', JSON.stringify({ Alpha: ['p5', 'p4', 'p3', 'p2', 'p1', 'p0', 'p6'], Unrelated: ['unresolved'] }));
    zip.file('future.bin', Uint8Array.of(0, 255, 3));
    assert(await loadEMDBFile(await fileFromZip(zip)), 'Synthetic database failed to load');
    activeTab = 'Sponsors';
    editDraft = ['401', 'TestCarCo', 'Test description', 'D', 'Automotive'];
    assert(getAssetDisplayName() === '401', 'Sponsor image display name did not use Num');
    assert(getAssetKey('Sponsors', editDraft) === 'sponsors:num:401', 'Sponsor image key did not use Num');
    let chosenAssetPayload;
    const chosenAssetResult = await saveChosenAssetFile(
        new File([Uint8Array.of(137, 80, 78, 71)], 'orange.png', { type: 'image/png' }),
        '401',
        'Sponsors',
        { saveAssetImage: async payload => {
            chosenAssetPayload = payload;
            return { fileName: payload.fileName, filePath: `C:\\CustomAssets\\${payload.folder}\\${payload.fileName}` };
        } }
    );
    assert(chosenAssetPayload.folder === 'Sponsors' && chosenAssetPayload.fileName === '401.png', 'Chosen sponsor image did not target the Sponsors folder with its numeric filename');
    assert(chosenAssetPayload.data.byteLength === 4 && /Sponsors/.test(chosenAssetResult.filePath), 'Chosen sponsor image bytes or saved path were lost');
    const imageNameCases = [
        ['Players', [...db.tables.Players.rows[0]], 'p0', 'p0.png'],
        ['Teams', [...db.tables.Teams.rows[0]], 'Alpha Team', 'Alpha Team.png'],
        ['Staff', ['coachNick', 'Coach', 'Person', 'Coach', 'Latvia', 'Alpha', 'coach-id', '10', '10'], 'coach-id', 'coach-id.png'],
        ['Sponsors', ['401', 'TestCarCo', 'Test description', 'D', 'Automotive'], '401', '401.png'],
        ['Tournaments', [...db.tables.Tournaments.rows[0]], 'Test cup', 'Test cup.png']
    ];
    imageNameCases.forEach(([tableName, row, expectedIdentity, expectedFileName]) => {
        activeTab = tableName;
        editDraft = row;
        const identity = getAssetDisplayName();
        assert(identity === expectedIdentity, `${tableName} image identity used ${identity} instead of ${expectedIdentity}`);
        assert(makePlayerImageFilename(identity, new File([Uint8Array.of(1)], 'source.png', { type: 'image/png' })) === expectedFileName, `${tableName} image filename syntax was incorrect`);
    });
    activeTab = 'Sponsors';
    editDraft = ['', '', 'Test description', 'D', 'Automotive'];
    const sponsorImageWarning = showAssetIdentityRequiredAlert('saving');
    assert(!appAlertModal.hidden && appAlertTitle.textContent === 'IMAGE IDENTITY REQUIRED', 'Missing sponsor image identity used a native or incorrect warning');
    assert(/sponsor number or company name/i.test(appAlertMessage.textContent), 'Sponsor image warning did not explain the accepted identity fields');
    closeAppAlert();
    await sponsorImageWarning;
    check('Chosen images use the correct folder and filename syntax for every category, and missing identity uses the custom warning');
    switchTab('Teams'); openEditor(0);
    equal(teamRosterDraft, [5, 4, 3, 2, 1, 0, 6], 'Roster does not follow package order');
    const entries = getTeamRosterEntriesForList(db.tables.Teams, db.tables.Teams.rows[0]);
    equal(entries.filter(entry => entry.isBench).map(entry => entry.index), [0, 6], 'Bench does not follow package order');
    for (const name of TEAM_MAP_FIELD_NAMES) {
        const index = db.tables.Teams.header.findIndex(header => normalizeFieldName(header) === name);
        assert(editFormFields.querySelector(`select[data-column="${index}"]`), `Missing map selector ${name}`);
    }
    captureVisibleFields();
    equal(editDraft, db.tables.Teams.rows[0], 'Opening team editor changes map or flag values');
    const originalRoster = JSON.stringify(db.roster_order);
    applyTeamRosterDraft(db.tables.Teams.rows[0]);
    assert(JSON.stringify(db.roster_order) === originalRoster, 'Unedited team rewrites roster');
    teamRosterDraft = [0, 1, 2, 3, 4, 5, 6];
    applyTeamRosterDraft(db.tables.Teams.rows[0]);
    equal(db.roster_order.Alpha, ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6'], 'Reorder not persisted');
    closeEditor(); openEditor(0);
    equal(teamRosterDraft, [0, 1, 2, 3, 4, 5, 6], 'Reopened team loses order');
    closeEditor();
    check('Six map controls, female-team flags, roster ordering and bench positions survive editing');

    switchTab('Tournaments'); openEditor(0); captureVisibleFields();
    assert(editDraft[2] === '4', 'Tier 4 silently replaced');
    assert(validateTournamentEligibilityDraft(db.tables.Tournaments), 'Optional tournament location rejected');
    editDraft[2] = '3'; renderEditorFields(); captureVisibleFields();
    assert(editDraft[2] === '3', 'Tier 3 silently replaced');
    editDraft[2] = 'FutureTier'; renderEditorFields(); captureVisibleFields();
    assert(editDraft[2] === 'FutureTier', 'Unknown tier silently replaced');
    closeEditor();
    assert(!validateCurrentDatabase().issues.some(issue => issue.tableName === 'Tournaments' && ['Country', 'City'].includes(issue.fieldLabel)), 'Optional tournament location flagged as missing');
    check('Tournament tiers 3/4 and unfamiliar enum values are preserved; blank location remains valid');

    switchTab('Players'); openEditor(0);
    const roleControl = createRoleField('Role2', 11);
    assert([...roleControl.querySelector('select').options].some(option => option.value === 'AWPer'), 'AWPer cannot be assigned');
    const beforeFlags = [editDraft[14], editDraft[15]];
    captureVisibleFields(); equal([editDraft[14], editDraft[15]], beforeFlags, 'Unedited flags normalized');
    assert(resolvePlayerPotential(db.tables.Players, db.tables.Players.rows[0]).automatic, 'Automatic potential lost');
    assert(resolvePlayerPotential(db.tables.Players, db.tables.Players.rows[1]).value === 18, 'Manual potential lost');
    assert(calculatePlayerRatingForTable(db.tables.Players, db.tables.Players.rows[0]) === 3, 'Player rating changed');
    closeEditor();
    const faceitTable = { header: ['Faceit', 'FromFaceIt'] };
    editDraft = ['https://www.faceit.com/en/players/test', '0'];
    markPlayerAsFaceitOrigin(faceitTable);
    equal(editDraft, ['https://www.faceit.com/en/players/test', '1'], 'FACEIT preset overwrites the profile URL instead of the origin flag');
    assert(hasFaceitTag(faceitTable, editDraft), 'Profile URL hides the FACEIT badge');
    editDraft = [];
    const oldPlayer = [...db.tables.Players.rows[0]];
    db.tables.Players.rows[0][13] = 'renamed-id';
    updatePlayerRosterReferences(db.tables.Players, oldPlayer, db.tables.Players.rows[0]);
    assert(db.roster_order.Alpha[0] === 'renamed-id', 'Renaming ID leaves stale roster');
    const beforeTransfer = [...db.tables.Players.rows[0]];
    db.tables.Players.rows[0][5] = 'Beta';
    updatePlayerRosterReferences(db.tables.Players, beforeTransfer, db.tables.Players.rows[0]);
    assert(!db.roster_order.Alpha.includes('renamed-id'), 'Transfer leaves old roster reference');
    assert(getTeamRosterEntriesForList(db.tables.Teams, db.tables.Teams.rows[1]).some(entry => entry.index === 0), 'Transferred player missing from destination');
    check('AWPer selection, unchanged boolean values, manual/automatic Potential, Rating and transfer/ID references work');

    // Exercise existing feature flows against the current columns.
    selectedRowElements.set(1, document.createElement('div'));
    selectedRowElements.set(2, document.createElement('div'));
    openPlayerComparison();
    assert(!compareModal.hidden, 'Player comparison failed to open');
    closePlayerComparison();
    openMassEditModal();
    const potentialControl = massEditContent.querySelector('[data-mass-edit-field="7"]');
    potentialControl.querySelector('input[type="checkbox"]').checked = true;
    potentialControl.querySelector('[data-mass-range="min"]').value = '19';
    potentialControl.querySelector('[data-mass-range="max"]').value = '19';
    massEditContent.querySelector('[data-mass-status-field="14"]').dataset.massStatusValue = 'true';
    applyMassEdit();
    assert(db.tables.Players.rows[1][7] === '19' && db.tables.Players.rows[2][7] === '19', 'Mass edit Potential failed');
    assert(db.tables.Players.rows[1][14] === '1' && db.tables.Players.rows[2][14] === '1', 'Mass edit flag encoding changed');
    assert(db.tables.Players.rows[3][7] === '18', 'Mass edit changed an unselected player');
    clearSelection();
    const beforeMerge = getDatabaseStateSnapshot();

    // A different internal ID must not make an otherwise identical player an automatic addition.
    mergeState = createEmptyMergeState();
    mergeState.incomingDb = { tables: { Players: JSON.parse(JSON.stringify(db.tables.Players)) } };
    mergeState.incomingDb.tables.Players.rows[1][13] = 'alternate-p1';
    mergeState.incomingDb.tables.Players.rows[1][6] = '18';
    mergeState.step = 'scope';
    await handleMergeNext();
    assert(mergeState.step === 'review' && databaseLoadingScreen.hidden, 'Build-review loading screen did not complete cleanly');
    const identityMismatch = mergeState.proposals.find(proposal => proposal.incomingIndex === 1);
    assert(identityMismatch?.action === 'update', 'Different player ID was proposed as a duplicate addition');
    assert(identityMismatch.identityWarning && !identityMismatch.selected, 'Suspicious identity match was not held for manual approval');
    assert(identityMismatch.confidence === 'identity', 'Strong identity fallback was not reported');
    mergeState.reviewFilter.attention = 'id-mismatch';
    equal(getFilteredMergeProposals(), [identityMismatch], 'ID mismatch filter did not isolate suspicious identity matches');
    mergeState.reviewFilter.attention = 'manual-review';
    equal(getFilteredMergeProposals(), [identityMismatch], 'Manual-review filter omitted an ID mismatch');
    mergeState.reviewFilter.attention = 'safe';
    equal(getFilteredMergeProposals(), [], 'Safe-change filter included an ID mismatch');
    mergeState.reviewFilter.attention = 'all';
    identityMismatch.selected = true;
    const mergeProgress = [];
    await applyApprovedMerge({ onProgress: (percent, message) => mergeProgress.push({ percent, message }) });
    assert(mergeProgress.at(-1)?.percent === 100 && mergeProgress.some(item => /Applying records/.test(item.message)), 'Merge progress did not report apply work and completion');
    assert(db.tables.Players.rows.length === 7, 'Identity match created a duplicate player');
    assert(db.tables.Players.rows[1][13] === 'p1' && db.tables.Players.rows[1][6] === '18', 'Identity match did not preserve the base ID while applying approved fields');
    undoLastMerge();
    assert(getDatabaseStateSnapshot() === beforeMerge, 'Identity-match undo failed');

    // Nickname-only collisions are ambiguous and must stay skipped until resolved.
    mergeState = createEmptyMergeState();
    mergeState.incomingDb = { tables: { Players: JSON.parse(JSON.stringify(db.tables.Players)) } };
    mergeState.incomingDb.tables.Players.rows[1][1] = 'Different';
    mergeState.incomingDb.tables.Players.rows[1][2] = 'Person';
    mergeState.incomingDb.tables.Players.rows[1][3] = '02.02.2002';
    mergeState.incomingDb.tables.Players.rows[1][13] = 'nickname-collision';
    buildMergeProposals();
    const nicknameConflict = mergeState.proposals.find(proposal => proposal.incomingIndex === 1);
    assert(nicknameConflict?.action === 'conflict' && !nicknameConflict.selected, 'Nickname collision was automatically added');
    mergeState.reviewFilter.attention = 'manual-review';
    assert(getFilteredMergeProposals().includes(nicknameConflict), 'Manual-review filter omitted a conflict');

    // Recheck automatic additions while applying so two incoming aliases cannot create a pair.
    const guardedOne = [...db.tables.Players.rows[1]];
    guardedOne[0] = 'DuplicateGuard'; guardedOne[1] = 'Test'; guardedOne[2] = 'Guard'; guardedOne[3] = '03.03.2003'; guardedOne[13] = 'guard-a';
    const guardedTwo = [...guardedOne]; guardedTwo[13] = 'guard-b'; guardedTwo[6] = '17';
    const guardedUpdate = [...db.tables.Players.rows[2]]; guardedUpdate[6] = '19';
    mergeState = createEmptyMergeState();
    mergeState.incomingDb = { tables: { Players: { header: [...db.tables.Players.header], rows: [guardedOne, guardedTwo, guardedUpdate] } } };
    buildMergeProposals();
    assert(mergeState.proposals.filter(proposal => proposal.action === 'add').length === 2, 'Addition guard fixture was not offered for review');
    await applyApprovedMerge();
    assert(mergeState.result.added === 1 && mergeState.result.blocked === 1 && mergeState.result.updated === 1, 'Cached merge indexes did not support additions followed by updates');
    assert(db.tables.Players.rows.filter(row => row[0] === 'DuplicateGuard').length === 1, 'Apply-time guard left duplicate players');
    undoLastMerge();
    assert(getDatabaseStateSnapshot() === beforeMerge, 'Duplicate-guard undo failed');

    // Large additions must reuse lookup indexes and yield often enough to report progress.
    const bulkRows = Array.from({ length: 5000 }, (_, index) => {
        const row = [...db.tables.Players.rows[1]];
        row[0] = `BulkPlayer${index}`;
        row[1] = 'Bulk';
        row[2] = `Player${index}`;
        row[13] = `bulk-player-${index}`;
        return row;
    });
    mergeState = createEmptyMergeState();
    mergeState.incomingDb = { tables: { Players: { header: [...db.tables.Players.header], rows: bulkRows } } };
    buildMergeProposals();
    assert(mergeState.proposals.length === bulkRows.length && mergeState.proposals.every(proposal => proposal.action === 'add'), 'Large-merge fixture was not offered as additions');
    const bulkProgress = [];
    const bulkStarted = performance.now();
    await applyApprovedMerge({ onProgress: (percent, message) => bulkProgress.push({ percent, message }) });
    report.largeMerge = { records: bulkRows.length, applyMilliseconds: Math.round(performance.now() - bulkStarted) };
    assert(mergeState.result.added === bulkRows.length && mergeState.result.blocked === 0, 'Large merge did not apply every unique player');
    assert(bulkProgress.filter(item => /Applying records/.test(item.message)).length >= 20, 'Large merge did not yield periodic progress updates');
    undoLastMerge();
    assert(getDatabaseStateSnapshot() === beforeMerge, 'Large-merge undo failed');

    mergeState = createEmptyMergeState();
    mergeState.incomingDb = { tables: JSON.parse(JSON.stringify(db.tables)) };
    mergeState.incomingDb.tables.Players.rows[1][5] = 'Beta';
    buildMergeProposals();
    assert(mergeState.proposals.some(proposal => proposal.action === 'transfer'), 'Merge transfer review missing');
    await applyApprovedMerge();
    assert(db.tables.Players.rows[1][5] === 'Beta' && !db.roster_order.Alpha.includes('p1'), 'Approved merge leaves stale roster references');
    undoLastMerge();
    assert(getDatabaseStateSnapshot() === beforeMerge, 'Merge undo failed to restore tables and roster');
    check('Comparison, mass editing, suspicious identity review, a 5,000-player incremental merge, transfers and merge undo retain their behavior');

    let savedBlob;
    const originalSave = saveEmdbBlob;
    const originalValidate = validateDatabaseBeforeSave;
    saveEmdbBlob = async blob => { savedBlob = blob; return 'test-output.emdb'; };
    validateDatabaseBeforeSave = async () => true;
    assert(await saveCurrentDatabase(), 'Actual save workflow failed');
    saveEmdbBlob = originalSave; validateDatabaseBeforeSave = originalValidate;
    assert(await loadEMDBFile(new File([savedBlob], 'reopened.emdb')), 'Saved database does not reopen');
    assert(db.roster_order.Alpha[0] === '', 'Vacant roster slot lost on save');
    assert(db.roster_order.Alpha[5] === 'p5', 'Bench boundary changed on save');
    equal(await db.packageZip.file('future.bin').async('uint8array').then(Array.from), [0, 255, 3], 'Unknown binary file lost');
    equal(db.roster_order.Unrelated, ['unresolved'], 'Unrelated roster data altered');
    check('Actual Save As workflow encrypts and reopens successfully, retaining unknown files and unrelated roster data');

    const savedState = getDatabaseStateSnapshot();
    const invalidZip = new JSZip().file('Players.csv', 'Nick;Id\nPlayer;id;unexpected');
    assert(!(await loadEMDBFile(await fileFromZip(invalidZip))), 'Malformed CSV unexpectedly loaded');
    assert(getDatabaseStateSnapshot() === savedState, 'Failed load replaced the active database');
    const invalidVersion = new Uint8Array(await (await fileFromZip(zip)).arrayBuffer());
    invalidVersion[4] = 4;
    assert(!(await loadEMDBFile(new File([invalidVersion], 'future.emdb'))), 'Unsupported version unexpectedly loaded');
    assert(getDatabaseStateSnapshot() === savedState, 'Unsupported version replaced the active database');
    const corrupt = new Uint8Array(await (await fileFromZip(zip)).arrayBuffer());
    corrupt[corrupt.length - 1] ^= 1;
    assert(!(await loadEMDBFile(new File([corrupt], 'corrupt.emdb'))), 'Corrupt authentication tag accepted');
    assert(getDatabaseStateSnapshot() === savedState, 'Corrupt file replaced the active database');
    zip.remove('roster_order.json');
    assert(await loadEMDBFile(await fileFromZip(zip)), 'Database without roster cannot load');
    equal(db.roster_order, {}, 'Previous database roster leaked into next load');
    check('Malformed input and unknown EMDB versions preserve the current database; missing roster starts fresh');
    assert(alerts.length === 3, `Unexpected alerts: ${alerts.join('; ')}`);
    return report;
})()
