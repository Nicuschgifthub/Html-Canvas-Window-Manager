
class HCWFaderField {
    constructor(faderText = 'Fader 01', id = Date.now()) {
        this.type = 'fader';
        this.text = faderText;
        this.id = id;

        this.value = 0.0; // 0.0 to 1.0
        this.displayType = 'value'; // 'value', 'byte', 'percent'
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
    }

    /**
     * Set the fader value (0.0 - 1.0)
     * @param {number} val 
     */
    setValue(val) {
        const oldVal = this.value;
        this.value = Math.max(0, Math.min(1, val));

        if (oldVal !== this.value) {
            if (this.onValueChangeCallback) {
                this.onValueChangeCallback({
                    value: this.value,
                    byte: Math.round(this.value * 255),
                    percent: Math.round(this.value * 100)
                });
            }
            // Trigger global render update to show change immediately
            if (typeof HCWRender !== 'undefined') {
                HCWRender.updateFrame();
            }
        }
        return this;
    }

    /**
     * Set the label text
     * @param {string} name 
     */
    setLabel(name) {
        this.text = name;
        if (typeof HCWRender !== 'undefined') {
            HCWRender.updateFrame();
        }
        return this;
    }

    /**
     * Set the value display type
     * @param {'value'|'byte'|'percent'} type 
     */
    setDisplayType(type) {
        if (['value', 'byte', 'percent'].includes(type)) {
            this.displayType = type;
            if (typeof HCWRender !== 'undefined') {
                HCWRender.updateFrame();
            }
        }
        return this;
    }

    /**
     * Get the current value
     * @returns {number}
     */
    getValue() {
        return this.value;
    }

    /**
     * Register a callback for when the value changes
     * @param {function} callback 
     */
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

    /**
     * Handle interactions passed from the global touch handler
     * @param {object} interaction 
     */
    _interaction(interaction) {
        if (interaction.type === 'mousedown' || interaction.type === 'mousemove') {
            // Calculate value based on Y position
            // 0 at bottom, 1 at top usually for faders, but let's stick to screen coords:
            // Top is 0, Bottom is Height.
            // Standard fader: Bottom (1.0) -> Top (0.0) or Top (1.0) -> Bottom (0.0)?
            // Mixer faders: Top is max val, Bottom is min val.

            const relativeY = interaction.mouseY - this.renderProps.startY;
            const height = this.renderProps.sy;

            // Invert Y so bottom is 0 and top is 1
            let normalizedVal = 1 - (relativeY / height);

            this.setValue(normalizedVal);
        } else if (interaction.type === 'scroll') {
            // Handle scroll (wheel)
            // deltaY > 0 means scrolling down (reducing value usually?)
            // Let's say scrolling UP (negative deltaY) increases value
            const step = 0.05;
            const direction = interaction.deltaY > 0 ? -1 : 1;
            this.setValue(this.value + (step * direction));
        }
    }

    /**
     * Render the field within the given context window
     * @param {object} contextwindow The bounding box to render into
     */
    render(contextwindow) {
        // Simple auto-layout: Fill the context window
        // In a real grid system we might use specific coordinates, 
        // but "scaling with window" means filling the available space here.

        this.renderProps.startX = contextwindow.x;
        this.renderProps.startY = contextwindow.y;
        this.renderProps.sx = contextwindow.sx;
        this.renderProps.sy = contextwindow.sy;
        this.renderProps.endX = contextwindow.x2;
        this.renderProps.endY = contextwindow.y2;

        const { x, y, sx, sy } = contextwindow;
        const colors = this.renderProps.colors;

        // 1. Draw Background Track
        HCW.ctx.fillStyle = colors.background;
        HCW.ctx.fillRect(x, y, sx, sy);

        // 2. Draw Fader Handle/Level
        // Let's draw it as a filled bar from bottom up
        const levelHeight = this.value * sy;
        const levelY = y + (sy - levelHeight);

        HCW.ctx.fillStyle = colors.fader;
        HCW.ctx.fillRect(x, levelY, sx, levelHeight);

        // 3. Draw Text Label
        HCW.ctx.fillStyle = colors.text;
        HCW.ctx.font = "12px Arial";
        HCW.ctx.fillText(this.text, x + 5, y + 15);
        HCW.ctx.fillText(this._getFormattedValue(), x + 5, y + 30);
    }
}

