class HCWBaseField {
    constructor(text, id = Date.now()) {
        this.text = text;
        this.id = id;
        this.fgmType = null;
        this.parentWindow = null;
        this.renderProps = {};
        this.actionFunction = null;
        this.className = 'HCWBaseField';
    }

    getId() {
        return this.id;
    }

    getLabel() {
        return this.text;
    }

    setLabel(label) {
        this.text = label;
        this.updateFrame();
        return this;
    }

    getFGMType() {
        return this.fgmType;
    }

    setFGMType(type = null) {
        this.fgmType = type;
        return this;
    }

    setParentWindow(win) {
        this.parentWindow = win;
        return this;
    }

    getParentWindow() {
        return this.parentWindow;
    }

    updateFrame() {
        if (typeof HCWRender !== 'undefined') {
            HCWRender.updateFrame();
        }
    }

    getExcludedJSONKeys() {
        return ['parentWindow', 'onValueChangeCallback', 'onPresetPressCallback', 'onEnterCallback', 'onColorChangeCallback'];
    }

    getActionFunction() {
        return this.actionFunction;
    }

    onAction(newFunction) {
        this.actionFunction = newFunction;
        return this;
    }

    emitAction(type, data = {}) {
        // If not set, try to set the default global handler
        if (typeof this.actionFunction !== 'function' && typeof FGMEvents !== 'undefined') {
            this.actionFunction = FGMEvents.onAction;
        }

        if (typeof this.actionFunction === 'function') {
            data.parentWindow = this.parentWindow;
            data.fgmType = this.fgmType;
            data.id = this.id;
            data.fieldClass = this;

            this.actionFunction(type, data);
        } else {
            console.warn(`Action ${type} skipped: No handler found locally or in FGMEvents.`);
        }
    }

    toJSON() {
        const copy = { ...this };
        this.getExcludedJSONKeys().forEach(key => delete copy[key]);
        return copy;
    }

    fromJSON(json) {
        try {
            const data = typeof json === 'string' ? JSON.parse(json) : json;
            Object.assign(this, data);
            this.updateFrame();
        } catch (e) {
            console.error("Failed to restore field:", e);
        }
        return this;
    }
}

class HCWFaderField extends HCWBaseField {
    constructor(faderText = 'Fader 01', id = Date.now()) {
        super(faderText, id);

        this.className = 'HCWFaderField';

        this.value = 0.0; // 0.0 to 1.0
        this.displayType = 'byte'; // 'value', 'byte', 'percent'

        this.renderProps = {
            colors: {
                background: '#1b1717ff',
                fader: '#574b4bff',
                text: '#ffffff'
            },
            startX: null,
            startY: null,
            endX: null,
            endY: null,
            sx: null,
            sy: null
        };

        this._potentialClick = false;
        this._clickStartY = 0;
    }

    getType() {
        return GLOBAL_TYPES.CONTEXT_FIELDS.FADER;
    }

    setValue(val) {
        const oldVal = this.value;
        this.value = Math.max(0, Math.min(1, val));

        if (oldVal !== this.value) {

            this.emitAction(GLOBAL_TYPES.ACTIONS.FADER_VALUE_UPDATE, {
                value: this.value,
                byte: Math.round(this.value * 255),
                percent: Math.round(this.value * 100)
            });

            this.updateFrame();
        }
        return this;
    }

    setDisplayType(type) {
        if (['value', 'byte', 'percent'].includes(type)) {
            this.displayType = type;
            this.updateFrame();
        }
        return this;
    }

    getValue() {
        return this.value;
    }

    _getFormattedValue() {
        switch (this.displayType) {
            case 'byte':
                return Math.round(this.value * 255).toString();
            case 'percent':
                return Math.round(this.value * 100) + '%';
            case 'value':
            default:
                return this.value.toFixed(2);
        }
    }

    _interaction(interaction) {
        if (interaction.type === 'mousedown' || interaction.type === 'mousemove') {
            const relativeY = interaction.mouseY - this.renderProps.startY;
            const height = this.renderProps.sy;

            let normalizedVal = 1 - (relativeY / height);

            this.setValue(normalizedVal);
        } else if (interaction.type === 'scroll') {
            const step = 0.04;
            const direction = interaction.deltaY > 0 ? -1 : 1;
            this.setValue(this.value + (step * direction));
        }
    }

    render(contextwindow) {
        this.renderProps.startX = contextwindow.x;
        this.renderProps.startY = contextwindow.y;
        this.renderProps.sx = contextwindow.sx;
        this.renderProps.sy = contextwindow.sy;
        this.renderProps.endX = contextwindow.x2;
        this.renderProps.endY = contextwindow.y2;

        const { x, y, sx, sy } = contextwindow;
        const colors = this.renderProps.colors;

        HCW.ctx.fillStyle = colors.background;
        HCW.ctx.fillRect(x, y, sx, sy);

        const levelHeight = this.value * sy;
        const levelY = y + (sy - levelHeight);

        HCW.ctx.fillStyle = colors.fader;
        HCW.ctx.fillRect(x, levelY, sx, levelHeight);

        HCW.ctx.fillStyle = colors.text;
        HCW.ctx.font = "12px Arial";
        HCW.ctx.fillText(this.text, x + 5, y + 15);
        HCW.ctx.fillText(this._getFormattedValue(), x + 5, y + 30);
    }
}

class HCWEncoderField extends HCWBaseField {
    constructor(encoderText = 'Encoder', id = Date.now()) {
        super(encoderText, id);

        this.className = 'HCWEncoderField';

        this.value = 0.0;
        this.value2 = 0.0;

        this.displayType = 'byte';

        this.renderProps = {
            colors: {
                background: '#1b1717ff',
                knobOuter: '#574b4bff',
                knobInner: '#3d3434',
                indicator: '#ffffff',
                indicatorInner: '#00ff95',
                text: '#ffffff'
            },
            centerX: null, centerY: null,
            outerRadius: null, innerRadius: null,
            startX: null, startY: null,
            endX: null, endY: null,
            activeRing: null
        };

        this._lastInteractionAngle = null;
    }

    getType() {
        return GLOBAL_TYPES.CONTEXT_FIELDS.ENCODER;
    }

    setValue(val1, val2 = null) {
        let v1 = val1;
        let v2 = (val2 !== null) ? val2 : this.value2;

        while (v2 >= 1.0) {
            v2 -= 1.0;
            v1 += (1 / 255);
        }
        while (v2 < 0.0) {
            v2 += 1.0;
            v1 -= (1 / 255);
        }

        this.value = Math.max(0, Math.min(1, v1));
        this.value2 = Math.max(0, Math.min(1, v2));

        this._triggerCallback();
        this.updateFrame();
        return this;
    }

    _triggerCallback() {
        this.emitAction(GLOBAL_TYPES.ACTIONS.ENCODER_VALUE_UPDATE, {
            outer: {
                value: this.value,
                byte: Math.round(this.value * 255),
                percent: Math.round(this.value * 100)
            },
            inner: {
                value: this.value2,
                byte: Math.round(this.value2 * 255),
                percent: Math.round(this.value2 * 100)
            },
            combinedByte: Math.round(this.value * 255) + Math.round(this.value2 * 255)
        });
    }

    setDisplayType(type) {
        if (['value', 'byte', 'percent'].includes(type)) {
            this.displayType = type;
            this.updateFrame();
        }
        return this;
    }

    getValue() {
        return this.value;
    }

    _getFormattedValue(val) {
        switch (this.displayType) {
            case 'byte':
                return Math.round(val * 255).toString();
            case 'percent':
                return Math.round(val * 100) + '%';
            case 'value':
                return val;
            default:
                return val;
        }
    }

    _interaction(interaction) {
        if (interaction.type === 'mousedown') {
            const cx = this.renderProps.centerX;
            const cy = this.renderProps.centerY;
            const dist = Math.sqrt(Math.pow(interaction.mouseX - cx, 2) + Math.pow(interaction.mouseY - cy, 2));

            if (dist < this.renderProps.innerRadius * 1.2) {
                this.renderProps.activeRing = 'inner';
            } else {
                this.renderProps.activeRing = 'outer';
            }

        } else if (interaction.type === 'mousemove') {
            if (this.renderProps.activeRing) {
                this._updateFromDelta(interaction.mouseX, interaction.mouseY);
            }

        } else if (interaction.type === 'mouseup') {
            this.renderProps.activeRing = null;

        } else if (interaction.type === 'scroll') {
            const step = 0.02;
            const direction = interaction.deltaY > 0 ? -1 : 1;
            this.setValue(this.value + (step * direction));
        }
    }

    _updateFromDelta(mx, my) {
        const cx = this.renderProps.centerX;
        const cy = this.renderProps.centerY;
        const currentAngle = Math.atan2(my - cy, mx - cx);

        if (this._lastInteractionAngle === null) {
            this._lastInteractionAngle = currentAngle;
            return;
        }

        let delta = currentAngle - this._lastInteractionAngle;
        if (delta > Math.PI) delta -= 2 * Math.PI;
        if (delta < -Math.PI) delta += 2 * Math.PI;

        const rotationSensitivity = delta / (Math.PI * 2);

        if (this.renderProps.activeRing === 'inner') {
            this.setValue(this.value, this.value2 + rotationSensitivity);
        } else {
            this.setValue(this.value + rotationSensitivity, this.value2);
        }

        this._lastInteractionAngle = currentAngle;
    }

