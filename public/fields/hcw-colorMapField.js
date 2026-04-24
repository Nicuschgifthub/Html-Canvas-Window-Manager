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
        const pad = 10;
        const innerW = w.sx - pad * 2;
        const innerH = w.sy - pad * 2;

        const previewH = 35;
        const topY = w.y + pad + 12;
        const previewSize = previewH;
        const dataWidth = innerW - previewSize - pad;

        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(w.x + pad, topY, innerW, previewH);

        const rgb = this.getColors();
        const finalR = Math.min(255, rgb.r);
        const finalG = Math.min(255, rgb.g);
        const finalB = Math.min(255, rgb.b);

        ctx.fillStyle = `rgb(${finalR}, ${finalG}, ${finalB})`;
        ctx.fillRect(w.x + pad + dataWidth + pad, topY, previewSize, previewH);

        ctx.fillStyle = '#888';
        ctx.font = '10px Monospace';
        ctx.textAlign = 'left';
        const dmxText = `W:${this.extra.white.toString().padStart(3, '0')} A:${this.extra.amber.toString().padStart(3, '0')} U:${this.extra.uv.toString().padStart(3, '0')}`;
        ctx.fillText(dmxText, w.x + pad + 5, topY + (previewH / 2) + 4);

        const mapTop = topY + previewH + pad;
        const mapSize = Math.floor(innerH * 0.55);
        this._ensureColorMap(mapSize);

        const mapX = w.x + pad;
        const mapY = mapTop;

        if (this._colorMapCanvas instanceof HTMLCanvasElement) {
            ctx.drawImage(this._colorMapCanvas, mapX, mapY);
        }
        this.renderProps.map = { x: mapX, y: mapY, w: mapSize, h: mapSize };

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(
            mapX + (this.h * mapSize),
            mapY + (1 - this.s) * mapSize,
            4,
            0,
            Math.PI * 2
        );
        ctx.stroke();

        const vFaderW = (innerW - mapSize - (pad * 4)) / 4;
        const vKeys = ['value', 'white', 'amber', 'uv'];
        const vColors = ['#ffffff', '#f0f0f0', '#ffbf00', '#bb00ff'];

        vKeys.forEach((k, i) => {
            const x = mapX + mapSize + pad + (i * (vFaderW + pad));
            ctx.fillStyle = '#111';
            ctx.fillRect(x, mapY, vFaderW, mapSize);

            const val = k === 'value' ? this.v * 255 : this.extra[k];
            const barH = (val / 255) * mapSize;

            ctx.fillStyle = vColors[i];
            ctx.globalAlpha = k === 'value' ? 1.0 : 0.6;
            ctx.fillRect(x, mapY + mapSize - barH, vFaderW, barH);
            ctx.globalAlpha = 1.0;

            const rect = { x, y: mapY, w: vFaderW, h: mapSize };
            if (k === 'value') this.renderProps.valueFader = rect;
            else this.renderProps.sliders[k] = rect;
        });

        let hy = mapY + mapSize + pad;
        const hSliderH = Math.max(12, (w.y + w.sy - hy - pad) / 3 - 4);
        const hSliderW = innerW - 20;

        this.renderProps.sliders.r = this._drawModernHSlider(ctx, 'R', mapX + 20, hy, hSliderW, hSliderH, rgb.r, '#ff4444'); hy += hSliderH + 4;
        this.renderProps.sliders.g = this._drawModernHSlider(ctx, 'G', mapX + 20, hy, hSliderW, hSliderH, rgb.g, '#44ff44'); hy += hSliderH + 4;
        this.renderProps.sliders.b = this._drawModernHSlider(ctx, 'B', mapX + 20, hy, hSliderW, hSliderH, rgb.b, '#4444ff');

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = "left";
        ctx.fillText(this.getLabel().toUpperCase(), w.x + pad, w.y + 17);
    }

    _drawModernHSlider(ctx, label, x, y, w, h, value, color) {
        // Track
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x, y, w, h);
        // Fill
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.8;
        ctx.fillRect(x, y, (value / 255) * w, h);
        ctx.globalAlpha = 1.0;
        // Label
        ctx.fillStyle = '#fff';
        ctx.font = '10px Monospace';
        ctx.textAlign = "right";
        ctx.fillText(label, x - 5, y + h / 2 + 4);
        return { x, y, w, h };
    }
}