/* class GlobalInterrupter {
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
} */

class GlobalInterrupter {
    static _waitingRooms = new Map();

    static hasEventWaiting(GlobalActionType) {
        return this._waitingRooms.has(GlobalActionType) &&
            this._waitingRooms.get(GlobalActionType).length > 0;
    }

    /**
     * Waits for the FIRST event of the provided types to occur.
     * Usage: await GlobalInterrupter.waitFor('LOGIN', 'TIMEOUT');
     */
    static waitFor(...GlobalActionTypes) {
        const promises = GlobalActionTypes.map(type => {
            return new Promise((resolve) => {
                if (!this._waitingRooms.has(type)) {
                    this._waitingRooms.set(type, []);
                }
                this._waitingRooms.get(type).push(resolve);
            });
        });

        return Promise.race(promises);
    }

    /**
     * Waits for ALL provided events to occur.
     * Usage: await GlobalInterrupter.waitForAll('DATA_LOADED', 'ASSETS_LOADED');
     */
    static waitForAll(...GlobalActionTypes) {
        const promises = GlobalActionTypes.map(type => {
            return new Promise((resolve) => {
                if (!this._waitingRooms.has(type)) {
                    this._waitingRooms.set(type, []);
                }
                this._waitingRooms.get(type).push(resolve);
            });
        });

        return Promise.all(promises);
    }

    static resolveEvent(GlobalActionType, resolvedAction) {
        if (this.hasEventWaiting(GlobalActionType)) {
            const resolvers = this._waitingRooms.get(GlobalActionType);
            resolvers.forEach(resolve => resolve({ GlobalActionType, resolvedAction }));
            this._waitingRooms.delete(GlobalActionType);
        }
    }
}