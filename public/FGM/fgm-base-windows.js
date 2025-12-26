class FGMBaseWindows {
    static pageView(pageCount = 10, windowId = FGMIds.newWindowId(), presetId = FGMIds.newComponentId()) {
        const pageField = new HCWPresetField('Pages', presetId)
            .onPresetPress(FGMKernel.eventPresetClicked)

        pageField.addPreset(new HCWPreset(`Setup`).setDefaultColor(FGMColors.PAGES.MENUS.SETUP).setData({ _goToPage: FGMPageHandler.PAGE_ENUMS.SETUP }));
        pageField.addPreset(new HCWPreset(`Fixture Cnt.`).setDefaultColor(FGMColors.PAGES.MENUS.FIXTURE_CONTROL).setData({ _goToPage: FGMPageHandler.PAGE_ENUMS.FIXTURE_CONTROL }));

        for (let i = 0; i < pageCount; i++) {
            pageField.addPreset(new HCWPreset(`Page ${i}`).setDefaultColor(FGMColors.PAGES.BACKGROUND).setData({ _goToPage: i }));
        }

        const newWindow = new HCWWindow(0, 0, 50, 400)
            .setTouchZoneColor(FGMColors.TOUCHZONE.BACKGROUND)
            .addContextField(pageField)
            .setMinSizes(100, 100)
            .setId(windowId)
            .onPress(FGMKernel.eventWindowClicked)
            .setPageId(FGMTypes.RENDER.PAGES.RENDER_ALWAYS);

        pageField.setParentWindow(newWindow);

        return newWindow;
    }

    static setupPage() {
        return;
    }

    static inOut() {
        let windowsForThisPage = [];

        const inOutSettings = new HCWPresetField('Config', FGMIds.newComponentId())
            .onPresetPress((win, presetField, data, preset) => {
                const presetData_open = preset.getData()._open;

                if (presetData_open == "ARTNET") {
                    const artNetWin = FGMStore.getHCW().getWindows().find(w => w.getId() === FGMIds.DEFAULT.WINDOWS.ART_NET_CONFIG);
                    if (artNetWin) {
                        artNetWin.setHidden(false);
                    }

                    return;
                }
            });

        inOutSettings.addPreset(new HCWPreset("ArtNet").setData({ _open: "ARTNET" }).setDefaultColor(FGMColors.PAGES.MENUS.IN_OUT));

        const newTriggerWindow = new HCWWindow(100, 0, 600, 200)
            .setTouchZoneColor(FGMColors.TOUCHZONE.BACKGROUND)
            .addContextField(inOutSettings)
            .setHidden(true)
            .setMinSizes(100, 50)
            .setId(FGMIds.newWindowId())
            .setPageId(FGMPageHandler.PAGE_ENUMS.SETUP);

        inOutSettings.setParentWindow(newTriggerWindow);
        windowsForThisPage.trigger = newTriggerWindow;

        return windowsForThisPage;
    }

    static fixtureTable() {
        let windowsForThisPage = [];

        const tableField = new HCWTableField('Patched Fixtures', FGMIds.newComponentId())
            .setHeaders(['uid', 'ShortName', 'Label', 'Address', 'Universe'])
            .onCellClick(FGMKernel.eventTableCellClicked)
            .onDeleteRow(FGMKernel.eventTableRowDeleted)
            .onAddRow(FGMKernel.eventTableRowAdded.bind(FGMKernel))
            .setFGMType(FGMTypes.ACTIONS.WINDOW.FIXTURE_LIST_CONFIG);

        const fixtureTableWindow = new HCWWindow(700, 0, 600, 600)
            .setTouchZoneColor(FGMColors.TOUCHZONE.BACKGROUND)
            .addContextField(tableField)
            .setHidden(true)
            .setMinSizes(300, 200)
            .setPageId(FGMPageHandler.PAGE_ENUMS.SETUP)
            .setId(FGMIds.DEFAULT.WINDOWS.FIXTURE_LIST_CONFIG);

        tableField.setParentWindow(fixtureTableWindow);

        windowsForThisPage.fixtureTableWindow = fixtureTableWindow;

        const searchBar = new HCWSearchField("Fixture Library", FGMIds.newComponentId())
            .setFGMType(FGMTypes.ACTIONS.WINDOW.FIXTURE_LIST_SEARCH_FIELD)
            .setLabel("Search Fixtures")

        const fixtureSearchWindow = new HCWWindow(0, 0, 900, 600)
            .setTouchZoneColor(FGMColors.TOUCHZONE.BACKGROUND)
            .addContextField(searchBar)
            .setHidden(true)
            .setMinSizes(300, 200)
            .setId(FGMIds.DEFAULT.WINDOWS.FIXTURE_LIST_SEARCH_FIELD);

        windowsForThisPage.fixtureSearchWindow = fixtureSearchWindow;

        return windowsForThisPage;
    }

    static artNetSettings() {
        const nodes = FGMStore.getArtNetNodes();
        const rows = nodes.map(n => [n.name, n.ip, n.subnet, n.universe, n.softUni]);

        const tableField = new HCWTableField('ArtNet Address Settings', FGMIds.newComponentId())
            .setHeaders(['Name', 'IP Address', 'Subnet Mask', 'Universe', 'Soft Uni'])
            .setRows(rows)
            .onCellClick(FGMKernel.eventTableCellClicked)
            .onDeleteRow(FGMKernel.eventTableRowDeleted)
            .onAddRow(FGMKernel.eventTableRowAdded.bind(FGMKernel))
            .setFGMType(FGMTypes.ACTIONS.WINDOW.ARTNET_SETTINGS);

        const artNetWindow = new HCWWindow(100, 200, 600, 600)
            .setTouchZoneColor(FGMColors.TOUCHZONE.QUICK_INPUT)
            .addContextField(tableField)
            .setHidden(true)
            .setMinSizes(300, 200)
            .setId(FGMIds.DEFAULT.WINDOWS.ART_NET_CONFIG);

        tableField.setParentWindow(artNetWindow);

        return artNetWindow;
    }

    static fixtureControl() {
        let windowsForThisPage = [];

        // --- Fixture Pool ---
        const fixturePool = new HCWPresetField('Fixtures', FGMIds.newComponentId())
            .setFGMType(FGMTypes.PROGRAMMER.POOLS.FIXTURE_POOL)
            .onPresetPress(FGMKernel.eventPresetClicked);

        // Populate from Store
        const patchedFixtures = FGMStore.getPatchedFixtures();
        patchedFixtures.forEach(fix => {
            fixturePool.addPreset(new HCWPreset(fix.getLabel(), null, null, { id: fix.getId() }));
        });

        const newFixturePoolWindow = new HCWWindow(100, 0, 400, 300)
            .setTouchZoneColor(FGMColors.TOUCHZONE.BACKGROUND)
            .addContextField(fixturePool)
            .setHidden(true)
            .setMinSizes(100, 100)
            .setId(FGMIds.newWindowId())
            .onPress(FGMKernel.eventWindowClicked)
            .setPageId(FGMPageHandler.PAGE_ENUMS.FIXTURE_CONTROL);

        fixturePool.setParentWindow(newFixturePoolWindow);
        windowsForThisPage.fixturePool = newFixturePoolWindow;

        // --- Group Pool ---
        const groupPool = new HCWPresetField('Groups', FGMIds.newComponentId())
            .setFGMType(FGMTypes.PROGRAMMER.POOLS.GROUP_POOL)
            .onPresetPress(FGMKernel.eventPresetClicked);

        for (let i = 1; i <= 20; i++) {
            groupPool.addPreset(new HCWPreset("Group " + i, null, null, { id: i }));
        }

        const newGroupPoolWindow = new HCWWindow(500, 0, 400, 300)
            .setTouchZoneColor(FGMColors.TOUCHZONE.BACKGROUND)
            .addContextField(groupPool)
            .setHidden(true)
            .setMinSizes(100, 100)
            .setId(FGMIds.newWindowId())
            .onPress(FGMKernel.eventWindowClicked)
            .setPageId(FGMPageHandler.PAGE_ENUMS.FIXTURE_CONTROL);

        groupPool.setParentWindow(newGroupPoolWindow);
        windowsForThisPage.groupPool = newGroupPoolWindow;

        // --- Dimmer Pool ---
        const dimmerPool = new HCWPresetField('Dimmers', FGMIds.newComponentId())
            .setFGMType(FGMTypes.PROGRAMMER.POOLS.DIMMER_POOL)
            .onPresetPress(FGMKernel.eventPresetClicked);

        for (let i = 0; i < 20; i++) dimmerPool.addPreset(new HCWPreset("", null, null, null));

        const dimmerPoolWindow = new HCWWindow(100, 300, 400, 200)
            .setTouchZoneColor(FGMColors.TOUCHZONE.BACKGROUND)
            .addContextField(dimmerPool)
            .setHidden(true)
            .setId(FGMIds.newWindowId())
            .onPress(FGMKernel.eventWindowClicked)
            .setPageId(FGMPageHandler.PAGE_ENUMS.FIXTURE_CONTROL);

        dimmerPool.setParentWindow(dimmerPoolWindow);
        windowsForThisPage.dimmerPool = dimmerPoolWindow;

        // --- Color Pool ---
        const colorPool = new HCWPresetField('Colors', FGMIds.newComponentId())
            .setFGMType(FGMTypes.PROGRAMMER.POOLS.COLOR_POOL)
            .onPresetPress(FGMKernel.eventPresetClicked);

        for (let i = 0; i < 20; i++) colorPool.addPreset(new HCWPreset("", null, null, null));

        const colorPoolWindow = new HCWWindow(500, 300, 400, 200)
            .setTouchZoneColor(FGMColors.TOUCHZONE.BACKGROUND)
            .addContextField(colorPool)
            .setHidden(true)
            .setId(FGMIds.newWindowId())
            .onPress(FGMKernel.eventWindowClicked)
            .setPageId(FGMPageHandler.PAGE_ENUMS.FIXTURE_CONTROL);

        colorPool.setParentWindow(colorPoolWindow);
        windowsForThisPage.colorPool = colorPoolWindow;

        // --- Position Pool ---
        const positionPool = new HCWPresetField('Positions', FGMIds.newComponentId())
            .setFGMType(FGMTypes.PROGRAMMER.POOLS.POSITION_POOL)
            .onPresetPress(FGMKernel.eventPresetClicked);

        for (let i = 0; i < 20; i++) positionPool.addPreset(new HCWPreset("", null, null, null));

        const positionPoolWindow = new HCWWindow(900, 300, 400, 200)
            .setTouchZoneColor(FGMColors.TOUCHZONE.BACKGROUND)
            .addContextField(positionPool)
            .setHidden(true)
            .setId(FGMIds.newWindowId())
            .onPress(FGMKernel.eventWindowClicked)
            .setPageId(FGMPageHandler.PAGE_ENUMS.FIXTURE_CONTROL);

        positionPool.setParentWindow(positionPoolWindow);
        windowsForThisPage.positionPool = positionPoolWindow;

        // --- All Pool ---
        const allPool = new HCWPresetField('All', FGMIds.newComponentId())
            .setFGMType(FGMTypes.PROGRAMMER.POOLS.ALL_POOL)
            .onPresetPress(FGMKernel.eventPresetClicked);

        for (let i = 0; i < 20; i++) allPool.addPreset(new HCWPreset("", null, null, null));

        const allPoolWindow = new HCWWindow(900, 0, 400, 300)
            .setTouchZoneColor(FGMColors.TOUCHZONE.BACKGROUND)
            .addContextField(allPool)
            .setHidden(true)
            .setId(FGMIds.newWindowId())
            .onPress(FGMKernel.eventWindowClicked)
            .setPageId(FGMPageHandler.PAGE_ENUMS.FIXTURE_CONTROL);

        allPool.setParentWindow(allPoolWindow);
        windowsForThisPage.allPool = allPoolWindow;

        // Main Dimmer
        const dimFader = new HCWFaderField('Dimmer', FGMIds.newComponentId())
            .setDisplayType("byte")
            .onValueChange(FGMKernel.eventFaderUpdate)
            .setFGMType(FGMTypes.PROGRAMMER.DIMMERS.MAIN)

        const newFaderWindow = new HCWWindow(0, 500, 80, 400)
            .setTouchZoneColor(FGMColors.TOUCHZONE.BACKGROUND)
            .addContextField(dimFader)
            .setHidden(true)
            .setMinSizes(100, 100)
            .setId(FGMIds.newWindowId())
            .onPress(FGMKernel.eventWindowClicked)
            .setPageId(FGMPageHandler.PAGE_ENUMS.FIXTURE_CONTROL);

        dimFader.setParentWindow(newFaderWindow);

        windowsForThisPage.dimFader = newFaderWindow;

        // Position Pan

        const panEncoder = new HCWEncoderField('Pan', FGMIds.newComponentId())
            .onValueChange(FGMKernel.eventEncoderUpdate)
            .setFGMType(FGMTypes.PROGRAMMER.POSITION.PAN_ENCODER)

        const newPanEncoderWindow = new HCWWindow(100, 500, 200, 200)
            .setTouchZoneColor(FGMColors.TOUCHZONE.BACKGROUND)
            .addContextField(panEncoder)
            .setHidden(true)
            .setMinSizes(100, 100)
            .setId(FGMIds.newWindowId())
            .onPress(FGMKernel.eventWindowClicked)
            .setPageId(FGMPageHandler.PAGE_ENUMS.FIXTURE_CONTROL);

        panEncoder.setParentWindow(newPanEncoderWindow);

        windowsForThisPage.panEncoder = newPanEncoderWindow;

        // Position Tilt

        const tiltEncoder = new HCWEncoderField('Tilt', FGMIds.newComponentId())
            .onValueChange(FGMKernel.eventEncoderUpdate)
            .setFGMType(FGMTypes.PROGRAMMER.POSITION.TILT_ENCODER)

        const newtiltEncoderWindow = new HCWWindow(100, 710, 200, 200)
            .setTouchZoneColor(FGMColors.TOUCHZONE.BACKGROUND)
            .addContextField(tiltEncoder)
            .setMinSizes(100, 100)
            .setHidden(true)
            .setId(FGMIds.newWindowId())
            .onPress(FGMKernel.eventWindowClicked)
            .setPageId(FGMPageHandler.PAGE_ENUMS.FIXTURE_CONTROL);

        tiltEncoder.setParentWindow(newtiltEncoderWindow);

        windowsForThisPage.tiltEncoder = newtiltEncoderWindow;

        // Color Picker

        const colorPicker = new HCWColorMapField('Color Picker', FGMIds.newComponentId())
            .onValueChange(FGMKernel.eventColorPickerUpdate)
            .setFGMType(FGMTypes.PROGRAMMER.COLORS.COLOR_PICKER)

        const newColorPickerWindow = new HCWWindow(300, 500, 400, 400)
            .setTouchZoneColor(FGMColors.TOUCHZONE.BACKGROUND)
            .addContextField(colorPicker)
            .setHidden(true)
            .setMinSizes(200, 200)
            .setId(FGMIds.newWindowId())
            .onPress(FGMKernel.eventWindowClicked)
            .setPageId(FGMPageHandler.PAGE_ENUMS.FIXTURE_CONTROL);

        colorPicker.setParentWindow(newColorPickerWindow);

        windowsForThisPage.colorPicker = newColorPickerWindow;

        const pageActions = new HCWPresetField('Actions', FGMIds.newComponentId())
            .onPresetPress(FGMKernel.eventPresetClicked)
            .addPreset(new HCWPreset("Edit Name").setDefaultColor(FGMColors.PAGES.BACKGROUND).setData({ _actionId: FGMTypes.ACTIONS.BUTTON.EDIT_NAME }))
            .addPreset(new HCWPreset("Store").setDefaultColor(FGMColors.PAGES.BACKGROUND).setData({ _actionId: FGMTypes.ACTIONS.BUTTON.STORE }))
            .addPreset(new HCWPreset("Move").setDefaultColor(FGMColors.PAGES.BACKGROUND).setData({ _actionId: FGMTypes.ACTIONS.BUTTON.MOVE }))
            .addPreset(new HCWPreset("Delete").setDefaultColor(FGMColors.PAGES.BACKGROUND).setData({ _actionId: FGMTypes.ACTIONS.BUTTON.DELETE }))
            .addPreset(new HCWPreset("Clear Selec.").setDefaultColor(FGMColors.PAGES.BACKGROUND).setData({ _actionId: FGMTypes.ACTIONS.BUTTON.CLEAR_SELECTION }))
            .addPreset(new HCWPreset("Release Fixt.").setDefaultColor(FGMColors.PAGES.BACKGROUND).setData({ _actionId: FGMTypes.ACTIONS.BUTTON.CLEAR_GHOST_VALUES }))

        const newPageActionsWindow = new HCWWindow(700, 500, 100, 500)
            .setTouchZoneColor(FGMColors.TOUCHZONE.BACKGROUND)
            .addContextField(pageActions)
            .setHidden(true)
            .setMinSizes(100, 100)
            .setId(FGMIds.newWindowId())
            .onPress(FGMKernel.eventWindowClicked)
            .setPageId(FGMPageHandler.PAGE_ENUMS.FIXTURE_CONTROL);

        windowsForThisPage.programmerActions = newPageActionsWindow;

        // --- Zoom ---
        const zoomEncoder = new HCWEncoderField('Zoom', FGMIds.newComponentId())
            .onValueChange(FGMKernel.eventEncoderUpdate)
            .setFGMType(FGMTypes.PROGRAMMER.BEAM.ZOOM);

        const zoomWindow = new HCWWindow(800, 500, 200, 200)
            .setTouchZoneColor(FGMColors.TOUCHZONE.BACKGROUND)
            .addContextField(zoomEncoder)
            .setHidden(true)
            .setId(FGMIds.newWindowId())
            .onPress(FGMKernel.eventWindowClicked)
            .setPageId(FGMPageHandler.PAGE_ENUMS.FIXTURE_CONTROL);

        zoomEncoder.setParentWindow(zoomWindow);
        windowsForThisPage.zoomEncoder = zoomWindow;

        // --- Focus ---
        const focusEncoder = new HCWEncoderField('Focus', FGMIds.newComponentId())
            .onValueChange(FGMKernel.eventEncoderUpdate)
            .setFGMType(FGMTypes.PROGRAMMER.BEAM.FOCUS);

        const focusWindow = new HCWWindow(800, 700, 200, 200)
            .setTouchZoneColor(FGMColors.TOUCHZONE.BACKGROUND)
            .addContextField(focusEncoder)
            .setHidden(true)
            .setId(FGMIds.newWindowId())
            .onPress(FGMKernel.eventWindowClicked)
            .setPageId(FGMPageHandler.PAGE_ENUMS.FIXTURE_CONTROL);

        focusEncoder.setParentWindow(focusWindow);
        windowsForThisPage.focusEncoder = focusWindow;

        // --- Shutter ---
        const shutterEncoder = new HCWEncoderField('Shutter', FGMIds.newComponentId())
            .onValueChange(FGMKernel.eventEncoderUpdate)
            .setFGMType(FGMTypes.PROGRAMMER.BEAM.SHUTTER);

        const shutterWindow = new HCWWindow(1000, 710, 200, 200)
            .setTouchZoneColor(FGMColors.TOUCHZONE.BACKGROUND)
            .addContextField(shutterEncoder)
            .setHidden(true)
            .setId(FGMIds.newWindowId())
            .onPress(FGMKernel.eventWindowClicked)
            .setPageId(FGMPageHandler.PAGE_ENUMS.FIXTURE_CONTROL);

        shutterEncoder.setParentWindow(shutterWindow);
        windowsForThisPage.shutterEncoder = shutterWindow;

        // --- Gobo ---
        const goboEncoder = new HCWColorWheelEncoderField('Gobo', FGMIds.newComponentId())
            .onValueChange(FGMKernel.eventEncoderUpdate)
            .setFGMType(FGMTypes.PROGRAMMER.BEAM.GOBO);

        const goboWindow = new HCWWindow(1200, 500, 200, 200)
            .setTouchZoneColor(FGMColors.TOUCHZONE.BACKGROUND)
            .addContextField(goboEncoder)
            .setHidden(true)
            .setId(FGMIds.newWindowId())
            .onPress(FGMKernel.eventWindowClicked)
            .setPageId(FGMPageHandler.PAGE_ENUMS.FIXTURE_CONTROL);

        goboEncoder.setParentWindow(goboWindow);
        windowsForThisPage.goboEncoder = goboWindow;

        // --- Color Wheel ---
        const colorWheelEncoder = new HCWColorWheelEncoderField('Color Wheel', FGMIds.newComponentId())
            .onValueChange(FGMKernel.eventEncoderUpdate)
            .setFGMType(FGMTypes.PROGRAMMER.COLORS.COLOR_WHEEL)
            .setCenterColor('#fff'); // Default white center

        const colorWheelWindow = new HCWWindow(1000, 500, 200, 200)
            .setTouchZoneColor(FGMColors.TOUCHZONE.BACKGROUND)
            .addContextField(colorWheelEncoder)
            .setHidden(true)
            .setId(FGMIds.newWindowId())
            .onPress(FGMKernel.eventWindowClicked)
            .setPageId(FGMPageHandler.PAGE_ENUMS.FIXTURE_CONTROL);

        colorWheelEncoder.setParentWindow(colorWheelWindow);
        windowsForThisPage.colorWheelEncoder = colorWheelWindow;

        const programmerSheetWin = this.programmerSheet();
        windowsForThisPage.programmerSheet = programmerSheetWin;

        return windowsForThisPage;
    }

    static programmerSheet() {
        const sheetField = new HCWTableField('Programmer Sheet', FGMIds.newComponentId())
            .setRenderMode('list')
            .setFGMType(FGMTypes.PROGRAMMER.POOLS.PROGRAMMER_SHEET)
            .setHeaders(['Fixture'])
            .setRows([]);

        const sheetWindow = new HCWWindow(1300, 0, 600, 500)
            .setTouchZoneColor(FGMColors.TOUCHZONE.BACKGROUND)
            .addContextField(sheetField)
            .setHidden(true)
            .setMinSizes(200, 150)
            .setId(FGMIds.newWindowId())
            .onPress(FGMKernel.eventWindowClicked)
            .setPageId(FGMPageHandler.PAGE_ENUMS.FIXTURE_CONTROL);

        sheetField.setParentWindow(sheetWindow);

        return sheetWindow;
    }

    static hiddenInputDevices() {
        let windowsForThisPage = {};

        // Keyboard

        const inputKeyboard = new HCWKeyboardField('Keyboard', FGMIds.newComponentId())
            .onEnter(FGMKernel.eventKeyboardOnEnter)
            .onValueChange(FGMKernel.eventKeyboardUpdate)
            .setFGMType(FGMTypes.ACTIONS.KEYBOARD.MAIN_INPUT)

        const newKeyboardWindow = new HCWWindow(300, 500, 400, 300)
            .setTouchZoneColor(FGMColors.TOUCHZONE.BACKGROUND)
            .addContextField(inputKeyboard)
            .setHidden(true)
            .setMinSizes(100, 100)
            .setId(FGMIds.newWindowId())

        windowsForThisPage.keyboard = newKeyboardWindow;

        return windowsForThisPage;
    }
}