    _drawIndicator(cx, cy, radius, value, color, isFullRotation = false) {
        let currentRad;

        if (isFullRotation) {
            currentRad = (value * 2 * Math.PI) - (Math.PI / 2);
        } else {
            const startRad = (135 * Math.PI) / 180;
            const rangeRad = (270 * Math.PI) / 180;
            currentRad = startRad + (value * rangeRad);
        }

        const indX = cx + (Math.cos(currentRad) * (radius * 0.8));
        const indY = cy + (Math.sin(currentRad) * (radius * 0.8));

        HCW.ctx.beginPath();
        HCW.ctx.moveTo(cx, cy);
        HCW.ctx.lineTo(indX, indY);
        HCW.ctx.strokeStyle = color;
        HCW.ctx.lineWidth = 3;
        HCW.ctx.stroke();
    }

    render(contextwindow) {
        this.renderProps.startX = contextwindow.x;
        this.renderProps.startY = contextwindow.y;
        this.renderProps.endX = contextwindow.x2;
        this.renderProps.endY = contextwindow.y2;

        const sx = contextwindow.sx;
        const sy = contextwindow.sy;

        const showText = sy > 100;
        const cx = contextwindow.x + (sx / 2);

        let knobCy;
        if (showText) {
            knobCy = contextwindow.y + (sy * 0.45);
        } else {
            knobCy = contextwindow.y + (sy * 0.5);
        }

        const minDim = Math.min(sx, sy);
        const outerRadius = (minDim * 0.35);
        const innerRadius = (minDim * 0.20);

        this.renderProps.centerX = cx;
        this.renderProps.centerY = knobCy;
        this.renderProps.outerRadius = outerRadius;
        this.renderProps.innerRadius = innerRadius;

        const colors = this.renderProps.colors;

        HCW.ctx.fillStyle = colors.background;
        HCW.ctx.fillRect(contextwindow.x, contextwindow.y, sx, sy);

        HCW.ctx.beginPath();
        HCW.ctx.arc(cx, knobCy, outerRadius, 0, 2 * Math.PI);
        HCW.ctx.fillStyle = colors.knobOuter;
        HCW.ctx.fill();
        this._drawIndicator(cx, knobCy, outerRadius, this.value, colors.indicator, false);

        HCW.ctx.beginPath();
        HCW.ctx.arc(cx, knobCy, innerRadius, 0, 2 * Math.PI);
        HCW.ctx.fillStyle = colors.knobInner;
        HCW.ctx.fill();

        this._drawIndicator(cx, knobCy, innerRadius, this.value2, colors.indicatorInner, true);

        if (showText) {
            HCW.ctx.fillStyle = colors.text;
            HCW.ctx.font = "12px Arial";
            HCW.ctx.textAlign = "center";
            HCW.ctx.fillText(this.text, cx, knobCy + outerRadius + 20);

            HCW.ctx.font = "10px Monospace";
            const v1Str = this._getFormattedValue(this.value);
            const v2Str = this._getFormattedValue(this.value2);
            HCW.ctx.fillText(`${v1Str} | ${v2Str}`, cx, knobCy + outerRadius + 35);

            HCW.ctx.textAlign = "start";
        }
    }
}

class HCWPreset {
    constructor(name = "Preset") {
        this.className = 'HCWPreset';
        this.id = (Date.now() + Math.random());
        this.name = name;
        this.color = null;
        this.defaultColor = null;
        this.data = null;
        this.progress = null;
        this.parentField = null;
        this.flashing = false;
        this.selectionState = 0;
    }

    getId() { return this.id; }
    getName() { return this.name; }
    getLabel() { return this.name; }
    getColor() { return this.color; }
    getDefaultColor() { return this.defaultColor; }
    getData() { return this.data; }
    getProgress() { return this.progress; }
    getType() { return GLOBAL_TYPES.CONTEXT_FIELDS.SINGLE_PRESET; }
    getParentField() { return this.parentField; }
    isFlashing() { return this.flashing; }
    getSelectionState() { return this.selectionState; }
    isSelected() { return this.selectionState > 0; }

    setId(id) { this.id = id; return this; }
    setName(name) { this.name = name; return this; }
    setLabel(name) { this.name = name; return this; }
    setColor(color) { this.color = color; return this; }
    setDefaultColor(color) { this.defaultColor = color; return this; }
    setData(data) { this.data = data; return this; }
    setProgress(progress) { this.progress = progress; return this; }
    setParentField(field) { this.parentField = field; return this; }
    setFlashing(flashing) { this.flashing = flashing; return this; }

    setSelectionState(state) {
        this.selectionState = state;
        return this;
    }

    setSelected(selected) {
        this.selectionState = selected ? 2 : 0;
        return this;
    }

    update(updates = {}) {
        Object.keys(updates).forEach(key => {
            if (this.hasOwnProperty(key)) this[key] = updates[key];
        });
        return this;
    }

    toJSON() {
        const copy = { ...this };
        delete copy.parentField;
        return copy;
    }

    fromJSON(json) {
        const data = typeof json === 'string' ? JSON.parse(json) : json;
        Object.assign(this, data);
        return this;
    }

    forceRerender() {
        if (this.parentField && typeof HCWRender !== 'undefined') {
            HCWRender.updateFrame();
        }
    }
}

class HCWPresetField extends HCWBaseField {
    constructor(fieldName = 'Presets', id = Date.now()) {
        super(fieldName, id);

        this.className = 'HCWPresetField';

        this.presets = [];

        this.scrollY = 0;

        this.itemMinWidth = 80;
        this.itemHeight = 60;
        this.gap = 5;
        this.headerHeight = 30;

        this.renderProps = {
            colors: {
                background: '#1b1717ff',
                headerText: '#ffffff',
                itemText: '#ffffffff',
                itemDefaultColor: '#aaaaaa',
                itemPressedColor: '#ffffff'
            },
            startX: null,
            startY: null,
            endX: null,
            endY: null,
            sx: null,
            sy: null,
            cols: 1,
            visibleItems: []
        };

        this._dragLastY = null;
        this._pressedIndex = -1;
    }

    toJSON() {
        const copy = super.toJSON();
        return copy;
    }

    getType() {
        return GLOBAL_TYPES.CONTEXT_FIELDS.PRESETS;
    }

    toJSON() {
        const copy = super.toJSON();
        copy.presets = this.presets.map(p => p.toJSON());
        return copy;
    }

    fromJSON(json) {
        try {
            const data = typeof json === 'string' ? JSON.parse(json) : json;
            Object.assign(this, data);
            if (data.presets) {
                this.presets = data.presets.map(p => new HCWPreset().fromJSON(p).setParentField(this));
            }
            this.updateFrame();
        } catch (e) {
            console.error("Failed to restore field:", e);
        }
        return this;
    }

    /** @param {...(HCWPreset|string)} nameOrInstances */
    addPresets(...nameOrInstances) {
        nameOrInstances.forEach(item => {
            if (item instanceof HCWPreset) {
                this._setupAndAddPreset(item);
            }
        });

        this.updateFrame();
        return this;
    }

    /**
     * @param {HCWPreset} preset 
     */
    _setupAndAddPreset(preset) {
        preset.setParentField(this);
        this.presets.push(preset);
    }

    updatePreset(id, updates = {}) {
        const preset = this.presets.find(p => p.id === id);
        if (preset) {
            preset.update(updates);
            this.updateFrame();
        } else {
            console.warn(`HCWPresetField: Preset with id '${id}' not found.`);
        }
        return this;
    }

    updateAllPresets(updates = {}, blacklistIds = []) {
        this.presets.forEach(preset => {
            if (blacklistIds.find(p => p === preset.id)) return;
            preset.update(updates);
        });
        this.updateFrame();
        return this;
    }

    clearAllPresets() {
        this.presets = [];
    }

    _interaction(interaction) {
        if (interaction.type === 'mousedown') {
            const { mouseX, mouseY } = interaction;
            this._clickStartY = mouseY;
            this._dragLastY = mouseY;

            if (mouseY > this.renderProps.startY + this.headerHeight) {
                this._potentialClick = true;
                const hitItem = this._findHitItem(mouseX, mouseY);
                if (hitItem) {
                    this._pressedIndex = hitItem.index;
                    if (typeof HCWRender !== 'undefined') HCWRender.updateFrame();
                }
            }

        } else if (interaction.type === 'mousemove') {
            const { mouseX, mouseY } = interaction;

            if (this._potentialClick && Math.abs(mouseY - this._clickStartY) > 5) {
                this._potentialClick = false;
                this._pressedIndex = -1;
            }

            if (this._dragLastY !== null && mouseY) {
                const dy = mouseY - this._dragLastY;
                this._dragLastY = mouseY;

                this.scrollY += dy;
                this._clampScroll();
                if (typeof HCWRender !== 'undefined') HCWRender.updateFrame();
            }

        } else if (interaction.type === 'mouseup') {
            if (this._potentialClick && this._pressedIndex !== -1) {
                const preset = this.presets[this._pressedIndex];
                if (preset) {
                    this.emitAction(GLOBAL_TYPES.ACTIONS.PRESET_PRESS, { preset, presetData: preset.data });
                }
            }

            this._dragLastY = null;
            this._potentialClick = false;
            this._pressedIndex = -1;
            if (typeof HCWRender !== 'undefined') HCWRender.updateFrame();
        } else if (interaction.type === 'scroll') {
            this.scrollY -= interaction.deltaY;
            this._clampScroll();
            if (typeof HCWRender !== 'undefined') HCWRender.updateFrame();
        }
    }

