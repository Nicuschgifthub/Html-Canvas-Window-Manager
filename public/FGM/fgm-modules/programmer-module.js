/**
 * Programmer Module
 * Handles all programmer input controls (faders, encoders, color pickers)
 */
class FGMProgrammerModule extends FGMFeatureModule {
    constructor() {
        super('programmer', '1.0.0');
    }

    init() {
        console.log('[ProgrammerModule] Initializing...');

        this.on(FGMEventTypes.FADER_UPDATE, {
            handler: (event) => this.handleFader(event),
            priority: 10
        });

        this.on(FGMEventTypes.ENCODER_UPDATE, {
            handler: (event) => this.handleEncoder(event),
            priority: 10
        });

        this.on(FGMEventTypes.COLOR_PICKER_UPDATE, {
            handler: (event) => this.handleColorPicker(event),
            priority: 10
        });

        this.on(FGMEventTypes.PRESET_CLICKED, {
            filter: FGMEventFilter.byFieldType(FGMTypes.PROGRAMMER.POOLS.FIXTURE_POOL),
            handler: (event) => this.handleFixtureSelection(event),
            priority: 10
        });

        this.on(FGMEventTypes.PRESET_CLICKED, {
            filter: FGMEventFilter.or(
                FGMEventFilter.byPresetData('_actionId', FGMTypes.ACTIONS.BUTTON.CLEAR_ALL),
                FGMEventFilter.byPresetData('_actionId', FGMTypes.ACTIONS.BUTTON.CLEAR_SELECTION),
                FGMEventFilter.byPresetData('_actionId', FGMTypes.ACTIONS.BUTTON.CLEAR_GHOST_VALUES)
            ),
            handler: (event) => {
                const data = event.data.presetData || event.data.data;
                const actionId = data._actionId;

                if (actionId === FGMTypes.ACTIONS.BUTTON.CLEAR_ALL) {
                    FGMProgrammer.clear();
                }

                if (actionId === FGMTypes.ACTIONS.BUTTON.CLEAR_SELECTION) {
                    FGMProgrammer.clearSelection();
                }

                if (actionId === FGMTypes.ACTIONS.BUTTON.CLEAR_GHOST_VALUES) {
                    FGMProgrammer.clearProgrammer();
                }

                if (typeof HCWRender !== 'undefined') HCWRender.updateFrame();
            },
            priority: 10
        });

        // Sync UI on selection or value change
        this.on(FGMEventTypes.SELECTION_CHANGED, () => this.syncUIControls());
        this.on(FGMEventTypes.PROGRAMMER_VALUE_CHANGED, () => this.syncUIControls());

        this.isSyncing = false;

        console.log('[ProgrammerModule] Initialized');
    }

    syncUIControls() {
        if (this.isSyncing) return;
        this.isSyncing = true;

        try {
            const hcw = FGMStore.getHCW();
            if (!hcw) return;

            const selection = FGMProgrammer.getSelection();
            const firstFid = selection.length > 0 ? selection[0] : null;
            const allProgData = FGMProgrammer.getData();
            const progData = firstFid ? allProgData[firstFid] : null;

            if (progData) {
                console.log(`[ProgrammerModule] Syncing UI for Fixture ${firstFid}. Attributes:`, Object.keys(progData));
            }

            // Get a reference once
            const prog = FGMTypes.PROGRAMMER;
            if (!prog) return;

            hcw.getWindows().forEach(win => {
                const field = win.getSingleContextField();
                if (!field) return;

                // CRITICAL: Don't sync the field the user is currently touching!
                if (typeof HCW !== 'undefined' && HCW.pointer && HCW.pointer.contextwindow === field) {
                    return;
                }

                const fgmType = field.getFGMType();
                if (!fgmType) return;

                const fieldType = field.getType();

                if (fieldType === 'FADER_FIELD') {
                    const attrData = progData ? progData[fgmType] : null;
                    if (attrData && attrData.value !== undefined) {
                        field.setValue(attrData.value / 255);
                    } else if (!progData) {
                        field.setValue(0);
                    }
                } else if (fieldType === 'ENCODER_FIELD' && prog.POSITION) {
                    const pos = prog.POSITION;
                    if (fgmType === pos.PAN_ENCODER) {
                        const pan8 = (progData && progData[pos.PAN_8Bit]) ? progData[pos.PAN_8Bit].value : (progData ? undefined : 0);
                        const pan16 = (progData && progData[pos.PAN_16Bit]) ? progData[pos.PAN_16Bit].value : (progData ? undefined : 0);
                        if (pan8 !== undefined || pan16 !== undefined) {
                            field.setValue(pan8 !== undefined ? pan8 / 255 : field.value, pan16 !== undefined ? pan16 / 255 : field.value2);
                        }
                    } else if (fgmType === pos.TILT_ENCODER) {
                        const tilt8 = (progData && progData[pos.TILT_8Bit]) ? progData[pos.TILT_8Bit].value : (progData ? undefined : 0);
                        const tilt16 = (progData && progData[pos.TILT_16Bit]) ? progData[pos.TILT_16Bit].value : (progData ? undefined : 0);
                        if (tilt8 !== undefined || tilt16 !== undefined) {
                            field.setValue(tilt8 !== undefined ? tilt8 / 255 : field.value, tilt16 !== undefined ? tilt16 / 255 : field.value2);
                        }
                    }
                } else if (fieldType === 'COLOR_MAP_FIELD' && prog.COLORS) {
                    const colors = prog.COLORS;
                    if (fgmType === colors.COLOR_PICKER) {
                        const getVal = (attr) => {
                            if (!progData) return undefined; // Protect UI state on clear
                            return (progData[attr] && progData[attr].value !== undefined) ? progData[attr].value : undefined;
                        };

                        field.setColor({
                            r: getVal(colors.COLOR_R),
                            g: getVal(colors.COLOR_G),
                            b: getVal(colors.COLOR_B),
                            white: getVal(colors.COLOR_W),
                            amber: getVal(colors.COLOR_A),
                            uv: getVal(colors.COLOR_U)
                        });
                    }
                } else if (fieldType === 'COLOR_WHEEL_ENCODER_FIELD' && prog.COLORS) {
                    const colors = prog.COLORS;
                    const beam = prog.BEAM;

                    if (fgmType === colors.COLOR_WHEEL || fgmType === beam.GOBO) {
                        const val = (progData && progData[fgmType]) ? progData[fgmType].value : (progData ? undefined : 0);
                        if (val !== undefined) field.setValue(val / 255);

                        // Sync wheel data from fixture profile
                        if (firstFid) {
                            const fixture = FGMStore.getPatchedFixtures().find(f => f.getId() === firstFid);
                            if (fixture) {
                                const wheelFunc = fixture.getFunctions().find(fn => fn.definition.type === fgmType);
                                if (wheelFunc && wheelFunc.wheelData) {
                                    field.setWheelData(wheelFunc.wheelData);
                                } else {
                                    field.setWheelData(null);
                                }
                            }
                        }
                    }
                } else if (fieldType === 'ENCODER_FIELD' && prog.BEAM) {
                    const beam = prog.BEAM;
                    if (fgmType === beam.ZOOM || fgmType === beam.FOCUS || fgmType === beam.SHUTTER) {
                        const val = (progData && progData[fgmType]) ? progData[fgmType].value : (progData ? undefined : 0);
                        if (val !== undefined) field.setValue(val / 255);
                    }
                }
            });
        } catch (err) {
            console.error("[ProgrammerModule] Sync Error:", err);
        } finally {
            this.isSyncing = false;
        }

        if (typeof HCWRender !== 'undefined') HCWRender.updateFrame();
    }