class HCWEncoderField {
    constructor(encoderText = 'Encoder 01', id = Date.now()) {
        this.type = 'encoder';
        this.text = encoderText;
        this.id = id;

        this.value = 0.0; // 0.0 to 1.0
        this.displayType = 'value'; // 'value', 'byte', 'percent'
        this.onValueChangeCallback = null;

        this.renderProps = {
            colors: {
                background: '#1b1717ff',
                knob: '#574b4bff',
                indicator: '#ffffff',
                text: '#ffffff'
            },
            centerX: null,
            centerY: null,
            radius: null,
            startX: null,
            startY: null,
            endX: null,
            endY: null
        };
    }

    /**
     * Set the encoder value (0.0 - 1.0)
     * @param {number} val 
     */
    setValue(val) {
        const oldVal = this.value;
        this.value = Math.max(0, Math.min(1, val));

        if (oldVal !== this.value) {
            if (this.onValueChangeCallback) {
                this.onValueChangeCallback({
                    value: this.value,
                    byte: Math.round(this.value * 255),
                    percent: Math.round(this.value * 100)
                });
            }
            if (typeof HCWRender !== 'undefined') {
                HCWRender.updateFrame();
            }
        }
        return this;
    }

    /**
     * Set the label text
     * @param {string} name 
     */
    setLabel(name) {
        this.text = name;
        if (typeof HCWRender !== 'undefined') {
            HCWRender.updateFrame();
        }
        return this;
    }

    /**
     * Set the value display type
     * @param {'value'|'byte'|'percent'} type 
     */
    setDisplayType(type) {
        if (['value', 'byte', 'percent'].includes(type)) {
            this.displayType = type;
            if (typeof HCWRender !== 'undefined') {
                HCWRender.updateFrame();
            }
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
            const cx = this.renderProps.centerX;
            const cy = this.renderProps.centerY;

            let angle = Math.atan2(interaction.mouseY - cy, interaction.mouseX - cx);
            let deg = angle * (180 / Math.PI);
            let adjustedDeg = deg - 135;
            if (adjustedDeg < 0) adjustedDeg += 360;

            if (adjustedDeg <= 270) {
                this.setValue(adjustedDeg / 270);
            }

        } else if (interaction.type === 'scroll') {
            const step = 0.05;
            const direction = interaction.deltaY > 0 ? -1 : 1;
            this.setValue(this.value + (step * direction));
        }
    }

    render(contextwindow) {
        this.renderProps.startX = contextwindow.x;
        this.renderProps.startY = contextwindow.y;
        this.renderProps.endX = contextwindow.x2;
        this.renderProps.endY = contextwindow.y2;

        const sx = contextwindow.sx;
        const sy = contextwindow.sy;

        // Check if we have space for text
        const showText = sy > 100;

        // Calculate center and radius
        const cx = contextwindow.x + (sx / 2);

        let knobCy;
        if (showText) {
            // Top 45% if showing text
            knobCy = contextwindow.y + (sy * 0.45);
        } else {
            // Centered if no text
            knobCy = contextwindow.y + (sy * 0.5);
        }

        const minDim = Math.min(sx, sy);
        const radius = (minDim * 0.35);

        this.renderProps.centerX = cx;
        this.renderProps.centerY = knobCy;
        this.renderProps.radius = radius;

        const colors = this.renderProps.colors;

        // 1. Background
        HCW.ctx.fillStyle = colors.background;
        HCW.ctx.fillRect(contextwindow.x, contextwindow.y, sx, sy);

        // 2. Knob Circle
        HCW.ctx.beginPath();
        HCW.ctx.arc(cx, knobCy, radius, 0, 2 * Math.PI);
        HCW.ctx.fillStyle = colors.knob;
        HCW.ctx.fill();

        // 3. Indicator Line
        // Start angle (135 deg) + (value * 270 deg)
        const startRad = (135 * Math.PI) / 180;
        const rangeRad = (270 * Math.PI) / 180;
        const currentRad = startRad + (this.value * rangeRad);

        // Calculate end point on circle
        const indX = cx + (Math.cos(currentRad) * (radius * 0.8));
        const indY = knobCy + (Math.sin(currentRad) * (radius * 0.8));

        HCW.ctx.beginPath();
        HCW.ctx.moveTo(cx, knobCy);
        HCW.ctx.lineTo(indX, indY);
        HCW.ctx.strokeStyle = colors.indicator;
        HCW.ctx.lineWidth = 3;
        HCW.ctx.stroke();

        // 4. Value Arc (Optional but nice)
        HCW.ctx.beginPath();
        HCW.ctx.arc(cx, knobCy, radius, startRad, currentRad);
        HCW.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        HCW.ctx.lineWidth = 5;
        HCW.ctx.stroke();

        // 5. Text Label & Value
        // Only draw text if we have enough space
        if (showText) {
            HCW.ctx.fillStyle = colors.text;
            HCW.ctx.font = "12px Arial";
            HCW.ctx.textAlign = "center";
            HCW.ctx.fillText(this.text, cx, knobCy + radius + 15);
            HCW.ctx.fillText(this._getFormattedValue(), cx, knobCy + radius + 30);
            HCW.ctx.textAlign = "start"; // Reset alignment
        }
    }
}