    _findHitItem(x, y) {
        return this.renderProps.visibleItems.find(item =>
            x >= item.x && x <= item.x + item.w &&
            y >= item.y && y <= item.y + item.h
        );
    }

    _clampScroll() {
        const contentHeight = Math.ceil(this.presets.length / this.renderProps.cols) * (this.itemHeight + this.gap);
        const viewHeight = this.renderProps.sy - this.headerHeight;

        if (contentHeight <= viewHeight) {
            this.scrollY = 0;
        } else {
            const minScroll = -(contentHeight - viewHeight + 10);
            this.scrollY = Math.min(0, Math.max(minScroll, this.scrollY));
        }
    }

    render(contextwindow) {
        this.renderProps.startX = contextwindow.x;
        this.renderProps.startY = contextwindow.y;
        this.renderProps.endX = contextwindow.x2;
        this.renderProps.endY = contextwindow.y2;
        this.renderProps.sx = contextwindow.sx;
        this.renderProps.sy = contextwindow.sy;

        const { x, y, sx, sy } = contextwindow;

        const availWidth = sx;
        const cols = Math.max(1, Math.floor(availWidth / this.itemMinWidth));
        this.renderProps.cols = cols;
        const itemWidth = (availWidth - ((cols - 1) * this.gap)) / cols;

        this._clampScroll();

        HCW.ctx.fillStyle = this.renderProps.colors.background;
        HCW.ctx.fillRect(x, y, sx, sy);

        HCW.ctx.fillStyle = this.renderProps.colors.headerText;
        HCW.ctx.font = "bold 14px Arial";
        HCW.ctx.textAlign = "center";
        HCW.ctx.fillText(this.text, x + (sx / 2), y + 20);
        HCW.ctx.textAlign = "start";

        HCW.ctx.save();
        HCW.ctx.beginPath();
        HCW.ctx.rect(x, y + this.headerHeight, sx, sy - this.headerHeight);
        HCW.ctx.clip();

        this.renderProps.visibleItems = [];

        const startY = y + this.headerHeight + this.scrollY;

        this.presets.forEach((preset, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);

            const px = x + (col * (itemWidth + this.gap));
            const py = startY + (row * (this.itemHeight + this.gap));

            if (py + this.itemHeight >= y && py <= y + sy) {

                let bgColor = preset.getColor() || this.renderProps.colors.itemDefaultColor;
                if (index === this._pressedIndex) {
                    bgColor = this.renderProps.colors.itemPressedColor;
                }

                if (preset.getDefaultColor() !== null && preset.getColor() == null) {
                    bgColor = preset.getDefaultColor();
                }

                const isFlashing = preset.isFlashing();

                if (isFlashing) {
                    if (typeof FGMKernel !== 'undefined' && FGMKernel.getAwaitingColor) {
                        bgColor = FGMKernel.getAwaitingColor();
                    } else {
                        // Fallback
                        const pulse = (Math.sin(Date.now() / 150) + 1) / 2;
                        if (pulse > 0.5) bgColor = '#ffffffaa';
                    }
                }

                HCW.ctx.fillStyle = bgColor;
                HCW.ctx.fillRect(px, py, itemWidth, this.itemHeight);

                if (preset.getSelectionState() > 0) {
                    const state = preset.getSelectionState();
                    HCW.ctx.strokeStyle = state === 2 ? "#39af0aff" : "#f1c40f"; // Green for Full, Yellow for Partial
                    HCW.ctx.lineWidth = 3;
                    HCW.ctx.strokeRect(px + 1.5, py + 1.5, itemWidth - 3, this.itemHeight - 3);
                }

                HCW.ctx.fillStyle = this.renderProps.colors.itemText;
                HCW.ctx.font = "12px Arial";
                HCW.ctx.textAlign = "center";

                let textY = py + (this.itemHeight / 2) + 4;
                if (preset.getProgress() !== undefined && preset.getProgress() !== null) {
                    textY = py + (this.itemHeight / 2) - 5;
                }

                HCW.ctx.fillText(preset.getName(), px + (itemWidth / 2), textY);

                if (preset.getProgress() !== undefined && preset.getProgress() !== null) {
                    const barHeight = 6;
                    const progress = Math.max(0, Math.min(1, preset.getProgress()));

                    HCW.ctx.fillStyle = "rgba(0,0,0,0.3)";
                    HCW.ctx.fillRect(px, py + this.itemHeight - barHeight, itemWidth, barHeight);

                    HCW.ctx.fillStyle = "#00ff00";
                    HCW.ctx.fillRect(px, py + this.itemHeight - barHeight, itemWidth * progress, barHeight);

                    HCW.ctx.fillStyle = this.renderProps.colors.itemText;
                    HCW.ctx.font = "10px Arial";
                    HCW.ctx.fillText(Math.round(progress * 100) + "%", px + (itemWidth / 2), textY + 15);
                }

                HCW.ctx.textAlign = "start";

                this.renderProps.visibleItems.push({
                    index,
                    x: px,
                    y: py,
                    w: itemWidth,
                    h: this.itemHeight
                });
            }
        });
        HCW.ctx.restore();
    }
}

class HCWNumberField extends HCWBaseField {
    constructor(fieldName = 'Numpad', id = Date.now()) {
        super(fieldName, id);
        this.type = 'numpad';
        this.className = 'HCWNumberField';

        this.value = "";
        this.cursorPos = 0;

        this.headerHeight = 30;
        this.displayHeight = 40;
        this.gap = 4;

        this.keys = [
            ['7', '8', '9'],
            ['4', '5', '6'],
            ['1', '2', '3'],
            ['.', '0', ','],
            ['<=', 'C', 'ENTER'],
            ['<', '>']
        ];

        this.physicalShiftDown = false;

        this.renderProps = {
            colors: {
                background: '#1b1717ff',
                headerText: '#ffffff',
                displayBg: '#000000',
                displayText: '#00ff95',
                cursorColor: '#00ff95',
                keyDefault: '#333333',
                keyActive: '#555555',
                keyText: '#ffffff',
                enterKey: '#005500',
                enterKeyActive: '#007700'
            },
            startX: null,
            startY: null,
            endX: null,
            endY: null,
            buttons: [],
            displayArea: null
        };

        this._pressedKey = null;
    }

    getType() {
        return GLOBAL_TYPES.CONTEXT_FIELDS.NUMBER_KEYPAD;
    }

    setValue(val) {
        this.value = String(val);
        this.cursorPos = this.value.length;
        this.updateFrame();
        return this;
    }

    _handleInput(key) {
        const NUM_ACTIONS = GLOBAL_TYPES.ACTIONS.NUMPAD_UPDATES;
        let actionTriggered = NUM_ACTIONS.KEY_PRESSED;

        if (key === 'ENTER' || key === 'Enter') {
            actionTriggered = NUM_ACTIONS.ENTER_PRESSED;
        } else if (key === 'C') {
            actionTriggered = NUM_ACTIONS.CLEAR_PRESSED;
            this.value = "";
            this.cursorPos = 0;
        } else if (key === '<=' || key === 'Backspace') {
            actionTriggered = NUM_ACTIONS.BACKSPACE_PRESSED;
            if (this.cursorPos > 0) {
                this.value = this.value.slice(0, this.cursorPos - 1) + this.value.slice(this.cursorPos);
                this.cursorPos--;
            }
        } else if (key === 'ArrowLeft' || key === '<') {
            actionTriggered = NUM_ACTIONS.ARROW_LEFT_PRESSED;
            this.cursorPos = Math.max(0, this.cursorPos - 1);
        } else if (key === 'ArrowRight' || key === '>') {
            actionTriggered = NUM_ACTIONS.ARROW_RIGHT_PRESSED;
            this.cursorPos = Math.min(this.value.length, this.cursorPos + 1);
        } else {
            const char = (key === ',') ? '.' : key;
            if (/^[0-9.]$/.test(char) || (key.length === 1 && !isNaN(key))) {
                this.value = this.value.slice(0, this.cursorPos) + char + this.value.slice(this.cursorPos);
                this.cursorPos++;
            }
        }

        this.emitAction(actionTriggered, {
            key: key,
            value: this.value,
            cursorPos: this.cursorPos
        });

        this.updateFrame();
    }