    handleFixtureSelection(event) {
        const { field, presetData, preset } = event.data;
        const fixtureId = presetData.id;

        if (FGMProgrammer.getSelection().includes(fixtureId)) {
            FGMProgrammer.unselectFixture(fixtureId);
        } else {
            FGMProgrammer.selectFixture(fixtureId, false);
        }

        if (typeof HCWRender !== 'undefined') HCWRender.updateFrame();
    }

    handleFader(event) {
        if (this.isSyncing) return;
        const { field: fromFader, data } = event.data;
        const type = fromFader.getFGMType();

        if (type) {
            FGMProgrammer.setAttributeValue(type, data.value * 255);
        }
    }

    handleEncoder(event) {
        if (this.isSyncing) return;
        const { field: fromEncoder, data } = event.data;
        const type = fromEncoder.getFGMType();

        if (!type) return;

        const pos = FGMTypes.PROGRAMMER.POSITION;
        if (type === pos.PAN_ENCODER) {
            FGMProgrammer.setAttributeValue(pos.PAN_8Bit, data.outer.value * 255, true);
            FGMProgrammer.setAttributeValue(pos.PAN_16Bit, data.inner.value * 255, false); // Emit on last
        }

        if (type === pos.TILT_ENCODER) {
            FGMProgrammer.setAttributeValue(pos.TILT_8Bit, data.outer.value * 255, true);
            FGMProgrammer.setAttributeValue(pos.TILT_16Bit, data.inner.value * 255, false); // Emit on last
        }

        const beam = FGMTypes.PROGRAMMER.BEAM;
        if (type === beam.ZOOM || type === beam.FOCUS || type === beam.SHUTTER || type === beam.GOBO) {
            FGMProgrammer.setAttributeValue(type, data.outer.value * 255);
        }

        const colors = FGMTypes.PROGRAMMER.COLORS;
        if (type === colors.COLOR_WHEEL) {
            FGMProgrammer.setAttributeValue(type, data.outer.value * 255);
        }
    }

    handleColorPicker(event) {
        if (this.isSyncing) return;
        const { field: fromColorPicker, data } = event.data;
        const type = fromColorPicker.getFGMType();

        const colors = FGMTypes.PROGRAMMER.COLORS;
        if (type === colors.COLOR_PICKER) {
            console.log(`[ProgrammerModule] Color Picker Drag: R:${data.r} G:${data.g} B:${data.b} W:${data.white}`);
            if (data.r !== undefined) FGMProgrammer.setAttributeValue(colors.COLOR_R, data.r, true);
            if (data.g !== undefined) FGMProgrammer.setAttributeValue(colors.COLOR_G, data.g, true);
            if (data.b !== undefined) FGMProgrammer.setAttributeValue(colors.COLOR_B, data.b, true);
            if (data.white !== undefined) FGMProgrammer.setAttributeValue(colors.COLOR_W, data.white, true);
            if (data.amber !== undefined) FGMProgrammer.setAttributeValue(colors.COLOR_A, data.amber, true);
            if (data.uv !== undefined) FGMProgrammer.setAttributeValue(colors.COLOR_U, data.uv, true);

            FGMProgrammer.emitValueChanged();
        }
    }
}