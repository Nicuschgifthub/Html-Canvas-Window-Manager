class HCWFaderField extends HCWBaseField {
    constructor(label = 'Fader 01') {
        super(label);
        this.className = 'HCWFaderField';
        this._insertClassKeyword();

        this.value = 0.0;
        this.displayType = 'byte';

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

        this._isDragging = false;
        this._clickStartY = 0;
        this._initialValue = 0;
    }

    getType() {
        return GLOBAL_TYPES.CONTEXT_FIELDS.FADER;
    }

    setFloat(val) {
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

    getFloat() {
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
        const height = this.renderProps.sy;

        if (interaction.type === 'mousedown') {
            this._isDragging = true;
            this._clickStartY = interaction.mouseY;
            this._initialValue = this.value;
        }
        else if (interaction.type === 'mousemove' && this._isDragging) {
            // Calculate how far the mouse moved from the start point
            const deltaY = this._clickStartY - interaction.mouseY;

            // Convert pixel movement to 0.0 - 1.0 range
            // (Moving up is positive, so we add the normalized delta)
            const normalizedDelta = deltaY / height;

            this.setFloat(this._initialValue + normalizedDelta);
        }
        else if (interaction.type === 'mouseup' || interaction.type === 'mouseleave') {
            this._isDragging = false;
        }
        else if (interaction.type === 'scroll') {
            const step = 0.04;
            const direction = interaction.deltaY > 0 ? -1 : 1;
            this.setFloat(this.value + (step * direction));
        }
    }

    render(contextwindow) {
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
        HCW.ctx.textAlign = "left";
        HCW.ctx.fillText(this.getLabel(), x + 5, y + 15);
        HCW.ctx.fillText(this._getFormattedValue(), x + 5, y + 30);
    }
}