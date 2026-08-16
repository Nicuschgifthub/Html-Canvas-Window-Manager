class HCW3DViewerField extends HCWBaseField {
    constructor(label = '3D Stage View') {
        super(label);
        this.className = 'HCW3DViewerField';
        this._insertClassKeyword();

        // 3D Camera State
        this.yaw = 0.6;     // Radians (Yaw around Y-axis)
        this.pitch = 0.35;  // Radians (Pitch around X-axis)
        this.zoom = 1.0;    // Camera zoom multiplier
        this.autoRotate = false;
        this.activePreset = 'MovingHead'; // 'Stage', 'MovingHead', 'Cube', 'Grid'

        // Interactive Mouse/Touch Orbit State
        this._isDragging = false;
        this._lastMouseX = 0;
        this._lastMouseY = 0;
        this._pressedPreset = null;

        this.headerHeight = 28;
        this.presetBarHeight = 28;

        this.presets = [
            { id: 'Stage', label: 'Stage' },
            { id: 'MovingHead', label: 'Moving Head' },
            { id: 'Cube', label: 'Cube' },
            { id: 'ResetCam', label: 'Reset Cam' }
        ];

        this.renderProps = {
            colors: GS.FIELDS.VIEWER_3D,
            viewportArea: null,
            presetButtons: []
        };
    }

    getType() {
        return GLOBAL_TYPES.CONTEXT_FIELDS.VIEWER_3D;
    }

    // 3D Point Matrix Projection (Perspective Projection onto 2D Canvas)
    _project3D(x, y, z, cx, cy, fov = 350) {
        // 1. Rotate around Y axis (Yaw)
        const cosY = Math.cos(this.yaw);
        const sinY = Math.sin(this.yaw);
        const x1 = x * cosY + z * sinY;
        const z1 = -x * sinY + z * cosY;

        // 2. Rotate around X axis (Pitch)
        const cosP = Math.cos(this.pitch);
        const sinP = Math.sin(this.pitch);
        const y2 = y * cosP - z1 * sinP;
        const z2 = y * sinP + z1 * cosP;

        // 3. Perspective Scale Z Depth
        const distance = 400 / this.zoom;
        const scale = fov / (fov + z2 + distance);

        return {
            x: cx + x1 * scale,
            y: cy + y2 * scale,
            scale: scale,
            depth: z2
        };
    }

    // Render 3D Stage Floor Grid
    _render3DGrid(ctx, cx, cy) {
        ctx.strokeStyle = GS.FIELDS.VIEWER_3D.GRID;
        ctx.lineWidth = 1;

        const gridSize = 200;
        const step = 40;

        ctx.beginPath();
        for (let i = -gridSize; i <= gridSize; i += step) {
            // Line along Z
            const p1 = this._project3D(i, 80, -gridSize, cx, cy);
            const p2 = this._project3D(i, 80, gridSize, cx, cy);
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);

            // Line along X
            const p3 = this._project3D(-gridSize, 80, i, cx, cy);
            const p4 = this._project3D(gridSize, 80, i, cx, cy);
            ctx.moveTo(p3.x, p3.y);
            ctx.lineTo(p4.x, p4.y);
        }
        ctx.stroke();
    }

    // Render 3D Wireframe/Shaded Cube Model
    _render3DCube(ctx, cx, cy) {
        const s = 50;
        const vertices = [
            { x: -s, y: -s, z: -s }, { x: s, y: -s, z: -s },
            { x: s, y: s, z: -s }, { x: -s, y: s, z: -s },
            { x: -s, y: -s, z: s }, { x: s, y: -s, z: s },
            { x: s, y: s, z: s }, { x: -s, y: s, z: s }
        ];

        const faces = [
            [0, 1, 2, 3, '#00ff95cc'], [4, 5, 6, 7, '#00aa55cc'],
            [0, 1, 5, 4, '#00dd77cc'], [2, 3, 7, 6, '#006633cc'],
            [0, 3, 7, 4, '#00ee88cc'], [1, 2, 6, 5, '#008844cc']
        ];

        // Project vertices
        const projected = vertices.map(v => this._project3D(v.x, v.y, v.z, cx, cy));

        // Sort faces by Z depth for Painter's Algorithm (Back-to-Front)
        const sortedFaces = faces.map(face => {
            const avgDepth = (projected[face[0]].depth + projected[face[1]].depth + projected[face[2]].depth + projected[face[3]].depth) / 4;
            return { face, depth: avgDepth };
        }).sort((a, b) => b.depth - a.depth);

        sortedFaces.forEach(item => {
            const f = item.face;
            ctx.fillStyle = f[4];
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;

            ctx.beginPath();
            ctx.moveTo(projected[f[0]].x, projected[f[0]].y);
            ctx.lineTo(projected[f[1]].x, projected[f[1]].y);
            ctx.lineTo(projected[f[2]].x, projected[f[2]].y);
            ctx.lineTo(projected[f[3]].x, projected[f[3]].y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        });
    }

    // Render 3D Moving Head Light Fixture with Dynamic Light Beam Cone!
    _render3DMovingHead(ctx, cx, cy) {
        // Base Box
        const baseP1 = this._project3D(-35, 70, -35, cx, cy);
        const baseP2 = this._project3D(35, 70, -35, cx, cy);
        const baseP3 = this._project3D(35, 80, 35, cx, cy);
        const baseP4 = this._project3D(-35, 80, 35, cx, cy);

        ctx.fillStyle = '#222222';
        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(baseP1.x, baseP1.y); ctx.lineTo(baseP2.x, baseP2.y);
        ctx.lineTo(baseP3.x, baseP3.y); ctx.lineTo(baseP4.x, baseP4.y);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // Yoke Arm
        const yoke1 = this._project3D(-25, 70, 0, cx, cy);
        const yoke2 = this._project3D(-25, 20, 0, cx, cy);
        const yoke3 = this._project3D(25, 20, 0, cx, cy);
        const yoke4 = this._project3D(25, 70, 0, cx, cy);

        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(yoke1.x, yoke1.y); ctx.lineTo(yoke2.x, yoke2.y);
        ctx.lineTo(yoke3.x, yoke3.y); ctx.lineTo(yoke4.x, yoke4.y);
        ctx.stroke();

        // Fixture Head Cylinder
        const headPos = this._project3D(0, 15, 0, cx, cy);
        ctx.fillStyle = '#444444';
        ctx.strokeStyle = GS.PALETTE.ACCENT_GREEN;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(headPos.x, headPos.y, 22 * headPos.scale, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // Glowing 3D Light Cone Beam!
        const beamTop = this._project3D(0, 15, 0, cx, cy);
        const beamBot1 = this._project3D(-70, 200, -70, cx, cy);
        const beamBot2 = this._project3D(70, 200, 70, cx, cy);

        const beamGrad = ctx.createLinearGradient(beamTop.x, beamTop.y, (beamBot1.x + beamBot2.x) / 2, (beamBot1.y + beamBot2.y) / 2);
        beamGrad.addColorStop(0, '#00ff95ee');
        beamGrad.addColorStop(1, '#00ff9500');

        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(beamTop.x, beamTop.y);
        ctx.lineTo(beamBot1.x, beamBot1.y);
        ctx.lineTo(beamBot2.x, beamBot2.y);
        ctx.closePath();
        ctx.fill();
    }

    _interaction(interaction) {
        const vp = this.renderProps.viewportArea;

        if (interaction.type === 'mousedown') {
            if (vp && interaction.mouseX >= vp.x && interaction.mouseX <= vp.x + vp.w && interaction.mouseY >= vp.y && interaction.mouseY <= vp.y + vp.h) {
                this._isDragging = true;
                this._lastMouseX = interaction.mouseX;
                this._lastMouseY = interaction.mouseY;
            }

            // Check Preset Button Clicks
            if (this.renderProps.presetButtons) {
                this.renderProps.presetButtons.forEach(btn => {
                    if (interaction.mouseX >= btn.x && interaction.mouseX <= btn.x + btn.w && interaction.mouseY >= btn.y && interaction.mouseY <= btn.y + btn.h) {
                        this._pressedPreset = btn.preset;
                        this._handlePresetClick(btn.preset.id);
                        this.updateFrame();
                    }
                });
            }
        } else if (interaction.type === 'mousemove' && this._isDragging) {
            const dx = interaction.mouseX - this._lastMouseX;
            const dy = interaction.mouseY - this._lastMouseY;

            this.yaw += dx * 0.01;
            this.pitch += dy * 0.01;
            this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch));

            this._lastMouseX = interaction.mouseX;
            this._lastMouseY = interaction.mouseY;
            this.updateFrame();
        } else if (interaction.type === 'mouseup') {
            this._isDragging = false;
            this._pressedPreset = null;
            this.updateFrame();
        } else if (interaction.type === 'scroll') {
            const direction = interaction.deltaY > 0 ? -1 : 1;
            this.zoom = Math.max(0.4, Math.min(3.0, this.zoom + direction * 0.1));
            this.updateFrame();
        }
    }

    _handlePresetClick(id) {
        if (id === 'ResetCam') {
            this.yaw = 0.6;
            this.pitch = 0.35;
            this.zoom = 1.0;
        } else {
            this.activePreset = id;
        }
        this.emitAction(GLOBAL_TYPES.ACTIONS.VIEWER_3D_UPDATE, {
            preset: this.activePreset,
            yaw: Math.round((this.yaw * 180) / Math.PI),
            pitch: Math.round((this.pitch * 180) / Math.PI),
            zoom: this.zoom.toFixed(1)
        });
    }

    render(contextwindow) {
        const ctx = HCW.ctx;
        if (!ctx) return;

        const { x, y, sx, sy } = contextwindow;
        const colors = this.renderProps.colors;

        // Auto-rotation spin mode
        if (this.autoRotate) {
            this.yaw += 0.01;
            this.updateFrame();
        }

        // 1. Background
        ctx.fillStyle = colors.background;
        ctx.fillRect(x, y, sx, sy);

        // 2. Header Bar
        ctx.fillStyle = GS.HEADER.BG;
        ctx.fillRect(x, y, sx, this.headerHeight);

        ctx.fillStyle = GS.HEADER.ACCENT_LINE;
        ctx.fillRect(x, y + this.headerHeight - 2, sx, 2);

        ctx.fillStyle = colors.text;
        ctx.font = GS.FONTS.TITLE;
        ctx.textAlign = "left";
        ctx.fillText(this.getLabel(), x + 10, y + 18);

        // Readout Stats at top right
        ctx.textAlign = "right";
        ctx.font = GS.FONTS.MONO_READOUT;
        ctx.fillStyle = colors.accent;
        const degYaw = Math.round(((this.yaw * 180) / Math.PI) % 360);
        const degPitch = Math.round((this.pitch * 180) / Math.PI);
        ctx.fillText(`Y:${degYaw}° P:${degPitch}° Z:${this.zoom.toFixed(1)}x`, x + sx - 10, y + 18);

        // 3. 3D Viewport Box Area
        const vpX = x + 6;
        const vpY = y + this.headerHeight + 4;
        const vpW = sx - 12;
        const vpH = sy - this.headerHeight - this.presetBarHeight - 12;

        ctx.fillStyle = colors.viewportBg;
        ctx.fillRect(vpX, vpY, vpW, vpH);
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 1;
        ctx.strokeRect(vpX, vpY, vpW, vpH);

        this.renderProps.viewportArea = { x: vpX, y: vpY, w: vpW, h: vpH };

        // 4. Render 3D Scene Inside Viewport Clip
        ctx.save();
        ctx.beginPath();
        ctx.rect(vpX, vpY, vpW, vpH);
        ctx.clip();

        const cx = vpX + (vpW / 2);
        const cy = vpY + (vpH / 2);

        this._render3DGrid(ctx, cx, cy);

        if (this.activePreset === 'Cube') {
            this._render3DCube(ctx, cx, cy);
        } else if (this.activePreset === 'MovingHead' || this.activePreset === 'Stage') {
            this._render3DMovingHead(ctx, cx, cy);
        }

        ctx.restore();

        // 5. Preset Action Buttons Row at Bottom
        const btnY = vpY + vpH + 6;
        const btnH = this.presetBarHeight - 4;
        const gap = 4;
        const btnW = (vpW - gap * (this.presets.length - 1)) / this.presets.length;

        this.renderProps.presetButtons = [];

        this.presets.forEach((preset, idx) => {
            const bx = vpX + idx * (btnW + gap);
            let bg = colors.buttonBg;
            let border = '#333333';

            if (this.activePreset === preset.id) {
                bg = colors.buttonActive;
                border = colors.accent;
            }

            if (this._pressedPreset === preset) {
                bg = colors.accent;
            }

            ctx.fillStyle = bg;
            ctx.fillRect(bx, btnY, btnW, btnH);

            ctx.strokeStyle = border;
            ctx.lineWidth = 1;
            ctx.strokeRect(bx + 0.5, btnY + 0.5, btnW - 1, btnH - 1);

            ctx.fillStyle = (this.activePreset === preset.id) ? colors.accent : colors.text;
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

        ctx.textAlign = "start";
    }
}

globalThis.HCW3DViewerField = HCW3DViewerField;