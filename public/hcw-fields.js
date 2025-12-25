class HCWBaseField {
    constructor(text, id = Date.now()) {
        this.text = text;
        this.id = id;
        this.fgmType = null;
        this.parentWindow = null;
        this.renderProps = {};
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

        this.value = 0.0; // 0.0 to 1.0
        this.displayType = 'byte'; // 'value', 'byte', 'percent'
        this.onValueChangeCallback = null;

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
        return 'FADER_FIELD';
    }

    setValue(val) {
        const oldVal = this.value;
        this.value = Math.max(0, Math.min(1, val));

        if (oldVal !== this.value) {
            if (this.onValueChangeCallback) {
                this.onValueChangeCallback(this.parentWindow, this, {
                    value: this.value,
                    byte: Math.round(this.value * 255),
                    percent: Math.round(this.value * 100)
                });
            }
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

    onValueChange(callback) {
        this.onValueChangeCallback = callback;
        return this;
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

        this.value = 0.0;
        this.value2 = 0.0;

        this.displayType = 'byte';
        this.onValueChangeCallback = null;

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
        return 'ENCODER_FIELD';
    }

    onFieldPress(callback) {
        this.onFieldPressCallback = callback;
        return this;
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
        if (this.onValueChangeCallback) {
            this.onValueChangeCallback(this.parentWindow, this, {
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

    onValueChange(callback) {
        this.onValueChangeCallback = callback;
        return this;
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
    constructor(name, color = null, defaultColor = null, data = {}, id = null, progress = null) {
        this.id = id || (Date.now() + Math.random());
        this.name = name;
        this.color = color;
        this.defaultColor = defaultColor;
        this.data = data;
        this.progress = progress;
        this.parentField = null;
        this.flashing = false;
        this.selectionState = 0; // 0: None, 1: Partial, 2: Full
    }

    getLabel() {
        return this.name;
    }

    getParentField() {
        return this.parentField;
    }

    setParentField(field) {
        this.parentField = field;
        return this;
    }

    triggerRender() {
        if (this.parentField && typeof HCWRender !== 'undefined') {
            HCWRender.updateFrame();
        }
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

    getId() { return this.id; }
    getName() { return this.name; }
    getColor() { return this.color; }
    getDefaultColor() { return this.defaultColor; }
    getData() { return this.data; }
    getProgress() { return this.progress; }

    setLabel(name) {
        this.name = name;
        this.triggerRender();
        return this;
    }

    setColor(color) {
        this.color = color;
        this.triggerRender();
        return this;
    }

    setDefaultColor(color) {
        this.defaultColor = color;
        this.triggerRender();
        return this;
    }

    setData(data) {
        this.data = data;
        this.triggerRender();
        return this;
    }

    setProgress(progress) {
        this.progress = progress;
        this.triggerRender();
        return this;
    }

    setFlashing(flashing) {
        this.flashing = flashing;
        this.triggerRender();
        return this;
    }

    isFlashing() {
        return this.flashing;
    }

    setSelectionState(state) {
        this.selectionState = state;
        this.triggerRender();
        return this;
    }

    getSelectionState() {
        return this.selectionState;
    }

    setSelected(selected) {
        this.selectionState = selected ? 2 : 0;
        this.triggerRender();
        return this;
    }

    isSelected() {
        return this.selectionState > 0;
    }

    update(updates = {}) {
        if (updates.name !== undefined) this.name = updates.name;
        if (updates.color !== undefined) this.color = updates.color;
        if (updates.data !== undefined) this.data = updates.data;
        if (updates.progress !== undefined) this.progress = updates.progress;
        if (updates.defaultColor !== undefined) this.defaultColor = updates.defaultColor;

        this.triggerRender();
        return this;
    }
}

class HCWPresetField extends HCWBaseField {
    constructor(fieldName = 'Presets', id = Date.now()) {
        super(fieldName, id);

        this.presets = [];
        this.onPresetPressCallback = null;

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

    getType() {
        return 'PRESET_FIELD';
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

    /** @param {HCWPreset} nameOrInstance */
    addPreset(nameOrInstance, color = null, defaultColor = null, data = {}, id = null, progress = null) {
        let preset;
        if (nameOrInstance instanceof HCWPreset) {
            preset = nameOrInstance;
        } else {
            preset = new HCWPreset(nameOrInstance, color, defaultColor, data, id, progress);
        }

        preset.setParentField(this);
        this.presets.push(preset);
        this.updateFrame();
        return this;
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

    onPresetPress(callback) {
        this.onPresetPressCallback = callback;
        return this;
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
                    if (this.onPresetPressCallback) {
                        this.onPresetPressCallback(this.parentWindow, this, preset.data, preset);
                    } else {
                        console.warn("HCWPresetField: Clicked presest '" + preset.name + "' but no callback set.");
                    }
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

        this.value = "";
        this.cursorPos = 0;
        this.onEnterCallback = null;

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
        this._dragLastY = null;
    }

    setValue(val) {
        this.value = String(val);
        this.cursorPos = this.value.length;
        this.updateFrame();
        return this;
    }

    onEnter(callback) {
        this.onEnterCallback = callback;
        return this;
    }

    _handleInput(key) {
        if (key === 'ENTER') {
            if (this.onEnterCallback) {
                this.onEnterCallback(this.value);
            }
        } else if (key === 'C') {
            this.value = "";
            this.cursorPos = 0;
        } else if (key === '<=' || key === 'Backspace') {
            if (this.cursorPos > 0) {
                this.value = this.value.slice(0, this.cursorPos - 1) + this.value.slice(this.cursorPos);
                this.cursorPos--;
            }
        } else if (key === 'Delete' || key === 'entf') {
            if (this.cursorPos < this.value.length) {
                this.value = this.value.slice(0, this.cursorPos) + this.value.slice(this.cursorPos + 1);
            }
        } else if (key === 'ArrowLeft' || key === '<') {
            this.cursorPos = Math.max(0, this.cursorPos - 1);
        } else if (key === 'ArrowRight' || key === '>') {
            this.cursorPos = Math.min(this.value.length, this.cursorPos + 1);
        } else {
            const char = (key === ',') ? '.' : key;
            if (/^[0-9.]$/.test(char) || (key.length === 1 && !isNaN(key))) {
                this.value = this.value.slice(0, this.cursorPos) + char + this.value.slice(this.cursorPos);
                this.cursorPos++;
            }
        }
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
        const textX = da.x + da.w - 10;
        const fullTextWidth = HCW.ctx.measureText(this.value).width;
        const textStartX = textX - fullTextWidth;

        let bestPos = 0;
        let minDiff = Infinity;

        for (let i = 0; i <= this.value.length; i++) {
            const prefix = this.value.slice(0, i);
            const prefixWidth = HCW.ctx.measureText(prefix).width;
            const charX = textStartX + prefixWidth;
            const diff = Math.abs(mouseX - charX);
            if (diff < minDiff) {
                minDiff = diff;
                bestPos = i;
            }
        }
        this.cursorPos = bestPos;
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
        HCW.ctx.textAlign = "right";

        const textX = x + sx - 15;
        const textY = displayY + 28;
        HCW.ctx.fillText(this.value, textX, textY);

        // Draw Cursor
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

                let bg = this.renderProps.colors.keyDefault;
                if (key === 'ENTER') bg = this.renderProps.colors.enterKey;

                if (this._pressedKey === key) {
                    if (key === 'ENTER') bg = this.renderProps.colors.enterKeyActive;
                    else bg = this.renderProps.colors.keyActive;
                }

                HCW.ctx.fillStyle = bg;
                HCW.ctx.fillRect(btnX, rowY, colW, rowH);

                HCW.ctx.fillStyle = this.renderProps.colors.keyText;
                HCW.ctx.font = (key === 'ENTER') ? "bold 12px Arial" : "16px Arial";
                HCW.ctx.textAlign = "center";
                HCW.ctx.fillText(key, btnX + (colW / 2), rowY + (rowH / 2) + 6);
                HCW.ctx.textAlign = "start";

                this.renderProps.buttons.push({
                    key,
                    x: btnX,
                    y: rowY,
                    w: colW,
                    h: rowH
                });
            });
        });
    }
}

class HCWKeyboardField extends HCWBaseField {
    constructor(fieldName = 'Keyboard', id = Date.now()) {
        super(fieldName, id);
        this.type = 'keyboard';

        this.value = "";
        this.cursorPos = 0;
        this.onEnterCallback = null;
        this.onValueChangeCallback = null;
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
        return 'KEYBOARD_FIELD';
    }

    setValue(val) {
        this.value = String(val);
        this.cursorPos = this.value.length;
        this.updateFrame();
        return this;
    }

    onEnter(callback) {
        this.onEnterCallback = callback;
        return this;
    }

    onValueChange(callback) {
        this.onValueChangeCallback = callback;
        return this;
    }

    _handleInput(key) {
        if (key === 'ENTER' || key === 'Enter') {
            if (this.onEnterCallback) {
                this.onEnterCallback(this.parentWindow, this, this.value);
            }
        } else if (key === '<=' || key === 'Backspace') {
            if (this.cursorPos > 0) {
                this.value = this.value.slice(0, this.cursorPos - 1) + this.value.slice(this.cursorPos);
                this.cursorPos--;
            }
        } else if (key === 'DELETE') {
            this.value = "";
            this.cursorPos = 0;
        } else if (key === 'Delete' || key === 'entf') {
            if (this.cursorPos < this.value.length) {
                this.value = this.value.slice(0, this.cursorPos) + this.value.slice(this.cursorPos + 1);
            }
        } else if (key === 'SPACE' || key === ' ') {
            this.value = this.value.slice(0, this.cursorPos) + " " + this.value.slice(this.cursorPos);
            this.cursorPos++;
        } else if (key === 'SHIFT' || key === 'Shift') {
            this.isUpperCase = !this.isUpperCase;
        } else if (key === 'ArrowLeft' || key === '<') {
            this.cursorPos = Math.max(0, this.cursorPos - 1);
        } else if (key === 'ArrowRight' || key === '>') {
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

        if (this.onValueChangeCallback) {
            this.onValueChangeCallback(this.parentWindow, this, this.value);
        }
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

        let bestPos = 0;
        let minDiff = Infinity;

        for (let i = 0; i <= this.value.length; i++) {
            const prefix = this.value.slice(0, i);
            const prefixWidth = HCW.ctx.measureText(prefix).width;
            const charX = textStartX + prefixWidth;
            const diff = Math.abs(mouseX - charX);
            if (diff < minDiff) {
                minDiff = diff;
                bestPos = i;
            }
        }
        this.cursorPos = bestPos;
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

        this.h = 0;
        this.s = 1;
        this.v = 1;

        this.extra = { white: 0, amber: 0, uv: 0 };
        this.fgmType = null;

        this.onColorChangeCallback = null;

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
        return 'COLOR_MAP_FIELD';
    }

    onValueChange(cb) {
        this.onColorChangeCallback = cb;
        return this;
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

        let h;
        const s = max === 0 ? 0 : d / max;
        const v = max;

        if (d === 0) {
            h = 0;
        } else {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        this.h = h;
        this.s = s;
        this.v = v;
    }

    _trigger() {
        if (this.onColorChangeCallback) {
            this.onColorChangeCallback(this.parentWindow, this, this.getColors());
        }
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
        if (this._colorMapCanvas && this._colorMapSize === size) return;

        const c = document.createElement('canvas');
        c.width = c.height = size;
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

        /*  Maybe one day i will fix this
        
        this.checkMouseLocation(mouseX, mouseY);
 
         if (i.type === 'scroll' && this.renderProps.active?.type === 'slider') {
             console.log("yes")
 
             const step = 0.02;
             const direction = i.deltaY > 0 ? -1 : 1;
 
             if (a.key === 'r' || a.key === 'g' || a.key === 'b') {
                 const rgb = this.getColors();
                 rgb[a.key] = rgb[a.key] + (step * direction);
 
                 if (rgb[a.key] < 0) {
                     rgb[a.key] = 0;
                 }
 
                 if (rgb[a.key] > 255) {
                     rgb[a.key] = 255;
                 }
 
                 this._rgbToHsv(rgb.r, rgb.g, rgb.b);
             } else {
 
             }
 
             this.renderProps.active = null;
 
             this._trigger();
         } */

        if (i.type === 'mouseup') {
            this.renderProps.active = null;
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

        // w.y += 10

        const ctx = HCW.ctx;
        const pad = 8;
        const labelW = 14;
        let vSliderW = 12;

        const innerW = w.sx - pad * 2;
        const innerH = w.sy - pad * 2;

        const topH = Math.floor(innerH * 0.7);
        const bottomH = innerH - topH - pad;

        const mapSize = Math.min(
            topH,
            innerW - (vSliderW + pad) * 4
        );

        this._ensureColorMap(mapSize);

        const mapX = w.x + pad;
        const mapY = w.y + pad;

        ctx.drawImage(this._colorMapCanvas, mapX, mapY);
        this.renderProps.map = { x: mapX, y: mapY, w: mapSize, h: mapSize };

        ctx.strokeStyle = '#fff';
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
            const mapDistance = this.renderProps.map.x + this.renderProps.map.w;
            const spaceForVFaders = this.renderProps.endX - mapDistance;
            const sliderNewSize = (spaceForVFaders - (vKeys.length * pad + pad)) / (vKeys.length);

            vSliderW = sliderNewSize;

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
        // const sliderHSize = (sy - this.renderProps.endY / 3) - 3 * pad + pad;

        const sh = Math.max(8, bottomH / 4);
        const sw = innerW - labelW;

        const rgb = this.getColors();
        this.renderProps.sliders.r =
            this._drawHSlider(ctx, 'R', mapX + labelW, sy, sw, sh, rgb.r, '#ff4444'); sy += sh + pad;
        this.renderProps.sliders.g =
            this._drawHSlider(ctx, 'G', mapX + labelW, sy, sw, sh, rgb.g, '#44ff44'); sy += sh + pad;
        this.renderProps.sliders.b =
            this._drawHSlider(ctx, 'B', mapX + labelW, sy, sw, sh, rgb.b, '#4444ff');

        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.fillText(this.text, this.renderProps.startX + pad, this.renderProps.startY + pad);
    }

    _drawHSlider(ctx, label, x, y, w, h, value, color) {
        ctx.fillStyle = '#222';
        ctx.fillRect(x, y, w, h);

        ctx.fillStyle = color;
        ctx.fillRect(x, y, (value / 255) * w, h);

        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.fillText(label, x - 10, y + h - 1);

        return { x, y, w, h };
    }

    _rgbToHsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const d = max - min;

        this.v = max;
        this.s = max === 0 ? 0 : d / max;

        if (d === 0) this.h = 0;
        else if (max === r) this.h = ((g - b) / d) / 6;
        else if (max === g) this.h = (2 + (b - r) / d) / 6;
        else this.h = (4 + (r - g) / d) / 6;

        if (this.h < 0) this.h += 1;
    }
}

class HCWTableField extends HCWBaseField {
    constructor(fieldName = 'Settings', id = Date.now()) {
        super(fieldName, id);

        this.headers = [];
        this.rows = [];
        this.onCellClickCallback = null;
        this.onDeleteRowCallback = null;
        this.onAddRowCallback = null;
        this.addRowLabel = '+ Add New Element';

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

    onCellClick(cb) {
        this.onCellClickCallback = cb;
        return this;
    }

    onDeleteRow(cb) {
        this.onDeleteRowCallback = cb;
        return this;
    }

    onAddRow(cb) {
        this.onAddRowCallback = cb;
        return this;
    }

    setAddRowLabel(label) {
        this.addRowLabel = label;
        return this;
    }

    getType() {
        return 'TABLE_FIELD';
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

                if (hitCell && this.onCellClickCallback) {
                    this.onCellClickCallback(this.parentWindow, this, hitCell.rowIndex, hitCell.colIndex, hitCell.value);
                }
                else {
                    const hitDelete = this.renderProps.deleteButtons.find(b =>
                        clickX >= b.x && clickX <= b.x + b.w &&
                        clickY >= b.y && clickY <= b.y + b.h
                    );

                    if (hitDelete && this.onDeleteRowCallback) {
                        this.onDeleteRowCallback(this.parentWindow, this, hitDelete.rowIndex);
                    }
                    else {
                        const hitAdd = this.renderProps.addButton;

                        if (hitAdd && this.onAddRowCallback &&
                            clickX >= hitAdd.x && clickX <= hitAdd.x + hitAdd.w &&
                            clickY >= hitAdd.y && clickY <= hitAdd.y + hitAdd.h) {

                            this.onAddRowCallback(this.parentWindow, this);
                        }
                    }
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
        const rowsHeight = this.rows.length * this.rowHeight;
        const addBtnH = this.onAddRowCallback ? (this.addBtnHeight + 10) : 0;
        const contentHeight = rowsHeight + addBtnH;

        const viewHeight = this.renderProps.sy - this.headerHeight;

        if (contentHeight <= viewHeight) {
            this.scrollY = 0;
        } else {
            const minScroll = -(contentHeight - viewHeight + 10);
            this.scrollY = Math.min(0, Math.max(minScroll, this.scrollY));
        }
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

        const pad = 10;
        const deleteColW = this.onDeleteRowCallback ? 40 : 0;
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

            if (rowY + this.rowHeight < contentAreaY || rowY > w.y + w.sy) {
                return;
            }

            ctx.fillStyle = rowIndex % 2 === 0 ? '#252525' : '#1e1e1e';
            ctx.fillRect(w.x, rowY, w.sx, this.rowHeight);

            row.forEach((cell, colIndex) => {
                const cellX = w.x + pad + colIndex * colW;

                ctx.fillStyle = '#bbb';
                ctx.fillText(cell, cellX + colW / 2, rowY + this.rowHeight / 2 + 5);

                this.renderProps.cells.push({
                    x: cellX,
                    y: rowY,
                    w: colW,
                    h: this.rowHeight,
                    rowIndex,
                    colIndex,
                    value: cell
                });
            });

            if (this.onDeleteRowCallback) {
                const delX = w.x2 - pad - deleteColW + 5;
                const delY = rowY + 5;
                const delW = deleteColW - 10;
                const delH = this.rowHeight - 10;

                ctx.fillStyle = '#770000';
                ctx.fillRect(delX, delY, delW, delH);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 12px Arial';
                ctx.fillText('X', delX + delW / 2, delY + delH / 2 + 5);

                this.renderProps.deleteButtons.push({
                    x: delX,
                    y: delY,
                    w: delW,
                    h: delH,
                    rowIndex
                });
            }

            ctx.strokeStyle = '#333';
            ctx.beginPath();
            ctx.moveTo(w.x, rowY + this.rowHeight);
            ctx.lineTo(w.x2, rowY + this.rowHeight);
            ctx.stroke();
        });

        if (this.onAddRowCallback) {
            const addBtnY = startDrawY + this.rows.length * this.rowHeight + 10;

            if (addBtnY < w.y + w.sy && addBtnY + this.addBtnHeight > contentAreaY) {
                const addBtnX = w.x + pad;
                const addBtnW = w.sx - pad * 2;

                ctx.fillStyle = '#006600';
                ctx.fillRect(addBtnX, addBtnY, addBtnW, this.addBtnHeight);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(this.addRowLabel, addBtnX + addBtnW / 2, addBtnY + this.addBtnHeight / 2 + 5);

                this.renderProps.addButton = {
                    x: addBtnX,
                    y: addBtnY,
                    w: addBtnW,
                    h: this.addBtnHeight
                };
            }
        }

        ctx.restore();

        ctx.strokeStyle = '#333';
        ctx.beginPath();
        ctx.save();
        ctx.beginPath();
        ctx.rect(w.x, contentAreaY, w.sx, contentAreaH);
        ctx.clip();

        for (let i = 1; i < this.headers.length; i++) {
            const x = w.x + pad + i * colW;
            ctx.beginPath();
            ctx.moveTo(x, w.y + this.headerHeight);
            ctx.lineTo(x, w.y2);
            ctx.stroke();
        }
        ctx.restore();

        ctx.textAlign = 'start';
    }
}

class HCWSearchField extends HCWBaseField {
    constructor(fieldName = 'Search', id = Date.now()) {
        super(fieldName, id);

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

    getType() {
        return 'SEARCH_FIELD';
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
/* 
class HCWSearchField extends HCWBaseField {
    constructor(fieldName = 'Search', id = Date.now()) {
        super(fieldName, id);

        this.searchValue = "";
        this.results = [];
        this.onResultClickCallback = null;
        this.onSearchRequestCallback = null;

        // Scrolling Properties
        this.scrollY = 0;
        this._dragLastY = null;
        this._clickStartY = null;
        this._potentialClick = false;

        this.headerHeight = 40;
        this.resultItemHeight = 45;
        this.gap = 5;
        this.padding = 10;

        this.renderProps = {
            startX: null,
            startY: null,
            endX: null,
            endY: null,
            sx: null,
            sy: null,
            resultButtons: []
        };
    }

    setSearchValue(val) {
        this.searchValue = val;
        this.updateFrame();
        return this;
    }

    setResults(results) {
        // Removed .slice(0, 5) to allow for scrolling through many results
        this.results = results;
        this.scrollY = 0; // Reset scroll on new search
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

    getType() {
        return 'SEARCH_FIELD';
    }

    _interaction(interaction) {
        const { mouseX, mouseY, type, deltaY } = interaction;

        if (type === 'mousedown') {
            this._clickStartY = mouseY;
            this._dragLastY = mouseY;
            this._potentialClick = true;

        } else if (type === 'mousemove') {
            if (this._dragLastY !== null) {
                const dy = mouseY - this._dragLastY;
                
                // If moved more than 5px, it's a drag, not a click
                if (Math.abs(mouseY - this._clickStartY) > 5) {
                    this._potentialClick = false;
                }

                this.scrollY += dy;
                this._clampScroll();
                this.updateFrame();
                this._dragLastY = mouseY;
            }

        } else if (type === 'mouseup') {
            if (this._potentialClick) {
                // Check if we hit a result button
                const hitResult = this.renderProps.resultButtons.find(b =>
                    mouseX >= b.x && mouseX <= b.x + b.w &&
                    mouseY >= b.y && mouseY <= b.y + b.h
                );

                if (hitResult && this.onResultClickCallback) {
                    this.onResultClickCallback(this.parentWindow, this, hitResult.result);
                } else {
                    // If clicked in header or empty area, open keyboard
                    if (this.onSearchRequestCallback) {
                        this.onSearchRequestCallback(this.parentWindow, this);
                    }
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
        const contentHeight = this.results.length * (this.resultItemHeight + this.gap);
        const viewHeight = this.renderProps.sy - (this.headerHeight + this.padding * 2);

        if (contentHeight <= viewHeight) {
            this.scrollY = 0;
        } else {
            const minScroll = -(contentHeight - viewHeight + 10);
            this.scrollY = Math.min(0, Math.max(minScroll, this.scrollY));
        }
    }

    render(w) {
        this.renderProps.startX = w.x;
        this.renderProps.startY = w.y;
        this.renderProps.endX = w.x2;
        this.renderProps.endY = w.y2;
        this.renderProps.sx = w.sx;
        this.renderProps.sy = w.sy;
        this.renderProps.resultButtons = [];

        const ctx = HCW.ctx;
        if (!ctx) return;

        const pad = this.padding;

        // 1. Background
        ctx.fillStyle = '#1b1717';
        ctx.fillRect(w.x, w.y, w.sx, w.sy);

        // 2. Header (Sticky at top)
        ctx.fillStyle = '#333';
        ctx.fillRect(w.x + pad, w.y + pad, w.sx - pad * 2, this.headerHeight);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(this.searchValue || "Click to search...", w.x + pad + 10, w.y + pad + this.headerHeight / 2 + 6);

        // 3. Results List with Clipping
        ctx.save();
        const clipY = w.y + pad + this.headerHeight + this.gap;
        const clipH = w.sy - (pad * 2 + this.headerHeight + this.gap);
        
        ctx.beginPath();
        ctx.rect(w.x, clipY, w.sx, clipH);
        ctx.clip();

        let currentY = clipY + this.scrollY;

        this.results.forEach((result, index) => {
            const rx = w.x + pad;
            const rw = w.sx - pad * 2;
            const rh = this.resultItemHeight;

            // Only draw if within visible vertical bounds (optimization)
            if (currentY + rh > clipY && currentY < clipY + clipH) {
                ctx.fillStyle = '#2a2a2a';
                ctx.fillRect(rx, currentY, rw, rh);

                ctx.fillStyle = '#00ff95';
                ctx.font = 'bold 13px Arial';
                ctx.fillText(result.name || "Unknown Fixture", rx + 10, currentY + 18);

                ctx.fillStyle = '#bbb';
                ctx.font = '11px Arial';
                ctx.fillText(result.shortName || result.type || '', rx + 10, currentY + 35);

                // Store for interaction
                this.renderProps.resultButtons.push({
                    x: rx,
                    y: currentY,
                    w: rw,
                    h: rh,
                    result: result
                });
            }

            currentY += rh + this.gap;
        });

        ctx.restore();
        ctx.textAlign = 'start';
    }
} */