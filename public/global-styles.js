class GLOBAL_STYLES {
    static get VERSION() { return '0.0.1'; }

    static get INFO() {
        return {
            ERROR: '#ff4444',
            GOOD: '#00ff95'
        }
    }

    static get FIELDS() {
        return {
            COLOR_MAP: {},
            FADER: {},
            ENCODER: {},
            CUSTOM_ENCODER: {},
            KEYBOARD: {},
            NUMBER_KEYPAD: {},
            PRESET_GROUP: {
                TEMP_COLOR: '#ffff00'
            },
            PRESETS: {
                DEFAULT_COLOR: '#00059c',
                HIGHLIGHT_COLOR: '#005b2f'
            },
            SEARCH: {},
            TABLE: {},
            SEQUENCE_EDITOR: {},
        }
    }

    static get FIELDS_GLOBAL() {
        return {
            TEMP_TOUCH_ZONE_COLOR: '#ffff00',
            TEMP_INPUT_FIELD_TOUCH_ZONE_COLOR: '#a600ff'
        }
    }
}

const GS = GLOBAL_STYLES;