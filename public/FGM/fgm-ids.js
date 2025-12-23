let fgmIdStore = new Set();

class FGMIds {
    static _registry = {};

    static _generate(prefix) {
        let timestamp = Date.now();

        if (!this._registry[prefix]) {
            this._registry[prefix] = { counter: 0, lastTimestamp: 0 };
        }

        const state = this._registry[prefix];

        if (timestamp === state.lastTimestamp) {
            state.counter++;
        } else {
            state.counter = 0;
            state.lastTimestamp = timestamp;
        }

        const newId = `${prefix}-${timestamp}-${state.counter}`;

        if (fgmIdStore.has(newId)) {
            return this._generate(prefix);
        }

        fgmIdStore.add(newId);
        return newId;
    }

    static getNewId(prefix = 'id') {
        return this._generate(prefix);
    }

    static newWindowId(prefix = 'window') {
        return this._generate(prefix);
    }

    static newPageId() {
        return this._generate('page');
    }

    static newComponentId() {
        return this._generate('comp');
    }

    static isIdTaken(id) {
        return fgmIdStore.has(id);
    }

    static resetStore() {
        fgmIdStore.clear();
        this._registry = {};
    }

    static get DEFAULT() {
        return {
            WINDOWS: {
                get ART_NET_CONFIG() {
                    return 'd_w_art_net_config';
                },
                get PATCH_WINDOW() {
                    return 'd_w_patch_window';
                },
                get FIXTURE_LIST_CONFIG() {
                    return 'd_w_fixture_list_config';
                },
                get FIXTURE_LIST_SEARCH_FIELD(){
                    return 'd_w_fixture_list_search_field';
                }
            }
        }
    }
}