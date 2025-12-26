class DMXValues {
    /** 0.0-1.0 to 0-255 */
    static valueToByte(val) {
        return Math.max(0, Math.min(255, Math.round(val * 255)));
    }

    /** 0.0-1.0 to 0-100 */
    static valueToPercent(val) {
        return Math.max(0, Math.min(100, Math.round(val * 100)));
    }

    /** 0-255 to 0.0-1.0 */
    static byteToValue(byte) {
        return Math.max(0, Math.min(1, byte / 255));
    }

    /** 0-255 to 0-100 */
    static byteToPercent(byte) {
        return Math.max(0, Math.min(100, Math.round((byte / 255) * 100)));
    }

    /** 0-100 to 0.0-1.0 */
    static percentToValue(pct) {
        return Math.max(0, Math.min(1, pct / 100));
    }

    /** 0-100 to 0-255 */
    static percentToByte(pct) {
        return Math.max(0, Math.min(255, Math.round((pct / 100) * 255)));
    }
}

class DmxConvert {
    /**
     * Converts a 0.0-1.0 value to a 16-bit pair
     * @returns {object} { coarse: 0-255, fine: 0-255 }
     */
    static valueTo16Bit(val) {
        const total = Math.max(0, Math.min(65535, Math.round(val * 65535)));
        return {
            coarse: (total >> 8) & 0xFF,
            fine: total & 0xFF
        };
    }

    /**
     * Combines two 8-bit numbers into one 16-bit integer (0-65535)
     * @param {number} coarse 0-255
     * @param {number} fine 0-255
     * @returns {number} 0-65535
     */
    static combineTo16Bit(coarse, fine) {
        // Shift coarse left by 8 bits and add the fine bits
        return ((coarse & 0xFF) << 8) | (fine & 0xFF);
    }

    static to8Bits(coarse, fine) {
        const total = this.combineTo16Bit(coarse, fine);
        return parseFloat((total / 65535).toFixed(5));
    }
}

class FGMFixtureFunctionDefinition {
    constructor(type, label, is16Bit = false) {
        this.type = type;
        this.label = label;
        this.is16Bit = is16Bit;
        this.logicRange = [0, 255];
    }
}

class FGMFixtureFunctionDefinitions {
    static get MAP() {
        return {
            DIMMER: this.DIMMER,
            PAN8BIT: this.PAN8BIT,
            PAN16BIT: this.PAN16BIT,
            TILT: this.TILT16BIT,
            TILT8BIT: this.TILT8BIT,
            TILT16BIT: this.TILT16BIT,
            COLOR_R: this.COLOR_R,
            COLOR_G: this.COLOR_G,
            COLOR_B: this.COLOR_B,
            COLOR_W: this.COLOR_W,
            COLOR_A: this.COLOR_A,
            COLOR_U: this.COLOR_U,
            RED: this.COLOR_R,
            GREEN: this.COLOR_G,
            BLUE: this.COLOR_B,
            WHITE: this.COLOR_W,
            AMBER: this.COLOR_A,
            UV: this.COLOR_U,
            COLOR_WHEEL: this.COLOR_WHEEL,
            ZOOM: this.ZOOM,
            FOCUS: this.FOCUS
        }
    }

    static getDefinitionByType(type) {
        return this.MAP[type] || null;
    }

    static get DIMMER() { return new FGMFixtureFunctionDefinition(FGMTypes.PROGRAMMER.DIMMERS.MAIN, "Dimmer"); }
    static get PAN8BIT() { return new FGMFixtureFunctionDefinition(FGMTypes.PROGRAMMER.POSITION.PAN_8Bit, "Pan (Coarse)"); }
    static get PAN16BIT() { return new FGMFixtureFunctionDefinition(FGMTypes.PROGRAMMER.POSITION.PAN_16Bit, "Pan (Fine)"); }
    static get TILT8BIT() { return new FGMFixtureFunctionDefinition(FGMTypes.PROGRAMMER.POSITION.TILT_8Bit, "Tilt (Coarse)"); }
    static get TILT16BIT() { return new FGMFixtureFunctionDefinition(FGMTypes.PROGRAMMER.POSITION.TILT_16Bit, "Tilt (Fine)"); }
    static get PAN() { return this.PAN16BIT; }
    static get TILT() { return this.TILT16BIT; }

