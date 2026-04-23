class GLOBAL_CORE {
    static get VERSION() { return '0.0.1'; }

    static get DEFS() {
        return {
            get ALL_IDS() {
                return {
                    get START_UNRESERVED_LOCATION_IDS() {
                        return {
                            get MAJOR() {
                                return 1;
                            },
                            get MINOR() {
                                return 1;
                            }
                        }
                    },
                    get START_UNRESERVED_WINDOW_IDS() {
                        return 2001;
                    }
                }
            },
            get PAGES() {
                return {
                    get EMPTY() {
                        return -2;
                    },
                    get SHOW_ALWAYS() {
                        return -1;
                    }
                }
            },
            get WINDOW() {
                return {
                    get SIZE() {
                        return {
                            get MIN_SIZEXY() {
                                return 100;
                            }
                        }
                    }
                }
            }
        }
    }

    static get CONTEXT_FIELDS() {
        return {
            get PAGE_MENU() {
                return {
                    get ID() {
                        return 1001;
                    },
                    get PAGE() {
                        return GLOBAL_CORE.DEFS.PAGES.SHOW_ALWAYS;
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
            },
            get ADD_WINDOW_MENU() {
                return {
                    get ID() {
                        return 1003;
                    },
                    get PAGE() {
                        return GLOBAL_CORE.DEFS.PAGES.EMPTY;
                    },
                    get LOCATION_ID() {
                        return '0.003';
                    }
                }
            }
        }
    }
}

const GC = GLOBAL_CORE;