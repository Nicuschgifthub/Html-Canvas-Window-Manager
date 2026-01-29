class GLOBAL_TYPES {

    static get ACTIONS() {
        return {
            get ENCODER_VALUE_UPDATE() {
                return 'ACTION_BUTTON_PRESS';
            },

            get FADER_VALUE_UPDATE() {
                return 'ACTION_FADER_VALUE_UPDATE';
            },

            get PRESET_PRESS() {
                return 'ACTION_PRESET_PRESSED';
            },

            get COLOR_FIELD_UPDATE() {
                return 'ACTION_COLOR_FIELD_UPDATE';
            },

            get TABLE_UPDATES() {
                return {
                    get CELL_DELETE() {
                        return 'ACTION_TABLE_CELL_DELETE';
                    },
                    get CELL_ADD() {
                        return 'ACTION_TABLE_CELL_ADD';
                    },
                    get CELL_PRESS() {
                        return 'ACTION_TABLE_CELL_PRESS';
                    }
                }
            },

           get WINDOW() {
                return {
                    get CLICKED() {
                        return 'ACTION_WINDOW_CLICKED';
                    },
                    get RESIZE() {
                        return 'ACTION_WINDOW_RESIZE';
                    }
                }
            },
        }
    }

}