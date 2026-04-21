class GlobalInterrupter {
    static _waitingRooms = new Map();

    static hasEventWaiting(GlobalActionType) {
        return this._waitingRooms.has(GlobalActionType) &&
            this._waitingRooms.get(GlobalActionType).length > 0;
    }

    static waitFor(GlobalActionType) {
        return new Promise((resolve) => {
            if (!this._waitingRooms.has(GlobalActionType)) {
                this._waitingRooms.set(GlobalActionType, []);
            }
            this._waitingRooms.get(GlobalActionType).push(resolve);
        });
    }

    static resolveEvent(GlobalActionType, data) {
        if (this.hasEventWaiting(GlobalActionType)) {
            const resolvers = this._waitingRooms.get(GlobalActionType);

            resolvers.forEach(resolve => resolve(data));

            this._waitingRooms.delete(GlobalActionType);
        }
    }
}