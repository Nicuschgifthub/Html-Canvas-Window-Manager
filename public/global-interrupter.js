class GlobalInterrupter {
    static _waitingRooms = new Map();

    static hasEventWaiting(GlobalActionType) {
        return this._waitingRooms.has(GlobalActionType) &&
            this._waitingRooms.get(GlobalActionType).length > 0;
    }

    static _removeResolver(type, resolver) {
        if (this._waitingRooms.has(type)) {
            const list = this._waitingRooms.get(type);
            const index = list.indexOf(resolver);
            if (index !== -1) {
                list.splice(index, 1);
            }
            if (list.length === 0) {
                this._waitingRooms.delete(type);
            }
        }
    }

    static waitForSome(...GlobalActionTypes) {
        if (GlobalActionTypes.length === 1) {
            const type = GlobalActionTypes[0];
            return new Promise(resolve => {
                if (!this._waitingRooms.has(type)) this._waitingRooms.set(type, []);
                this._waitingRooms.get(type).push(resolve);
            });
        }

        return new Promise((resolve) => {
            const registeredResolvers = [];

            const cleanupAndResolve = (result) => {
                registeredResolvers.forEach(({ type, fn }) => {
                    this._removeResolver(type, fn);
                });
                resolve(result);
            };

            GlobalActionTypes.forEach(type => {
                if (!this._waitingRooms.has(type)) this._waitingRooms.set(type, []);

                const resolverFunc = (data) => cleanupAndResolve(data);

                this._waitingRooms.get(type).push(resolverFunc);
                registeredResolvers.push({ type, fn: resolverFunc });
            });
        });
    }

    static waitForAll(...GlobalActionTypes) {
        return Promise.all(GlobalActionTypes.map(type => this.waitFor(type)));
    }

    static resolveEvent(GlobalActionType, resolvedAction) {
        if (this.hasEventWaiting(GlobalActionType)) {
            const resolvers = this._waitingRooms.get(GlobalActionType);
            const resolversCopy = [...resolvers];
            resolversCopy.forEach(resolve => resolve({ GlobalActionType, resolvedAction }));
            this._waitingRooms.delete(GlobalActionType);
        }
    }
}