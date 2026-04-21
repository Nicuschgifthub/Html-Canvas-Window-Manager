class FGMWindowManager {

    static _setupWindows(windows) {
        FGMShowHandler.getHCWClass().addWindows(windows);
    }

    static buildDefaultSetup(onlyReturnWindows = false) {

        const pagesMenu = new HCWPresetField("Pages",)
            .setLocationId(GC.CONTEXT_FIELDS.PAGE_MENU.LOCATION_ID)
            .addPresets(
                new HCWPreset().setLabel("Menu").setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR).setData({ _pageChangeTo: 0 }),
                new HCWPreset().setLabel("Page 1").setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR).setData({ _pageChangeTo: 1 }),
                new HCWPreset().setLabel("Page 2").setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR).setData({ _pageChangeTo: 2 }),
                new HCWPreset().setLabel("Page 3").setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR).setData({ _pageChangeTo: 3 }),
                new HCWPreset().setLabel("Page 4").setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR).setData({ _pageChangeTo: 4 }),
                new HCWPreset().setLabel("Page 5").setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR).setData({ _pageChangeTo: 5 }),
                new HCWPreset().setLabel("Page 6").setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR).setData({ _pageChangeTo: 6 }),
                new HCWPreset().setLabel("Page 7").setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR).setData({ _pageChangeTo: 7 }),
                new HCWPreset().setLabel("Page 8").setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR).setData({ _pageChangeTo: 8 }),
                new HCWPreset().setLabel("Page 9").setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR).setData({ _pageChangeTo: 9 }),
                new HCWPreset().setLabel("Page 10").setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR).setData({ _pageChangeTo: 10 }),
            );

        const settingsMenu = new HCWPresetField("Config", GC.CONTEXT_FIELDS.SETTINGS_MENU)
            .setLocationId(GC.CONTEXT_FIELDS.SETTINGS_MENU.LOCATION_ID)
            .addPresets(
                new HCWPreset().setLabel("Status").setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR).setData({}),
                new HCWPreset().setLabel("ArtNet").setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR).setData({}),
                new HCWPreset().setLabel("Fixtures").setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR).setData({}),
            );

        const pageMenuWindow = new HCWWindow({ x: 0, y: 0, sx: 100, sy: 600 })
            .setPageId(GC.CONTEXT_FIELDS.PAGE_MENU.PAGE)
            .setMinSizes(GLOBAL_CORE.DEFS.WINDOW.SIZE.MIN_SIZEXY, GLOBAL_CORE.DEFS.WINDOW.SIZE.MIN_SIZEXY)
            .setId(GC.CONTEXT_FIELDS.PAGE_MENU.ID)
            .setContextField(pagesMenu);

        const settingsMenuWindow = new HCWWindow({ x: 100, y: 0, sx: 400, sy: 300 })
            .setPageId(GC.CONTEXT_FIELDS.SETTINGS_MENU.PAGE)
            .setMinSizes(GLOBAL_CORE.DEFS.WINDOW.SIZE.MIN_SIZEXY, GLOBAL_CORE.DEFS.WINDOW.SIZE.MIN_SIZEXY)
            .setId(Date.now() + 11)
            .setContextField(settingsMenu);

        const windows = [pageMenuWindow, settingsMenuWindow];

        if (onlyReturnWindows) return windows;
        this._setupWindows(windows);
    }

    static createEncoderWheel() {

    }

    static buildWindowAddMenu() {
        const windowMenu = new HCWPresetField("Add Window")
            .setLocationId(GC.CONTEXT_FIELDS.ADD_WINDOW_MENU.LOCATION_ID)
            .addPresets(
                new HCWPreset().setLabel("Fader").setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR).setData({ _UN_: 0 }),
                new HCWPreset().setLabel("Dimmer Presets").setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR).setData({ _UN_: 0 }),
                new HCWPreset().setLabel("FGroup Presets").setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR).setData({ _UN_: 0 }),
                new HCWPreset().setLabel("RGBW Presets").setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR).setData({ _UN_: 0 }),
                new HCWPreset().setLabel("Position Presets").setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR).setData({ _UN_: 0 }),
            );

        const pageMenuWindow = new HCWWindow({ x: 100, y: 0, sx: 400, sy: 400 })
            .setTouchZoneColor(GLOBAL_STYLES.FIELDS.PRESET_GROUP.TEMP_COLOR)
            .setPageId(GLOBAL_CORE.DEFS.PAGES.EMPTY)
            .setMinSizes(GLOBAL_CORE.DEFS.WINDOW.SIZE.MIN_SIZEXY, GLOBAL_CORE.DEFS.WINDOW.SIZE.MIN_SIZEXY)
            .setId(GC.CONTEXT_FIELDS.PAGE_MENU.ID)
            .setContextField(windowMenu);

        return pageMenuWindow;
    }

    static async openWindowAddMenu(data) {
        const { x, y, sx, sy } = data;
        const currentPageCursor = FGMShowHandler.getPageCursor();

        FGMShowHandler.setPageCursor(GLOBAL_CORE.DEFS.PAGES.EMPTY);

        const menuWindow = this.buildWindowAddMenu();

        const windowAddMenuId = menuWindow.getId();

        FGMShowHandler.getHCWClass().addWindows([menuWindow]);

        const clickedPresetResult = await GlobalInterrupter.waitFor(GLOBAL_TYPES.ACTIONS.PRESET_PRESS);

        // Removing not working and page reset issues, bug when in menu creating a new drag box for another menu like it

        HCWDB.removeWindowByWindowId(windowAddMenuId);

        console.log("nn", currentPageCursor)

        //  FGMShowHandler.setPageCursor(currentPageCursor);

    }

}