class FGMWindowManager {

    static _setupWindows(windows) {
        HCWDB.addWindows(windows);
    }

    static _getPageMenu(returnContextOnly = false) {
        const pagesMenu = new HCWPresetField("Pages")
            .setLocationId(GC.CONTEXT_FIELDS.PAGE_MENU.LOCATION_ID)
            .addPresets(
                new HCWPreset().setLabel("Menu").setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR).setData({ _pageChangeTo: 0 }),
                ...Array.from({ length: 50 }, (_, i) =>
                    new HCWPreset()
                        .setLabel(`Page ${i + 1}`)
                        .setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR)
                        .setData({ _pageChangeTo: i + 1 })
                ));

        return new HCWWindow({ x: 0, y: 0, sx: 100, sy: 600 })
            .setPageId(GC.CONTEXT_FIELDS.PAGE_MENU.PAGE)
            .setMinSizes(GLOBAL_CORE.DEFS.WINDOW.SIZE.MIN_SIZEXY, GLOBAL_CORE.DEFS.WINDOW.SIZE.MIN_SIZEXY)
            .setId(GC.CONTEXT_FIELDS.PAGE_MENU.ID)
            .setContextField(pagesMenu);
    }

    static _getSettingsMenu(returnContextOnly = false) {
        const settingsMenu = new HCWPresetField("Config")
            .setLocationId(GC.CONTEXT_FIELDS.SETTINGS_MENU.LOCATION_ID)
            .addPresets(
                new HCWPreset().setLabel("Status").setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR).setData({}),
                new HCWPreset().setLabel("ArtNet").setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR).setData({}),
                new HCWPreset().setLabel("Fixtures").setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR).setData({}),
            );

        return new HCWWindow({ x: 100, y: 0, sx: 400, sy: 300 })
            .setPageId(GC.CONTEXT_FIELDS.SETTINGS_MENU.PAGE)
            .setMinSizes(GLOBAL_CORE.DEFS.WINDOW.SIZE.MIN_SIZEXY, GLOBAL_CORE.DEFS.WINDOW.SIZE.MIN_SIZEXY)
            .setId(GLOBAL_CORE.CONTEXT_FIELDS.SETTINGS_MENU.ID)
            .setContextField(settingsMenu);
    }

    static buildDefaultSetup(onlyReturnWindows = false) {
        const windows = [this._getPageMenu(), this._getSettingsMenu()];

        if (onlyReturnWindows) return windows;
        this._setupWindows(windows);
    }

    static buildWindowAddMenu() {
        const windowTypes = [
            { label: "Fader", key: "fader" },
            { label: "Color Picker", key: "colorMap" },
            { label: "Encoder", key: "encoder" },
            { label: "Presets", key: "presetGroup" },
            { label: "Page Menu", key: "pageMenu" },
            { label: "Settings Menu", key: "settingsMenu" }
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

        let windowBuildValues = {
            sx: GLOBAL_CORE.DEFS.WINDOW.SIZE.MIN_SIZEXY,
            sy: GLOBAL_CORE.DEFS.WINDOW.SIZE.MIN_SIZEXY,
            minSizeX: GLOBAL_CORE.DEFS.WINDOW.SIZE.MIN_SIZEXY,
            minSizeY: GLOBAL_CORE.DEFS.WINDOW.SIZE.MIN_SIZEXY
        }

        const contexts = {
            fader() {
                return new HCWFaderField(`Fader ${locationId}`).setFloat(0).setLocationId(locationId);
            },
            encoder() {
                return new HCWEncoderField(`Encoder ${locationId}`).setFloats(0, 0).setLocationId(locationId);
            },
            colorMap() {
                windowBuildValues.sx = 200;
                windowBuildValues.sy = 200;
                windowBuildValues.minSizeX = 200;
                windowBuildValues.minSizeY = 200;
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
            },
            pageMenu() {
                return FGMWindowManager._getPageMenu();
            },
            settingsMenu() {
                return FGMWindowManager._getSettingsMenu();
            }
        }

        newContext = contexts[type]();

        if (newContext.type && newContext.type == GLOBAL_TYPES.WINDOW.TYPE) {
            return newContext;
        }

        return new HCWWindow({ x: 0, y: 0, sx: windowBuildValues.sx, sy: windowBuildValues.sy })
            .setMinSizes(GLOBAL_CORE.DEFS.WINDOW.SIZE.MIN_SIZEXY, GLOBAL_CORE.DEFS.WINDOW.SIZE.MIN_SIZEXY)
            .setMinSizes(windowBuildValues.minSizeX, windowBuildValues.minSizeY)
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
            GLOBAL_TYPES.ACTIONS.BACKGROUND_DRAG,
            GLOBAL_TYPES.ACTIONS.WINDOW.CLICKED
        );

        HCWDB.removeWindowByWindowId(menuWindow.getId());

        if (GlobalActionType == GLOBAL_TYPES.ACTIONS.BACKGROUND_DRAG) {
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

        const existWindow = HCWDB.getWindowById(newWindow.getId());

        if (existWindow) {
            console.log("Window removed as new same window created")
            HCWDB.removeWindowByWindowId(existWindow.getId())
        }

        const existContext = HCWDB.getContextFieldByLocationId(newWindow.getContextField().getLocationId());

        if (existContext) {
            console.log("Context removed as new same context created")
            HCWDB.removeWindowByLocationId(existContext.getLocationId())
        }

        if (newWindow.getPageId() == null) newWindow.setPageId(currentPageCursor);
        newWindow.setPosition(x, y);
        newWindow.setSize(sx, sy);

        HCWDB.addWindows([newWindow]);

        FGMShowHandler.setPageCursor();
    }
}