    _interaction(interaction) {
        if (interaction.type === 'mousedown') {
            const { mouseX, mouseY } = interaction;
            this._potentialClick = true;
            this._clickStartY = mouseY;

            const da = this.renderProps.displayArea;
            if (da && mouseX >= da.x && mouseX <= da.x + da.w && mouseY >= da.y && mouseY <= da.y + da.h) {
                this._setCursorByClick(mouseX);
                this.updateFrame();
                return;
            }

            const hit = this._findHitButton(mouseX, mouseY);
            if (hit) {
                this._pressedKey = hit.key;
                this.updateFrame();
            }

        } else if (interaction.type === 'mouseup') {
            if (this._potentialClick && this._pressedKey) {
                this._handleInput(this._pressedKey);
            }
            this._potentialClick = false;
            this._pressedKey = null;
            this.updateFrame();
        } else if (interaction.type === 'keydown') {
            this._handleInput(interaction.key);
        }
    }

    _setCursorByClick(mouseX) {
        const da = this.renderProps.displayArea;
        if (!da) return;

        HCW.ctx.font = "20px Monospace";
        const metrics = HCW.ctx.measureText(this.value);
        const textX = da.x + da.w - 15;
        const textStartX = textX - metrics.width;

        let newCursorPos = this.value.length;
        for (let i = 0; i < this.value.length; i++) {
            const prefix = this.value.slice(0, i + 1);
            const charRightEdge = textStartX + HCW.ctx.measureText(prefix).width;
            if (mouseX <= charRightEdge) {
                newCursorPos = i + 1;
                break;
            }
        }

        if (mouseX < textStartX) newCursorPos = 0;
        this.cursorPos = newCursorPos;
    }

    _findHitButton(x, y) {
        return this.renderProps.buttons.find(b =>
            x >= b.x && x <= b.x + b.w &&
            y >= b.y && y <= b.y + b.h
        );
    }

    render(contextwindow) {
        this.renderProps.startX = contextwindow.x;
        this.renderProps.startY = contextwindow.y;
        this.renderProps.endX = contextwindow.x2;
        this.renderProps.endY = contextwindow.y2;

        const { x, y, sx, sy } = contextwindow;

        HCW.ctx.fillStyle = this.renderProps.colors.background;
        HCW.ctx.fillRect(x, y, sx, sy);

        HCW.ctx.fillStyle = this.renderProps.colors.headerText;
        HCW.ctx.font = "bold 14px Arial";
        HCW.ctx.textAlign = "center";
        HCW.ctx.fillText(this.text, x + (sx / 2), y + 20);

        const displayY = y + this.headerHeight;
        HCW.ctx.fillStyle = this.renderProps.colors.displayBg;
        const daX = x + 5;
        const daW = sx - 10;
        const daH = this.displayHeight;
        HCW.ctx.fillRect(daX, displayY, daW, daH);
        this.renderProps.displayArea = { x: daX, y: displayY, w: daW, h: daH };

        HCW.ctx.fillStyle = this.renderProps.colors.displayText;
        HCW.ctx.font = "20px Monospace";
        HCW.ctx.textAlign = "right";

        const textX = x + sx - 15;
        const textY = displayY + 28;
        HCW.ctx.fillText(this.value, textX, textY);

        const fullTextWidth = HCW.ctx.measureText(this.value).width;
        const prefixWidth = HCW.ctx.measureText(this.value.slice(0, this.cursorPos)).width;
        const cursorX = (textX - fullTextWidth) + prefixWidth;

        HCW.ctx.beginPath();
        HCW.ctx.moveTo(cursorX, textY - 18);
        HCW.ctx.lineTo(cursorX, textY + 4);
        HCW.ctx.strokeStyle = this.renderProps.colors.cursorColor;
        HCW.ctx.lineWidth = 2;
        HCW.ctx.stroke();

        HCW.ctx.textAlign = "start";
        const gridY = displayY + this.displayHeight + 10;
        const gridH = sy - (gridY - y) - 5;
        const gridW = sx - 10;
        const gridX = x + 5;

        const rows = this.keys.length;
        const rowH = (gridH - ((rows - 1) * this.gap)) / rows;
        this.renderProps.buttons = [];

        this.keys.forEach((rowKeys, rowIndex) => {
            const rowY = gridY + (rowIndex * (rowH + this.gap));
            const cols = rowKeys.length;
            const colW = (gridW - ((cols - 1) * this.gap)) / cols;

            rowKeys.forEach((key, colIndex) => {
                const btnX = gridX + (colIndex * (colW + this.gap));
                let bg = (key === 'ENTER') ? this.renderProps.colors.enterKey : this.renderProps.colors.keyDefault;

                if (this._pressedKey === key) {
                    bg = (key === 'ENTER') ? this.renderProps.colors.enterKeyActive : this.renderProps.colors.keyActive;
                }

                HCW.ctx.fillStyle = bg;
                HCW.ctx.fillRect(btnX, rowY, colW, rowH);

                HCW.ctx.fillStyle = this.renderProps.colors.keyText;
                HCW.ctx.font = (key === 'ENTER') ? "bold 12px Arial" : "16px Arial";
                HCW.ctx.textAlign = "center";
                HCW.ctx.fillText(key, btnX + (colW / 2), rowY + (rowH / 2) + 6);

                this.renderProps.buttons.push({ key, x: btnX, y: rowY, w: colW, h: rowH });
            });
        });
    }
}

class HCWKeyboardField extends HCWBaseField {
    constructor(fieldName = 'Keyboard', id = Date.now()) {
        super(fieldName, id);

        this.className = 'HCWKeyboardField';

        this.type = 'keyboard';

        this.value = "";
        this.cursorPos = 0;
        this.isUpperCase = true;

        this.headerHeight = 30;
        this.displayHeight = 40;
        this.gap = 4;

        this.keys = [
            ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'ß'],
            ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O', 'P', 'Ü'],
            ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ö', 'Ä'],
            ['SHIFT', 'Y', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '-'],
            ['DELETE', '<=', 'SPACE', '<', '>', 'ENTER']
        ];

        this.physicalShiftDown = false;

        this.renderProps = {
            colors: {
                background: '#1b1717ff',
                headerText: '#ffffff',
                displayBg: '#000000',
                displayText: '#00ff95',
                cursorColor: '#00ff95',
                keyDefault: '#333333',
                keyActive: '#555555',
                keyText: '#ffffff',
                specialKey: '#005500',
                specialKeyActive: '#007700',
                deleteKey: '#770000',
                deleteKeyActive: '#990000',
                shiftKey: '#444444',
                shiftKeyActive: '#888888'
            },
            startX: null,
            startY: null,
            endX: null,
            endY: null,
            buttons: [],
            displayArea: null
        };

