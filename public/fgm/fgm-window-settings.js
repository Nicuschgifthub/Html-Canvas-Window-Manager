class FGMWindowSettings {

    static async openAndAwaitWindowSettings(targetWindow) {
        const { x, y, sx, sy } = HCWPositions.getMiddleUserFocusPosition(2);

        const targetContext = targetWindow.getContextField();

        const rowDefinitions = [
            {
                label: "Label",
                value: targetContext.getLabel(),
                setter: "setLabel",
                setterValueVerify: (newValue) => {
                    // return true or false if new value is valid
                }
            },
            {
                label: "Location ID",
                value: targetContext.getLocationId(),
                setter: "setLocationId",
                setterValueVerify: (newValue) => {
                    // return true or false if new value is valid
                }
            }
        ];

        const tableTitle = `Settings: ${targetContext.getLabel()}`;
        const tableField = new HCWTableField(tableTitle)
            .setLocationId(GLOBAL_CORE.CONTEXT_FIELDS.WINDOW_SETTINGS_MENU.LOCATION_ID)
            .setHeaders(["Attribute", "Value"])
            .setRows(rowDefinitions.map(def => [def.label, def.value]));

        const applyChange = (rowIndex, newValue) => {
            const definition = rowDefinitions[rowIndex];
            if (definition && definition.setter && typeof targetContext[definition.setter] === "function") {
                targetContext[definition.setter](newValue);
                console.log(`Applied ${newValue} via ${definition.setter}`);
            }
        };

        const settingsWindow = new HCWWindow()
            .setTouchZoneColor(GLOBAL_STYLES.FIELDS_GLOBAL.TEMP_TOUCH_ZONE_COLOR)
            .setPosition(x, y)
            .setSize(sx, sy)
            .setMinSizes(300, 400)
            .setContextField(tableField)
            .setPageId(GLOBAL_CORE.CONTEXT_FIELDS.WINDOW_SETTINGS_MENU.PAGE)
            .setId(GLOBAL_CORE.CONTEXT_FIELDS.WINDOW_SETTINGS_MENU.ID);

        HCWDB.addWindows([settingsWindow]);

        return {
            settingsWindow,
            applyChange
        };
    }

    static async settingsLoop(data) {
        const { settingsWindow, applyChange } = data;

        const { GlobalActionType, resolvedAction } = await GlobalInterrupter.waitForSome(
            GLOBAL_TYPES.ACTIONS.WINDOW.CLICKED,
            GLOBAL_TYPES.ACTIONS.BACKGROUND_CLICKED,
            GLOBAL_TYPES.ACTIONS.BACKGROUND_DRAG,
            GLOBAL_TYPES.ACTIONS.TABLE_UPDATES.CELL_PRESS
        );

        if (GlobalActionType == GLOBAL_TYPES.ACTIONS.WINDOW.CLICKED) {
            this.settingsLoop(data);
            return;
        }

        if (GlobalActionType !== GLOBAL_TYPES.ACTIONS.TABLE_UPDATES.CELL_PRESS) {
            FGMShowHandler.setPageCursor();
            HCWDB.removeWindowByWindowId(GLOBAL_CORE.CONTEXT_FIELDS.WINDOW_SETTINGS_MENU.ID);
            return;
        }

        if (rowIndex == 0) {
            this.settingsLoop(data);
            return;
        }

        // open keyboard
        console.log(resolvedAction)
    }

    static async windowEdgeClicked(window) {
        FGMShowHandler.setPageEmpty();

        const { settingsWindow, applyChange } = this.openAndAwaitWindowSettings(window);

        this.settingsLoop({ settingsWindow, applyChange });
    }
}