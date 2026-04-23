class FGMWindowSettings {

    static async openAndAwaitWindowSettings(targetWindow) {
        const { x, y, sx, sy } = HCWPositions.getMiddleUserFocusPosition(2);
        const targetContext = targetWindow.getContextField();

        const rowDefinitions = [
            {
                label: "Label",
                value: targetContext.getLabel(),
                setter: "setLabel",
                isReadOnly: false,
                setterValueVerify: (newValue) => {
                    const val = newValue.trim();
                    if (val.length === 0) return { valid: false, infoText: "Label cannot be empty" };
                    if (val.length > 20) return { valid: false, infoText: "Label is too long" };
                    return { valid: true, infoText: "" };
                }
            },
            {
                label: "Location ID",
                value: targetContext.getLocationId(),
                setter: "setLocationId",
                isReadOnly: false,
                setterValueVerify: (newValue) => {
                    const val = newValue.toString().trim();
                    const pattern = /^[1-9]\.\d{3}$/;

                    if (!pattern.test(val)) {
                        return { valid: false, infoText: "Format Error: Use X.XXX" };
                    }

                    const exists = HCWDB.getContextFieldByLocationId(val);
                    if (exists && exists !== targetContext) {
                        return { valid: false, infoText: `ID ${val} used by "${exists.getLabel()}"` };
                    }

                    return { valid: true, infoText: "" };
                }
            },
            {
                label: "Type",
                value: targetContext.getType(),
                isReadOnly: true
            }
        ];

        const tableTitle = `Settings: ${targetContext.getLabel()}`;
        const tableField = new HCWTableField(tableTitle)
            .setLocationId(GLOBAL_CORE.CONTEXT_FIELDS.WINDOW_SETTINGS_MENU.LOCATION_ID)
            .setHeaders(["Attribute", "Value"])
            .setRows(rowDefinitions.map(def => [def.label, def.value]));

        const settingsWindow = new HCWWindow()
            .setTouchZoneColor(GLOBAL_STYLES.FIELDS_GLOBAL.TEMP_TOUCH_ZONE_COLOR)
            .setPosition(x, y)
            .setSize(sx, sy)
            .setMinSizes(300, 400)
            .setContextField(tableField)
            .setPageId(GLOBAL_CORE.CONTEXT_FIELDS.WINDOW_SETTINGS_MENU.PAGE)
            .setId(GLOBAL_CORE.CONTEXT_FIELDS.WINDOW_SETTINGS_MENU.ID);

        HCWDB.addWindows([settingsWindow]);

        return { settingsWindow, rowDefinitions, targetWindow };
    }

    static async settingsLoop(data) {
        const { settingsWindow, rowDefinitions, targetWindow } = data;
        const targetContext = targetWindow.getContextField();

        if (!HCWDB.getWindowById(settingsWindow.getId())) return;

        const { GlobalActionType, resolvedAction } = await GlobalInterrupter.waitForSome(
            GLOBAL_TYPES.ACTIONS.WINDOW.CLICKED,
            GLOBAL_TYPES.ACTIONS.BACKGROUND_CLICKED,
            GLOBAL_TYPES.ACTIONS.BACKGROUND_DRAG,
            GLOBAL_TYPES.ACTIONS.TABLE_UPDATES.CELL_PRESS
        );

        if (GlobalActionType == GLOBAL_TYPES.ACTIONS.WINDOW.CLICKED) return this.settingsLoop(data);

        if (GlobalActionType !== GLOBAL_TYPES.ACTIONS.TABLE_UPDATES.CELL_PRESS) {
            FGMShowHandler.setPageCursor();
            HCWDB.removeWindowByWindowId(settingsWindow.getId());
            HCWRender.updateFrame();
            return;
        }

        const { rowIndex, colIndex } = resolvedAction;
        const definition = rowDefinitions[rowIndex];

        if (colIndex === 1 && definition && !definition.isReadOnly) {
            settingsWindow.setHidden(true);
            FGMShowHandler.setPageEmpty();
            HCWRender.updateFrame();

            try {
                const result = await FGMKeyboardInteraction.openKeyboard(
                    FGMKeyboardInteractionSettings.create()
                        .setLabel(`Edit ${definition.label}`)
                        .setInitialValue(definition.value)
                        .setVerify(definition.setterValueVerify)
                        .onEnter((newValue) => {
                            if (typeof targetContext[definition.setter] === "function") {
                                targetContext[definition.setter](newValue);
                                definition.value = newValue;
                            }
                        })
                );

                if (result !== null) {
                    settingsWindow.getContextField().setRows(
                        rowDefinitions.map(def => [def.label, def.value])
                    );
                }
            } catch (e) {
                console.error("Keyboard Interaction Error:", e);
            } finally {
                FGMShowHandler.setPageEmpty();
                settingsWindow.setHidden(false);
                HCWRender.updateFrame();
            }
        } else {
            if (definition?.isReadOnly) {
                console.log(`Attribute "${definition.label}" is read-only.`);
            }
        }

        return this.settingsLoop(data);
    }

    static async windowEdgeClicked(window) {
        FGMShowHandler.setPageEmpty();
        const data = await this.openAndAwaitWindowSettings(window);
        this.settingsLoop(data);
    }
}