class GLOBAL_TYPES {

    static get ACTIONS() {
        return {
            get ENCODER_VALUE_UPDATE() {
                return 'ACTION_ENCODER_VALUE_UPDATE';
            },

            get CUSTOM_ENCODER_VALUE_UPDATE() {
                return 'ACTION_COLOR_ENCODER_VALUE_UPDATE';
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

            get KEYBOARD_UPDATES() {
                return {
                    get KEY_PRESSED() {
                        return 'ACTION_KEYBOARD_KEY_PRESSED';
                    },
                    get RETURN_PRESSED() {
                        return 'ACTION_KEYBOARD_RETURN_PRESSED';
                    },
                    get DELETE_ALL_PRESSED() {
                        return 'ACTION_KEYBOARD_DELETE_ALL_PRESSED';
                    },
                    get ENTER_PRESSED() {
                        return 'ACTION_KEYBOARD_ENTER_PRESSED';
                    },
                    get SPACE_PRESSED() {
                        return 'ACTION_KEYBOARD_SPACE_PRESSED';
                    },
                    get ARROW_LEFT_PRESSED() {
                        return 'ACTION_KEYBOARD_ARROW_LEFT_PRESSED';
                    },
                    get ARROW_RIGHT_PRESSED() {
                        return 'ACTION_KEYBOARD_ARROW_RIGHT_PRESSED';
                    },
                    get BACKSPACE_PRESSED() {
                        return 'ACTION_KEYBOARD_BACKSPACE_PRESSED';
                    }
                }
            },

            get NUMPAD_UPDATES() {
                return {
                    get KEY_PRESSED() {
                        return 'ACTION_NUMPAD_KEY_PRESSED';
                    },
                    get ENTER_PRESSED() {
                        return 'ACTION_NUMPAD_ENTER_PRESSED';
                    },
                    get CLEAR_PRESSED() {
                        return 'ACTION_NUMPAD_CLEAR_PRESSED';
                    },
                    get BACKSPACE_PRESSED() {
                        return 'ACTION_NUMPAD_BACKSPACE_PRESSED';
                    },
                    get ARROW_LEFT_PRESSED() {
                        return 'ACTION_NUMPAD_ARROW_LEFT_PRESSED';
                    },
                    get ARROW_RIGHT_PRESSED() {
                        return 'ACTION_NUMPAD_ARROW_RIGHT_PRESSED';
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

            get SEARCH_UPDATES() {
                return {
                    get RESULT_PRESS() {
                        return 'ACTION_SEARCH_RESULT_PRESS';
                    },
                    get SEARCH_BAR_PRESS() {
                        return 'ACTION_SEARCH_BAR_PRESS';
                    }
                }
            }
        }
    }

    static get CONTEXT_FIELDS() {
        return {
            get FADER() {
                return 'CONTEXT_FIELD_FADER';
            },
            get ENCODER() {
                return 'CONTEXT_FIELD_ENCODER';
            },
            get SINGLE_PRESET() {
                return 'CONTEXT_FIELD_SINGLE_PRESET';
            },
            get PRESETS() {
                return 'CONTEXT_FIELD_PRESET';
            },
            get NUMBER_KEYPAD() {
                return 'CONTEXT_FIELD_NUMBER_KEYPAD';
            },
            get KEYBOARD() {
                return 'CONTEXT_FIELD_KEYBOARD';
            },
            get COLOR_MAP_INPUT() {
                return 'CONTEXT_FIELD_COLOR_MAP_INPUT';
            },
            get TABLE() {
                return 'CONTEXT_FIELD_TABLE';
            },
            get SEARCH_BOX() {
                return 'CONTEXT_FIELD_SEARCH_BOX';
            },
            get SEQUENCE_EDITOR() {
                return 'CONTEXT_FIELD_SEQUENCE_EDITOR';
            },
            get CUSTOM_WHEEL_ENCODER() {
                return 'CONTEXT_FIELD_CUSTOM_WHEEL_ENCODER';
            }
        }
    }
}