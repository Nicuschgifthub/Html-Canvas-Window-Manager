class HCWFaderField extends HCWBaseField {
    constructor(label = 'Fader 01') {
        super(label);
        this.className = 'HCWFaderField';
        this._insertClassKeyword();

        this.value = 0.0;
        this.displayType = 'byte';

        this.renderProps = {
            colors: {
                background: GS.FIELDS.FADER.BACKGROUND,
                fader: GS.FIELDS.FADER.FADER,
                text: GS.FIELDS.FADER.TEXT
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

    getDMX() {
        return Math.round(this.value * 255);
    }

    setDMX(val255) {
        return this.setFloat(val255 / 255);
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
        const ctx = HCW.ctx;
        if (!ctx) return;

        const { x, y, sx, sy } = contextwindow;
        const colors = this.renderProps.colors;

        this.renderProps.sx = sx;
        this.renderProps.sy = sy;

        // 1. Background
        ctx.fillStyle = colors.background;
        ctx.fillRect(x, y, sx, sy);

        // Header Title
        const headerH = 26;
        ctx.fillStyle = colors.text;
        ctx.font = GS.FONTS.TITLE;
        ctx.textAlign = "center";
        ctx.fillText(this.getLabel(), x + (sx / 2), y + 18);

        // 2. Track & Fader Dimensions
        const trackMarginX = Math.max(12, sx * 0.3);
        const trackW = sx - (trackMarginX * 2);
        const trackY = y + headerH + 10;
        const trackH = sy - headerH - 45; // Space for bottom readout

        // Draw Recessed Track Slot Background
        ctx.fillStyle = GS.FIELDS.FADER.TRACK_BG;
        ctx.fillRect(x + trackMarginX, trackY, trackW, trackH);
        ctx.strokeStyle = GS.FIELDS.FADER.TRACK_BORDER;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + trackMarginX, trackY, trackW, trackH);

        // 3. Ruler Tick Marks (0%, 25%, 50%, 75%, 100%)
        ctx.strokeStyle = GS.FIELDS.FADER.TICK_MARK;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const tickY = trackY + (trackH * (i / 4));
            const tickW = 4;
            // Left Ticks
            ctx.beginPath();
            ctx.moveTo(x + trackMarginX - tickW - 2, tickY);
            ctx.lineTo(x + trackMarginX - 2, tickY);
            ctx.stroke();
            // Right Ticks
            ctx.beginPath();
            ctx.moveTo(x + trackMarginX + trackW + 2, tickY);
            ctx.lineTo(x + trackMarginX + trackW + tickW + 2, tickY);
            ctx.stroke();
        }

        // 4. Fill Bar (Level Height)
        const fillH = this.value * trackH;
        const fillY = trackY + (trackH - fillH);

        if (fillH > 0) {
            const fillGrad = ctx.createLinearGradient(0, fillY + fillH, 0, fillY);
            fillGrad.addColorStop(0, GS.FIELDS.FADER.FILL_BOTTOM);
            fillGrad.addColorStop(1, GS.FIELDS.FADER.FILL_TOP);

            ctx.fillStyle = fillGrad;
            ctx.fillRect(x + trackMarginX + 1, fillY, trackW - 2, fillH);

            // Bright Top Level Highlight
            ctx.fillStyle = GS.PALETTE.TEXT_PRIMARY;
            ctx.fillRect(x + trackMarginX + 1, fillY, trackW - 2, 2);
        }

        // 5. 3D Metallic Fader Handle (Cap)
        const capW = Math.min(sx - 8, trackW + 16);
        const capH = 22;
        const capX = x + (sx / 2) - (capW / 2);
        const capY = fillY - (capH / 2);

        // Cap Shadow
        ctx.fillStyle = '#00000066';
        ctx.fillRect(capX + 2, capY + 3, capW, capH);

        // Cap 3D Metallic Gradient
        const capGrad = ctx.createLinearGradient(0, capY, 0, capY + capH);
        capGrad.addColorStop(0, GS.FIELDS.FADER.CAP_TOP);
        capGrad.addColorStop(0.5, GS.FIELDS.FADER.CAP_MID);
        capGrad.addColorStop(1, GS.FIELDS.FADER.CAP_BOT);

        ctx.fillStyle = capGrad;
        ctx.fillRect(capX, capY, capW, capH);

        ctx.strokeStyle = GS.FIELDS.FADER.CAP_BORDER;
        ctx.lineWidth = 1;
        ctx.strokeRect(capX, capY, capW, capH);

        // Cap Grip Ridges
        ctx.fillStyle = GS.FIELDS.FADER.CAP_GRIP;
        ctx.fillRect(capX + 4, capY + (capH / 2) - 1, capW - 8, 2);

        // 6. Bottom Readout Badge
        const badgeY = y + sy - 28;
        const badgeH = 20;
        const badgeW = sx - 16;
        const badgeX = x + 8;

        ctx.fillStyle = '#0e0e0e';
        ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
        ctx.strokeStyle = GS.PALETTE.ACCENT_GREEN;
        ctx.lineWidth = 1;
        ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

        ctx.fillStyle = GS.PALETTE.ACCENT_GREEN;
        ctx.font = GS.FONTS.MONO_READOUT;
        ctx.textAlign = "center";
        const pct = Math.round(this.value * 100);
        const dmx = Math.round(this.value * 255);
        ctx.fillText(`${pct}% (${dmx})`, x + (sx / 2), badgeY + (badgeH / 2) + 4);

        ctx.textAlign = "start";
    }
}