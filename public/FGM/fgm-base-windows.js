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

        const nodes = FGMStore.getPatchedFixtures();

        // const rows = nodes.map(n => [n.name, n.ip, n.subnet, n.universe]);

        const tableField = new HCWTableField('Patched Fixtures', FGMIds.newComponentId())
            .setHeaders(['uid', 'ShortName', 'Label', 'Address', 'Universe'])
            // .setRows(rows)
            .onCellClick(FGMKernel.eventTableFixturePatchCellClicked)
            .onDeleteRow(FGMKernel.eventDeleteFixturePatchCell)
            .onAddRow(FGMKernel.eventAddFixturePatchCell.bind(FGMKernel))
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

        const searchBar = new HCWSearchField("Fixture Lib", FGMIds.newComponentId())
            .setFGMType(FGMTypes.ACTIONS.WINDOW.FIXTURE_LIST_SEARCH_FIELD)
            .setLabel("Search Fixtures")
        /* .setSearchValue(FGMStore.getLibrary().map((n) => {
            return { name: n.name, shortName: n.shortName };
        }))
*/
        const fixtureSearchWindow = new HCWWindow(700, 700, 300, 600)
            .setTouchZoneColor(FGMColors.TOUCHZONE.BACKGROUND)
            .addContextField(searchBar)
            .setHidden(true)
            .setMinSizes(300, 200)
            // .setPageId(FGMPageHandler.PAGE_ENUMS.SETUP)
            .setId(FGMIds.DEFAULT.WINDOWS.FIXTURE_LIST_SEARCH_FIELD);

        windowsForThisPage.fixtureSearchWindow = fixtureSearchWindow;

        return windowsForThisPage;
    }

    static artNetSettings() {
        const nodes = FGMStore.getArtNetNodes();
        const rows = nodes.map(n => [n.name, n.ip, n.subnet, n.universe]);

        const tableField = new HCWTableField('ArtNet Address Settings', FGMIds.newComponentId())
            .setHeaders(['Name', 'IP Address', 'Subnet Mask', 'Universe'])
            .setRows(rows)
            .onCellClick(FGMKernel.eventTableArtNetCellClicked)
            .onDeleteRow(FGMKernel.eventDeleteArtNetNode)
            .onAddRow(FGMKernel.eventAddArtNetNode.bind(FGMKernel))
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

        // Main Dimmer
        const dimFader = new HCWFaderField('Dimmer', FGMIds.newComponentId())
            .setDisplayType("byte")
            .onValueChange(FGMKernel.eventFaderUpdate)
            .setFGMType(FGMTypes.PROGRAMMER.DIMMERS.MAIN)

        const newFaderWindow = new HCWWindow(0, 500, 50, 400)
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

        const newtiltEncoderWindow = new HCWWindow(100, 700, 200, 200)
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

        const colorPicker = new HCWColorMapField('Color Picker 1', FGMIds.newComponentId())
            .onValueChange(FGMKernel.eventColorPickerUpdate)
            .setFGMType(FGMTypes.PROGRAMMER.COLORS.COLOR_PICKER)

        const newColorPickerWindow = new HCWWindow(300, 500, 300, 300)
            .setTouchZoneColor(FGMColors.TOUCHZONE.BACKGROUND)
            .addContextField(colorPicker)
            .setHidden(true)
            .setMinSizes(200, 200)
            .setId(FGMIds.newWindowId())
            .onPress(FGMKernel.eventWindowClicked)
            .setPageId(FGMPageHandler.PAGE_ENUMS.FIXTURE_CONTROL);

        colorPicker.setParentWindow(newColorPickerWindow);

        windowsForThisPage.colorPicker = newColorPickerWindow;

        // 3 Simple actions

        const pageActions = new HCWPresetField('Actions', FGMIds.newComponentId())
            .onPresetPress(FGMKernel.eventPresetClicked)
            // .addPreset(new HCWPreset("Store").setDefaultColor(FGMColors.PAGES.BACKGROUND).setData({ _programmerAction: FGMTypes.ACTIONS.BUTTON.STORE }))
            // .addPreset(new HCWPreset("Clear Fixture atr.").setDefaultColor(FGMColors.PAGES.BACKGROUND).setData({ _programmerAction: FGMTypes.ACTIONS.BUTTON.CLEAR_FIXTURE_VALUE_OVERWRITE }))
            // .addPreset(new HCWPreset("Clear All").setDefaultColor(FGMColors.PAGES.BACKGROUND).setData({ _programmerAction: FGMTypes.ACTIONS.BUTTON.CLEAR_ALL }))
            .addPreset(new HCWPreset("Edit Name").setDefaultColor(FGMColors.PAGES.BACKGROUND).setData({ _programmerAction: FGMTypes.ACTIONS.BUTTON.EDIT_NAME }))

        const newPageActionsWindow = new HCWWindow(300, 800, 300, 100)
            .setTouchZoneColor(FGMColors.TOUCHZONE.BACKGROUND)
            .addContextField(pageActions)
            .setHidden(true)
            .setMinSizes(100, 100)
            .setId(FGMIds.newWindowId())
            .onPress(FGMKernel.eventWindowClicked)
            .setPageId(FGMPageHandler.PAGE_ENUMS.FIXTURE_CONTROL);

        windowsForThisPage.programmerActions = newPageActionsWindow;

        return windowsForThisPage;
    }

    static hiddenInputDevices() {
        let windowsForThisPage = {};

        // Keyboard

        const inputKeyboard = new HCWKeyboardField('Keyboard', FGMIds.newComponentId())
            .onEnter(FGMKernel.eventKeyboardOnEnter)
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