class HCWEncoderField extends HCWBaseField {
    constructor(encoderText = 'Encoder') {
        super(encoderText);
        this.className = 'HCWEncoderField';
        this._insertClassKeyword();

        this.value = 0.0;
        this.value2 = 0.0;

        this.outerSlowFactor = 0.25;

        this.displayType = 'byte';

        this.renderProps = {
            colors: {
                background: GS.FIELDS.ENCODER.BACKGROUND,
                knobOuter: GS.FIELDS.ENCODER.KNOB_OUTER,
                knobInner: GS.FIELDS.ENCODER.KNOB_INNER,
                indicator: GS.FIELDS.ENCODER.INDICATOR_OUTER,
                indicatorInner: GS.FIELDS.ENCODER.INDICATOR_INNER,
                text: GS.FIELDS.ENCODER.TEXT
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

    getV1_DMX() {
        return Math.round(this.value * 255);
    }

    getV2_DMX() {
        return Math.round(this.value2 * 255);
    }

    setDMX(v1_255, v2_255 = null) {
        const v1_float = v1_255 / 255;
        const v2_float = (v2_255 !== null) ? (v2_255 / 255) : this.value2;
        return this.setFloats(v1_float, v2_float);
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

            this._lastInteractionAngle = Math.atan2(interaction.mouseY - cy, interaction.mouseX - cx);

        } else if (interaction.type === 'mousemove') {
            if (this.renderProps.activeRing) {
                this._updateFromDelta(interaction.mouseX, interaction.mouseY);
            }

        } else if (interaction.type === 'mouseup') {
            this.renderProps.activeRing = null;
            this._lastInteractionAngle = null;

        } else if (interaction.type === 'scroll') {
            const step = 0.01;
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
            this.setFloats(this.value + (rotationSensitivity * this.outerSlowFactor), this.value2);
        }

        this._lastInteractionAngle = currentAngle;
    }

    _drawArcTrack(ctx, cx, cy, radius, value, color, startAngleDeg = 135, totalAngleDeg = 270) {
        const startRad = (startAngleDeg * Math.PI) / 180;
        const totalRad = (totalAngleDeg * Math.PI) / 180;
        const endRad = startRad + (value * totalRad);

        // Track Background Arc
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startRad, startRad + totalRad);
        ctx.strokeStyle = GS.FIELDS.ENCODER.TRACK_ARC_BG;
        ctx.lineWidth = 4;
        ctx.stroke();

        // Active Progress Arc
        if (value > 0) {
            ctx.beginPath();
            ctx.arc(cx, cy, radius, startRad, endRad);
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.stroke();
        }
    }

    _drawIndicator(cx, cy, radius, value, color, isFullRotation = false) {
        const ctx = HCW.ctx;
        let currentRad;

        if (isFullRotation) {
            currentRad = (value * 2 * Math.PI) - (Math.PI / 2);
        } else {
            const startRad = (135 * Math.PI) / 180;
            const rangeRad = (270 * Math.PI) / 180;
            currentRad = startRad + (value * rangeRad);
        }

        const startX = cx + (Math.cos(currentRad) * (radius * 0.35));
        const startY = cy + (Math.sin(currentRad) * (radius * 0.35));
        const indX = cx + (Math.cos(currentRad) * (radius * 0.85));
        const indY = cy + (Math.sin(currentRad) * (radius * 0.85));

        // Line
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(indX, indY);
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Glowing Dot at Tip
        ctx.beginPath();
        ctx.arc(indX, indY, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    }

    render(contextwindow) {
        const ctx = HCW.ctx;
        if (!ctx) return;

        const { x, y, sx, sy } = contextwindow;
        const showText = sy > 110;
        const cx = x + (sx / 2);

        let knobCy = showText ? y + (sy * 0.42) : y + (sy * 0.5);

        const minDim = Math.min(sx, sy);
        const outerRadius = Math.max(20, minDim * 0.32);
        const innerRadius = Math.max(12, minDim * 0.18);

        this.renderProps.centerX = cx;
        this.renderProps.centerY = knobCy;
        this.renderProps.outerRadius = outerRadius;
        this.renderProps.innerRadius = innerRadius;

        const colors = this.renderProps.colors;

        // Window Background
        ctx.fillStyle = colors.background;
        ctx.fillRect(x, y, sx, sy);

        // Header Title
        if (showText) {
            ctx.fillStyle = colors.text;
            ctx.font = GS.FONTS.TITLE;
            ctx.textAlign = "center";
            ctx.fillText(this.getLabel(), cx, y + 20);
        }

        // 1. Outer Arc Progress Track
        this._drawArcTrack(ctx, cx, knobCy, outerRadius + 6, this.value, colors.indicator, 135, 270);

        // 2. Outer Knob (Radial Gradient 3D Metallic)
        const outerGrad = ctx.createRadialGradient(cx - outerRadius * 0.3, knobCy - outerRadius * 0.3, outerRadius * 0.1, cx, knobCy, outerRadius);
        outerGrad.addColorStop(0, GS.FIELDS.ENCODER.KNOB_GRAD_START);
        outerGrad.addColorStop(0.7, colors.knobOuter);
        outerGrad.addColorStop(1, GS.FIELDS.ENCODER.KNOB_GRAD_END);

        ctx.beginPath();
        ctx.arc(cx, knobCy, outerRadius, 0, 2 * Math.PI);
        ctx.fillStyle = outerGrad;
        ctx.fill();

        ctx.strokeStyle = GS.FIELDS.ENCODER.KNOB_BORDER;
        ctx.lineWidth = 1;
        ctx.stroke();

        this._drawIndicator(cx, knobCy, outerRadius, this.value, colors.indicator, false);

        // 3. Inner Arc Progress Track
        this._drawArcTrack(ctx, cx, knobCy, innerRadius + 4, this.value2, colors.indicatorInner, 0, 360);

        // 4. Inner Knob (Radial Gradient 3D Metallic)
        const innerGrad = ctx.createRadialGradient(cx - innerRadius * 0.3, knobCy - innerRadius * 0.3, innerRadius * 0.1, cx, knobCy, innerRadius);
        innerGrad.addColorStop(0, GS.FIELDS.ENCODER.INNER_KNOB_GRAD_START);
        innerGrad.addColorStop(0.8, colors.knobInner);
        innerGrad.addColorStop(1, GS.FIELDS.ENCODER.INNER_KNOB_GRAD_END);

        ctx.beginPath();
        ctx.arc(cx, knobCy, innerRadius, 0, 2 * Math.PI);
        ctx.fillStyle = innerGrad;
        ctx.fill();

        ctx.strokeStyle = GS.FIELDS.ENCODER.INNER_KNOB_BORDER;
        ctx.lineWidth = 1;
        ctx.stroke();

        this._drawIndicator(cx, knobCy, innerRadius, this.value2, colors.indicatorInner, true);

        // Center Cap Dot
        ctx.beginPath();
        ctx.arc(cx, knobCy, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#0a0a0a';
        ctx.fill();

        // 5. Dual Readout Pill Badges at Bottom
        if (showText && sy >= 140) {
            const v1Str = `V1: ${this._getFormattedValue(this.value)}`;
            const v2Str = `V2: ${this._getFormattedValue(this.value2)}`;

            const badgeH = 22;
            const badgeW = (sx - 30) / 2;
            const badgeY = y + sy - badgeH - 10;

            // Outer V1 Badge (Left)
            ctx.fillStyle = '#111111';
            ctx.fillRect(x + 10, badgeY, badgeW, badgeH);
            ctx.strokeStyle = colors.indicator;
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 10, badgeY, badgeW, badgeH);

            ctx.fillStyle = colors.indicator;
            ctx.font = GS.FONTS.MONO_READOUT;
            ctx.textAlign = "center";
            ctx.fillText(v1Str, x + 10 + badgeW / 2, badgeY + badgeH / 2 + 4);

            // Inner V2 Badge (Right)
            ctx.fillStyle = '#111111';
            ctx.fillRect(x + 20 + badgeW, badgeY, badgeW, badgeH);
            ctx.strokeStyle = colors.indicatorInner;
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 20 + badgeW, badgeY, badgeW, badgeH);

            ctx.fillStyle = colors.indicatorInner;
            ctx.font = GS.FONTS.MONO_READOUT;
            ctx.textAlign = "center";
            ctx.fillText(v2Str, x + 20 + badgeW + badgeW / 2, badgeY + badgeH / 2 + 4);
        }

        ctx.textAlign = "start";
    }
}