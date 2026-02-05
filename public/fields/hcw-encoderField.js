class HCWEncoderField extends HCWBaseField {
    constructor(encoderText = 'Encoder') {
        super(encoderText);
        this.className = 'HCWEncoderField';
        this._insertClassKeyword();

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

    setFloats(val1, val2 = null) {
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

    getFloat() {
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
            this.setFloats(this.value + (step * direction));
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
            this.setFloats(this.value, this.value2 + rotationSensitivity);
        } else {
            this.setFloats(this.value + rotationSensitivity, this.value2);
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
            HCW.ctx.fillText(this.getLabel(), cx, knobCy + outerRadius + 16);

            HCW.ctx.font = "10px Monospace";
            const v1Str = this._getFormattedValue(this.value);
            const v2Str = this._getFormattedValue(this.value2);
            HCW.ctx.fillText(`${v1Str} | ${v2Str}`, cx, knobCy + outerRadius + 30);

            HCW.ctx.textAlign = "start";
        }
    }
}