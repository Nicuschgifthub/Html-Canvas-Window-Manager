class Cue {
    constructor() {
        this.inFade = 0;
        this.outFade = 0;
        this.delay = 0;
        this.id = 0;

        this.data = [];

        this._createId();
    }

    _createId() {
        this.id = FGMIds.getNewId();
    }

    addDirectValues() {

    }

    addPresetId() {

    }

    addFixtureGroupOrId() {

    }

    getId() {
        return this.id;
    }

    getInFade() {
        return this.inFade;
    }
    getOutFade() {
        return this.outFade;
    }
    getDelay() {
        return this.delay;
    }

    setInFade(value) {
        this.inFadeFade = value;
        return this;
    }
    setOutFade(value) {
        this.outFade = value;
        return this;
    }
    setDelay(value) {
        this.delay = value;
        return this;
    }
}

class Sequencer {
    constructor() {
        this.sequences = [];

        this.id = 0;

        this._createId();
    }

    _createId() {
        this.id = FGMIds.getNewId();
    }

    getSequences() {

    }
}