class FGMKeyboardInteractionSettings {
    constructor() {
        // Default values
        this.config = {
            initialValue: "",
            label: "Keyboard",
            onEnter: () => { },
            verify: () => true,
            isNumeric: false
        };
    }

    static create() {
        return new FGMKeyboardInteractionSettings();
    }

    setInitialValue(val) {
        this.config.initialValue = val;
        return this;
    }

    setLabel(text) {
        this.config.label = text;
        return this;
    }

    onEnter(fn) {
        this.config.onEnter = fn;
        return this;
    }

    setVerify(fn) {
        this.config.verify = fn;
        return this;
    }

    numericOnly() {
        this.config.isNumeric = true;
        this.config.verify = (val) => /^\d+$/.test(val);
        return this;
    }

    // This returns the final object to the Interaction class
    getConfig() {
        return this.config;
    }
}

class FGMKeyboardInteraction {
    static openKeyboard({ }) {


    }
}