class HCWPresetField {
    constructor(fieldName = 'Presets', id = Date.now()) {
        this.type = 'preset';
        this.text = fieldName;
        this.id = id;

        this.presets = [];
        this.onPresetPressCallback = null;

        // Valid scroll offset (Y)
        this.scrollY = 0;

        // Layout config
        this.itemMinWidth = 80;
        this.itemHeight = 60;
        this.gap = 5;
        this.headerHeight = 30;

        this.renderProps = {
            colors: {
                background: '#1b1717ff',
                headerText: '#ffffff',
                itemText: '#000000',
                itemDefaultColor: '#aaaaaa',
                itemPressedColor: '#ffffff' // Visual feedback
            },
            startX: null,
            startY: null,
            endX: null,
            endY: null,
            sx: null,
            sy: null,
            // Cache layout for interaction
            cols: 1,
            visibleItems: []
        };

        this._dragLastY = null;
        this._pressedIndex = -1; // Track pressed item index
    }

    /**
     * Add a preset to the grid
     * @param {string} name Display name
     * @param {string} color Hex color
     * @param {any} data Data to return on press
     * @param {any} id Optional custom ID (defaults to auto-generated)
     * @param {number} progress Optional progress (0.0 - 1.0)
     */
    addPreset(name, color = '#cccccc', data = {}, id = null, progress = null) {
        this.presets.push({
            id: id || (Date.now() + Math.random()),
            name,
            color,
            data,
            progress
        });
        if (typeof HCWRender !== 'undefined') HCWRender.updateFrame();
        return this;
    }

    /**
     * Update an existing preset by ID
     * @param {any} id ID of the preset to update
     * @param {object} updates Object containing fields to update { name, color, data, progress }
     */
    updatePreset(id, updates = {}) {
        const preset = this.presets.find(p => p.id === id);
        if (preset) {
            if (updates.name !== undefined) preset.name = updates.name;
            if (updates.color !== undefined) preset.color = updates.color;
            if (updates.data !== undefined) preset.data = updates.data;
            if (updates.progress !== undefined) preset.progress = updates.progress;

            if (typeof HCWRender !== 'undefined') HCWRender.updateFrame();
        } else {
            console.warn(`HCWPresetField: Preset with id '${id}' not found.`);
        }
        return this;
    }

    /**
     * Callback when a preset is pressed
     * @param {function} callback (data, preset) => {}
     */
    onPresetPress(callback) {
        this.onPresetPressCallback = callback;
        return this;
    }

