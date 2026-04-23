class FGMWindowSettings {
    static async openAndAwaitWindowSettings(targetWindow) {
        const { x, y, sx, sy } = HCWPositions.getMiddleUserFocusPosition(2);
        const targetContext = targetWindow.getContextField();
        const currentType = targetContext.getType();

        const rawDefinitions = [
            {
                label: "Label",
                getValue: () => targetContext.getLabel(),
                setterFunction: (value) => targetContext.setLabel(value),
                isReadOnly: false,
                setterValueVerify: (newValue) => {
                    const val = newValue.trim();
                    if (val.length === 0) return { valid: false, infoText: "Label cannot be empty" };
                    if (val.length > 20) return { valid: false, infoText: "Label cannot be longer than 20 chars" };
                    return { valid: true, infoText: "" };
                }
            },
            {
                label: "Location ID",
                getValue: () => targetContext.getLocationId(),
                setterFunction: (value) => targetContext.setLocationId(value),
                isReadOnly: targetContext.getLocationId().startsWith("0"),
                setterValueVerify: (newValue) => {
                    const val = newValue.toString().trim();
                    const pattern = /^[1-9]\.\d{3}$/;
                    if (!pattern.test(val)) return { valid: false, infoText: "Format Error: Use X.XXX" };
                    const exists = HCWDB.getContextFieldByLocationId(val);
                    if (exists && exists !== targetContext) return { valid: false, infoText: `ID ${val} used by "${exists.getLabel()}"` };
                    return { valid: true, infoText: "" };
                }
            },
            {
                label: "Fader Value",
                _useFloatLogic: true,
                getValue: () => targetContext.getFloat(),
                _forContextTypeOnly: GLOBAL_TYPES.CONTEXT_FIELDS.FADER,
                setterFunction: (v) => targetContext.setFloat(v)
            },
            {
                label: "Outer Value (V1)",
                _useFloatLogic: true,
                getValue: () => targetContext.value,
                _forContextTypeOnly: GLOBAL_TYPES.CONTEXT_FIELDS.ENCODER,
                setterFunction: (v) => targetContext.setFloats(v)
            },
            {
                label: "Inner Value (V2)",
                _useFloatLogic: true,
                getValue: () => targetContext.value2,
                _forContextTypeOnly: GLOBAL_TYPES.CONTEXT_FIELDS.ENCODER,
                setterFunction: (v) => targetContext.setFloats(targetContext.value, v)
            },
            // Hue, Sat, Brightness (Natural: Float)
            { label: "Hue", _useFloatLogic: true, _forContextTypeOnly: GLOBAL_TYPES.CONTEXT_FIELDS.COLOR_MAP_INPUT, getValue: () => targetContext.h, setterFunction: (v) => { targetContext.h = v; targetContext._trigger(); } },
            { label: "Saturation", _useFloatLogic: true, _forContextTypeOnly: GLOBAL_TYPES.CONTEXT_FIELDS.COLOR_MAP_INPUT, getValue: () => targetContext.s, setterFunction: (v) => { targetContext.s = v; targetContext._trigger(); } },
            { label: "Brightness (V)", _useFloatLogic: true, _forContextTypeOnly: GLOBAL_TYPES.CONTEXT_FIELDS.COLOR_MAP_INPUT, getValue: () => targetContext.v, setterFunction: (v) => { targetContext.v = v; targetContext._trigger(); } },
            // RGB & Extra LEDs (Natural: DMX 0-255)
            { label: "Red", _useDmxLogic: true, _forContextTypeOnly: GLOBAL_TYPES.CONTEXT_FIELDS.COLOR_MAP_INPUT, getValue: () => targetContext.getColors().r, setterFunction: (v) => { targetContext.setColor({ r: v }); targetContext._trigger(); } },
            { label: "Green", _useDmxLogic: true, _forContextTypeOnly: GLOBAL_TYPES.CONTEXT_FIELDS.COLOR_MAP_INPUT, getValue: () => targetContext.getColors().g, setterFunction: (v) => { targetContext.setColor({ g: v }); targetContext._trigger(); } },
            { label: "Blue", _useDmxLogic: true, _forContextTypeOnly: GLOBAL_TYPES.CONTEXT_FIELDS.COLOR_MAP_INPUT, getValue: () => targetContext.getColors().b, setterFunction: (v) => { targetContext.setColor({ b: v }); targetContext._trigger(); } },
            { label: "White LED", _useDmxLogic: true, _forContextTypeOnly: GLOBAL_TYPES.CONTEXT_FIELDS.COLOR_MAP_INPUT, getValue: () => targetContext.extra.white, setterFunction: (v) => { targetContext.setColor({ white: v }); targetContext._trigger(); } },
            { label: "Amber LED", _useDmxLogic: true, _forContextTypeOnly: GLOBAL_TYPES.CONTEXT_FIELDS.COLOR_MAP_INPUT, getValue: () => targetContext.extra.amber, setterFunction: (v) => { targetContext.setColor({ amber: v }); targetContext._trigger(); } },
            { label: "UV LED", _useDmxLogic: true, _forContextTypeOnly: GLOBAL_TYPES.CONTEXT_FIELDS.COLOR_MAP_INPUT, getValue: () => targetContext.extra.uv, setterFunction: (v) => { targetContext.setColor({ uv: v }); targetContext._trigger(); } },
            {
                label: "Type",
                getValue: () => currentType,
                isReadOnly: true
            }
        ];

        rawDefinitions.forEach(def => {
            if (!def._useFloatLogic && !def._useDmxLogic) return;

            const originalGet = def.getValue;
            const originalSet = def.setterFunction;
            const mode = FGMShowHandler.getValueTypeSettings();

            // 1. Ensure we always have a 0.0 - 1.0 float for calculations
            const getNormalizedFloat = () => {
                const val = originalGet();
                // If it's DMX logic, the internal value is 0-255, so convert to 0-1


                if (def._useDmxLogic) {
                    console.log("Dmx to flaot ", val)
                    return DMXHelper.dmxToFloat(val);
                }

                console.log("Float ", val)

                // Otherwise it's already a float
                return val;
            };

            def.getValue = () => {
                const floatVal = getNormalizedFloat();

                if (mode === GLOBAL_TYPES.DMX_VALUE_TYPE.DMX_BIT_8) {
                    return `${DMXHelper.floatToDMX(floatVal)} ${GLOBAL_TYPES.SYMBOLS.DMX_BIT_8}`;
                }
                if (mode === GLOBAL_TYPES.DMX_VALUE_TYPE.PERCENT) {
                    // floatVal is 1.0, this correctly returns "100 %"

                    console.log("Convert float to Percent float: ", floatVal)

                    return `${Math.round(floatVal * 100)} ${GLOBAL_TYPES.SYMBOLS.PERCENT}`;
                }
                return `${floatVal.toFixed(3)} ${GLOBAL_TYPES.SYMBOLS.FLOAT}`;
            };

            def.getKeyboardValue = () => {
                const floatVal = getNormalizedFloat();

                if (mode === GLOBAL_TYPES.DMX_VALUE_TYPE.DMX_BIT_8) {
                    return `${DMXHelper.floatToDMX(floatVal)}`;
                }
                if (mode === GLOBAL_TYPES.DMX_VALUE_TYPE.PERCENT) {
                    return `${Math.round(floatVal * 100)}`;
                }
                return floatVal.toFixed(3);
            };

            def.setterFunction = (input) => {
                let cleanInput = String(input).replace(/[^\d.-]/g, '');
                let num = Number(cleanInput);
                let floatVal;

                // Convert the user's input back to a 0.0 - 1.0 float based on the UI mode
                if (mode === GLOBAL_TYPES.DMX_VALUE_TYPE.DMX_BIT_8) {
                    floatVal = DMXHelper.dmxToFloat(num);
                } else if (mode === GLOBAL_TYPES.DMX_VALUE_TYPE.PERCENT) {
                    floatVal = num / 100;
                } else {
                    floatVal = num;
                }

                // Clamp to safety
                floatVal = Math.min(Math.max(floatVal, 0), 1);

                // 2. Convert that float back to the "Natural" state the targetContext expects
                const finalValue = def._useDmxLogic ? DMXHelper.floatToDMX(floatVal) : floatVal;
                originalSet(finalValue);
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
            return !def._forContextTypeOnly || def._forContextTypeOnly === currentType;
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

        // Edit value column (index 1)
        if (colIndex === 1 && definition && !definition.isReadOnly) {
            settingsWindow.setHidden(true);
            FGMShowHandler.setPageEmpty();
            HCWRender.updateFrame();

            try {
                const result = await FGMKeyboardInteraction.openKeyboard(
                    FGMKeyboardInteractionSettings.create()
                        .setLabel(`Edit ${definition.label} as `)
                        .setInitialValue(definition.getKeyboardValue())
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
        } else if (definition?.isReadOnly) {
            console.log(`Attribute "${definition.label}" is read-only.`);
        }

        return this.settingsLoop(data);
    }

    static async windowEdgeClicked(window) {
        FGMShowHandler.setPageEmpty();
        const data = await this.openAndAwaitWindowSettings(window);
        this.settingsLoop(data);
    }
}