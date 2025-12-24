/**
 * Fixture Patch Module
 * Handles fixture patching functionality
 */
class FGMFixturePatchModule extends FGMFeatureModule {
    constructor() {
        super('fixture-patch', '1.0.0');
    }

    init() {
        console.log('[FixturePatchModule] Initializing...');

        this.on(FGMEventTypes.TABLE_CELL_CLICKED, {
            filter: (event) => {
                return event.data.field?.getFGMType() === FGMTypes.ACTIONS.WINDOW.FIXTURE_LIST_CONFIG;
            },
            handler: (event) => this.handleCellClick(event),
            priority: 10
        });

        this.on(FGMEventTypes.TABLE_ROW_DELETED, {
            filter: (event) => {
                return event.data.field?.getFGMType() === FGMTypes.ACTIONS.WINDOW.FIXTURE_LIST_CONFIG;
            },
            handler: (event) => this.handleRowDelete(event),
            priority: 10
        });

        this.on(FGMEventTypes.TABLE_ROW_ADDED, {
            filter: (event) => {
                return event.data.field?.getFGMType() === FGMTypes.ACTIONS.WINDOW.FIXTURE_LIST_CONFIG;
            },
            handler: (event) => this.handleRowAdd(event),
            priority: 10
        });

        this.on(FGMEventTypes.KEYBOARD_ENTER, {
            filter: (event) => {
                const awaitingAction = FGMSubAction.getAwaitingAction();
                return awaitingAction === FGMTypes.ACTIONS.WINDOW.FIXTURE_LIST_SEARCH_FIELD;
            },
            handler: (event) => this.handleSearchKeyboardUpdate(event),
            priority: 10
        });

        this.on(FGMEventTypes.KEYBOARD_UPDATE, {
            filter: (event) => {
                const awaitingAction = FGMSubAction.getAwaitingAction();
                return awaitingAction === FGMTypes.ACTIONS.WINDOW.FIXTURE_LIST_SEARCH_FIELD;
            },
            handler: (event) => this.handleSearchKeyboardUpdate(event),
            priority: 10
        });

        this.registerAction(FGMTypes.ACTIONS.WINDOW.FIXTURE_LIST_CONFIG, {
            handleKeyboardEnter: (value) => this.handleKeyboardSave(value)
        });

        this.registerAction(FGMTypes.ACTIONS.WINDOW.FIXTURE_LIST_SEARCH_FIELD, {
            handleKeyboardEnter: (value) => this.handleSearchSelect(value)
        });

        console.log('[FixturePatchModule] Initialized');
    }

    handleSearchKeyboardUpdate(event) {
        const { value } = event.data;
        const library = FGMStore.getLibrary();

        if (!library) return;

        const searchWindow = this.getSearchWindow();
        if (!searchWindow) return;

        const searchField = searchWindow.getSingleContextField();

        const profiles = library.searchProfiles(value);
        const results = profiles.map(p => ({
            name: p.name || p.shortName,
            shortName: p.shortName,
            type: p.type || ''
        }));

        searchField.setSearchValue(value);
        searchField.setResults(results);
    }

    handleCellClick(event) {
        const { window: fromWindow, field: fromTable, rowIndex, colIndex, value } = event.data;

        FGMSubAction.setAwaitingAction(FGMTypes.ACTIONS.WINDOW.FIXTURE_LIST_CONFIG, {
            targetWindow: fromWindow,
            targetField: fromTable,
            rowIndex: rowIndex,
            colIndex: colIndex
        });

        FGMWindowManager.openKeyboardForWindow(fromWindow, value);
    }

    handleRowDelete(event) {
        const { rowIndex } = event.data;
        const fixtures = FGMStore.getPatchedFixtures();
        if (fixtures[rowIndex]) {
            fixtures.splice(rowIndex, 1);
            this.refreshFixtureTable();
        }
    }

    handleRowAdd(event) {
        this.openFixtureSearch();
    }

