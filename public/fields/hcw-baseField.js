class HCWBaseField {
    constructor(label) {
        this.label = label;
        this.parentWindow = null;
        this.renderProps = {};
        this.actionFunction = null;
        this.className = 'HCWBaseField';

        this.address = {
            keyword: "placeholder",
            childKeyword: null,
            locationId: null
        };
    }

    getKeyword() {
        return this.address.keyword;
    }

    getLocationId() {
        return this.address.locationId;
    }

    getSecondKeyword() {
        return this.address.secondKeyword;
    }

    getLabel() {
        return this.label;
    }

    setLocationId(locationString) {
        this.address.locationId = locationString;
        return this;
    }

    setLabel(label) {
        this.label = label;
        this.updateFrame();
        return this;
    }

    setParentWindow(win) {
        this.parentWindow = win;
        return this;
    }

    getParentWindow() {
        return this.parentWindow;
    }

    updateFrame() {
        if (typeof HCWRender !== 'undefined') {
            HCWRender.updateFrame();
        }
    }

    getExcludedJSONKeys() {
        return ['parentWindow'];
    }

    getActionFunction() {
        return this.actionFunction;
    }

    onAction(newFunction) {
        this.actionFunction = newFunction;
        return this;
    }

    emitAction(type, data = {}) {
        // If not set, try to set the default global handler
        if (typeof this.actionFunction !== 'function' && typeof FGMEvents !== 'undefined') {
            this.actionFunction = FGMEvents.onAction;
        }

        if (typeof this.actionFunction === 'function') {
            data.parentWindow = this.parentWindow;
            data.actionType = this.getType();
            data.fieldClass = this;

            this.actionFunction(type, data);
        } else {
            console.warn(`Action ${type} skipped: No handler found locally or in FGMEvents.`);
        }
    }

    toJSON() {
        const copy = { ...this };
        this.getExcludedJSONKeys().forEach(key => delete copy[key]);
        return copy;
    }

    fromJSON(json) {
        try {
            const data = typeof json === 'string' ? JSON.parse(json) : json;
            Object.assign(this, data);
            this.updateFrame();
        } catch (e) {
            console.error("Failed to restore field:", e);
        }
        return this;
    }

    _insertClassKeyword() {
        if (!this.className) return;

        switch (this.className) {
            case "HCWFaderField":
                this.address.keyword = GLOBAL_TYPES.CONSOLE.KEYWORDS.FADER;
                break;
            case "HCWEncoderField":
                this.address.keyword = GLOBAL_TYPES.CONSOLE.KEYWORDS.ENCODER;
                break;
            case "HCWPresetField":
                this.address.keyword = GLOBAL_TYPES.CONSOLE.KEYWORDS.PRESET_GROUP;
                this.address.childKeyword = GLOBAL_TYPES.CONSOLE.KEYWORDS.PRESET;
                break;
            case "HCWNumberField":
                this.address.keyword = GLOBAL_TYPES.CONSOLE.KEYWORDS.NONE;
                break;
            case "HCWKeyboardField":
                this.address.keyword = GLOBAL_TYPES.CONSOLE.KEYWORDS.NONE;
                break;
            case "HCWColorMapField":
                this.address.keyword = GLOBAL_TYPES.CONSOLE.KEYWORDS.COLOR_MAP;
                break;
            case "HCWTableField":
                this.address.keyword = GLOBAL_TYPES.CONSOLE.KEYWORDS.TABLE;
                break;
            case "HCWSearchField":
                this.address.keyword = GLOBAL_TYPES.CONSOLE.KEYWORDS.NONE;
                break;
            case "HCWCustomEncoderField":
                this.address.keyword = GLOBAL_TYPES.CONSOLE.KEYWORDS.C_ENCODER;
                break;
            default:
                break;
        }
    }
}