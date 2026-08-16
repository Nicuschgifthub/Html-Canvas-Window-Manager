class FGMWindowManager {

    static buildDefaultSetup(onlyReturnWindows = false) {
        const windows = [this._getPageMenu(), this._getSettingsMenu()];

        if (onlyReturnWindows) return windows;
        this._setupWindows(windows);
    }

    static _setupWindows(windows) {
        HCWDB.addWindows(windows);
    }

    static _getPageMenu(returnContextOnly = false) {
        return FGMBuildStructs.build('window-page-menu');
    }

    static _getSettingsMenu(returnContextOnly = false) {
        return FGMBuildStructs.build('window-config-menu');
    }

    static buildWindowAddMenu() {
        return FGMBuildStructs.build('window-add-menu');
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
            xyPad() {
                windowBuildValues.sx = 400;
                windowBuildValues.sy = 300;
                windowBuildValues.minSizeX = 400;
                windowBuildValues.minSizeY = 300;
                return new HCWXYPadField(`Pan/Tilt ${locationId}`).setLocationId(locationId);
            },
            encoder() {
                return new HCWEncoderField(`Encoder ${locationId}`).setFloats(0, 0).setLocationId(locationId);
            },
            customEncoder() {
                windowBuildValues.sx = 200;
                windowBuildValues.sy = 200;
                windowBuildValues.minSizeX = 150;
                windowBuildValues.minSizeY = 150;
                return new HCWCustomEncoderField(`Custom Wheel ${locationId}`).setLocationId(locationId);
            },
            keyboard() {
                windowBuildValues.sx = 500;
                windowBuildValues.sy = 300;
                windowBuildValues.minSizeX = 400;
                windowBuildValues.minSizeY = 250;
                return new HCWKeyboardField(`Keyboard ${locationId}`).setLocationId(locationId);
            },
            number() {
                windowBuildValues.sx = 300;
                windowBuildValues.sy = 350;
                windowBuildValues.minSizeX = 200;
                windowBuildValues.minSizeY = 250;
                return new HCWNumberField(`Numpad ${locationId}`).setLocationId(locationId);
            },
            table() {
                windowBuildValues.sx = 400;
                windowBuildValues.sy = 300;
                windowBuildValues.minSizeX = 300;
                windowBuildValues.minSizeY = 200;
                return new HCWTableField(`Table ${locationId}`).setLocationId(locationId).setHeaders(["Channel", "Value"]).setRows([["1", "255"], ["2", "128"]]);
            },
            search() {
                windowBuildValues.sx = 300;
                windowBuildValues.sy = 150;
                windowBuildValues.minSizeX = 200;
                windowBuildValues.minSizeY = 100;
                return new HCWSearchField(`Search ${locationId}`).setLocationId(locationId);
            },
            sequenceEditor() {
                windowBuildValues.sx = 500;
                windowBuildValues.sy = 300;
                windowBuildValues.minSizeX = 350;
                windowBuildValues.minSizeY = 200;
                return new HCWSequenceEditorField(`Sequence ${locationId}`).setLocationId(locationId);
            },
            colorMap() {
                windowBuildValues.sx = 400;
                windowBuildValues.sy = 400;
                windowBuildValues.minSizeX = 400;
                windowBuildValues.minSizeY = 400;
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
                );
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
        const { x, y, sx, sy } = HCWGridSnap.snapBox(data);
        const currentPageCursor = FGMShowHandler.getPageCursor();

        FGMShowHandler.setPageEmpty();

        const menuWindow = this.buildWindowAddMenu();
        menuWindow.setPosition(x, y);
        menuWindow.setSize(sx, sy);

        HCWDB.addWindowAndResolveCollisions(menuWindow);

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
            console.log("Window removed as new same window created");
            HCWDB.removeWindowByWindowId(existWindow.getId());
        }

        const existContext = HCWDB.getContextFieldByLocationId(newWindow.getContextField().getLocationId());

        if (existContext) {
            console.log("Context removed as new same context created");
            HCWDB.removeWindowByLocationId(existContext.getLocationId());
        }

        if (newWindow.getPageId() == null) newWindow.setPageId(currentPageCursor);
        newWindow.setPosition(x, y);
        newWindow.setSize(sx, sy);

        HCWDB.addWindowAndResolveCollisions(newWindow);

        FGMShowHandler.setPageCursor();
        HCWWindow.resolveCollisions(newWindow);
    }
}