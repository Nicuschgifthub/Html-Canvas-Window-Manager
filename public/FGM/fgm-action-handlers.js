class FGMActionRegistry {
    static _handlers = new Map();

    /** @param {string} actionType @param {object} handler */
    static register(actionType, handler) {
        this._handlers.set(actionType, handler);
    }

    /** @param {string} actionType */
    static getHandler(actionType) {
        return this._handlers.get(actionType) || null;
    }
}

class FGMBaseHandler {
    constructor() { }

    /** @param {FGMHandleAwaitActionStore} actionStore */
    handleInteraction(actionStore) {
        // Base click/interaction logic
    }

    /** @param {string} value */
    handleKeyboardEnter(value) {
        // Base keyboard enter logic
    }

    /** @param {HCWWindow} win */
    handleKeyboardUpdate(win, field, value) {
        // Real-time updates if needed
    }
}