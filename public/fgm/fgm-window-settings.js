class FGMWindowSettings {
    static async openAndAwaitWindowSettings(targetWindow) {
        const { x, y, sx, sy } = HCWPositions.getMiddleUserFocusPosition(2);
        const targetContext = targetWindow.getContextField();
        const currentType = targetContext.getType();

        console.log(currentType);

        const rawDefinitions = [
            {
                label: "Label",
                value: targetContext.getLabel(),
                setter: "setLabel",
                isReadOnly: false,
                setterValueVerify: (newValue) => {
                    const val = newValue.trim();
                    if (val.length === 0) return { valid: false, infoText: "Label cannot be empty" };
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
                    if (!pattern.test(val)) return { valid: false, infoText: "Format Error: Use X.XXX" };

                    const exists = HCWDB.getContextFieldByLocationId(val);
                    if (exists && exists !== targetContext) {
                        return { valid: false, infoText: `ID ${val} already used` };
                    }
                    return { valid: true, infoText: "" };
                }
            },
            {
                label: "Fader Value",
                value: targetContext.getFloat(),
                isReadOnly: false,
                _forContextTypeOnly: GLOBAL_TYPES.CONTEXT_FIELDS.FADER,
                setter: "setFloat",
                setterValueVerify: (newValue) => {
                    const valStr = newValue.toString().trim();

                    const num = Number(valStr);

                    if (valStr === "" || isNaN(num)) {
                        return {
                            valid: false,
                            infoText: "Invalid Format: Enter a decimal number"
                        };
                    }

                    if (num < 0 || num > 1) {
                        return {
                            valid: false,
                            infoText: "Range Error: Value must be between 0 and 1"
                        };
                    }

                    return { valid: true, infoText: "" };
                }
            },
            {
                label: "Outer Value (V1)",
                value: targetContext.value,
                isReadOnly: false,
                _forContextTypeOnly: GLOBAL_TYPES.CONTEXT_FIELDS.ENCODER,
                setter: "setFloats",
                setterValueVerify: (newValue) => {
                    const valStr = newValue.toString().trim();
                    const num = Number(valStr);

                    if (valStr === "" || isNaN(num)) {
                        return { valid: false, infoText: "Invalid Format: Enter a decimal" };
                    }

                    if (num < 0 || num > 1) {
                        return { valid: false, infoText: "Range Error: Value must be between 0 and 1" };
                    }

                    return { valid: true, infoText: "" };
                }
            },
            {
                label: "Inner Value (V2)",
                value: targetContext.value2,
                isReadOnly: false,
                _forContextTypeOnly: GLOBAL_TYPES.CONTEXT_FIELDS.ENCODER,
                customSetter: (newValue) => {
                    targetContext.setFloats(targetContext.value, Number(newValue));
                },
                setterValueVerify: (newValue) => {
                    const valStr = newValue.toString().trim();
                    const num = Number(valStr);

                    if (valStr === "" || isNaN(num)) {
                        return { valid: false, infoText: "Invalid Format: Enter a decimal" };
                    }

                    if (num < 0 || num > 1) {
                        return { valid: false, infoText: "Range Error: Value must be between 0 and 1" };
                    }

                    return { valid: true, infoText: "" };
                }
            },
            {
                label: "Hue",
                value: targetContext.h,
                isReadOnly: false,
                _forContextTypeOnly: GLOBAL_TYPES.CONTEXT_FIELDS.COLOR_MAP_INPUT,
                customSetter: (newValue) => {
                    targetContext.h = Number(newValue);
                    targetContext._trigger(); // Updates RGB and emits action
                },
                setterValueVerify: (newValue) => {
                    const num = Number(newValue);
                    if (isNaN(num) || num < 0 || num > 1) return { valid: false, infoText: "Range: 0.000 - 1.000" };
                    return { valid: true, infoText: "" };
                }
            },
            {
                label: "Saturation",
                value: targetContext.s,
                isReadOnly: false,
                _forContextTypeOnly: GLOBAL_TYPES.CONTEXT_FIELDS.COLOR_MAP_INPUT,
                customSetter: (newValue) => {
                    targetContext.s = Number(newValue);
                    targetContext._trigger();
                },
                setterValueVerify: (newValue) => {
                    const num = Number(newValue);
                    if (isNaN(num) || num < 0 || num > 1) return { valid: false, infoText: "Range: 0.000 - 1.000" };
                    return { valid: true, infoText: "" };
                }
            },
            {
                label: "Brightness (V)",
                value: targetContext.v,
                isReadOnly: false,
                _forContextTypeOnly: GLOBAL_TYPES.CONTEXT_FIELDS.COLOR_MAP_INPUT,
                customSetter: (newValue) => {
                    targetContext.v = Number(newValue);
                    targetContext._trigger();
                },
                setterValueVerify: (newValue) => {
                    const num = Number(newValue);
                    if (isNaN(num) || num < 0 || num > 1) return { valid: false, infoText: "Range: 0.000 - 1.000" };
                    return { valid: true, infoText: "" };
                }
            },

            // --- RGB BYTES (Direct DMX Control) ---
            {
                label: "Red",
                value: targetContext.getColors().r,
                isReadOnly: false,
                _forContextTypeOnly: GLOBAL_TYPES.CONTEXT_FIELDS.COLOR_MAP_INPUT,
                customSetter: (newValue) => {
                    targetContext.setColor({ r: Math.round(Number(newValue)) });
                    targetContext._trigger();
                },
                setterValueVerify: (newValue) => {
                    const num = Number(newValue);
                    if (isNaN(num) || num < 0 || num > 255) return { valid: false, infoText: "Range: 0 - 255" };
                    return { valid: true, infoText: "" };
                }
            },
            {
                label: "Green",
                value: targetContext.getColors().g,
                isReadOnly: false,
                _forContextTypeOnly: GLOBAL_TYPES.CONTEXT_FIELDS.COLOR_MAP_INPUT,
                customSetter: (newValue) => {
                    targetContext.setColor({ g: Math.round(Number(newValue)) });
                    targetContext._trigger();
                },
                setterValueVerify: (newValue) => {
                    const num = Number(newValue);
                    if (isNaN(num) || num < 0 || num > 255) return { valid: false, infoText: "Range: 0 - 255" };
                    return { valid: true, infoText: "" };
                }
            },
            {
                label: "Blue",
                value: targetContext.getColors().b,
                isReadOnly: false,
                _forContextTypeOnly: GLOBAL_TYPES.CONTEXT_FIELDS.COLOR_MAP_INPUT,
                customSetter: (newValue) => {
                    targetContext.setColor({ b: Math.round(Number(newValue)) });
                    targetContext._trigger();
                },
                setterValueVerify: (newValue) => {
                    const num = Number(newValue);
                    if (isNaN(num) || num < 0 || num > 255) return { valid: false, infoText: "Range: 0 - 255" };
                    return { valid: true, infoText: "" };
                }
            },

            // --- EXTRA LEDS ---
            {
                label: "White LED",
                value: targetContext.extra.white,
                isReadOnly: false,
                _forContextTypeOnly: GLOBAL_TYPES.CONTEXT_FIELDS.COLOR_MAP_INPUT,
                customSetter: (newValue) => {
                    targetContext.setColor({ white: Math.round(Number(newValue)) });
                    targetContext._trigger();
                },
                setterValueVerify: (newValue) => {
                    const num = Number(newValue);
                    if (isNaN(num) || num < 0 || num > 255) return { valid: false, infoText: "Range: 0 - 255" };
                    return { valid: true, infoText: "" };
                }
            },
            {
                label: "Amber LED",
                value: targetContext.extra.amber,
                isReadOnly: false,
                _forContextTypeOnly: GLOBAL_TYPES.CONTEXT_FIELDS.COLOR_MAP_INPUT,
                customSetter: (newValue) => {
                    targetContext.setColor({ amber: Math.round(Number(newValue)) });
                    targetContext._trigger();
                },
                setterValueVerify: (newValue) => {
                    const num = Number(newValue);
                    if (isNaN(num) || num < 0 || num > 255) return { valid: false, infoText: "Range: 0 - 255" };
                    return { valid: true, infoText: "" };
                }
            },
            {
                label: "UV LED",
                value: targetContext.extra.uv,
                isReadOnly: false,
                _forContextTypeOnly: GLOBAL_TYPES.CONTEXT_FIELDS.COLOR_MAP_INPUT,
                customSetter: (newValue) => {
                    targetContext.setColor({ uv: Math.round(Number(newValue)) });
                    targetContext._trigger();
                },
                setterValueVerify: (newValue) => {
                    const num = Number(newValue);
                    if (isNaN(num) || num < 0 || num > 255) return { valid: false, infoText: "Range: 0 - 255" };
                    return { valid: true, infoText: "" };
                }
            },
            {
                label: "Type",
                value: currentType,
                isReadOnly: true
            }
        ];

        const rowDefinitions = rawDefinitions.filter(def => {
            return !def._forContextTypeOnly || def._forContextTypeOnly === currentType;
        });

        const tableTitle = `Settings: ${targetContext.getLabel()}`;
        const tableField = new HCWTableField(tableTitle)
            .setLocationId(GLOBAL_CORE.CONTEXT_FIELDS.WINDOW_SETTINGS_MENU.LOCATION_ID)
            .setHeaders(["Attribute", "Value"])
            .setRows(rowDefinitions.map(def => [def.label, def.value]));

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