    _interaction(interaction) {
        if (interaction.type === 'mousedown') {
            const { mouseX, mouseY } = interaction;
            this._clickStartY = mouseY;
            this._dragLastY = mouseY; // Start drag tracking

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

            // Check total distance moved for click cancellation
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
            // IMPORTANT: HCWTouch._handleMouseUp doesn't send coords.
            // We rely on the fact that if _potentialClick is still true, 
            // the user didn't drag away significantly.

            if (this._potentialClick && this._pressedIndex !== -1) {
                const preset = this.presets[this._pressedIndex];
                if (preset) {
                    // Fire callback
                    if (this.onPresetPressCallback) {
                        this.onPresetPressCallback(preset.data, preset);
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
        // Find hit item in visible items
        return this.renderProps.visibleItems.find(item =>
            x >= item.x && x <= item.x + item.w &&
            y >= item.y && y <= item.y + item.h
        );
    }

    _clampScroll() {
        // Max scroll is 0 (top aligned)
        // Min scroll is -(contentHeight - viewHeight)

        const contentHeight = Math.ceil(this.presets.length / this.renderProps.cols) * (this.itemHeight + this.gap);
        const viewHeight = this.renderProps.sy - this.headerHeight;

        // If content fits, reset to 0
        if (contentHeight <= viewHeight) {
            this.scrollY = 0;
        } else {
            // Allow scrolling but clamp to bottom
            // minScroll is negative. 
            // We want to be able to scroll until the last item is visible at the bottom.
            const minScroll = -(contentHeight - viewHeight + 10); // 10px padding
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

        // 1. Calculate Grid Dimensions First (Critical for scroll clamping)
        const availWidth = sx;
        const cols = Math.max(1, Math.floor(availWidth / this.itemMinWidth));
        this.renderProps.cols = cols;
        const itemWidth = (availWidth - ((cols - 1) * this.gap)) / cols;

        // 2. Clamp Scroll based on new dimensions
        this._clampScroll();

        // Background
        HCW.ctx.fillStyle = this.renderProps.colors.background;
        HCW.ctx.fillRect(x, y, sx, sy);

        // Header
        HCW.ctx.fillStyle = this.renderProps.colors.headerText;
        HCW.ctx.font = "bold 14px Arial";
        HCW.ctx.textAlign = "center";
        HCW.ctx.fillText(this.text, x + (sx / 2), y + 20);
        HCW.ctx.textAlign = "start";

        // Content Area clipping
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

            // Optimization: Only draw if visible
            // Check checking overlap with context window
            if (py + this.itemHeight >= y && py <= y + sy) {

                // Determine color (Pressed or Default)
                let bgColor = preset.color || this.renderProps.colors.itemDefaultColor;
                if (index === this._pressedIndex) {
                    bgColor = this.renderProps.colors.itemPressedColor;
                }

                // Draw Item Box
                HCW.ctx.fillStyle = bgColor;
                HCW.ctx.fillRect(px, py, itemWidth, this.itemHeight);

                // Draw Item Text
                HCW.ctx.fillStyle = this.renderProps.colors.itemText;
                HCW.ctx.font = "12px Arial";
                HCW.ctx.textAlign = "center";

                // Adjust text position if progress is shown
                let textY = py + (this.itemHeight / 2) + 4;
                if (preset.progress !== undefined && preset.progress !== null) {
                    textY = py + (this.itemHeight / 2) - 5;
                }

                HCW.ctx.fillText(preset.name, px + (itemWidth / 2), textY);

                // Draw Progress Bar and Percent
                if (preset.progress !== undefined && preset.progress !== null) {
                    const barHeight = 6;
                    const progress = Math.max(0, Math.min(1, preset.progress));

                    // Bar Background (Darker)
                    HCW.ctx.fillStyle = "rgba(0,0,0,0.3)";
                    HCW.ctx.fillRect(px, py + this.itemHeight - barHeight, itemWidth, barHeight);

                    // Bar Fill (Green)
                    HCW.ctx.fillStyle = "#00ff00";
                    HCW.ctx.fillRect(px, py + this.itemHeight - barHeight, itemWidth * progress, barHeight);

                    // Percentage Text
                    HCW.ctx.fillStyle = this.renderProps.colors.itemText;
                    HCW.ctx.font = "10px Arial";
                    HCW.ctx.fillText(Math.round(progress * 100) + "%", px + (itemWidth / 2), textY + 15);
                }

                HCW.ctx.textAlign = "start";

                // Store hit box (using absolute screen coords)
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

class HCWNumberField {
    constructor(fieldName = 'Numpad', id = Date.now()) {
        this.type = 'numpad';
        this.text = fieldName;
        this.id = id;

        this.value = "";
        this.onEnterCallback = null;

        this.headerHeight = 30;
        this.displayHeight = 40;
        this.gap = 4;

        this.keys = [
            ['7', '8', '9'],
            ['4', '5', '6'],
            ['1', '2', '3'],
            ['.', '0', ','],
            ['<=', 'C', 'ENTER']
        ];

        this.renderProps = {
            colors: {
                background: '#1b1717ff',
                headerText: '#ffffff',
                displayBg: '#000000',
                displayText: '#00ff95',
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
            buttons: [] // Hit zones
        };

        this._pressedKey = null; // Track pressed key for visual feedback
        this._dragLastY = null; // Needed for compatibility with touch/drag context
    }

    setValue(val) {
        this.value = String(val);
        if (typeof HCWRender !== 'undefined') HCWRender.updateFrame();
        return this;
    }

    onEnter(callback) {
        this.onEnterCallback = callback;
        return this;
    }

    _interaction(interaction) {
        if (interaction.type === 'mousedown') {
            const { mouseX, mouseY } = interaction;
            this._potentialClick = true;
            this._clickStartY = mouseY;

            // Check button hits
            const hit = this._findHitButton(mouseX, mouseY);
            if (hit) {
                this._pressedKey = hit.key;
                if (typeof HCWRender !== 'undefined') HCWRender.updateFrame();
            }

        } else if (interaction.type === 'mousemove') {
            const { mouseX, mouseY } = interaction;
            if (this._potentialClick && Math.abs(mouseY - this._clickStartY) > 5) {
                this._potentialClick = false;
                this._pressedKey = null;
                if (typeof HCWRender !== 'undefined') HCWRender.updateFrame();
            }

        } else if (interaction.type === 'mouseup') {

            if (this._potentialClick && this._pressedKey) {
                // Determine action
                const key = this._pressedKey;

                if (key === 'ENTER') {
                    if (this.onEnterCallback) {
                        this.onEnterCallback(this.value);
                    }
                    // Optionally clear or keep value? Let's keep it until user clears or overwrites.
                    // Or maybe we should clear? Usually numpads might clear on enter. 
                    // Let's keep it for now.
                } else if (key === '.' || key === ',') {
                    // Prevent multiple dots/commas if desired? 
                    // For now just append.
                    this.value += key;
                } else if (key === 'C') {
                    this.value = "";
                } else if (key === '<=') {
                    this.value = this.value.slice(0, -1);
                } else {
                    // Number
                    this.value += key;
                }
            }

            this._potentialClick = false;
            this._pressedKey = null;
            if (typeof HCWRender !== 'undefined') HCWRender.updateFrame();
        }
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

        // Background
        HCW.ctx.fillStyle = this.renderProps.colors.background;
        HCW.ctx.fillRect(x, y, sx, sy);

        // Header
        HCW.ctx.fillStyle = this.renderProps.colors.headerText;
        HCW.ctx.font = "bold 14px Arial";
        HCW.ctx.textAlign = "center";
        HCW.ctx.fillText(this.text, x + (sx / 2), y + 20);
        HCW.ctx.textAlign = "start";

        // Display Area
        const displayY = y + this.headerHeight;
        HCW.ctx.fillStyle = this.renderProps.colors.displayBg;
        HCW.ctx.fillRect(x + 5, displayY, sx - 10, this.displayHeight);

        HCW.ctx.fillStyle = this.renderProps.colors.displayText;
        HCW.ctx.font = "20px Monospace"; // Digital look
        HCW.ctx.textAlign = "right";
        // Simple clipping of text could be needed if too long, but for now just draw
        HCW.ctx.fillText(this.value, x + sx - 15, displayY + 28);
        HCW.ctx.textAlign = "start"; // Reset

        // Keypad Grid
        const gridY = displayY + this.displayHeight + 10;
        const gridH = sy - (gridY - y) - 5; // Available height
        const gridW = sx - 10; // Available width (5px padding sides)
        const gridX = x + 5;

        // We have 5 rows
        const rows = this.keys.length;
        const rowH = (gridH - ((rows - 1) * this.gap)) / rows;

        this.renderProps.buttons = [];

        this.keys.forEach((rowKeys, rowIndex) => {
            const rowY = gridY + (rowIndex * (rowH + this.gap));

            // Calculate col width based on keys in this row
            // If row has 1 key (ENTER), it spans full width
            const cols = rowKeys.length;
            const colW = (gridW - ((cols - 1) * this.gap)) / cols;

            rowKeys.forEach((key, colIndex) => {
                const btnX = gridX + (colIndex * (colW + this.gap));

                // Color Logic
                let bg = this.renderProps.colors.keyDefault;
                if (key === 'ENTER') bg = this.renderProps.colors.enterKey;

                // Active State
                if (this._pressedKey === key) {
                    if (key === 'ENTER') bg = this.renderProps.colors.enterKeyActive;
                    else bg = this.renderProps.colors.keyActive;
                }

                // Draw Button
                HCW.ctx.fillStyle = bg;
                HCW.ctx.fillRect(btnX, rowY, colW, rowH);

                // Draw Text
                HCW.ctx.fillStyle = this.renderProps.colors.keyText;
                HCW.ctx.font = (key === 'ENTER') ? "bold 12px Arial" : "16px Arial";
                HCW.ctx.textAlign = "center";
                HCW.ctx.fillText(key, btnX + (colW / 2), rowY + (rowH / 2) + 6);
                HCW.ctx.textAlign = "start";

                // Hitbox
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

class HCWKeyboardField {
    constructor(fieldName = 'Keyboard', id = Date.now()) {
        this.type = 'keyboard';
        this.text = fieldName;
        this.id = id;

        this.value = "";
        this.onEnterCallback = null;
        this.isUpperCase = true; // Default to upper case

        // Layout constants
        this.headerHeight = 30;
        this.displayHeight = 40;
        this.gap = 4;

        // QWERTZ Layout
        this.keys = [
            ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'ß'],
            ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O', 'P', 'Ü'],
            ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ö', 'Ä'],
            ['SHIFT', 'Y', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '-'],
            ['DELETE', '<=', 'SPACE', 'ENTER']
        ];

        this.renderProps = {
            colors: {
                background: '#1b1717ff',
                headerText: '#ffffff',
                displayBg: '#000000',
                displayText: '#00ff95',
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
            buttons: []
        };

        this._pressedKey = null;
        this._dragLastY = null;
    }

    setValue(val) {
        this.value = String(val);
        if (typeof HCWRender !== 'undefined') HCWRender.updateFrame();
        return this;
    }

    onEnter(callback) {
        this.onEnterCallback = callback;
        return this;
    }

    _interaction(interaction) {
        if (interaction.type === 'mousedown') {
            const { mouseX, mouseY } = interaction;
            this._potentialClick = true;
            this._clickStartY = mouseY;

            // Check button hits
            const hit = this._findHitButton(mouseX, mouseY);
            if (hit) {
                this._pressedKey = hit.key;
                if (typeof HCWRender !== 'undefined') HCWRender.updateFrame();
            }

        } else if (interaction.type === 'mousemove') {
            const { mouseX, mouseY } = interaction;
            if (this._potentialClick && Math.abs(mouseY - this._clickStartY) > 5) {
                this._potentialClick = false;
                this._pressedKey = null;
                if (typeof HCWRender !== 'undefined') HCWRender.updateFrame();
            }

        } else if (interaction.type === 'mouseup') {

            if (this._potentialClick && this._pressedKey) {
                const key = this._pressedKey; // This is the RAW key from the layout (e.g. 'SHIFT', 'A')

                if (key === 'ENTER') {
                    if (this.onEnterCallback) {
                        this.onEnterCallback(this.value);
                    }
                } else if (key === '<=') {
                    this.value = this.value.slice(0, -1);
                } else if (key === 'DELETE') { // Clear All
                    this.value = "";
                } else if (key === 'SPACE') {
                    this.value += " ";
                } else if (key === 'SHIFT') {
                    this.isUpperCase = !this.isUpperCase;
                } else {
                    // Regular character
                    // Apply case logic
                    if (this.isUpperCase) {
                        this.value += key.toUpperCase();
                    } else {
                        this.value += key.toLowerCase();
                    }
                }
            }

            this._potentialClick = false;
            this._pressedKey = null;
            if (typeof HCWRender !== 'undefined') HCWRender.updateFrame();
        }
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

        // Background
        HCW.ctx.fillStyle = this.renderProps.colors.background;
        HCW.ctx.fillRect(x, y, sx, sy);

        // Header
        HCW.ctx.fillStyle = this.renderProps.colors.headerText;
        HCW.ctx.font = "bold 14px Arial";
        HCW.ctx.textAlign = "center";
        HCW.ctx.fillText(this.text, x + (sx / 2), y + 20);
        HCW.ctx.textAlign = "start";

        // Display Area
        const displayY = y + this.headerHeight;
        HCW.ctx.fillStyle = this.renderProps.colors.displayBg;
        HCW.ctx.fillRect(x + 5, displayY, sx - 10, this.displayHeight);

        HCW.ctx.fillStyle = this.renderProps.colors.displayText;
        HCW.ctx.font = "20px Monospace";
        HCW.ctx.textAlign = "left";

        let textToDraw = this.value;
        const metrics = HCW.ctx.measureText(textToDraw);
        if (metrics.width > sx - 20) {
            HCW.ctx.textAlign = "right";
            HCW.ctx.fillText(textToDraw, x + sx - 10, displayY + 28);
        } else {
            HCW.ctx.fillText(textToDraw, x + 10, displayY + 28);
        }
        HCW.ctx.textAlign = "start";

        // Keypad Grid
        const gridY = displayY + this.displayHeight + 10;
        const gridH = sy - (gridY - y) - 5;
        const gridW = sx - 10;
        const gridX = x + 5;

        const rows = this.keys.length;
        const rowH = (gridH - ((rows - 1) * this.gap)) / rows;

        this.renderProps.buttons = [];

        this.keys.forEach((rowKeys, rowIndex) => {
            const rowY = gridY + (rowIndex * (rowH + this.gap));

            // Layout Logic for specific rows
            let totalKeyWeight = 0;
            if (rowIndex === 4) { // Last row: DELETE, C, SPACE, ENTER
                // DELETE: 1.5, C: 1, SPACE: 4, ENTER: 1.5 -> Total ~8
                rowKeys.forEach(k => {
                    if (k === 'SPACE') totalKeyWeight += 4;
                    else if (k === 'DELETE' || k === 'ENTER') totalKeyWeight += 1.5;
                    else totalKeyWeight += 1;
                });
            } else if (rowIndex === 3) { // SHIFT row
                // SHIFT needs to be wider?
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
                    if (keyRaw === 'SPACE') colW = unitW * 4;
                    else if (keyRaw === 'DELETE' || keyRaw === 'ENTER') colW = unitW * 1.5;
                } else if (rowIndex === 3) {
                    if (keyRaw === 'SHIFT') colW = unitW * 1.5;
                }

                // Determine display label based on case (only for single chars usually)
                let displayLabel = keyRaw;
                if (!this.isUpperCase && keyRaw.length === 1) {
                    displayLabel = keyRaw.toLowerCase();
                    // Handle numbers? Usually shift affects numbers (symbols), but for simplicity:
                    // If we want 1-0 to stay 1-0, we just lower case. 
                    // To be strict, 1.toLowerCase is 1.
                }

                // Color Logic
                let bg = this.renderProps.colors.keyDefault;
                if (keyRaw === 'ENTER') bg = this.renderProps.colors.specialKey;
                else if (keyRaw === 'DELETE' || keyRaw === '<=') bg = this.renderProps.colors.deleteKey;
                else if (keyRaw === 'SHIFT') bg = this.isUpperCase ? this.renderProps.colors.shiftKeyActive : this.renderProps.colors.shiftKey;

                // Active State (Pressing)
                if (this._pressedKey === keyRaw) {
                    if (keyRaw === 'ENTER') bg = this.renderProps.colors.specialKeyActive;
                    else if (keyRaw === 'DELETE' || keyRaw === '<=') bg = this.renderProps.colors.deleteKeyActive;
                    else if (keyRaw === 'SHIFT') { /* handled above by toggle state usually, but for press feedback: */ bg = '#aaaaaa'; }
                    else bg = this.renderProps.colors.keyActive;
                }

                // Draw Button
                HCW.ctx.fillStyle = bg;
                HCW.ctx.fillRect(currentX, rowY, colW, rowH);

                // Draw Text
                HCW.ctx.fillStyle = this.renderProps.colors.keyText;
                HCW.ctx.font = (displayLabel.length > 1) ? "bold 11px Arial" : "14px Arial";
                HCW.ctx.textAlign = "center";
                HCW.ctx.fillText(displayLabel, currentX + (colW / 2), rowY + (rowH / 2) + 5);
                HCW.ctx.textAlign = "start";

                // Hitbox
                this.renderProps.buttons.push({
                    key: keyRaw, // Store RAW key for logic
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
