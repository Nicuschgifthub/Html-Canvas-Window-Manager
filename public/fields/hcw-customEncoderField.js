class HCWCustomEncoderField extends HCWBaseField {
    constructor(label = 'Color Wheel') {
        super(label);
        this.className = 'HCWCustomEncoderField';
        this._insertClassKeyword();

        this.value = 0.0;
        this.value2 = 0.0;
        this.displayType = 'byte';

        this.centerColor = null;
        this.centerImage = null;
        this._loadedImage = null;
        this.wheelData = [];
        this.iconCache = {};

        this.renderProps = {
            colors: {
                background: GS.FIELDS.CUSTOM_ENCODER.BACKGROUND,
                knobOuter: GS.FIELDS.CUSTOM_ENCODER.KNOB_OUTER,
                knobInner: GS.FIELDS.CUSTOM_ENCODER.KNOB_INNER,
                indicator: GS.FIELDS.CUSTOM_ENCODER.INDICATOR,
                text: GS.FIELDS.CUSTOM_ENCODER.TEXT
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
        return GLOBAL_TYPES.CONTEXT_FIELDS.CUSTOM_WHEEL_ENCODER;
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

    _triggerCallback() {
        let activeKeys = [];
        const dmx = Math.round(this.value * 255);
        if (this.wheelData) {
            this.wheelData.forEach(item => {
                const ranges = Array.isArray(item.range[0]) ? item.range : [item.range];
                const match = ranges.some(r => dmx >= r[0] && dmx <= r[1]);

                if (match) {
                    if (Array.isArray(item.data)) {
                        activeKeys.push(...item.data);
                    } else {
                        activeKeys.push(item.data);
                    }
                }
            });
        }

        this.emitAction(GLOBAL_TYPES.ACTIONS.CUSTOM_ENCODER_VALUE_UPDATE, {
            outer: {
                value: this.value,
                byte: dmx,
                percent: Math.round(this.value * 100)
            },
            inner: {
                value: this.value2,
                byte: Math.round(this.value2 * 255),
                percent: Math.round(this.value2 * 100)
            },
            wheel: {
                activeKeys: activeKeys,
                isSplit: activeKeys.length > 1,
                count: activeKeys.length
            },
            combinedByte: dmx + Math.round(this.value2 * 255)
        });
    }

    setFloats(val1, val2 = null) {
        let v1 = val1;
        let v2 = (val2 !== null) ? val2 : this.value2;

        while (v2 >= 1.0) { v2 -= 1.0; v1 += (1 / 255); }
        while (v2 < 0.0) { v2 += 1.0; v1 -= (1 / 255); }

        this.value = Math.max(0, Math.min(1, v1));
        this.value2 = Math.max(0, Math.min(1, v2));

        this._triggerCallback();

        this.updateFrame();
        return this;
    }

    _interaction(interaction) {
        if (interaction.type === 'mousedown') {
            const cx = this.renderProps.centerX;
            const cy = this.renderProps.centerY;
            const dist = Math.sqrt(Math.pow(interaction.mouseX - cx, 2) + Math.pow(interaction.mouseY - cy, 2));
            if (dist < this.renderProps.innerRadius * 1.2) {
                this.renderProps.activeRing = 'inner';
            } else if (dist < this.renderProps.outerRadius * 1.2) {
                this.renderProps.activeRing = 'outer';
            }
        } else if (interaction.type === 'mousemove') {
            if (this.renderProps.activeRing) {
                this._updateFromDelta(interaction.mouseX, interaction.mouseY);
            }
        } else if (interaction.type === 'mouseup') {
            this.renderProps.activeRing = null;
            this._lastInteractionAngle = null;
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
        this.outerSlowFactor = 0.25;
        if (this.renderProps.activeRing === 'inner') {
            this.setFloats(this.value, this.value2 + rotationSensitivity);
        } else {
            this.setFloats(this.value + (rotationSensitivity * this.outerSlowFactor), this.value2);
        }
        this._lastInteractionAngle = currentAngle;
    }

    setWheelData(dataArray) {
        this.wheelData = Array.isArray(dataArray) ? dataArray : [];
        this.wheelData.forEach(item => {
            const keys = Array.isArray(item.data) ? item.data : [item.data];
            keys.forEach(key => {
                if (key.includes('base64') || key.includes('/') || key.includes('.')) {
                    if (!this.iconCache[key]) {
                        const img = new Image();
                        img.src = key;
                        img.onload = () => this.updateFrame();
                        this.iconCache[key] = img;
                    }
                }
            });
        });
        return this;
    }

    setCenterImage(src) {
        this.centerImage = src;
        if (src) {
            this._loadedImage = new Image();
            this._loadedImage.src = src;
            this._loadedImage.onload = () => this.updateFrame();
        }
        return this;
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
        const innerRadius = Math.max(12, minDim * 0.19);

        this.renderProps.centerX = cx;
        this.renderProps.centerY = knobCy;
        this.renderProps.outerRadius = outerRadius;
        this.renderProps.innerRadius = innerRadius;

        const colors = this.renderProps.colors;

        // 1. Background
        ctx.fillStyle = colors.background;
        ctx.fillRect(x, y, sx, sy);

        // Header Title
        if (showText) {
            ctx.fillStyle = colors.text;
            ctx.font = GS.FONTS.TITLE;
            ctx.textAlign = "center";
            ctx.fillText(this.getLabel(), cx, y + 20);
        }

        // 2. 270° Outer Progress Arc
        const startRad = (135 * Math.PI) / 180;
        const rangeRad = (270 * Math.PI) / 180;
        const currentRad = startRad + (this.value * rangeRad);

        ctx.beginPath();
        ctx.arc(cx, knobCy, outerRadius + 6, startRad, startRad + rangeRad);
        ctx.strokeStyle = '#252525';
        ctx.lineWidth = 4;
        ctx.stroke();

        if (this.value > 0) {
            ctx.beginPath();
            ctx.arc(cx, knobCy, outerRadius + 6, startRad, currentRad);
            ctx.strokeStyle = colors.indicator;
            ctx.lineWidth = 4;
            ctx.stroke();
        }

        // 3. Outer Wheel Rim (3D Metallic Gradient)
        const outerGrad = ctx.createRadialGradient(cx - outerRadius * 0.3, knobCy - outerRadius * 0.3, outerRadius * 0.1, cx, knobCy, outerRadius);
        outerGrad.addColorStop(0, '#4a4040');
        outerGrad.addColorStop(0.7, colors.knobOuter);
        outerGrad.addColorStop(1, '#241f1f');

        ctx.beginPath();
        ctx.arc(cx, knobCy, outerRadius, 0, 2 * Math.PI);
        ctx.fillStyle = outerGrad;
        ctx.fill();

        ctx.strokeStyle = '#5a4f4f';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 4. Indicator Line & Glowing Tip (1:1 mouse rotation tracking across 4 full revolutions)
        const currentRad = (this.value * 4 * 2 * Math.PI) - (Math.PI / 2);
        const startY = knobCy + (Math.sin(currentRad) * (outerRadius * 0.35));
        const indX = cx + (Math.cos(currentRad) * (outerRadius * 0.85));
        const indY = knobCy + (Math.sin(currentRad) * (outerRadius * 0.85));

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(indX, indY);
        ctx.strokeStyle = colors.indicator;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(indX, indY, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = colors.indicator;
        ctx.fill();

        // 5. Center Active Gobo / Color Slot Wheel
        let activeKeys = [];
        const dmx = Math.round(this.value * 255);

        this.wheelData.forEach(item => {
            const ranges = Array.isArray(item.range[0]) ? item.range : [item.range];
            const match = ranges.some(r => dmx >= r[0] && dmx <= r[1]);
            if (match) {
                if (Array.isArray(item.data)) {
                    activeKeys.push(...item.data);
                } else {
                    activeKeys.push(item.data);
                }
            }
        });

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, knobCy, innerRadius, 0, Math.PI * 2);
        ctx.clip();

        if (activeKeys.length > 0) {
            const sliceAngle = (Math.PI * 2) / activeKeys.length;
            activeKeys.forEach((key, i) => {
                ctx.beginPath();
                ctx.moveTo(cx, knobCy);
                ctx.arc(cx, knobCy, innerRadius, i * sliceAngle - Math.PI / 2, (i + 1) * sliceAngle - Math.PI / 2);
                const img = this.iconCache[key];
                if (img && img.complete) {
                    ctx.save(); ctx.clip();
                    ctx.drawImage(img, cx - innerRadius, knobCy - innerRadius, innerRadius * 2, innerRadius * 2);
                    ctx.restore();
                } else {
                    ctx.fillStyle = (key.startsWith('#') || key.startsWith('rgb')) ? key : '#444';
                    ctx.fill();
                }
            });
        } else if (this._loadedImage && this._loadedImage.complete) {
            ctx.drawImage(this._loadedImage, cx - innerRadius, knobCy - innerRadius, innerRadius * 2, innerRadius * 2);
        } else if (this.centerColor) {
            ctx.fillStyle = this.centerColor;
            ctx.fill();
        } else {
            ctx.fillStyle = '#0a0a0a';
            ctx.fill();
        }
        ctx.restore();

        // Glass Inner Ring Bevel
        ctx.strokeStyle = '#ffffff44';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, knobCy, innerRadius, 0, Math.PI * 2);
        ctx.stroke();

        // 6. Dual Readout Badges at Bottom
        if (showText && sy >= 140) {
            const v1Str = `DMX: ${dmx}`;
            const v2Str = `Fine: ${Math.round(this.value2 * 255)}`;

            const badgeH = 22;
            const badgeW = (sx - 30) / 2;
            const badgeY = y + sy - badgeH - 10;

            ctx.fillStyle = '#111111';
            ctx.fillRect(x + 10, badgeY, badgeW, badgeH);
            ctx.strokeStyle = colors.indicator;
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 10, badgeY, badgeW, badgeH);

            ctx.fillStyle = colors.indicator;
            ctx.font = GS.FONTS.MONO_READOUT;
            ctx.textAlign = "center";
            ctx.fillText(v1Str, x + 10 + badgeW / 2, badgeY + badgeH / 2 + 4);

            ctx.fillStyle = '#111111';
            ctx.fillRect(x + 20 + badgeW, badgeY, badgeW, badgeH);
            ctx.strokeStyle = GS.PALETTE.ACCENT_GREEN;
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 20 + badgeW, badgeY, badgeW, badgeH);

            ctx.fillStyle = GS.PALETTE.ACCENT_GREEN;
            ctx.font = GS.FONTS.MONO_READOUT;
            ctx.textAlign = "center";
            ctx.fillText(v2Str, x + 20 + badgeW + badgeW / 2, badgeY + badgeH / 2 + 4);
        }

        ctx.textAlign = "start";
    }
}