class HCWXYPadField extends HCWBaseField {
    constructor(label = 'Pan / Tilt Pad') {
        super(label);
        this.className = 'HCWXYPadField';
        this._insertClassKeyword();

        this.type = 'xyPad';

        this.pan = 0.5;   // 0.0 - 1.0 (0° - 540°)
        this.tilt = 0.5;  // 0.0 - 1.0 (0° - 270°)

        this.fineMode = false;
        this.headerHeight = 35;
        this.presetBarHeight = 40;

        this.presets = [
            { label: 'Home', pan: 0.5, tilt: 0.5 },
            { label: 'Center', pan: 0.5, tilt: 0.25 },
            { label: 'Stage L', pan: 0.2, tilt: 0.4 },
            { label: 'Stage R', pan: 0.8, tilt: 0.4 },
            { label: 'Audience', pan: 0.5, tilt: 0.75 }
        ];

        this.renderProps = {
            colors: {
                background: GS.FIELDS.XY_PAD.BACKGROUND,
                padBg: GS.FIELDS.XY_PAD.PAD_BG,
                grid: GS.FIELDS.XY_PAD.GRID,
                crosshair: GS.FIELDS.XY_PAD.CROSSHAIR,
                target: GS.FIELDS.XY_PAD.TARGET,
                targetGlow: GS.FIELDS.XY_PAD.TARGET_GLOW,
                text: GS.FIELDS.XY_PAD.TEXT,
                presetBg: GS.FIELDS.XY_PAD.PRESET_BG,
                presetActive: GS.FIELDS.XY_PAD.PRESET_ACTIVE,
                presetText: GS.FIELDS.XY_PAD.PRESET_TEXT
            },
            padArea: null,
            presetButtons: []
        };

        this._isDragging = false;
        this._pressedPreset = null;
    }

    getType() {
        return GLOBAL_TYPES.CONTEXT_FIELDS.XY_PAD;
    }

    getPanDMX() {
        return Math.round(this.pan * 255);
    }

    getTiltDMX() {
        return Math.round(this.tilt * 255);
    }

    getPanAngle() {
        return Math.round(this.pan * 540);
    }

    getTiltAngle() {
        return Math.round(this.tilt * 270);
    }

    setPanTilt(pan, tilt) {
        this.pan = Math.max(0, Math.min(1, pan));
        this.tilt = Math.max(0, Math.min(1, tilt));
        this._trigger();
        this.updateFrame();
        return this;
    }

    _trigger() {
        this.emitAction(GLOBAL_TYPES.ACTIONS.XY_PAD_UPDATE, {
            pan: this.pan,
            tilt: this.tilt,
            panDMX: this.getPanDMX(),
            tiltDMX: this.getTiltDMX(),
            panAngle: this.getPanAngle(),
            tiltAngle: this.getTiltAngle(),
            locationId: this.getLocationId()
        });
    }

    _interaction(interaction) {
        if (interaction.type === 'mousedown') {
            const { mouseX, mouseY } = interaction;
            const pa = this.renderProps.padArea;

            if (pa && mouseX >= pa.x && mouseX <= pa.x + pa.w && mouseY >= pa.y && mouseY <= pa.y + pa.h) {
                this._isDragging = true;
                this._updateFromCoordinates(mouseX, mouseY);
                return;
            }

            const hitBtn = this.renderProps.presetButtons.find(b =>
                mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= b.y + b.h
            );

            if (hitBtn) {
                this._pressedPreset = hitBtn.preset;
                this.setPanTilt(hitBtn.preset.pan, hitBtn.preset.tilt);
            }

        } else if (interaction.type === 'mousemove') {
            if (this._isDragging) {
                const { mouseX, mouseY } = interaction;
                this._updateFromCoordinates(mouseX, mouseY);
            }
        } else if (interaction.type === 'mouseup') {
            this._isDragging = false;
            this._pressedPreset = null;
            this.updateFrame();
        }
    }

    _updateFromCoordinates(x, y) {
        const pa = this.renderProps.padArea;
        if (!pa) return;

        let normX = (x - pa.x) / pa.w;
        let normY = (y - pa.y) / pa.h;

        normX = Math.max(0, Math.min(1, normX));
        normY = Math.max(0, Math.min(1, normY));

        if (this.fineMode) {
            const deltaX = (normX - this.pan) * 0.1;
            const deltaY = (normY - this.tilt) * 0.1;
            this.setPanTilt(this.pan + deltaX, this.tilt + deltaY);
        } else {
            this.setPanTilt(normX, normY);
        }
    }

