class FGMColors {
    static get PAGES() {
        return {
            BACKGROUND: "#0e0e0eff",
            ACTIVE: "#00ff4cff",
            AWAITING: "#c2c505ff",
            MENUS: {
                SETUP: "#007771ff",
                IN_OUT: "#000baaff",
                FIXTURE_CONTROL: "#7c9200ff"
            },
            HIGHLIGHT: "#00ff4cff",
            SELECTED: "#00ff4cff"
        }
    }
    static get TOUCHZONE() {
        return {
            BACKGROUND: "#1b1b1bff",
            QUICK_INPUT: "#c2c505ff" // This window will be open until the user has input a value
        }
    }
    static get POOLS(){
        return {
            DIMMER_POOL: "#574b4bff",
            ALL_POOL: "#27ae60",
            POSITION_POOL: "#2980b9",
            COLOR_POOL: "#8e44ad"
        }
    }
}