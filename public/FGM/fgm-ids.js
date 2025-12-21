let fgmIdStore = new Set();

class FGMIds {
    static _counter = 0;
    static _lastTimestamp = 0;

    static getNewId(prefix = 'id') {
        let timestamp = Date.now();

        if (timestamp === this._lastTimestamp) {
            this._counter++;
        } else {
            this._counter = 0;
            this._lastTimestamp = timestamp;
        }

        const newId = `${prefix}-${timestamp}-${this._counter}`;

        if (fgmIdStore.has(newId)) {
            return this.getNewId(prefix);
        }

        fgmIdStore.add(newId);
        return newId;
    }

    static isIdTaken(id) {
        return fgmIdStore.has(id);
    }
}