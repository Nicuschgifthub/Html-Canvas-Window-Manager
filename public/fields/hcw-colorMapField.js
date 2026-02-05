class HCWColorMapField extends HCWBaseField {
    constructor(label = 'Color 1') {
        super(label);
        this.className = 'HCWColorMapField';
        this._insertClassKeyword();

        this._CLASS_REBUILD_NONE_OVERWRITES = {
            mapFirstBuild: true,
        }

        this.h = 0;
        this.s = 1;
        this.v = 1;

        this.extra = { white: 0, amber: 0, uv: 0 };

        this._colorMapCanvas = null;
        this._colorMapSize = 0;

        this.mouseDownOnceCalculated = true;

        this.renderProps = {
            map: null,
            valueFader: null,
            active: null,
            startX: null,
            startY: null,
            endX: null,
            endY: null,
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

    getColors() {
        const rgb = this._HCW_hsvToRgb(this.h, this.s, this.v);
        return { ...rgb, ...this.extra };
    }

    setColor(colorDmx) {
        if (!colors) return;

        const r = colors.r !== undefined ? colors.r : this.getColors().r;
        const g = colors.g !== undefined ? colors.g : this.getColors().g;
        const b = colors.b !== undefined ? colors.b : this.getColors().b;
        this._rgbToHsv(r, g, b);

        if (colors.white !== undefined) this.extra.white = colors.white;
        if (colors.amber !== undefined) this.extra.amber = colors.amber;
        if (colors.uv !== undefined) this.extra.uv = colors.uv;

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
        c.width = size;
        c.height = size;
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
        this.mouseDownOnceCalculated = true;

        if (i.type === 'mousedown') {
            this.checkMouseLocation(mouseX, mouseY);
        }

        if (this.mouseDownOnceCalculated == false || (i.type === 'mousemove' && this.renderProps.active)) {
            const a = this.renderProps.active;
            this.mouseDownOnceCalculated = true;

            if (a.type === 'map') {
                const m = this.renderProps.map;
                this.h = (mouseX - m.x) / m.w;
                this.s = 1 - ((mouseY - m.y) / m.h);
                this.h = Math.max(0, Math.min(1, this.h));
                this.s = Math.max(0, Math.min(1, this.s));
                if (!this.v) this.v = 1.0;
            }
            else if (a.type === 'value') {
                const f = this.renderProps.valueFader;
                let t = 1 - ((mouseY - f.y) / f.h);
                this.v = Math.max(0, Math.min(1, t));
            }
            else if (a.type === 'slider') {
                const r = this.renderProps.sliders[a.key];
                if (a.key === 'r' || a.key === 'g' || a.key === 'b') {
                    let t = (mouseX - r.x) / r.w;
                    t = Math.max(0, Math.min(1, t));
                    const rgb = this.getColors();
                    rgb[a.key] = Math.round(t * 255);
                    this._rgbToHsv(rgb.r, rgb.g, rgb.b);
                } else {
                    let t = 1 - ((mouseY - r.y) / r.h);
                    t = Math.max(0, Math.min(1, t));
                    this.extra[a.key] = Math.round(t * 255);
                }
            }
            this._trigger();
        }

        if (i.type === 'mouseup') {
            this.renderProps.active = null;
        }
    }

    checkMouseLocation(mouseX, mouseY) {
        this.renderProps.active = null;
        if (this._hit(this.renderProps.map, mouseX, mouseY)) {
            this.renderProps.active = { type: 'map' };
            this.mouseDownOnceCalculated = false;
        }
        if (this._hit(this.renderProps.valueFader, mouseX, mouseY)) {
            this.renderProps.active = { type: 'value' };
            this.mouseDownOnceCalculated = false;
        }
        for (const k in this.renderProps.sliders) {
            if (this._hit(this.renderProps.sliders[k], mouseX, mouseY)) {
                this.renderProps.active = { type: 'slider', key: k };
                this.mouseDownOnceCalculated = false;
            }
        }
    }

    _hit(r, x, y) {
        return r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    }

    render(w) {
        const ctx = HCW.ctx;
        const pad = 8;
        const labelW = 14;
        let vSliderW = 12;

        const innerW = w.sx - pad * 2;
        const innerH = w.sy - pad * 2;
        const topH = Math.floor(innerH * 0.7);

        const mapSize = Math.max(1, Math.floor(Math.min(
            topH,
            innerW - (vSliderW + pad) * 4
        )));

        this._ensureColorMap(mapSize);

        const mapX = w.x + pad;
        const mapY = w.y + pad;

        if (this._colorMapCanvas instanceof HTMLCanvasElement && this._colorMapSize > 0) {
            ctx.drawImage(this._colorMapCanvas, mapX, mapY);
        } else {
            ctx.fillStyle = '#111';
            ctx.fillRect(mapX, mapY, mapSize, mapSize);
        }

        this.renderProps.map = { x: mapX, y: mapY, w: mapSize, h: mapSize };

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(
            mapX + this.h * mapSize,
            mapY + (1 - this.s) * mapSize,
            5, 0, Math.PI * 2
        );
        ctx.stroke();

        const baseX = mapX + mapSize + pad;
        const vKeys = ['value', 'white', 'amber', 'uv'];
        const vColors = ['#fff', '#ddd', '#ffb000', '#8000ff'];

        vKeys.forEach((k, i) => {
            const mapDistance = mapX + mapSize;
            const spaceForVFaders = this.renderProps.endX - mapDistance;
            vSliderW = (spaceForVFaders - (vKeys.length * pad + pad)) / (vKeys.length);

            const x = baseX + i * (vSliderW + pad);
            ctx.fillStyle = '#222';
            ctx.fillRect(x, mapY, vSliderW, mapSize);

            const val = k === 'value' ? this.v * 255 : this.extra[k];
            const h = (val / 255) * mapSize;

            ctx.fillStyle = vColors[i];
            ctx.fillRect(x, mapY + mapSize - h, vSliderW, h);

            const rect = { x, y: mapY, w: vSliderW, h: mapSize };
            if (k === 'value') this.renderProps.valueFader = rect;
            else this.renderProps.sliders[k] = rect;
        });

        let sy = mapY + mapSize + pad;
        const bottomH = innerH - topH - pad;
        const sh = Math.max(8, bottomH / 4);
        const sw = innerW - labelW;

        const rgb = this.getColors();
        this.renderProps.sliders.r = this._drawHSlider(ctx, 'R', mapX + labelW, sy, sw, sh, rgb.r, '#ff4444'); sy += sh + pad;
        this.renderProps.sliders.g = this._drawHSlider(ctx, 'G', mapX + labelW, sy, sw, sh, rgb.g, '#44ff44'); sy += sh + pad;
        this.renderProps.sliders.b = this._drawHSlider(ctx, 'B', mapX + labelW, sy, sw, sh, rgb.b, '#4444ff');

        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.textAlign = "left";
        ctx.fillText(this.getLabel(), w.x + pad, w.y + 10);
    }

    _drawHSlider(ctx, label, x, y, w, h, value, color) {
        ctx.fillStyle = '#222';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = color;
        ctx.fillRect(x, y, (value / 255) * w, h);
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = "center";
        ctx.fillText(label, x - 8, y + h - 1);
        return { x, y, w, h };
    }
}