        this._pressedKey = null;
        this._dragLastY = null;
    }

    getType() {
        return GLOBAL_TYPES.CONTEXT_FIELDS.KEYBOARD;
    }

    setValue(val) {
        this.value = String(val);
        this.cursorPos = this.value.length;
        this.updateFrame();
        return this;
    }

    _handleInput(key) {
        const KBD_ACTIONS = GLOBAL_TYPES.ACTIONS.KEYBOARD_UPDATES;
        let actionTriggered = KBD_ACTIONS.KEY_PRESSED;

        if (key === 'ENTER' || key === 'Enter') {
            actionTriggered = KBD_ACTIONS.ENTER_PRESSED;
        } else if (key === '<=' || key === 'Backspace') {
            actionTriggered = KBD_ACTIONS.BACKSPACE_PRESSED;
            if (this.cursorPos > 0) {
                this.value = this.value.slice(0, this.cursorPos - 1) + this.value.slice(this.cursorPos);
                this.cursorPos--;
            }
        } else if (key === 'DELETE') {
            actionTriggered = KBD_ACTIONS.DELETE_ALL_PRESSED;
            this.value = "";
            this.cursorPos = 0;
        } else if (key === 'Delete' || key === 'entf') {
            if (this.cursorPos < this.value.length) {
                this.value = this.value.slice(0, this.cursorPos) + this.value.slice(this.cursorPos + 1);
            }
        } else if (key === 'SPACE' || key === ' ') {
            actionTriggered = KBD_ACTIONS.SPACE_PRESSED;
            this.value = this.value.slice(0, this.cursorPos) + " " + this.value.slice(this.cursorPos);
            this.cursorPos++;
        } else if (key === 'SHIFT' || key === 'Shift') {
            this.isUpperCase = !this.isUpperCase;
        } else if (key === 'ArrowLeft' || key === '<') {
            actionTriggered = KBD_ACTIONS.ARROW_LEFT_PRESSED;
            this.cursorPos = Math.max(0, this.cursorPos - 1);
        } else if (key === 'ArrowRight' || key === '>') {
            actionTriggered = KBD_ACTIONS.ARROW_RIGHT_PRESSED;
            this.cursorPos = Math.min(this.value.length, this.cursorPos + 1);
        } else if (key.length === 1) {
            let char = key;
            const useCaps = this.isUpperCase || this.physicalShiftDown;
            if (useCaps) {
                char = char.toUpperCase();
            } else {
                char = char.toLowerCase();
            }
            this.value = this.value.slice(0, this.cursorPos) + char + this.value.slice(this.cursorPos);
            this.cursorPos++;
        }

        this.emitAction(actionTriggered, {
            key: key,
            value: this.value,
            cursorPos: this.cursorPos,
            length: this.value.length
        });
    }

    _interaction(interaction) {
        if (interaction.type === 'mousedown') {
            const { mouseX, mouseY } = interaction;
            this._potentialClick = true;
            this._clickStartY = mouseY;

            const da = this.renderProps.displayArea;
            if (da && mouseX >= da.x && mouseX <= da.x + da.w && mouseY >= da.y && mouseY <= da.y + da.h) {
                this._setCursorByClick(mouseX);
                this.updateFrame();
                return;
            }

            const hit = this._findHitButton(mouseX, mouseY);
            if (hit) {
                this._pressedKey = hit.key;
                this.updateFrame();
            }

        } else if (interaction.type === 'mousemove') {
            const { mouseX, mouseY } = interaction;
            if (this._potentialClick && Math.abs(mouseY - this._clickStartY) > 5) {
                this._potentialClick = false;
                this._pressedKey = null;
                this.updateFrame();
            }

        } else if (interaction.type === 'mouseup') {

            if (this._potentialClick && this._pressedKey) {
                this._handleInput(this._pressedKey);
            }

            this._potentialClick = false;
            this._pressedKey = null;
            this.updateFrame();
        } else if (interaction.type === 'keydown') {
            if (interaction.key === 'Shift') this.physicalShiftDown = true;
            this._handleInput(interaction.key);
        } else if (interaction.type === 'keyup') {
            if (interaction.key === 'Shift') this.physicalShiftDown = false;
        }
    }

    _setCursorByClick(mouseX) {
        const da = this.renderProps.displayArea;
        if (!da) return;

        HCW.ctx.font = "20px Monospace";
        const metrics = HCW.ctx.measureText(this.value);
        let textStartX;

        if (metrics.width > da.w - 10) {
            textStartX = (da.x + da.w - 10) - metrics.width;
        } else {
            textStartX = da.x + 10;
        }

        let newCursorPos = this.value.length;

        for (let i = 0; i < this.value.length; i++) {
            const prefix = this.value.slice(0, i + 1);
            const charRightEdge = textStartX + HCW.ctx.measureText(prefix).width;

            if (mouseX <= charRightEdge) {
                newCursorPos = i + 1;
                break;
            }
        }

        if (mouseX < textStartX) {
            newCursorPos = 0;
        }

        this.cursorPos = newCursorPos;
    }

    _findHitButton(x, y) {
        return this.renderProps.buttons.find(b =>
            x >= b.x && x <= b.x + b.w &&
            y >= b.y && y <= b.y + b.h
        );
    }

    render(contextwindow) {
        this.renderProps.startX = contextwindow.x;
        this.renderProps.startY = contextwindow.y;
        this.renderProps.endX = contextwindow.x2;
        this.renderProps.endY = contextwindow.y2;

        const { x, y, sx, sy } = contextwindow;

        HCW.ctx.fillStyle = this.renderProps.colors.background;
        HCW.ctx.fillRect(x, y, sx, sy);

        HCW.ctx.fillStyle = this.renderProps.colors.headerText;
        HCW.ctx.font = "bold 14px Arial";
        HCW.ctx.textAlign = "center";
        HCW.ctx.fillText(this.text, x + (sx / 2), y + 20);
        HCW.ctx.textAlign = "start";

        const displayY = y + this.headerHeight;
        HCW.ctx.fillStyle = this.renderProps.colors.displayBg;
        const daX = x + 5;
        const daW = sx - 10;
        const daH = this.displayHeight;
        HCW.ctx.fillRect(daX, displayY, daW, daH);
        this.renderProps.displayArea = { x: daX, y: displayY, w: daW, h: daH };

        HCW.ctx.fillStyle = this.renderProps.colors.displayText;
        HCW.ctx.font = "20px Monospace";
        HCW.ctx.textAlign = "left";

        let textToDraw = this.value;
        const metrics = HCW.ctx.measureText(textToDraw);
        const textY = displayY + 28;
        let cursorX;

        if (metrics.width > sx - 20) {
            HCW.ctx.textAlign = "right";
            const textX = x + sx - 10;
            HCW.ctx.fillText(textToDraw, textX, textY);

            const prefixWidth = HCW.ctx.measureText(this.value.slice(0, this.cursorPos)).width;
            cursorX = (textX - metrics.width) + prefixWidth;
        } else {
            HCW.ctx.textAlign = "left";
            const textX = x + 10;
            HCW.ctx.fillText(textToDraw, textX, textY);

            const prefixWidth = HCW.ctx.measureText(this.value.slice(0, this.cursorPos)).width;
            cursorX = textX + prefixWidth;
        }

        // Draw Cursor
        HCW.ctx.beginPath();
        HCW.ctx.moveTo(cursorX, textY - 18);
        HCW.ctx.lineTo(cursorX, textY + 4);
        HCW.ctx.strokeStyle = this.renderProps.colors.cursorColor;
        HCW.ctx.lineWidth = 2;
        HCW.ctx.stroke();

        HCW.ctx.textAlign = "start";

        const gridY = displayY + this.displayHeight + 10;
        const gridH = sy - (gridY - y) - 5;
        const gridW = sx - 10;
        const gridX = x + 5;

        const rows = this.keys.length;
        const rowH = (gridH - ((rows - 1) * this.gap)) / rows;

        this.renderProps.buttons = [];

        this.keys.forEach((rowKeys, rowIndex) => {
            const rowY = gridY + (rowIndex * (rowH + this.gap));

            let totalKeyWeight = 0;
            if (rowIndex === 4) {
                rowKeys.forEach(k => {
                    if (k === 'SPACE') totalKeyWeight += 3;
                    else if (k === 'DELETE' || k === 'ENTER') totalKeyWeight += 1.5;
                    else if (k === '<' || k === '>') totalKeyWeight += 0.7;
                    else totalKeyWeight += 1;
                });
            } else if (rowIndex === 3) {
                rowKeys.forEach(k => {
                    if (k === 'SHIFT') totalKeyWeight += 1.5;
                    else totalKeyWeight += 1;
                });
            } else {
                totalKeyWeight = rowKeys.length;
            }

            const unitW = (gridW - ((rowKeys.length - 1) * this.gap)) / totalKeyWeight;

            let currentX = gridX;

            rowKeys.forEach((keyRaw, colIndex) => {
                let colW = unitW;
                if (rowIndex === 4) {
                    if (keyRaw === 'SPACE') colW = unitW * 3;
                    else if (keyRaw === 'DELETE' || keyRaw === 'ENTER') colW = unitW * 1.5;
                    else if (keyRaw === '<' || keyRaw === '>') colW = unitW * 0.7;
                } else if (rowIndex === 3) {
                    if (keyRaw === 'SHIFT') colW = unitW * 1.5;
                }

                let displayLabel = keyRaw;
                if (!this.isUpperCase && keyRaw.length === 1) {
                    displayLabel = keyRaw.toLowerCase();
                }

                let bg = this.renderProps.colors.keyDefault;
                if (keyRaw === 'ENTER') bg = this.renderProps.colors.specialKey;
                else if (keyRaw === 'DELETE' || keyRaw === '<=') bg = this.renderProps.colors.deleteKey;
                else if (keyRaw === 'SHIFT') bg = this.isUpperCase ? this.renderProps.colors.shiftKeyActive : this.renderProps.colors.shiftKey;

                if (this._pressedKey === keyRaw) {
                    if (keyRaw === 'ENTER') bg = this.renderProps.colors.specialKeyActive;
                    else if (keyRaw === 'DELETE' || keyRaw === '<=') bg = this.renderProps.colors.deleteKeyActive;
                    else if (keyRaw === 'SHIFT') { bg = '#aaaaaa'; }
                    else bg = this.renderProps.colors.keyActive;
                }

                HCW.ctx.fillStyle = bg;
                HCW.ctx.fillRect(currentX, rowY, colW, rowH);

                HCW.ctx.fillStyle = this.renderProps.colors.keyText;
                HCW.ctx.font = (displayLabel.length > 1) ? "bold 11px Arial" : "14px Arial";
                HCW.ctx.textAlign = "center";
                HCW.ctx.fillText(displayLabel, currentX + (colW / 2), rowY + (rowH / 2) + 5);
                HCW.ctx.textAlign = "start";

                this.renderProps.buttons.push({
                    key: keyRaw,
                    x: currentX,
                    y: rowY,
                    w: colW,
                    h: rowH
                });

                currentX += colW + this.gap;
            });
        });
    }
}

class HCWColorMapField extends HCWBaseField {
    constructor(label = 'Color 1', id = Date.now()) {
        super(label, id);
        this._CLASS_REBUILD_NONE_OVERWRITES = {
            mapFirstBuild: true,
        }

        this.className = 'HCWColorMapField';

        this.h = 0;
        this.s = 1;
        this.v = 1;

        this.extra = { white: 0, amber: 0, uv: 0 };

        this._colorMapCanvas = null;
        this._colorMapSize = 0;

        this.mouseDownOnceCalculated = true;

        this.renderProps = {
            map: null,
            valueFader: null,
            active: null,
            startX: null,
            startY: null,
            endX: null,
            endY: null,
            sliders: {
                r: null,
                g: null,
                b: null,
                white: null,
                amber: null,
                uv: null
            }
        };
    }

    getType() {
        return GLOBAL_TYPES.CONTEXT_FIELDS.COLOR_MAP_INPUT;
    }

