class FGMWindowManager {

    static _setupWindows(windows) {
        FGMShowHandler.getHCWClass().addWindows(windows);
    }

    static buildDefaultSetup(onlyReturnWindows = false) {

        const pagesMenu = new HCWPresetField("Pages", GI.MAIN_FUNCTIONS.PAGE_MENU.ID)
            .setLocationId(GI.MAIN_FUNCTIONS.PAGE_MENU.LOCATION_ID)
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

        const settingsMenu = new HCWPresetField("Config", GI.MAIN_FUNCTIONS.SETTINGS_MENU)
            .setLocationId(GI.MAIN_FUNCTIONS.SETTINGS_MENU.LOCATION_ID)
            .addPresets(
                new HCWPreset().setLabel("Status").setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR).setData({}),
                new HCWPreset().setLabel("ArtNet").setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR).setData({}),
                new HCWPreset().setLabel("Fixtures").setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR).setData({}),
            );

        const pageMenuWindow = new HCWWindow({ x: 0, y: 0, sx: 100, sy: 600 })
            .setPageId(GI.MAIN_FUNCTIONS.PAGE_MENU.PAGE).setMinSizes(100, 100).setId(Date.now() + 1).setContextField(pagesMenu);

        const settingsMenuWindow = new HCWWindow({ x: 100, y: 0, sx: 400, sy: 300 })
            .setPageId(GI.MAIN_FUNCTIONS.SETTINGS_MENU.PAGE).setMinSizes(100, 100).setId(Date.now() + 11).setContextField(settingsMenu);

        const windows = [pageMenuWindow, settingsMenuWindow];

        if (onlyReturnWindows) return windows;
        this._setupWindows(windows);
    }

    static createEncoderWheel() {

    }

    static openWindowAddMenu(data) {
        const { x, y, sx, sy } = data;

        // add Open Menu...
    }

}