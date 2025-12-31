class Cue {
    constructor(name = "New Cue") {
        this.id = FGMIds.getNewId('cue');
        this.name = name;
        this.inFade = 2; // Default 2s fade
        this.outFade = null; // null means same as inFade in gMA3 usually
        this.inDelay = 0;
        this.outDelay = null;

        this.trigType = 'Go'; // Go, Time, Follow, Wait
        this.trigTime = 0;

        this.cmd = ""; // Command string
        this.mib = "None"; // MIB mode

        this.data = {}; // { fixtureId: { attribute: { value, presetId } } }
    }

    /**
     * Set the entire content of the cue
     * @param {Object} content 
     */
    setContent(content) {
        this.data = JSON.parse(JSON.stringify(content));
        return this;
    }

    /**
     * Add direct values for a fixture
     * @param {string} fixtureId 
     * @param {Object} attributeValues - { dimmer: 0.5, pan: 0.2, ... }
     */
    addDirectValues(fixtureId, attributeValues) {
        if (!this.data[fixtureId]) this.data[fixtureId] = {};
        for (let attr in attributeValues) {
            this.data[fixtureId][attr] = {
                value: attributeValues[attr],
                presetId: null
            };
        }
        return this;
    }

    /**
     * Add a preset reference for a fixture attribute
     */
    addPresetId(fixtureId, attribute, presetId) {
        if (!this.data[fixtureId]) this.data[fixtureId] = {};
        this.data[fixtureId][attribute] = {
            presetId: presetId
        };
        return this;
    }

    getId() { return this.id; }
    getName() { return this.name; }
    setName(name) { this.name = name; return this; }

    getInFade() { return this.inFade; }
    getOutFade() { return this.outFade ?? this.inFade; }
    getInDelay() { return this.inDelay; }
    getOutDelay() { return this.outDelay ?? this.inDelay; }

    setSetting(key, value) {
        this[key] = value;
        return this;
    }

    getContent() { return this.data; }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            inFade: this.inFade,
            outFade: this.outFade,
            inDelay: this.inDelay,
            outDelay: this.outDelay,
            trigType: this.trigType,
            trigTime: this.trigTime,
            cmd: this.cmd,
            mib: this.mib,
            data: this.data
        };
    }

    static fromJSON(json) {
        const cue = new Cue(json.name);
        cue.id = json.id || FGMIds.getNewId('cue');
        cue.inFade = json.inFade ?? 2;
        cue.outFade = json.outFade ?? null;
        cue.inDelay = json.inDelay ?? 0;
        cue.outDelay = json.outDelay ?? null;
        cue.trigType = json.trigType || 'Go';
        cue.trigTime = json.trigTime ?? 0;
        cue.cmd = json.cmd || "";
        cue.mib = json.mib || "None";
        cue.data = json.data || {};
        return cue;
    }
}

class Sequence {
    constructor(name = "New Sequence") {
        this.id = FGMIds.getNewId('seq');
        this.name = name;
        this.cues = [];
    }

    addCue(cue) {
        if (!(cue instanceof Cue)) cue = Cue.fromJSON(cue);
        this.cues.push(cue);
        return this;
    }

    removeCue(index) {
        if (index >= 0 && index < this.cues.length) {
            this.cues.splice(index, 1);
        }
        return this;
    }

    moveCue(index, direction) {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex >= 0 && targetIndex < this.cues.length) {
            const temp = this.cues[index];
            this.cues[index] = this.cues[targetIndex];
            this.cues[targetIndex] = temp;
        }
        return this;
    }

    getCue(index) {
        return this.cues[index];
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            cues: this.cues.map(cue => cue.toJSON())
        };
    }

    static fromJSON(json) {
        const sequence = new Sequence(json.name);
        sequence.id = json.id || FGMIds.getNewId('seq');
        sequence.cues = (json.cues || []).map(c => Cue.fromJSON(c));
        return sequence;
    }
}

class Sequencer {
    constructor() {
        this.sequences = [];
        this.id = FGMIds.getNewId('sequencer');
    }

    getSequences() {
        return this.sequences;
    }

    addSequence(seq) {
        if (!(seq instanceof Sequence)) seq = Sequence.fromJSON(seq);
        this.sequences.push(seq);
        return this;
    }

    toJSON() {
        return {
            id: this.id,
            sequences: this.sequences.map(s => s.toJSON())
        };
    }

    static fromJSON(json) {
        const sequencer = new Sequencer();
        sequencer.id = json.id || FGMIds.getNewId('sequencer');
        sequencer.sequences = (json.sequences || []).map(s => Sequence.fromJSON(s));
        return sequencer;
    }
}