    getColors() {
        const rgb = this._HCW_hsvToRgb(this.h, this.s, this.v);
        return { ...rgb, ...this.extra };
    }

    setColor(colors) {
        if (!colors) return;

        const r = colors.r !== undefined ? colors.r : this.getColors().r;
        const g = colors.g !== undefined ? colors.g : this.getColors().g;
        const b = colors.b !== undefined ? colors.b : this.getColors().b;
        this._rgbToHsv(r, g, b);

        if (colors.white !== undefined) this.extra.white = colors.white;
        if (colors.amber !== undefined) this.extra.amber = colors.amber;
        if (colors.uv !== undefined) this.extra.uv = colors.uv;

        this.updateFrame();
        return this;
    }

    _rgbToHsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const d = max - min;

        this.v = max;
        this.s = max === 0 ? 0 : d / max;

        if (d === 0) {
            this.h = 0;
        } else {
            if (max === r) this.h = (g - b) / d + (g < b ? 6 : 0);
            else if (max === g) this.h = (b - r) / d + 2;
            else this.h = (r - g) / d + 4;
            this.h /= 6;
        }
    }

    _trigger() {
        this.emitAction(GLOBAL_TYPES.ACTIONS.COLOR_FIELD_UPDATE, { colors: this.getColors() });
        this.updateFrame();
    }

    _HCW_hsvToRgb(h, s, v) {
        let i = Math.floor(h * 6);
        let f = h * 6 - i;
        let p = v * (1 - s);
        let q = v * (1 - f * s);
        let t = v * (1 - (1 - f) * s);

        let r, g, b;
        switch (i % 6) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            case 5: r = v; g = p; b = q; break;
        }

        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    _ensureColorMap(size) {
        size = Math.floor(size);
        if (size <= 1) return;

        if (this._colorMapCanvas && this._colorMapSize === size && this._CLASS_REBUILD_NONE_OVERWRITES.mapFirstBuild == false) return;

        this._CLASS_REBUILD_NONE_OVERWRITES.mapFirstBuild = false;

        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const ctx = c.getContext('2d');

        for (let y = 0; y < size; y++) {
            const s = 1 - y / size;
            for (let x = 0; x < size; x++) {
                const h = x / size;
                const { r, g, b } = this._HCW_hsvToRgb(h, s, 1);
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.fillRect(x, y, 1, 1);
            }
        }

        this._colorMapCanvas = c;
        this._colorMapSize = size;
    }

    _interaction(i) {
        const { mouseX, mouseY } = i;
        this.mouseDownOnceCalculated = true;

        if (i.type === 'mousedown') {
            this.checkMouseLocation(mouseX, mouseY);
        }

        if (this.mouseDownOnceCalculated == false || (i.type === 'mousemove' && this.renderProps.active)) {
            const a = this.renderProps.active;
            this.mouseDownOnceCalculated = true;

            if (a.type === 'map') {
                const m = this.renderProps.map;
                this.h = (mouseX - m.x) / m.w;
                this.s = 1 - ((mouseY - m.y) / m.h);
                this.h = Math.max(0, Math.min(1, this.h));
                this.s = Math.max(0, Math.min(1, this.s));
                if (!this.v) this.v = 1.0;
            }
            else if (a.type === 'value') {
                const f = this.renderProps.valueFader;
                let t = 1 - ((mouseY - f.y) / f.h);
                this.v = Math.max(0, Math.min(1, t));
            }
            else if (a.type === 'slider') {
                const r = this.renderProps.sliders[a.key];
                if (a.key === 'r' || a.key === 'g' || a.key === 'b') {
                    let t = (mouseX - r.x) / r.w;
                    t = Math.max(0, Math.min(1, t));
                    const rgb = this.getColors();
                    rgb[a.key] = Math.round(t * 255);
                    this._rgbToHsv(rgb.r, rgb.g, rgb.b);
                } else {
                    let t = 1 - ((mouseY - r.y) / r.h);
                    t = Math.max(0, Math.min(1, t));
                    this.extra[a.key] = Math.round(t * 255);
                }
            }
            this._trigger();
        }

        if (i.type === 'mouseup') {
            this.renderProps.active = null;
        }
    }

    checkMouseLocation(mouseX, mouseY) {
        this.renderProps.active = null;
        if (this._hit(this.renderProps.map, mouseX, mouseY)) {
            this.renderProps.active = { type: 'map' };
            this.mouseDownOnceCalculated = false;
        }
        if (this._hit(this.renderProps.valueFader, mouseX, mouseY)) {
            this.renderProps.active = { type: 'value' };
            this.mouseDownOnceCalculated = false;
        }
        for (const k in this.renderProps.sliders) {
            if (this._hit(this.renderProps.sliders[k], mouseX, mouseY)) {
                this.renderProps.active = { type: 'slider', key: k };
                this.mouseDownOnceCalculated = false;
            }
        }
    }

    _hit(r, x, y) {
        return r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    }

    render(w) {
        this.renderProps.startX = w.x;
        this.renderProps.startY = w.y;
        this.renderProps.endX = w.x2;
        this.renderProps.endY = w.y2;

        const ctx = HCW.ctx;
        const pad = 8;
        const labelW = 14;
        let vSliderW = 12;

        const innerW = w.sx - pad * 2;
        const innerH = w.sy - pad * 2;
        const topH = Math.floor(innerH * 0.7);

        const mapSize = Math.max(1, Math.floor(Math.min(
            topH,
            innerW - (vSliderW + pad) * 4
        )));

        this._ensureColorMap(mapSize);

        const mapX = w.x + pad;
        const mapY = w.y + pad;

        if (this._colorMapCanvas instanceof HTMLCanvasElement && this._colorMapSize > 0) {
            ctx.drawImage(this._colorMapCanvas, mapX, mapY);
        } else {
            ctx.fillStyle = '#111';
            ctx.fillRect(mapX, mapY, mapSize, mapSize);
        }

        this.renderProps.map = { x: mapX, y: mapY, w: mapSize, h: mapSize };

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(
            mapX + this.h * mapSize,
            mapY + (1 - this.s) * mapSize,
            5, 0, Math.PI * 2
        );
        ctx.stroke();

        const baseX = mapX + mapSize + pad;
        const vKeys = ['value', 'white', 'amber', 'uv'];
        const vColors = ['#fff', '#ddd', '#ffb000', '#8000ff'];

        vKeys.forEach((k, i) => {
            const mapDistance = mapX + mapSize;
            const spaceForVFaders = this.renderProps.endX - mapDistance;
            vSliderW = (spaceForVFaders - (vKeys.length * pad + pad)) / (vKeys.length);

            const x = baseX + i * (vSliderW + pad);
            ctx.fillStyle = '#222';
            ctx.fillRect(x, mapY, vSliderW, mapSize);

            const val = k === 'value' ? this.v * 255 : this.extra[k];
            const h = (val / 255) * mapSize;

            ctx.fillStyle = vColors[i];
            ctx.fillRect(x, mapY + mapSize - h, vSliderW, h);

            const rect = { x, y: mapY, w: vSliderW, h: mapSize };
            if (k === 'value') this.renderProps.valueFader = rect;
            else this.renderProps.sliders[k] = rect;
        });

        let sy = mapY + mapSize + pad;
        const bottomH = innerH - topH - pad;
        const sh = Math.max(8, bottomH / 4);
        const sw = innerW - labelW;

        const rgb = this.getColors();
        this.renderProps.sliders.r = this._drawHSlider(ctx, 'R', mapX + labelW, sy, sw, sh, rgb.r, '#ff4444'); sy += sh + pad;
        this.renderProps.sliders.g = this._drawHSlider(ctx, 'G', mapX + labelW, sy, sw, sh, rgb.g, '#44ff44'); sy += sh + pad;
        this.renderProps.sliders.b = this._drawHSlider(ctx, 'B', mapX + labelW, sy, sw, sh, rgb.b, '#4444ff');

        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.textAlign = "left";
        ctx.fillText(this.text, w.x + pad, w.y + 10);
    }

    _drawHSlider(ctx, label, x, y, w, h, value, color) {
        ctx.fillStyle = '#222';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = color;
        ctx.fillRect(x, y, (value / 255) * w, h);
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = "center";
        ctx.fillText(label, x - 8, y + h - 1);
        return { x, y, w, h };
    }
}

class HCWTableField extends HCWBaseField {
    constructor(fieldName = 'Settings', id = Date.now()) {
        super(fieldName, id);

        this.className = 'HCWTableField';

        this.headers = [];
        this.rows = [];
        this.renderMode = 'table'; // 'table' or 'list'

        this.addRowLabel = null;
        this.showRemoveButton = false;

        this.rowHeight = 35;
        this.headerHeight = 40;
        this.addBtnHeight = 40;

        this.scrollY = 0;
        this._dragLastY = null;
        this._clickStartY = null;
        this._clickStartX = null;
        this._potentialClick = false;

        this.renderProps = {
            startX: null,
            startY: null,
            endX: null,
            endY: null,
            sx: null,
            sy: null,
            cells: [],
            deleteButtons: [],
            addButton: null
        };
    }

