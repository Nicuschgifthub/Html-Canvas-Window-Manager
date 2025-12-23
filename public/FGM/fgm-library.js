class FGMLibrary {
    constructor() {
        this.profiles = [];
    }

    /**
     * Loads fixture profiles from a JSON object or array.
     * @param {Array|Object} json 
     */
    loadLibrary(json) {
        if (Array.isArray(json)) {
            this.profiles = json;
        } else if (json && typeof json === 'object') {
            this.profiles = [json];
        }
        console.log(`FGMLibrary: Loaded ${this.profiles.length} profiles.`);
        return this;
    }

    /**
     * Searches for profiles matching a name or short name.
     * @param {string} query 
     * @returns {Array}
     */
    searchProfiles(query) {
        if (!query) return this.profiles;
        const q = query.toLowerCase();
        return this.profiles.filter(p =>
            (p.name && p.name.toLowerCase().includes(q)) ||
            (p.shortName && p.shortName.toLowerCase().includes(q))
        );
    }

    /**
     * Gets a specific profile by its short name.
     * @param {string} shortName 
     * @returns {Object|null}
     */
    getProfile(shortName) {
        return this.profiles.find(p => p.shortName === shortName) || null;
    }

    getProfiles() {
        return this.profiles;
    }
}