    handleKeyboardSave(string) {
        const data = FGMSubAction.actionData;
        if (data.targetField && data.rowIndex !== undefined) {
            data.targetField.updateCellValue(data.rowIndex, data.colIndex, string);

            const fixtures = FGMStore.getPatchedFixtures();
            const fixture = fixtures[data.rowIndex];

            if (fixture) {
                const fields = ['uid', 'shortName', 'label', 'address', 'universe'];
                const fieldName = fields[data.colIndex];

                if (fieldName === 'uid') {
                    fixture.setId(string);
                } else if (fieldName === 'shortName') {
                    fixture.setShortName(string);
                } else if (fieldName === 'label') {
                    fixture.setLabel(string);
                } else if (fieldName === 'address') {
                    fixture.setAddress(parseInt(string) || 1);
                } else if (fieldName === 'universe') {
                    fixture.setUniverse(parseInt(string) || 1);
                }
            }
        }
        FGMSubAction.clearAwaitingAction();
        FGMWindowManager.closeKeyboard();
        this.refreshFixtureTable();
    }

    openFixtureSearch() {
        const searchWindow = this.getSearchWindow();
        const fixtureWindow = this.getFixtureWindow();

        if (searchWindow && fixtureWindow) {
            searchWindow.setHidden(false);
            fixtureWindow.setHidden(true);

            const searchField = searchWindow.getSingleContextField();
            const library = FGMStore.getLibrary();

            if (library) {
                const profiles = library.getProfiles();
                const results = profiles.map(p => ({
                    name: p.name || p.shortName,
                    shortName: p.shortName,
                    type: p.type || ''
                }));
                searchField.setResults(results);
                searchField.onResultClick((window, field, result) => {
                    this.handleSearchSelect(result.shortName);
                });
            }

            FGMSubAction.setAwaitingAction(FGMTypes.ACTIONS.WINDOW.FIXTURE_LIST_SEARCH_FIELD, {
                targetWindow: searchWindow,
                targetField: searchField
            });

            FGMWindowManager.openKeyboardForWindow(searchWindow, '');
        }
    }

    handleSearchSelect(value) {
        const library = FGMStore.getLibrary();
        if (!library) {
            console.error('[FixturePatchModule] No library loaded');
            return;
        }

        const profile = library.getProfile(value);
        if (!profile) {
            console.error('[FixturePatchModule] Profile not found:', value);
            return;
        }

        const fixture = new FGMFixture(
            FGMIds.newFixtureId(),
            profile.shortName,
            profile.name || profile.shortName
        );

        fixture.setAddress(1);
        fixture.setUniverse(1);

        FGMStore.addPatchedFixture(fixture);

        FGMSubAction.clearAwaitingAction();
        FGMWindowManager.closeKeyboard();

        const searchWindow = this.getSearchWindow();
        const fixtureWindow = this.getFixtureWindow();

        if (searchWindow) searchWindow.setHidden(true);
        if (fixtureWindow) fixtureWindow.setHidden(false);

        this.refreshFixtureTable();
    }

    refreshFixtureTable() {
        const fixtureWindow = this.getFixtureWindow();
        if (fixtureWindow) {
            const tableField = fixtureWindow.getSingleContextField();
            const fixtures = FGMStore.getPatchedFixtures();
            console.log(fixtures)
            const rows = fixtures.map(f => [
                f.getId(),
                f.getShortName(),
                f.getLabel(),
                f.getAddress().toString(),
                f.getUniverse().toString()
            ]);
            tableField.setRows(rows);
        }
    }

    getFixtureWindow() {
        return FGMStore.getHCW().getWindows().find(w => w.getId() === FGMIds.DEFAULT.WINDOWS.FIXTURE_LIST_CONFIG);
    }

    getSearchWindow() {
        return FGMStore.getHCW().getWindows().find(w => w.getId() === FGMIds.DEFAULT.WINDOWS.FIXTURE_LIST_SEARCH_FIELD);
    }
}