    getType() {
        return GLOBAL_TYPES.CONTEXT_FIELDS.TABLE;
    }

    setHeaders(headers) {
        this.headers = headers;
        this.updateFrame();
        return this;
    }

    setRows(rows) {
        this.rows = rows;
        this.updateFrame();
        return this;
    }

    setButtonAddRowLabel(label) {
        this.addRowLabel = label;
        return this;
    }

    setButtonRemoveRow(addButton = true) {
        this.showRemoveButton = addButton;
        return this;
    }

    setRenderMode(mode) {
        this.renderMode = mode;
        this.updateFrame();
        return this;
    }

    _interaction(interaction) {
        const { mouseX, mouseY, type, deltaY } = interaction;

        if (type === 'mousedown') {
            this._clickStartX = mouseX;
            this._clickStartY = mouseY;
            this._dragLastY = mouseY;
            this._potentialClick = true;

        } else if (type === 'mousemove') {
            if (this._dragLastY !== null) {
                const dy = mouseY - this._dragLastY;

                if (Math.abs(mouseY - this._clickStartY) > 10) {
                    this._potentialClick = false;
                }

                this.scrollY += dy;
                this._clampScroll();
                this.updateFrame();
                this._dragLastY = mouseY;
            }

        } else if (type === 'mouseup') {
            if (this._potentialClick) {
                const clickX = this._clickStartX;
                const clickY = this._clickStartY;

                const hitCell = this.renderProps.cells.find(c =>
                    clickX >= c.x && clickX <= c.x + c.w &&
                    clickY >= c.y && clickY <= c.y + c.h
                );

                const hitDelete = this.renderProps.deleteButtons.find(b =>
                    clickX >= b.x && clickX <= b.x + b.w &&
                    clickY >= b.y && clickY <= b.y + b.h
                );

                if (hitCell && !hitDelete) {
                    this.emitAction(GLOBAL_TYPES.ACTIONS.TABLE_UPDATES.CELL_PRESS, {
                        rowIndex: hitCell.rowIndex,
                        colIndex: hitCell.colIndex,
                        value: hitCell.value
                    });
                    return;
                }

                if (hitDelete) {
                    this.emitAction(GLOBAL_TYPES.ACTIONS.TABLE_UPDATES.CELL_DELETE, {
                        rowIndex: hitDelete.rowIndex,
                    });
                    return;
                }

                const hitAdd = this.renderProps.addButton;
                if (hitAdd && clickX >= hitAdd.x && clickX <= hitAdd.x + hitAdd.w &&
                    clickY >= hitAdd.y && clickY <= hitAdd.y + hitAdd.h) {
                    this.emitAction(GLOBAL_TYPES.ACTIONS.TABLE_UPDATES.CELL_ADD);
                }
            }

            this._dragLastY = null;
            this._potentialClick = false;

        } else if (type === 'scroll') {
            this.scrollY -= deltaY;
            this._clampScroll();
            this.updateFrame();
        }
    }

    _clampScroll() {
        const rowH = this._getEffectiveRowHeight();
        const rowsHeight = this.rows.length * rowH;

        const addBtnTotalH = (this.addRowLabel != null) ? (this.addBtnHeight + 20) : 10;
        const contentHeight = rowsHeight + addBtnTotalH;

        const hH = this.renderMode === 'table' ? this.headerHeight : 0;
        const viewHeight = this.renderProps.sy - hH;

        if (contentHeight <= viewHeight) {
            this.scrollY = 0;
        } else {
            const minScroll = -(contentHeight - viewHeight);
            this.scrollY = Math.min(0, Math.max(minScroll, this.scrollY));
        }
    }

    _getEffectiveRowHeight() {
        if (this.renderMode === 'list') {
            return (this.headers.length) * 20 + 20;
        }
        return this.rowHeight;
    }

    updateCellValue(rowIndex, colIndex, newValue) {
        if (this.rows[rowIndex] && this.rows[rowIndex][colIndex] !== undefined) {
            this.rows[rowIndex][colIndex] = newValue;
            this.updateFrame();
        }
    }

    render(w) {
        this.renderProps.startX = w.x;
        this.renderProps.startY = w.y;
        this.renderProps.endX = w.x2;
        this.renderProps.endY = w.y2;
        this.renderProps.sx = w.sx;
        this.renderProps.sy = w.sy;

        this.renderProps.cells = [];
        this.renderProps.deleteButtons = [];
        this.renderProps.addButton = null;

        const ctx = HCW.ctx;
        if (!ctx) return;

        if (this.renderMode === 'list') {
            this._renderList(w, ctx);
        } else {
            this._renderTable(w, ctx);
        }

        ctx.restore();
        ctx.textAlign = 'start';
    }

    _renderTable(w, ctx) {
        const pad = 10;
        const deleteColW = 40;
        const availableW = w.sx - pad * 2 - deleteColW;
        const colW = availableW / (this.headers.length || 1);

        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(w.x, w.y, w.sx, w.sy);

        ctx.fillStyle = '#333';
        ctx.fillRect(w.x, w.y, w.sx, this.headerHeight);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';

        this.headers.forEach((header, i) => {
            const x = w.x + pad + i * colW;
            ctx.fillText(header, x + colW / 2, w.y + this.headerHeight / 2 + 5);
        });

        ctx.save();
        const contentAreaY = w.y + this.headerHeight;
        const contentAreaH = w.sy - this.headerHeight;

        ctx.beginPath();
        ctx.rect(w.x, contentAreaY, w.sx, contentAreaH);
        ctx.clip();

        const startDrawY = contentAreaY + this.scrollY;

        ctx.font = '13px Arial';
        this.rows.forEach((row, rowIndex) => {
            const rowY = startDrawY + rowIndex * this.rowHeight;
            if (rowY + this.rowHeight < contentAreaY || rowY > w.y + w.sy) return;

            ctx.fillStyle = rowIndex % 2 === 0 ? '#252525' : '#1e1e1e';
            ctx.fillRect(w.x, rowY, w.sx, this.rowHeight);

            row.forEach((cell, colIndex) => {
                const cellX = w.x + pad + colIndex * colW;
                ctx.fillStyle = '#bbb';
                ctx.fillText(cell, cellX + colW / 2, rowY + this.rowHeight / 2 + 5);

                this.renderProps.cells.push({
                    x: cellX, y: rowY, w: colW, h: this.rowHeight, rowIndex, colIndex, value: cell
                });
            });

            if (this.showRemoveButton) {
                const b = this._getDeleteButtonProps(w, rowY, pad, deleteColW);
                ctx.fillStyle = '#770000';
                ctx.fillRect(b.x, b.y, b.w, b.h);
                ctx.fillStyle = '#fff';
                ctx.fillText('X', b.x + b.w / 2, b.y + b.h / 2 + 5);
                this.renderProps.deleteButtons.push({ ...b, rowIndex });
            }

            ctx.strokeStyle = '#333';
            ctx.beginPath();
            ctx.moveTo(w.x, rowY + this.rowHeight);
            ctx.lineTo(w.x2, rowY + this.rowHeight);
            ctx.stroke();
        });

        ctx.strokeStyle = '#333';
        for (let i = 1; i < this.headers.length; i++) {
            const x = w.x + pad + i * colW;
            ctx.beginPath();
            ctx.moveTo(x, w.y + this.headerHeight);
            ctx.lineTo(x, w.y2);
            ctx.stroke();
        }

        if (this.addRowLabel != null) {
            this._drawAddButton(w, ctx, contentAreaY, startDrawY);
        }

        ctx.restore();
    }

    _renderList(w, ctx) {
        const pad = 10;
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(w.x, w.y, w.sx, w.sy);

        ctx.save();
        ctx.beginPath();
        ctx.rect(w.x, w.y, w.sx, w.sy);
        ctx.clip();

        const startDrawY = w.y + this.scrollY;
        const rowH = this._getEffectiveRowHeight();

        this.rows.forEach((row, rowIndex) => {
            const rowY = startDrawY + rowIndex * rowH;
            if (rowY + rowH < w.y || rowY > w.y + w.sy) return;

            ctx.fillStyle = rowIndex % 2 === 0 ? '#252525' : '#1e1e1e';
            ctx.fillRect(w.x, rowY, w.sx, rowH);

            ctx.textAlign = 'left';
            row.forEach((cell, colIndex) => {
                const header = this.headers[colIndex] || "";
                const lineY = rowY + colIndex * 20 + 20;

                if (colIndex === 0) {
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 13px Arial';
                    ctx.fillText(cell, w.x + pad, lineY);
                } else {
                    ctx.fillStyle = '#888';
                    ctx.font = '12px Monospace';
                    ctx.fillText(`${header}:`, w.x + pad, lineY);
                    ctx.fillStyle = '#bbb';
                    ctx.fillText(cell, w.x + pad + 100, lineY);
                }

                this.renderProps.cells.push({
                    x: w.x, y: lineY - 15, w: w.sx, h: 20, rowIndex, colIndex, value: cell
                });
            });

            ctx.strokeStyle = '#444';
            ctx.beginPath();
            ctx.moveTo(w.x, rowY + rowH);
            ctx.lineTo(w.x2, rowY + rowH);
            ctx.stroke();
        });

        if (this.addRowLabel != null) {
            this._drawAddButton(w, ctx, w.y, startDrawY);
        }
        ctx.restore();
    }

