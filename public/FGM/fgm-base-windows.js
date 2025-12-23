class FGMBaseWindows {
    static pageView(pageCount = 10, windowId = FGMIds.newWindowId(), presetId = FGMIds.newComponentId()) {
        const pageField = new HCWPresetField('Pages', presetId)
            .onPresetPress(FGMKernel.eventPresetClicked)

        pageField.addPreset(new HCWPreset(`Setup`).setDefaultColor(FGMColors.PAGES.MENUS.SETUP).setData({ _goToPage: FGMPageHandler.PAGE_ENUMS.SETUP }));
        pageField.addPreset(new HCWPreset(`IN&OUT`).setDefaultColor(FGMColors.PAGES.MENUS.IN_OUT).setData({ _goToPage: FGMPageHandler.PAGE_ENUMS.LINK_SETTINGS }));
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
            .setFGMType(FGMTypes.PROGRAMMER.POSITION.PAN_16Bit)

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
            .setFGMType(FGMTypes.PROGRAMMER.POSITION.TILT_16Bit)

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
            .addPreset(new HCWPreset("Store").setDefaultColor(FGMColors.PAGES.BACKGROUND).setData({ _programmerAction: FGMTypes.ACTIONS.BUTTON.STORE }))
            .addPreset(new HCWPreset("Clear Fixture atr.").setDefaultColor(FGMColors.PAGES.BACKGROUND).setData({ _programmerAction: FGMTypes.ACTIONS.BUTTON.CLEAR_FIXTURE_VALUE_OVERWRITE }))
            .addPreset(new HCWPreset("Clear All").setDefaultColor(FGMColors.PAGES.BACKGROUND).setData({ _programmerAction: FGMTypes.ACTIONS.BUTTON.CLEAR_ALL }))
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

        const inputKeyboard = new HCWKeyboardField('Keyboard 1', FGMIds.newComponentId())
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