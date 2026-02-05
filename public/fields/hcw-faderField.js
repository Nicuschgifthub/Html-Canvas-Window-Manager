class HCWFaderField extends HCWBaseField {
    constructor(label = 'Fader 01') {
        super(label);
        this.className = 'HCWFaderField';
        this._insertClassKeyword();

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
        if (interaction.type === 'mousedown' || interaction.type === 'mousemove') {
            const relativeY = interaction.mouseY - this.renderProps.startY;
            const height = this.renderProps.sy;

            let normalizedVal = 1 - (relativeY / height);

            this.setFloat(normalizedVal);
        } else if (interaction.type === 'scroll') {
            const step = 0.04;
            const direction = interaction.deltaY > 0 ? -1 : 1;
            this.setFloat(this.value + (step * direction));
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
        HCW.ctx.textAlign = "left";
        HCW.ctx.fillText(this.getLabel(), x + 5, y + 15);
        HCW.ctx.fillText(this._getFormattedValue(), x + 5, y + 30);
    }
}