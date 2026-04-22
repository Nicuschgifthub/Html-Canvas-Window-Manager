class FGMWindowManager {

    static _setupWindows(windows) {
        HCWDB.addWindows(windows);
    }

    static buildDefaultSetup(onlyReturnWindows = false) {

        const pagesMenu = new HCWPresetField("Pages")
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

        const settingsMenu = new HCWPresetField("Config")
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
        const windowTypes = [
            { label: "Fader", key: "fader" },
            { label: "Color Picker", key: "colorMap" },
            { label: "Encoder", key: "encoder" },
            { label: "Presets", key: "presetGroup" }
        ];

        const windowMenu = new HCWPresetField("Add Window")
            .setLocationId(GC.CONTEXT_FIELDS.ADD_WINDOW_MENU.LOCATION_ID)
            .addPresets(
                ...windowTypes.map(type =>
                    new HCWPreset()
                        .setLabel(type.label)
                        .setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR)
                        .setData({ _contextAdd: type.key })
                )
            );

        const pageMenuWindow = new HCWWindow({ x: 100, y: 0, sx: 400, sy: 400 })
            .setTouchZoneColor(GLOBAL_STYLES.FIELDS_GLOBAL.TEMP_TOUCH_ZONE_COLOR)
            .setPageId(GLOBAL_CORE.DEFS.PAGES.EMPTY)
            .setMinSizes(GLOBAL_CORE.DEFS.WINDOW.SIZE.MIN_SIZEXY, GLOBAL_CORE.DEFS.WINDOW.SIZE.MIN_SIZEXY)
            .setId(GC.CONTEXT_FIELDS.ADD_WINDOW_MENU.ID)
            .setContextField(windowMenu);

        return pageMenuWindow;
    }

    static getNewContext(type, windowId, locationId) {
        let newContext = null;

        const contexts = {
            fader() {
                return new HCWFaderField(`Fader ${locationId}`).setFloat(0).setLocationId(locationId);
            },
            encoder() {
                return new HCWEncoderField(`Encoder ${locationId}`).setFloats(0, 0).setLocationId(locationId);
            },
            colorMap() {
                return new HCWColorMapField(`ColorMap ${locationId}`).setLocationId(locationId);
            },
            presetGroup() {
                return new HCWPresetField(`Presets ${locationId}`).setLocationId(locationId).addPresets(
                    ...Array.from({ length: 50 }, (_, i) =>
                        new HCWPreset()
                            .setLabel(`Preset ${i + 1}`)
                            .setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR)
                            .setData({ _presetNumber: i })
                    )
                )
            }
        }

        newContext = contexts[type]();

        return new HCWWindow({ x: 0, y: 0, sx: 100, sy: 100 })
            .setMinSizes(GLOBAL_CORE.DEFS.WINDOW.SIZE.MIN_SIZEXY, GLOBAL_CORE.DEFS.WINDOW.SIZE.MIN_SIZEXY)
            .setId(windowId)
            .setContextField(newContext);
    }

    static async createNewWindowByUserInput(data) {
        const { x, y, sx, sy } = data;
        const currentPageCursor = FGMShowHandler.getPageCursor();

        FGMShowHandler.setPageEmpty();

        const menuWindow = this.buildWindowAddMenu();

        menuWindow.setPosition(x, y);
        menuWindow.setSize(sx, sy);

        HCWDB.addWindows([menuWindow]);

        const { GlobalActionType, resolvedAction } = await GlobalInterrupter.waitForSome(
            GLOBAL_TYPES.ACTIONS.PRESET_PRESS,
            GLOBAL_TYPES.ACTIONS.BACKGROUND_CLICKED,
            GLOBAL_TYPES.ACTIONS.BACKGROUND_DRAG);

        HCWDB.removeWindowByWindowId(menuWindow.getId());

        if (GlobalActionType == GLOBAL_TYPES.ACTIONS.BACKGROUND_DRAG) { // refire itself if new drag
            this.createNewWindowByUserInput(resolvedAction);
            return;
        }

        if (GlobalActionType !== GLOBAL_TYPES.ACTIONS.PRESET_PRESS) {
            FGMShowHandler.setPageCursor();
            return;
        }

        const locationId = HCWDB.generateNextLocationId();
        const windowId = HCWDB.generateNextWindowId();

        const newWindow = this.getNewContext(resolvedAction.presetData._contextAdd, windowId, locationId);

        newWindow.setPageId(currentPageCursor);
        newWindow.setPosition(x, y);
        newWindow.setSize(sx, sy);

        HCWDB.addWindows([newWindow]);

        FGMShowHandler.setPageCursor();
    }
}