    static get COLOR_R() { return new FGMFixtureFunctionDefinition(FGMTypes.PROGRAMMER.COLORS.COLOR_R, "Red"); }
    static get COLOR_G() { return new FGMFixtureFunctionDefinition(FGMTypes.PROGRAMMER.COLORS.COLOR_G, "Green"); }
    static get COLOR_B() { return new FGMFixtureFunctionDefinition(FGMTypes.PROGRAMMER.COLORS.COLOR_B, "Blue"); }
    static get COLOR_W() { return new FGMFixtureFunctionDefinition(FGMTypes.PROGRAMMER.COLORS.COLOR_W, "White"); }
    static get COLOR_A() { return new FGMFixtureFunctionDefinition(FGMTypes.PROGRAMMER.COLORS.COLOR_A, "Amber"); }
    static get COLOR_U() { return new FGMFixtureFunctionDefinition(FGMTypes.PROGRAMMER.COLORS.COLOR_U, "UV"); }
    static get COLOR_WHEEL() { return new FGMFixtureFunctionDefinition(FGMTypes.PROGRAMMER.COLORS.COLOR_WHEEL, "Color Wheel"); }
    static get ZOOM() { return new FGMFixtureFunctionDefinition(FGMTypes.PROGRAMMER.BEAM.ZOOM, "Zoom"); }
    static get FOCUS() { return new FGMFixtureFunctionDefinition(FGMTypes.PROGRAMMER.BEAM.FOCUS, "Focus"); }
}

class FGMTypes {
    static get RENDER() {
        return {
            PAGES: {
                get RENDER_ALWAYS() {
                    return 'r_settings_render_always';
                }
            }
        }
    }
    static get PROGRAMMER() {
        return {
            DIMMERS: {
                get MAIN() {
                    return 'DIMMER';
                }
            },
            POSITION: {
                get PAN_ENCODER() {
                    return 'p_position_pan';
                },
                get TILT_ENCODER() {
                    return 'p_position_tilt';
                },
                get PAN_8Bit() {
                    return 'PAN8BIT';
                },
                get PAN_16Bit() {
                    return 'PAN16BIT';
                },
                get TILT_8Bit() {
                    return 'TILT8BIT';
                },
                get TILT_16Bit() {
                    return 'TILT16BIT';
                }
            },
            COLORS: {
                get COLOR_R() { return 'COLOR_R'; },
                get COLOR_G() { return 'COLOR_G'; },
                get COLOR_B() { return 'COLOR_B'; },
                get COLOR_W() { return 'COLOR_W'; },
                get COLOR_A() { return 'COLOR_A'; },
                get COLOR_U() { return 'COLOR_U'; },
                get COLOR_PICKER() {
                    return 'p_color_color_picker';
                },
                get COLOR_WHEEL() { return 'COLOR_WHEEL'; }
            },
            BEAM: {
                get ZOOM() { return 'ZOOM'; },
                get FOCUS() { return 'FOCUS'; }
            },
            POOLS: {
                get FIXTURE_POOL() { return 'p_pool_fixture'; },
                get GROUP_POOL() { return 'p_pool_group'; },
                get DIMMER_POOL() { return 'p_pool_dimmer'; },
                get POSITION_POOL() { return 'p_pool_position'; },
                get COLOR_POOL() { return 'p_pool_color'; },
                get COLOR_WHEEL_POOL() { return 'p_pool_color_wheel'; },
                get GOBO_WHEEL_POOL() { return 'p_pool_group_color_wheel'; },
                get ALL_POOL() { return 'p_pool_all'; },
                get PROGRAMMER_SHEET() { return 'p_pool_programmer_sheet'; }
            }
        }
    }
    static get ACTIONS() {
        return {
            BUTTON: {
                get STORE() {
                    return 'a_button_store';
                },
                get DELETE() {
                    return 'a_button_delete';
                },
                get CLEAR_ALL() {
                    return 'a_button_clear_all';
                },
                get CLEAR_FIXTURE_VALUE_OVERWRITE() { // does not unselect them
                    return 'a_button_store_fixture_values_dontwrite';
                },
                get EDIT_NAME() {
                    return 'a_button_edit_name';
                },
                get CLEAR_GHOST_VALUES() {
                    return 'a_button_clear_ghost_selection';
                },
                get CLEAR_SELECTION() {
                    return 'a_button_clear_selection';
                }
            },
            KEYBOARD: {
                get MAIN_INPUT() {
                    return 'a_keyboard_main_input-device';
                }
            },
            WINDOW: {
                get ARTNET_SETTINGS() {
                    return 'w_artnet_settings';
                },
                get PATCH_SEARCH() {
                    return 'w_patch_search';
                },
                get PATCH_CELL_CLICK() {
                    return 'w_patch_cell_click';
                },
                get FIXTURE_LIST_EDIT() {
                    return 'w_fixture_list_edit';
                },
                get FIXTURE_LIST_CONFIG() {
                    return 'w_fixture_list_config';
                },
                get FIXTURE_LIST_SEARCH_FIELD() {
                    return 'w_fixture_list_search_field';
                }
            }
        }
    }
}