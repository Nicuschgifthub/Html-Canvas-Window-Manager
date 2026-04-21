class GLOBAL_IDS_AND_CONFIGS {
    static get VERSION() { return '0.0.1'; }

    static get MAIN_FUNCTIONS() {
        return {
            get PAGE_MENU() {
                return {
                    get ID() {
                        return 1001;
                    },
                    get PAGE() {
                        return -1;
                    },
                    get LOCATION_ID() {
                        return '0.001';
                    }
                }
            },
            get SETTINGS_MENU() {
                return {
                    get ID() {
                        return 1002;
                    },
                    get PAGE() {
                        return 0;
                    },
                    get LOCATION_ID() {
                        return '0.002';
                    }
                }
            }
        }
    }
}

const GI = GLOBAL_IDS_AND_CONFIGS;