class FGMHandleAwaitActionStore {
    constructor() {
        this.action = null;
        this.window = null;
        this.data = null;

        // Custom

        this.singlePreset = null;

    }

    setAction(action) {
        this.action = action;
        return this;
    }

    getAction() {
        return this.action;
    }

    setWindow(window) {
        this.window = window;
        return this;
    }

    getWindow() {
        return this.window;
    }

    setSinglePreset(singlePreset) {
        this.singlePreset = singlePreset;
        return this;
    }

    getSinglePreset() {
        return this.singlePreset;
    }

    setData(data) {
        this.data = data;
        return this;
    }

    getData() {
        return this.data;
    }
}