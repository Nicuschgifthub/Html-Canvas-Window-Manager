class FGMWindowSettings {
    static async openAndAwaitWindowSettings(targetWindow) {
        const { x, y, sx, sy } = HCWPositions.getMiddleUserFocusPosition(1);
        const targetContext = targetWindow.getContextField();
        const currentType = targetContext.getType();

        const rawDefinitions = FGMBuildStructs.build('window-settings', { targetContext });

        rawDefinitions.forEach(def => {
            if (!def._isNumeric) return;

            const originalGetDMX = def.getValue;
            const originalSetDMX = def.setterFunction;
            const mode = FGMShowHandler.getValueTypeSettings();

            def.getValue = () => {
                const dmx = originalGetDMX();
                if (mode === GLOBAL_TYPES.DMX_VALUE_TYPE.DMX_BIT_8) {
                    return `${dmx} ${GLOBAL_TYPES.SYMBOLS.DMX_BIT_8}`;
                }
                if (mode === GLOBAL_TYPES.DMX_VALUE_TYPE.PERCENT) {
                    return `${Math.round((dmx / 255) * 100)} ${GLOBAL_TYPES.SYMBOLS.PERCENT}`;
                }
                return `${(dmx / 255).toFixed(3)} ${GLOBAL_TYPES.SYMBOLS.FLOAT}`;
            };

            def.getKeyboardValue = () => {
                const dmx = originalGetDMX();
                if (mode === GLOBAL_TYPES.DMX_VALUE_TYPE.DMX_BIT_8) return dmx.toString();
                if (mode === GLOBAL_TYPES.DMX_VALUE_TYPE.PERCENT) return Math.round((dmx / 255) * 100).toString();
                return (dmx / 255).toFixed(3);
            };

            def.setterFunction = (input) => {
                let cleanInput = String(input).replace(/[^\d.-]/g, '');
                let num = Number(cleanInput);
                let dmxOut;

                if (mode === GLOBAL_TYPES.DMX_VALUE_TYPE.DMX_BIT_8) {
                    dmxOut = num;
                } else if (mode === GLOBAL_TYPES.DMX_VALUE_TYPE.PERCENT) {
                    dmxOut = (num / 100) * 255;
                } else {
                    dmxOut = num * 255;
                }

                originalSetDMX(Math.min(Math.max(Math.round(dmxOut), 0), 255));
            };

            def.setterValueVerify = (input) => {
                let cleanInput = String(input).replace(/[^\d.-]/g, '');
                let num = Number(cleanInput);
                if (isNaN(num)) return { valid: false, infoText: "Must be a number" };

                if (mode === GLOBAL_TYPES.DMX_VALUE_TYPE.DMX_BIT_8 && (num < 0 || num > 255))
                    return { valid: false, infoText: "Range: 0-255" };
                if (mode === GLOBAL_TYPES.DMX_VALUE_TYPE.PERCENT && (num < 0 || num > 100))
                    return { valid: false, infoText: "Range: 0-100%" };
                if (mode === GLOBAL_TYPES.DMX_VALUE_TYPE.FLOAT && (num < 0 || num > 1))
                    return { valid: false, infoText: "Range: 0.0-1.0" };

                return { valid: true, infoText: "" };
            };
        });

        const rowDefinitions = rawDefinitions.filter(def => {
            if (!def._forContextTypeOnly) return true;
            if (Array.isArray(def._forContextTypeOnly)) return def._forContextTypeOnly.includes(currentType);
            return def._forContextTypeOnly === currentType;
        });

        const tableTitle = `Settings: ${targetContext.getLabel()}`;
        const tableField = new HCWTableField(tableTitle)
            .setLocationId(GLOBAL_CORE.CONTEXT_FIELDS.WINDOW_SETTINGS_MENU.LOCATION_ID)
            .setHeaders(["Attribute", "Value"])
            .setRows(rowDefinitions.map(def => [def.label, def.getValue()]))
            .setButtonAddRowLabel(`Delete \"${targetContext.getLabel()}\" window`)
            .setButtonAddRowLabelBGColor(GLOBAL_STYLES.INFO.DANGER);

        const settingsWindow = new HCWWindow()
            .setTouchZoneColor(GLOBAL_STYLES.FIELDS_GLOBAL.TEMP_TOUCH_ZONE_COLOR)
            .setPosition(x, y)
            .setSize(sx, sy)
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
            GLOBAL_TYPES.ACTIONS.TABLE_UPDATES.CELL_PRESS,
            GLOBAL_TYPES.ACTIONS.TABLE_UPDATES.CELL_ADD
        );

        if (GlobalActionType == GLOBAL_TYPES.ACTIONS.WINDOW.CLICKED) return this.settingsLoop(data);

        if (GlobalActionType !== GLOBAL_TYPES.ACTIONS.TABLE_UPDATES.CELL_PRESS) {
            if (GlobalActionType == GLOBAL_TYPES.ACTIONS.TABLE_UPDATES.CELL_ADD) {
                HCWDB.removeWindowByWindowId(targetWindow.getId());
            }
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
                        .setInitialValue(definition.getKeyboardValue ? definition.getKeyboardValue() : definition.getValue())
                        .setVerify(definition.setterValueVerify)
                        .onEnter((newValue) => {
                            if (definition.setterFunction) {
                                definition.setterFunction(newValue);
                            }
                        })
                );

                if (result !== null) {
                    settingsWindow.getContextField().setRows(
                        rowDefinitions.map(def => [def.label, def.getValue()])
                    );
                    settingsWindow.getContextField().setButtonAddRowLabel(`Delete \"${targetContext.getLabel()}\" window`);
                }
            } catch (e) {
                console.error("Keyboard Interaction Error:", e);
            } finally {
                FGMShowHandler.setPageEmpty();
                settingsWindow.setHidden(false);
                HCWRender.updateFrame();
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