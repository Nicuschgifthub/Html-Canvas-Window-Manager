class HCWPreset {
    constructor(name = "Preset") {
        this.className = 'HCWPreset';

        this.presetId = -1; // Set by parent field or manually
        this.name = name;
        this.color = null;
        this.defaultColor = null;
        this.data = null;
        this.progress = null;
        this.parentField = null;
        this.flashing = false;
        this.selectionState = 0;
    }

    getId() { return this.presetId; }
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

    setId(presetId) { this.presetId = presetId; return this; }
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
    constructor(label = 'Presets') {
        super(label);
        this.className = 'HCWPresetField';
        this._insertClassKeyword();

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

        if (preset.getId() === -1 || typeof preset.getId() !== 'number') {
            let nextId = 0;
            const existingIds = this.presets.map(p => p.getId()).sort((a, b) => a - b);

            for (let i = 0; i < existingIds.length; i++) {
                if (existingIds[i] !== i) {
                    nextId = i;
                    break;
                }
                nextId = i + 1;
            }

            if (existingIds.length === 0) nextId = 0;

            preset.setId(nextId);
        }

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
        HCW.ctx.fillText(this.getLabel(), x + (sx / 2), y + 20);
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