    render(contextwindow) {
        const { x, y, sx, sy } = contextwindow;
        const ctx = HCW.ctx;
        if (!ctx) return;

        const colors = this.renderProps.colors;

        // Background Fill
        ctx.fillStyle = colors.background;
        ctx.fillRect(x, y, sx, sy);

        // Header Title & Readout
        ctx.fillStyle = colors.text;
        ctx.font = GS.FONTS.TITLE;
        ctx.textAlign = 'left';
        ctx.fillText(this.getLabel(), x + 10, y + 22);

        ctx.textAlign = 'right';
        ctx.font = GS.FONTS.MONO_READOUT;
        ctx.fillStyle = colors.target;
        ctx.fillText(`P:${this.getPanAngle()}° (${this.getPanDMX()}) T:${this.getTiltAngle()}° (${this.getTiltDMX()})`, x + sx - 10, y + 22);

        // Calculate Pad Area
        const padX = x + 10;
        const padY = y + this.headerHeight;
        const padW = sx - 20;
        const padH = sy - this.headerHeight - this.presetBarHeight - 15;

        this.renderProps.padArea = { x: padX, y: padY, w: padW, h: padH };

        // Draw Touch Pad Box
        ctx.fillStyle = colors.padBg;
        ctx.fillRect(padX, padY, padW, padH);

        // Draw Grid Lines (Cross Lines)
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;

        const centerX = padX + padW * 0.5;
        const centerY = padY + padH * 0.5;

        ctx.beginPath();
        ctx.moveTo(centerX, padY);
        ctx.lineTo(centerX, padY + padH);
        ctx.moveTo(padX, centerY);
        ctx.lineTo(padX + padW, centerY);

        ctx.moveTo(padX + padW * 0.25, padY);
        ctx.lineTo(padX + padW * 0.25, padY + padH);
        ctx.moveTo(padX + padW * 0.75, padY);
        ctx.lineTo(padX + padW * 0.75, padY + padH);

        ctx.moveTo(padX, padY + padH * 0.25);
        ctx.lineTo(padX + padW, padY + padH * 0.25);
        ctx.moveTo(padX, padY + padH * 0.75);
        ctx.lineTo(padX + padW, padY + padH * 0.75);
        ctx.stroke();

        // Calculate Target Position
        const targetX = padX + this.pan * padW;
        const targetY = padY + this.tilt * padH;

        // Draw Target Crosshairs
        ctx.strokeStyle = colors.crosshair;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);

        ctx.beginPath();
        ctx.moveTo(targetX, padY);
        ctx.lineTo(targetX, padY + padH);
        ctx.moveTo(padX, targetY);
        ctx.lineTo(padX + padW, targetY);
        ctx.stroke();

        ctx.setLineDash([]); // Reset line dash

        // Draw Target Radial Glow Circle
        ctx.beginPath();
        ctx.arc(targetX, targetY, 18, 0, Math.PI * 2);
        ctx.fillStyle = colors.targetGlow;
        ctx.fill();

        // Draw Target Center Cursor Circle
        ctx.beginPath();
        ctx.arc(targetX, targetY, 8, 0, Math.PI * 2);
        ctx.fillStyle = colors.target;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(targetX, targetY, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();

        // Render Preset Buttons Row at Bottom
        const btnY = padY + padH + 10;
        const btnH = this.presetBarHeight - 5;
        const gap = 4;
        const btnW = (padW - gap * (this.presets.length - 1)) / this.presets.length;

        this.renderProps.presetButtons = [];

        this.presets.forEach((preset, idx) => {
            const bx = padX + idx * (btnW + gap);
            let bg = colors.presetBg;

            if (this._pressedPreset === preset) {
                bg = colors.presetActive;
            }

            ctx.fillStyle = bg;
            ctx.fillRect(bx, btnY, btnW, btnH);

            ctx.fillStyle = colors.presetText;
            ctx.font = GS.FONTS.SMALL_BOLD;
            ctx.textAlign = 'center';
            ctx.fillText(preset.label, bx + btnW / 2, btnY + btnH / 2 + 4);

            this.renderProps.presetButtons.push({
                preset: preset,
                x: bx,
                y: btnY,
                w: btnW,
                h: btnH
            });
        });

        ctx.textAlign = 'start';
    }
}

globalThis.HCWXYPadField = HCWXYPadField;