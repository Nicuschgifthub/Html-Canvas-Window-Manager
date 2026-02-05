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
                background: '#1b1717ff',
                knobOuter: '#574b4bff',
                knobInner: '#3d3434',
                indicator: '#ffffff',
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
        return GLOBAL_TYPES.CONTEXT_FIELDS.CUSTOM_WHEEL_ENCODER;
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
        if (this.renderProps.activeRing === 'inner') {
            this.setFloats(this.value, this.value2 + rotationSensitivity);
        } else {
            this.setFloats(this.value + rotationSensitivity, this.value2);
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
        const sx = contextwindow.sx;
        const sy = contextwindow.sy;
        const cx = contextwindow.x + (sx / 2);
        const knobCy = sy > 100 ? contextwindow.y + (sy * 0.45) : contextwindow.y + (sy * 0.5);
        const minDim = Math.min(sx, sy);
        this.renderProps.centerX = cx;
        this.renderProps.centerY = knobCy;
        this.renderProps.outerRadius = (minDim * 0.35);
        this.renderProps.innerRadius = (minDim * 0.20);

        const ctx = HCW.ctx;
        const colors = this.renderProps.colors;

        ctx.fillStyle = colors.background;
        ctx.fillRect(contextwindow.x, contextwindow.y, sx, sy);

        ctx.beginPath();
        ctx.arc(cx, knobCy, this.renderProps.outerRadius, 0, 2 * Math.PI);
        ctx.fillStyle = colors.knobOuter;
        ctx.fill();

        const startRad = (135 * Math.PI) / 180;
        const rangeRad = (270 * Math.PI) / 180;
        const currentRad = startRad + (this.value * rangeRad);
        ctx.beginPath();
        ctx.moveTo(cx, knobCy);
        ctx.lineTo(
            cx + Math.cos(currentRad) * (this.renderProps.outerRadius * 0.8),
            knobCy + Math.sin(currentRad) * (this.renderProps.outerRadius * 0.8)
        );
        ctx.strokeStyle = colors.indicator;
        ctx.lineWidth = 3;
        ctx.stroke();

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
        ctx.arc(cx, knobCy, this.renderProps.innerRadius - 2, 0, Math.PI * 2);
        ctx.clip();

        if (activeKeys.length > 0) {
            const sliceAngle = (Math.PI * 2) / activeKeys.length;
            activeKeys.forEach((key, i) => {
                ctx.beginPath();
                ctx.moveTo(cx, knobCy);
                ctx.arc(cx, knobCy, this.renderProps.innerRadius, i * sliceAngle - Math.PI / 2, (i + 1) * sliceAngle - Math.PI / 2);
                const img = this.iconCache[key];
                if (img && img.complete) {
                    ctx.save(); ctx.clip();
                    ctx.drawImage(img, cx - this.renderProps.innerRadius, knobCy - this.renderProps.innerRadius, this.renderProps.innerRadius * 2, this.renderProps.innerRadius * 2);
                    ctx.restore();
                } else {
                    ctx.fillStyle = (key.startsWith('#') || key.startsWith('rgb')) ? key : '#444';
                    ctx.fill();
                }
            });
        } else if (this._loadedImage && this._loadedImage.complete) {
            ctx.drawImage(this._loadedImage, cx - this.renderProps.innerRadius, knobCy - this.renderProps.innerRadius, this.renderProps.innerRadius * 2, this.renderProps.innerRadius * 2);
        } else if (this.centerColor) {
            ctx.fillStyle = this.centerColor;
            ctx.fill();
        } else {
            ctx.fillStyle = '#000000';
            ctx.fill();
        }
        ctx.restore();

        if (sy > 100) {
            ctx.fillStyle = colors.text;
            ctx.font = "12px Arial";
            ctx.textAlign = "center";
            ctx.fillText(this.getLabel(), cx, knobCy + this.renderProps.outerRadius + 16);
            ctx.font = "10px Monospace";
            ctx.fillText(Math.round(this.value * 255), cx, knobCy + this.renderProps.outerRadius + 30);
        }
    }
}