class GLOBAL_STYLES {
    static get VERSION() { return '0.0.1'; }

    static get PALETTE() {
        return {
            BG_PRIMARY: '#1b1717ff',
            BG_SECONDARY: '#000000',
            BG_DARK: '#0a0a0a',
            TEXT_PRIMARY: '#ffffff',
            TEXT_SECONDARY: '#888888',
            TEXT_HIGHLIGHT: '#00ff95',
            ACCENT_GREEN: '#00ff95',
            ACCENT_BLUE: '#4444ff',
            ACCENT_RED: '#ff4444',
            KNOB_OUTER: '#574b4bff',
            KNOB_INNER: '#3d3434',
            KEY_DEFAULT: '#333333',
            KEY_ACTIVE: '#555555',
            KEY_SPECIAL: '#005500',
            KEY_SPECIAL_ACTIVE: '#007700',
            KEY_DELETE: '#770000',
            KEY_DELETE_ACTIVE: '#990000',
            KEY_SHIFT: '#444444',
            KEY_SHIFT_ACTIVE: '#888888'
        };
    }

    static get FONTS() {
        return {
            PRIMARY: 'Arial, sans-serif',
            MONO: 'Monospace, monospace',
            TITLE: 'bold 13px Arial, sans-serif',
            HEADER: 'bold 14px Arial, sans-serif',
            LABEL: 'bold 12px Arial, sans-serif',
            SMALL: '11px Arial, sans-serif',
            SMALL_BOLD: 'bold 11px Arial, sans-serif',
            MONO_READOUT: '12px Monospace, monospace',
            MONO_DISPLAY: '20px Monospace, monospace'
        };
    }

    static get WINDOW() {
        const P = this.PALETTE;
        return {
            BASE_COLOR: '#454545',
            TOUCH_ZONE_COLOR: '#969696',
            TOUCH_ZONE_HIGHLIGHT_COLOR: '#d6d6d6',
            DEFAULT_BORDER: P.BG_DARK
        };
    }

    static get CANVAS() {
        const P = this.PALETTE;
        return {
            BACKGROUND: P.BG_SECONDARY,
            GRID_LINE: P.ACCENT_GREEN,
            SELECTION_OUTLINE: '#ffff00'
        };
    }

    static get INFO() {
        return {
            DANGER: '#ff4444',
            ERROR: '#ff4444',
            GOOD: '#00ff95'
        };
    }

