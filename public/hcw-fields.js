
class HCWFaderField {
    constructor(faderText = 'Fader 01', id = Date.now()) {
        this.type = 'fader';
        this.text = faderText;
        this.id = id;

        this.value = 0.0; // 0.0 to 1.0
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
        HCW.ctx.fillText(this.value.toFixed(2), x + 5, y + 30);
    }
}