    _getDeleteButtonProps(w, rowY, pad, deleteColW) {
        return {
            x: w.x2 - pad - deleteColW + 5,
            y: rowY + 5,
            w: deleteColW - 10,
            h: this.rowHeight - 10
        };
    }

    _drawAddButton(w, ctx, contentAreaY, startDrawY) {
        const rowH = this._getEffectiveRowHeight();
        const addBtnY = startDrawY + (this.rows.length * rowH) + 10;
        const x = w.x + 10;
        const w_btn = w.sx - 20;

        this.renderProps.addButton = { x, y: addBtnY, w: w_btn, h: this.addBtnHeight };

        if (addBtnY < w.y + w.sy && addBtnY + this.addBtnHeight > contentAreaY) {
            ctx.fillStyle = '#1e1e1e';
            ctx.fillRect(x, addBtnY, w_btn, this.addBtnHeight);

            ctx.fillStyle = '#006600';
            ctx.fillRect(x, addBtnY, w_btn, this.addBtnHeight);

            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.font = 'bold 13px Arial';
            ctx.fillText(this.addRowLabel, x + w_btn / 2, addBtnY + this.addBtnHeight / 2 + 5);
        }
    }
}

class HCWSearchField extends HCWBaseField {
    constructor(fieldName = 'Search', id = Date.now()) {
        super(fieldName, id);

        this.className = 'HCWSearchField';

        this.searchValue = "";
        this.results = [];
        this.onResultClickCallback = null;
        this.onSearchRequestCallback = null;

        this.headerHeight = 40;
        this.resultItemHeight = 45;
        this.gap = 5;

        this.renderProps = {
            startX: null,
            startY: null,
            endX: null,
            endY: null,
            resultButtons: []
        };
    }

    getType() {
        return GLOBAL_TYPES.CONTEXT_FIELDS.SEARCH_BOX;
    }

    setSearchValue(val) {
        this.searchValue = val;
        this.updateFrame();
        return this;
    }

    setResults(results) {
        this.results = results.slice(0, 5);
        this.updateFrame();
        return this;
    }

    onResultClick(cb) {
        this.onResultClickCallback = cb;
        return this;
    }

    onSearchRequest(cb) {
        this.onSearchRequestCallback = cb;
        return this;
    }

    _interaction(interaction) {
        if (interaction.type === 'mousedown') {
            const { mouseX, mouseY } = interaction;

            const hitResult = this.renderProps.resultButtons.find(b =>
                mouseX >= b.x && mouseX <= b.x + b.w &&
                mouseY >= b.y && mouseY <= b.y + b.h
            );

            if (hitResult && this.onResultClickCallback) {
                this.onResultClickCallback(this.parentWindow, this, hitResult.result);
                return;
            }

            // If clicked anywhere else, request to open search (keyboard)
            if (this.onSearchRequestCallback) {
                this.onSearchRequestCallback(this.parentWindow, this);
            }
        }
    }

    render(w) {
        this.renderProps.startX = w.x;
        this.renderProps.startY = w.y;
        this.renderProps.endX = w.x2;
        this.renderProps.endY = w.y2;
        this.renderProps.resultButtons = [];

        const ctx = HCW.ctx;
        if (!ctx) return;

        const pad = 10;

        // Background
        ctx.fillStyle = '#1b1717';
        ctx.fillRect(w.x, w.y, w.sx, w.sy);

        // Header / Search Display
        ctx.fillStyle = '#333';
        ctx.fillRect(w.x + pad, w.y + pad, w.sx - pad * 2, this.headerHeight);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(this.searchValue || "Click to search...", w.x + pad + 10, w.y + pad + this.headerHeight / 2 + 6);

        // Results
        ctx.font = '14px Arial';
        let currentY = w.y + pad + this.headerHeight + this.gap + 10;

        this.results.forEach((result, index) => {
            if (currentY + this.resultItemHeight > w.y2) return;

            const rx = w.x + pad;
            const rw = w.sx - pad * 2;
            const rh = this.resultItemHeight;

            ctx.fillStyle = '#2a2a2a';
            ctx.fillRect(rx, currentY, rw, rh);

            ctx.fillStyle = '#00ff95';
            ctx.font = 'bold 13px Arial';
            ctx.fillText(result.name || "Unknown Fixture", rx + 10, currentY + 18);

            ctx.fillStyle = '#bbb';
            ctx.font = '11px Arial';
            ctx.fillText(result.shortName || result.type || '', rx + 10, currentY + 35);

            this.renderProps.resultButtons.push({
                x: rx,
                y: currentY,
                w: rw,
                h: rh,
                result: result
            });

            currentY += rh + this.gap;
        });

        ctx.textAlign = 'start';
    }
}

class HCWColorWheelEncoderField extends HCWEncoderField {
    constructor(encoderText = 'Color Wheel', id = Date.now()) {
        super(encoderText, id);

        this.className = 'HCWColorWheelEncoderField';

        this.centerColor = null;
        this.centerImage = null;
        this._loadedImage = null;
        this.wheelData = null; // { "#ffffff": [[0,9],...], "/path/img.png": [[10,19]], ... }
        this.iconCache = {}; // { path: ImageObject }
    }

    getType() {
        return GLOBAL_TYPES.CONTEXT_FIELDS.COLOR_WHEEL_ENCODER;
    }

    setWheelData(data) {
        this.wheelData = data;

        // Preload icons if keys are paths
        if (data) {
            for (const key of Object.keys(data)) {
                if (!key.startsWith('#') && !key.startsWith('rgb') && !this.iconCache[key] && key.includes('.')) {
                    const img = new Image();
                    img.src = key;
                    img.onload = () => this.updateFrame();
                    this.iconCache[key] = img;
                }
            }
        }
        return this;
    }

    setCenterColor(color) {
        this.centerColor = color;
        this.updateFrame();
        return this;
    }

    setCenterImage(src) {
        this.centerImage = src;
        if (src) {
            this._loadedImage = new Image();
            this._loadedImage.src = src;
            this._loadedImage.onload = () => this.updateFrame();
        } else {
            this._loadedImage = null;
        }
        this.updateFrame();
        return this;
    }

    render(contextwindow) {
        // First run normal encoder render
        super.render(contextwindow);

        const ctx = HCW.ctx;
        const cx = this.renderProps.centerX;
        const cy = this.renderProps.centerY;
        const innerRadius = this.renderProps.innerRadius;

        // Dynamic lookup based on wheelData
        const activeKeys = [];

        if (this.wheelData) {
            const dmxVal = Math.round(this.value * 255);
            for (const [key, ranges] of Object.entries(this.wheelData)) {
                // Determine if any range in this color matches
                // Support both old format [min, max] and new format [[min, max], ...]
                const rangeArray = Array.isArray(ranges[0]) ? ranges : [ranges];

                for (const range of rangeArray) {
                    if (dmxVal >= range[0] && dmxVal <= range[1]) {
                        activeKeys.push(key);
                        break;
                    }
                }
            }
        }

        // Helper to draw color or image segment
        const drawSegment = (key, isLeft) => {
            const img = this.iconCache[key];
            if (img && img.complete) {
                // Segment clipping for half-half
                ctx.save();
                ctx.beginPath();
                if (activeKeys.length === 1) {
                    ctx.arc(cx, cy, innerRadius - 2, 0, Math.PI * 2);
                } else if (isLeft) {
                    ctx.arc(cx, cy, innerRadius - 2, Math.PI / 2, (3 * Math.PI) / 2);
                    ctx.lineTo(cx, cy);
                } else {
                    ctx.arc(cx, cy, innerRadius - 2, (3 * Math.PI) / 2, Math.PI / 2);
                    ctx.lineTo(cx, cy);
                }
                ctx.clip();
                ctx.drawImage(img, cx - innerRadius, cy - innerRadius, innerRadius * 2, innerRadius * 2);
                ctx.restore();
            } else {
                ctx.beginPath();
                if (activeKeys.length === 1) {
                    ctx.arc(cx, cy, innerRadius - 2, 0, Math.PI * 2);
                } else if (isLeft) {
                    ctx.arc(cx, cy, innerRadius - 2, Math.PI / 2, (3 * Math.PI) / 2);
                    ctx.lineTo(cx, cy);
                } else {
                    ctx.arc(cx, cy, innerRadius - 2, (3 * Math.PI) / 2, Math.PI / 2);
                    ctx.lineTo(cx, cy);
                }
                ctx.fillStyle = (key.startsWith('#') || key.startsWith('rgb')) ? key : '#444';
                ctx.fill();
            }
        };

        // Draw center part
        if (activeKeys.length > 0) {
            ctx.save();
            if (activeKeys.length === 1) {
                drawSegment(activeKeys[0], true);
            } else if (activeKeys.length >= 2) {
                drawSegment(activeKeys[0], true);
                drawSegment(activeKeys[1], false);
            }
            ctx.restore();
        } else if (this.centerColor) {
            // Fallback to default center color if no wheel match
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, innerRadius - 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.fillStyle = this.centerColor;
            ctx.fill();
            ctx.restore();
        }
    }
}