    static get FIELDS() {
        const P = this.PALETTE;
        return {
            COLOR_MAP: {
                BACKGROUND: P.BG_PRIMARY,
                DISPLAY_BG: P.BG_SECONDARY,
                BORDER: P.BG_DARK,
                TEXT: P.TEXT_PRIMARY,
                TEXT_MUTED: P.TEXT_SECONDARY,
                RED_SLIDER: P.ACCENT_RED,
                GREEN_SLIDER: '#44ff44',
                BLUE_SLIDER: P.ACCENT_BLUE
            },
            FADER: {
                BACKGROUND: P.BG_PRIMARY,
                FADER: P.KNOB_OUTER,
                TEXT: P.TEXT_PRIMARY,
                INDICATOR: P.ACCENT_GREEN
            },
            ENCODER: {
                BACKGROUND: P.BG_PRIMARY,
                KNOB_OUTER: P.KNOB_OUTER,
                KNOB_INNER: P.KNOB_INNER,
                INDICATOR_OUTER: P.TEXT_PRIMARY,
                INDICATOR_INNER: P.ACCENT_GREEN,
                TEXT: P.TEXT_PRIMARY
            },
            CUSTOM_ENCODER: {
                BACKGROUND: P.BG_PRIMARY,
                KNOB_OUTER: P.KNOB_OUTER,
                KNOB_INNER: P.KNOB_INNER,
                INDICATOR: P.TEXT_PRIMARY,
                TEXT: P.TEXT_PRIMARY
            },
            KEYBOARD: {
                BACKGROUND: P.BG_PRIMARY,
                HEADER_TEXT: P.TEXT_PRIMARY,
                DISPLAY_BG: P.BG_SECONDARY,
                DISPLAY_TEXT: P.ACCENT_GREEN,
                CURSOR_COLOR: P.ACCENT_GREEN,
                KEY_DEFAULT: P.KEY_DEFAULT,
                KEY_ACTIVE: P.KEY_ACTIVE,
                KEY_TEXT: P.TEXT_PRIMARY,
                SPECIAL_KEY: P.KEY_SPECIAL,
                SPECIAL_KEY_ACTIVE: P.KEY_SPECIAL_ACTIVE,
                DELETE_KEY: P.KEY_DELETE,
                DELETE_KEY_ACTIVE: P.KEY_DELETE_ACTIVE,
                SHIFT_KEY: P.KEY_SHIFT,
                SHIFT_KEY_ACTIVE: P.KEY_SHIFT_ACTIVE
            },
            NUMBER_KEYPAD: {
                BACKGROUND: P.BG_PRIMARY,
                HEADER_TEXT: P.TEXT_PRIMARY,
                DISPLAY_BG: P.BG_SECONDARY,
                DISPLAY_TEXT: P.ACCENT_GREEN,
                CURSOR_COLOR: P.ACCENT_GREEN,
                KEY_DEFAULT: P.KEY_DEFAULT,
                KEY_ACTIVE: P.KEY_ACTIVE,
                KEY_TEXT: P.TEXT_PRIMARY,
                ENTER_KEY: P.KEY_SPECIAL,
                ENTER_KEY_ACTIVE: P.KEY_SPECIAL_ACTIVE
            },
            PRESET_GROUP: {
                BACKGROUND: P.BG_PRIMARY,
                HEADER_TEXT: P.TEXT_PRIMARY,
                ITEM_TEXT: P.TEXT_PRIMARY,
                ITEM_DEFAULT_COLOR: '#aaaaaa',
                ITEM_PRESSED_COLOR: P.TEXT_PRIMARY,
                TEMP_COLOR: '#ffff00'
            },
            PRESETS: {
                DEFAULT_COLOR: '#00059c',
                GRAY: '#353535',
                HIGHLIGHT_COLOR: '#005b2f'
            },
            SEARCH: {
                BACKGROUND: P.BG_PRIMARY,
                TEXT: P.TEXT_PRIMARY,
                DISPLAY_BG: P.BG_SECONDARY
            },
            TABLE: {
                BACKGROUND: P.BG_PRIMARY,
                HEADER_BG: '#222222',
                HEADER_TEXT: P.TEXT_PRIMARY,
                ROW_BG_EVEN: '#111111',
                ROW_BG_ODD: '#1a1a1a',
                TEXT: P.TEXT_PRIMARY,
                GRID_LINE: '#333333'
            },
            SEQUENCE_EDITOR: {
                BACKGROUND: P.BG_PRIMARY,
                HEADER_TEXT: P.TEXT_PRIMARY,
                ROW_BG: P.BG_SECONDARY,
                ACCENT: P.ACCENT_GREEN
            },
            XY_PAD: {
                BACKGROUND: P.BG_PRIMARY,
                PAD_BG: P.BG_SECONDARY,
                GRID: '#222222',
                CROSSHAIR: P.TEXT_SECONDARY,
                TARGET: P.ACCENT_GREEN,
                TARGET_GLOW: '#00ff9566',
                TEXT: P.TEXT_PRIMARY,
                PRESET_BG: P.KEY_DEFAULT,
                PRESET_ACTIVE: P.KEY_ACTIVE,
                PRESET_TEXT: P.TEXT_PRIMARY
            }
        };
    }

    static get FIELDS_GLOBAL() {
        return {
            TEMP_TOUCH_ZONE_COLOR: '#ffff00',
            TEMP_INPUT_FIELD_TOUCH_ZONE_COLOR: '#a600ff',
            GRID_DEFAULT_COLOR: '#00ff95'
        };
    }
}

const GS = GLOBAL_STYLES;