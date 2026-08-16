class HCWColorMapField extends HCWBaseField {
    constructor(label = 'Color 1') {
        super(label);
        this.className = 'HCWColorMapField';
        this._insertClassKeyword();

        this._CLASS_REBUILD_NONE_OVERWRITES = {
            mapFirstBuild: true,
        };

        this.h = 0;
        this.s = 1;
        this.v = 1;

        this.extra = { white: 0, amber: 0, uv: 0 };

        this._colorMapCanvas = null;
        this._colorMapSize = 0;
        this.mouseDownOnceCalculated = true;
        this._clickStartX = 0;
        this._clickStartY = 0;
        this._initialValues = { h: 0, s: 0, v: 0, r: 0, g: 0, b: 0, extra: 0 };

        this.renderProps = {
            map: null,
            valueFader: null,
            active: null,
            startX: null,
            startY: null,
            endX: null,
            endY: null,
            previewBox: null,
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
        return GLOBAL_TYPES.CONTEXT_FIELDS.COLOR_MAP_INPUT;
    }

    getH_DMX() { return Math.round(this.h * 255); }
    getS_DMX() { return Math.round(this.s * 255); }
    getV_DMX() { return Math.round(this.v * 255); }

    setH_DMX(val) { this.h = Math.max(0, Math.min(255, val)) / 255; }
    setS_DMX(val) { this.s = Math.max(0, Math.min(255, val)) / 255; }
    setV_DMX(val) { this.v = Math.max(0, Math.min(255, val)) / 255; }

    getColors() {
        const rgb = this._HCW_hsvToRgb(this.h, this.s, this.v);
        return {
            r: rgb.r,
            g: rgb.g,
            b: rgb.b,
            white: Math.round(this.extra.white),
            amber: Math.round(this.extra.amber),
            uv: Math.round(this.extra.uv)
        };
    }

    setColor(colorDmx) {
        if (!colorDmx) return;

        const current = this.getColors();
        const r = colorDmx.r !== undefined ? colorDmx.r : current.r;
        const g = colorDmx.g !== undefined ? colorDmx.g : current.g;
        const b = colorDmx.b !== undefined ? colorDmx.b : current.b;

        this._rgbToHsv(r, g, b);

        if (colorDmx.white !== undefined) this.extra.white = Math.max(0, Math.min(255, colorDmx.white));
        if (colorDmx.amber !== undefined) this.extra.amber = Math.max(0, Math.min(255, colorDmx.amber));
        if (colorDmx.uv !== undefined) this.extra.uv = Math.max(0, Math.min(255, colorDmx.uv));

        this.updateFrame();
        return this;
    }

    _rgbToHsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const d = max - min;

        this.v = max;
        this.s = max === 0 ? 0 : d / max;

        if (d === 0) {
            this.h = 0;
        } else {
            if (max === r) this.h = (g - b) / d + (g < b ? 6 : 0);
            else if (max === g) this.h = (b - r) / d + 2;
            else this.h = (r - g) / d + 4;
            this.h /= 6;
        }
    }

    _trigger() {
        this.emitAction(GLOBAL_TYPES.ACTIONS.COLOR_FIELD_UPDATE, { colors: this.getColors() });
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
        size = Math.floor(size);
        if (size <= 1) return;
        if (this._colorMapCanvas && this._colorMapSize === size && this._CLASS_REBUILD_NONE_OVERWRITES.mapFirstBuild == false) return;
        this._CLASS_REBUILD_NONE_OVERWRITES.mapFirstBuild = false;
        const c = document.createElement('canvas');
        c.width = size; c.height = size;
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

    _interaction(i) {
        const { mouseX, mouseY } = i;
        if (i.type === 'mousedown') {
            this.checkMouseLocation(mouseX, mouseY);
            if (this.renderProps.active) {
                this._clickStartX = mouseX;
                this._clickStartY = mouseY;
                const rgb = this.getColors();
                this._initialValues = {
                    h: this.h, s: this.s, v: this.v,
                    r: rgb.r, g: rgb.g, b: rgb.b,
                    extra: this.renderProps.active.key ? this.extra[this.renderProps.active.key] : 0
                };
                this.mouseDownOnceCalculated = false;
            }
        }

        if (i.type === 'mousemove' && this.renderProps.active) {
            const a = this.renderProps.active;
            const dx = mouseX - this._clickStartX;
            const dy = this._clickStartY - mouseY;

            if (a.type === 'map') {
                this.h = Math.max(0, Math.min(1, this._initialValues.h + (dx / this.renderProps.map.w)));
                this.s = Math.max(0, Math.min(1, this._initialValues.s + (dy / this.renderProps.map.h)));
            } else if (a.type === 'value') {
                this.v = Math.max(0, Math.min(1, this._initialValues.v + (dy / this.renderProps.valueFader.h)));
            } else if (a.type === 'slider') {
                const r = this.renderProps.sliders[a.key];
                if (['r', 'g', 'b'].includes(a.key)) {
                    const normalizedDelta = dx / r.w;
                    const rgb = this.getColors();
                    rgb[a.key] = Math.max(0, Math.min(255, Math.round(this._initialValues[a.key] + (normalizedDelta * 255))));
                    this._rgbToHsv(rgb.r, rgb.g, rgb.b);
                } else {
                    const normalizedDelta = dy / r.h;
                    this.extra[a.key] = Math.max(0, Math.min(255, Math.round(this._initialValues.extra + (normalizedDelta * 255))));
                }
            }
            this._trigger();
        }

        if (i.type === 'mouseup') {
            this.renderProps.active = null;
            this.mouseDownOnceCalculated = true;
        }
    }

    checkMouseLocation(mouseX, mouseY) {
        this.renderProps.active = null;
        if (this._hit(this.renderProps.map, mouseX, mouseY)) {
            this.renderProps.active = { type: 'map' };
        } else if (this._hit(this.renderProps.valueFader, mouseX, mouseY)) {
            this.renderProps.active = { type: 'value' };
        } else {
            for (const k in this.renderProps.sliders) {
                if (this._hit(this.renderProps.sliders[k], mouseX, mouseY)) {
                    this.renderProps.active = { type: 'slider', key: k };
                    break;
                }
            }
        }
    }

    _hit(r, x, y) {
        return r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    }

    render(w) {
        const ctx = HCW.ctx;
        if (!ctx) return;

        const pad = 10;
        const innerW = w.sx - pad * 2;
        const innerH = w.sy - pad * 2;

        // 1. Background
        ctx.fillStyle = GS.FIELDS.COLOR_MAP.BACKGROUND;
        ctx.fillRect(w.x, w.y, w.sx, w.sy);

        // 2. Header Bar
        const headerH = 26;
        ctx.fillStyle = '#141414';
        ctx.fillRect(w.x, w.y, w.sx, headerH);

        ctx.fillStyle = GS.PALETTE.ACCENT_GREEN;
        ctx.fillRect(w.x, w.y + headerH - 2, w.sx, 2);

        ctx.fillStyle = GS.FIELDS.COLOR_MAP.TEXT;
        ctx.font = GS.FONTS.TITLE;
        ctx.textAlign = "left";
        ctx.fillText(this.getLabel(), w.x + pad, w.y + 17);

        // 3. Top Color Preview & Readout Strip
        const topY = w.y + headerH + pad;
        const previewH = 34;
        const previewW = 50;
        const readoutW = innerW - previewW - pad;

        const rgb = this.getColors();
        const finalR = Math.min(255, rgb.r);
        const finalG = Math.min(255, rgb.g);
        const finalB = Math.min(255, rgb.b);

        // Readout Dark Box
        ctx.fillStyle = GS.PALETTE.BG_SECONDARY;
        ctx.fillRect(w.x + pad, topY, readoutW, previewH);
        ctx.strokeStyle = '#282828';
        ctx.lineWidth = 1;
        ctx.strokeRect(w.x + pad, topY, readoutW, previewH);

        // Hex & RGB Text in Readout
        const hexStr = `#${finalR.toString(16).padStart(2,'0')}${finalG.toString(16).padStart(2,'0')}${finalB.toString(16).padStart(2,'0')}`.toUpperCase();
        const rgbText = `RGB: ${finalR}, ${finalG}, ${finalB}`;
        const ledText = `W:${this.extra.white} A:${this.extra.amber} U:${this.extra.uv}`;

        ctx.fillStyle = GS.PALETTE.ACCENT_GREEN;
        ctx.font = GS.FONTS.MONO_READOUT;
        ctx.textAlign = 'left';
        ctx.fillText(`${hexStr}  ${rgbText}`, w.x + pad + 8, topY + 15);

        ctx.fillStyle = GS.PALETTE.TEXT_SECONDARY;
        ctx.font = GS.FONTS.SMALL;
        ctx.fillText(ledText, w.x + pad + 8, topY + 28);

        // Color Swatch Preview Box
        const previewX = w.x + pad + readoutW + pad;
        ctx.fillStyle = `rgb(${finalR}, ${finalG}, ${finalB})`;
        ctx.fillRect(previewX, topY, previewW, previewH);
        ctx.strokeStyle = '#ffffff44';
        ctx.strokeRect(previewX, topY, previewW, previewH);

        // 4. 2D Color Map Canvas & Vertical LED Faders
        const mapTop = topY + previewH + pad;
        const mapSize = Math.max(80, Math.floor(innerH * 0.48));
        this._ensureColorMap(mapSize);

        const mapX = w.x + pad;
        const mapY = mapTop;

        if (this._colorMapCanvas instanceof HTMLCanvasElement) {
            ctx.drawImage(this._colorMapCanvas, mapX, mapY);
        }
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;
        ctx.strokeRect(mapX, mapY, mapSize, mapSize);

        this.renderProps.map = { x: mapX, y: mapY, w: mapSize, h: mapSize };

        // 2D Cursor Target Crosshair & Ring
        const cursorX = mapX + (this.h * mapSize);
        const cursorY = mapY + ((1 - this.s) * mapSize);

        ctx.beginPath();
        ctx.arc(cursorX, cursorY, 6, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cursorX, cursorY, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();

        // 5. Vertical Strips: V (Brightness), W (White), A (Amber), U (UV)
        const vFaderAreaW = innerW - mapSize - (pad * 2);
        const vKeys = ['value', 'white', 'amber', 'uv'];
        const vLabels = ['V', 'W', 'A', 'U'];
        const vColors = ['#ffffff', '#e0e0e0', '#ffbf00', '#bb00ff'];
        const vFaderW = Math.max(12, (vFaderAreaW - (pad * (vKeys.length - 1))) / vKeys.length);

        vKeys.forEach((k, i) => {
            const vx = mapX + mapSize + pad + (i * (vFaderW + pad));

            // Slot Track
            ctx.fillStyle = '#0f0f0f';
            ctx.fillRect(vx, mapY, vFaderW, mapSize);
            ctx.strokeStyle = '#252525';
            ctx.lineWidth = 1;
            ctx.strokeRect(vx, mapY, vFaderW, mapSize);

            const val = k === 'value' ? this.v * 255 : this.extra[k];
            const barH = (val / 255) * mapSize;
            const barY = mapY + mapSize - barH;

            // Fill Bar
            if (barH > 0) {
                ctx.fillStyle = vColors[i];
                ctx.globalAlpha = k === 'value' ? 1.0 : 0.7;
                ctx.fillRect(vx + 1, barY, vFaderW - 2, barH);
                ctx.globalAlpha = 1.0;
            }

            // Label at Top of Fader Slot
            ctx.fillStyle = '#888888';
            ctx.font = GS.FONTS.SMALL_BOLD;
            ctx.textAlign = 'center';
            ctx.fillText(vLabels[i], vx + vFaderW / 2, mapY + 12);

            const rect = { x: vx, y: mapY, w: vFaderW, h: mapSize };
            if (k === 'value') this.renderProps.valueFader = rect;
            else this.renderProps.sliders[k] = rect;
        });

        // 6. Horizontal RGB Channel Sliders
        let hy = mapY + mapSize + pad;
        const availableH = w.y + w.sy - hy - pad;
        const hSliderH = Math.max(14, Math.floor(availableH / 3) - 4);
        const hSliderW = innerW - 25;

        this.renderProps.sliders.r = this._drawModernHSlider(ctx, 'R', mapX + 25, hy, hSliderW, hSliderH, rgb.r, '#ff4444'); hy += hSliderH + 4;
        this.renderProps.sliders.g = this._drawModernHSlider(ctx, 'G', mapX + 25, hy, hSliderW, hSliderH, rgb.g, '#44ff44'); hy += hSliderH + 4;
        this.renderProps.sliders.b = this._drawModernHSlider(ctx, 'B', mapX + 25, hy, hSliderW, hSliderH, rgb.b, '#4444ff');

        ctx.textAlign = "start";
    }

    _drawModernHSlider(ctx, label, x, y, w, h, value, color) {
        // Track Slot
        ctx.fillStyle = '#0e0e0e';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);

        // Fill Bar
        const fillW = (value / 255) * w;
        if (fillW > 0) {
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.85;
            ctx.fillRect(x + 1, y + 1, fillW - 1, h - 2);
            ctx.globalAlpha = 1.0;
        }

        // Channel Letter Label (Left)
        ctx.fillStyle = color;
        ctx.font = GS.FONTS.SMALL_BOLD;
        ctx.textAlign = "right";
        ctx.fillText(label, x - 6, y + (h / 2) + 4);

        // Value Badge (Right overlay)
        ctx.fillStyle = '#ffffff';
        ctx.font = GS.FONTS.MONO_READOUT;
        ctx.textAlign = "right";
        ctx.fillText(value.toString(), x + w - 6, y + (h / 2) + 4);

        return { x, y, w, h };
    }
}