class FGMBaseWindows {
    static pageView(pageCount = 10, windowId = FGMIds.newWindowId(), presetId = FGMIds.newComponentId()) {
        const pageField = new HCWPresetField('Pages', presetId)
            .onPresetPress(FGMKernel.eventPresetClicked)

        pageField.addPreset(`Setup`, null, FGMColors.PAGES.MENUS.SETUP, { _goToPage: FGMPageHandler.PAGE_ENUMS.SETUP }, FGMIds.getNewId());
        pageField.addPreset(`IN&OUT`, null, FGMColors.PAGES.MENUS.IN_OUT, { _goToPage: FGMPageHandler.PAGE_ENUMS.LINK_SETTINGS }, FGMIds.getNewId());
        pageField.addPreset(`Fixture Cnt.`, null, FGMColors.PAGES.MENUS.FIXTURE_CONTROL, { _goToPage: FGMPageHandler.PAGE_ENUMS.FIXTURE_CONTROL }, FGMIds.getNewId());

        for (let i = 0; i < pageCount; i++) {
            pageField.addPreset(`Page ${i}`, null, FGMColors.PAGES.BACKGROUND, { _goToPage: i }, FGMIds.getNewId());
        }

        const newWindow = new HCWWindow(0, 0, 50, 400)
            .setTouchZoneColor(FGMColors.TOUCHZONE.BACKGROUND)
            .addContextField(pageField)
            .setId(windowId)
            .setPageId(null);

        pageField.setParentWindow(newWindow);

        return newWindow;
    }

    static setupPage() {
        return
    }

    static inOut() {

    }

    static fixtureControl() {
        let windowsForThisPage = [];

        const dimFader = new HCWFaderField('Dimmer', FGMIds.newComponentId())
            .setDisplayType("byte")
            .onValueChange(FGMKernel.eventFaderUpdate)
            .setFGMFaderType(FGMTypes.PROGRAMMER.DIMMERS.MAIN)

        const newFaderWindow = new HCWWindow(0, 500, 50, 400)
            .setTouchZoneColor(FGMColors.TOUCHZONE.BACKGROUND)
            .addContextField(dimFader)
            .setHidden(true)
            .setId(FGMIds.newWindowId())
            .setPageId(FGMPageHandler.PAGE_ENUMS.FIXTURE_CONTROL);


        dimFader.setParentWindow(newFaderWindow);

        windowsForThisPage.dimFader = newFaderWindow;

        return windowsForThisPage;
    }
}