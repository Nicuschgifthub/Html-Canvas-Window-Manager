class HCW3DViewerField extends HCWBaseField {
    constructor(label = '3D Stage View') {
        super(label);
        this.className = 'HCW3DViewerField';
        this._insertClassKeyword();

        // 3D Camera State
        this.yaw = -0.5;
        this.pitch = 0.4;
        this.zoom = 1.0;
        this.autoRotate = false;
        this.activePreset = 'Stage';

        // Interactive Orbit State
        this._isDragging = false;
        this._lastMouseX = 0;
        this._lastMouseY = 0;
        this._pressedPreset = null;

        this.headerHeight = 28;
        this.presetBarHeight = 30;

        this.presets = [
            { id: 'Stage', label: 'Stage' },
            { id: 'MovingHead', label: 'Single Fixture' },
            { id: 'Cube', label: 'Cube' },
            { id: 'AutoRotate', label: 'Auto Rotate' },
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

    // Perspective projection with Y-then-X orbit rotation
    _project3D(x, y, z, cx, cy, fov = 450) {
        const cosY = Math.cos(this.yaw);
        const sinY = Math.sin(this.yaw);
        const x1 = x * cosY + z * sinY;
        const z1 = -x * sinY + z * cosY;

        const cosP = Math.cos(this.pitch);
        const sinP = Math.sin(this.pitch);
        const y2 = y * cosP - z1 * sinP;
        const z2 = y * sinP + z1 * cosP;

        const distance = 420 / this.zoom;
        const scale = fov / (fov + z2 + distance);

        return {
            x: cx + x1 * scale,
            y: cy + y2 * scale,
            scale: Math.max(0.001, scale),
            depth: z2
        };
    }

    // Stage floor with two-tone grid
    _renderFloor(ctx, cx, cy) {
        const gridSize = 300;
        const step = 60;
        const floorY = 120; // World Y of floor

        // Draw filled grid squares alternating dark/darker
        for (let xi = -gridSize; xi < gridSize; xi += step) {
            for (let zi = -gridSize; zi < gridSize; zi += step) {
                const p1 = this._project3D(xi, floorY, zi, cx, cy);
                const p2 = this._project3D(xi + step, floorY, zi, cx, cy);
                const p3 = this._project3D(xi + step, floorY, zi + step, cx, cy);
                const p4 = this._project3D(xi, floorY, zi + step, cx, cy);

                const tileX = Math.floor(xi / step);
                const tileZ = Math.floor(zi / step);
                const even = (tileX + tileZ) % 2 === 0;
                ctx.fillStyle = even ? '#0d0d0d' : '#111111';

                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.lineTo(p3.x, p3.y);
                ctx.lineTo(p4.x, p4.y);
                ctx.closePath();
                ctx.fill();
            }
        }

        // Grid lines over top
        ctx.strokeStyle = '#1f2923';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = -gridSize; i <= gridSize; i += step) {
            const p1 = this._project3D(i, floorY, -gridSize, cx, cy);
            const p2 = this._project3D(i, floorY, gridSize, cx, cy);
            ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);

            const p3 = this._project3D(-gridSize, floorY, i, cx, cy);
            const p4 = this._project3D(gridSize, floorY, i, cx, cy);
            ctx.moveTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
        }
        ctx.stroke();

        // Center axis lines
        ctx.strokeStyle = '#00ff9540';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const ax1 = this._project3D(-gridSize, floorY, 0, cx, cy);
        const ax2 = this._project3D(gridSize, floorY, 0, cx, cy);
        ctx.moveTo(ax1.x, ax1.y); ctx.lineTo(ax2.x, ax2.y);
        const az1 = this._project3D(0, floorY, -gridSize, cx, cy);
        const az2 = this._project3D(0, floorY, gridSize, cx, cy);
        ctx.moveTo(az1.x, az1.y); ctx.lineTo(az2.x, az2.y);
        ctx.stroke();
    }

    // Render a full moving head fixture: truss bar, two yoke arms, head, and beam
    _renderMovingHeadFixture(ctx, cx, cy, wx, color = '#00ff95', panNorm = 0.5, tiltNorm = 0.6) {
        // World position of fixture base mount on truss
        const mountY = -120;
        const mountX = wx;

        // --- Truss clamp mounting point ---
        const mountPt = this._project3D(mountX, mountY, 0, cx, cy);

        // --- Yoke arms (two vertical bars down from mount) ---
        const yokeSpread = 18;
        const yokeBottom = mountY + 70;

        const yokeL1 = this._project3D(mountX - yokeSpread, mountY, 0, cx, cy);
        const yokeL2 = this._project3D(mountX - yokeSpread, yokeBottom, 0, cx, cy);
        const yokeR1 = this._project3D(mountX + yokeSpread, mountY, 0, cx, cy);
        const yokeR2 = this._project3D(mountX + yokeSpread, yokeBottom, 0, cx, cy);

        ctx.strokeStyle = '#777777';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(yokeL1.x, yokeL1.y); ctx.lineTo(yokeL2.x, yokeL2.y);
        ctx.moveTo(yokeR1.x, yokeR1.y); ctx.lineTo(yokeR2.x, yokeR2.y);
        ctx.stroke();

        // --- Head position (pan rotates around Y, tilt rotates around X of yoke) ---
        const panAngle = (panNorm - 0.5) * Math.PI * 1.2; // -108 to +108 degrees
        const tiltAngle = (tiltNorm - 0.5) * Math.PI * 0.9; // -81 to +81 degrees

        const headY = yokeBottom;
        const headX = mountX;

        // Compute beam endpoint based on pan/tilt
        const beamLen = 280;
        const beamDX = Math.sin(panAngle) * beamLen;
        const beamDY = Math.cos(tiltAngle) * beamLen;
        const beamDZ = -Math.sin(tiltAngle) * beamLen;

        // Head cylinder
        const headPt = this._project3D(headX, headY, 0, cx, cy);
        const headRadius = 14 * headPt.scale;

        ctx.fillStyle = '#333333';
        ctx.strokeStyle = '#00ff95';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(headPt.x, headPt.y, Math.max(4, headRadius), 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // Lens glow circle inside head
        const lensRadius = headRadius * 0.55;
        const lensGrad = ctx.createRadialGradient(headPt.x, headPt.y, 0, headPt.x, headPt.y, lensRadius);
        lensGrad.addColorStop(0, color + 'ff');
        lensGrad.addColorStop(1, color + '00');
        ctx.fillStyle = lensGrad;
        ctx.beginPath();
        ctx.arc(headPt.x, headPt.y, Math.max(2, lensRadius), 0, Math.PI * 2);
        ctx.fill();

        // --- Light cone beam ---
        const beamTip = this._project3D(headX, headY, 0, cx, cy);
        const beamEnd = this._project3D(headX + beamDX, headY + beamDY, beamDZ, cx, cy);

        // Cone width at end point
        const spread = 55;
        const spreadAngle = (panAngle + Math.PI / 2);
        const spreadX = Math.cos(spreadAngle) * spread;
        const spreadZ = Math.sin(spreadAngle) * spread;

        const coneL = this._project3D(headX + beamDX - spreadX, headY + beamDY, beamDZ - spreadZ, cx, cy);
        const coneR = this._project3D(headX + beamDX + spreadX, headY + beamDY, beamDZ + spreadZ, cx, cy);

        const beamGrad = ctx.createLinearGradient(beamTip.x, beamTip.y, beamEnd.x, beamEnd.y);
        beamGrad.addColorStop(0, color + 'cc');
        beamGrad.addColorStop(0.6, color + '44');
        beamGrad.addColorStop(1, color + '08');

        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(beamTip.x, beamTip.y);
        ctx.lineTo(coneL.x, coneL.y);
        ctx.lineTo(coneR.x, coneR.y);
        ctx.closePath();
        ctx.fill();

        // Pool of light on the floor (ellipse)
        const poolY = 120;
        const poolCX = headX + beamDX;
        const poolCZ = beamDZ;
        const poolPt = this._project3D(poolCX, poolY, poolCZ, cx, cy);
        const poolW = 48 * poolPt.scale;
        const poolH = 14 * poolPt.scale;

        const poolGrad = ctx.createRadialGradient(poolPt.x, poolPt.y, 0, poolPt.x, poolPt.y, Math.max(5, poolW));
        poolGrad.addColorStop(0, color + '88');
        poolGrad.addColorStop(1, color + '00');
        ctx.fillStyle = poolGrad;
        ctx.beginPath();
        ctx.ellipse(poolPt.x, poolPt.y, Math.max(4, poolW), Math.max(2, poolH), 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Render a section of truss bar spanning the stage
    _renderTruss(ctx, cx, cy, x1, x2, y, z) {
        const p1 = this._project3D(x1, y, z, cx, cy);
        const p2 = this._project3D(x2, y, z, cx, cy);
        const p3 = this._project3D(x2, y + 12, z + 12, cx, cy);
        const p4 = this._project3D(x1, y + 12, z + 12, cx, cy);

        // Top chord
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // Bottom chord
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
        ctx.stroke();

        // Cross diagonals
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#666666';
        const steps = 6;
        const dx = (x2 - x1) / steps;
        for (let i = 0; i <= steps; i++) {
            const tpTop = this._project3D(x1 + i * dx, y, z, cx, cy);
            const tpBot = this._project3D(x1 + i * dx, y + 12, z + 12, cx, cy);
            ctx.beginPath();
            ctx.moveTo(tpTop.x, tpTop.y); ctx.lineTo(tpBot.x, tpBot.y);
            ctx.stroke();

            if (i < steps) {
                const tpTop2 = this._project3D(x1 + (i + 1) * dx, y, z, cx, cy);
                ctx.beginPath();
                ctx.moveTo(tpTop.x, tpTop.y); ctx.lineTo(tpBot.x, tpBot.y);
                ctx.stroke();

                ctx.strokeStyle = '#555555';
                ctx.beginPath();
                ctx.moveTo(tpTop.x, tpTop.y); ctx.lineTo(tpTop2.x, tpTop2.y);
                ctx.stroke();
                ctx.strokeStyle = '#666666';
            }
        }
    }

    // Full stage scene: truss + 5 moving heads
    _renderStage(ctx, cx, cy) {
        this._renderFloor(ctx, cx, cy);
        this._renderTruss(ctx, cx, cy, -240, 240, -120, 0);

        const fixturePositions = [
            { x: -180, pan: 0.35, tilt: 0.65, color: '#00ff95' },
            { x: -90,  pan: 0.55, tilt: 0.55, color: '#4499ff' },
            { x: 0,    pan: 0.50, tilt: 0.70, color: '#ffffff' },
            { x: 90,   pan: 0.45, tilt: 0.60, color: '#ff4499' },
            { x: 180,  pan: 0.62, tilt: 0.50, color: '#ffaa00' }
        ];

        fixturePositions.forEach(f => {
            this._renderMovingHeadFixture(ctx, cx, cy, f.x, f.color, f.pan, f.tilt);
        });
    }

    // Single moving head
    _renderSingleMovingHead(ctx, cx, cy) {
        this._renderFloor(ctx, cx, cy);
        this._renderTruss(ctx, cx, cy, -80, 80, -120, 0);
        this._renderMovingHeadFixture(ctx, cx, cy, 0, '#00ff95', 0.5, 0.65);
    }

    // Cube for testing
    _renderCube(ctx, cx, cy) {
        this._renderFloor(ctx, cx, cy);

        const s = 60;
        const vertices = [
            { x: -s, y: -s, z: -s }, { x: s, y: -s, z: -s },
            { x: s, y: s, z: -s }, { x: -s, y: s, z: -s },
            { x: -s, y: -s, z: s }, { x: s, y: -s, z: s },
            { x: s, y: s, z: s }, { x: -s, y: s, z: s }
        ];

        const faces = [
            [0, 1, 2, 3, '#00ff95cc'],
            [4, 5, 6, 7, '#00aa55cc'],
            [0, 1, 5, 4, '#00dd77cc'],
            [2, 3, 7, 6, '#006633cc'],
            [0, 3, 7, 4, '#00ee88cc'],
            [1, 2, 6, 5, '#008844cc']
        ];

        const projected = vertices.map(v => this._project3D(v.x, v.y, v.z, cx, cy));

        const sortedFaces = faces.map(face => {
            const avgDepth = (projected[face[0]].depth + projected[face[1]].depth + projected[face[2]].depth + projected[face[3]].depth) / 4;
            return { face, depth: avgDepth };
        }).sort((a, b) => b.depth - a.depth);

        sortedFaces.forEach(item => {
            const f = item.face;
            ctx.fillStyle = f[4];
            ctx.strokeStyle = '#ffffff33';
            ctx.lineWidth = 1;
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

    _interaction(interaction) {
        const vp = this.renderProps.viewportArea;

        if (interaction.type === 'mousedown') {
            if (vp && interaction.mouseX >= vp.x && interaction.mouseX <= vp.x + vp.w && interaction.mouseY >= vp.y && interaction.mouseY <= vp.y + vp.h) {
                this._isDragging = true;
                this._lastMouseX = interaction.mouseX;
                this._lastMouseY = interaction.mouseY;
            }

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
            this.yaw -= dx * 0.008;
            this.pitch -= dy * 0.008;
            this.pitch = Math.max(-1.3, Math.min(1.3, this.pitch));
            this._lastMouseX = interaction.mouseX;
            this._lastMouseY = interaction.mouseY;
            this.updateFrame();
        } else if (interaction.type === 'mouseup') {
            this._isDragging = false;
            this._pressedPreset = null;
            this.updateFrame();
        } else if (interaction.type === 'scroll') {
            const direction = interaction.deltaY > 0 ? -1 : 1;
            this.zoom = Math.max(0.01, this.zoom + direction * 0.12);
            this.updateFrame();
        }
    }

    _handlePresetClick(id) {
        if (id === 'ResetCam') {
            this.yaw = -0.5;
            this.pitch = 0.4;
            this.zoom = 1.0;
        } else if (id === 'AutoRotate') {
            this.autoRotate = !this.autoRotate;
            if (this.autoRotate) this.updateFrame();
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

        if (this.autoRotate) {
            this.yaw += 0.008;
            this.updateFrame();
        }

        // 1. Background
        ctx.fillStyle = '#080808';
        ctx.fillRect(x, y, sx, sy);

        // 2. Header Bar
        ctx.fillStyle = GS.HEADER.BG;
        ctx.fillRect(x, y, sx, this.headerHeight);
        ctx.fillStyle = GS.HEADER.ACCENT_LINE;
        ctx.fillRect(x, y + this.headerHeight - 2, sx, 2);

        ctx.fillStyle = GS.PALETTE.TEXT_PRIMARY;
        ctx.font = GS.FONTS.TITLE;
        ctx.textAlign = "left";
        ctx.fillText(this.getLabel(), x + 10, y + 18);

        // Camera readout right side
        ctx.textAlign = "right";
        ctx.font = GS.FONTS.MONO_READOUT;
        ctx.fillStyle = GS.PALETTE.ACCENT_GREEN;
        const degYaw = Math.round(((this.yaw * 180) / Math.PI + 360) % 360);
        const degPitch = Math.round((this.pitch * 180) / Math.PI);
        ctx.fillText(`Y:${degYaw}° P:${degPitch}° Z:${this.zoom.toFixed(1)}x`, x + sx - 8, y + 18);

        // 3. Viewport area
        const vpX = x + 4;
        const vpY = y + this.headerHeight + 4;
        const vpW = sx - 8;
        const vpH = sy - this.headerHeight - this.presetBarHeight - 10;

        // Deep dark background with subtle vignette
        ctx.fillStyle = '#050505';
        ctx.fillRect(vpX, vpY, vpW, vpH);

        const vignette = ctx.createRadialGradient(
            vpX + vpW / 2, vpY + vpH / 2, vpH * 0.1,
            vpX + vpW / 2, vpY + vpH / 2, vpH * 0.85
        );
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.65)');

        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1;
        ctx.strokeRect(vpX, vpY, vpW, vpH);

        this.renderProps.viewportArea = { x: vpX, y: vpY, w: vpW, h: vpH };

        // 4. 3D scene clipped to viewport
        ctx.save();
        ctx.beginPath();
        ctx.rect(vpX, vpY, vpW, vpH);
        ctx.clip();

        const cx = vpX + vpW / 2;
        const cy = vpY + vpH * 0.55; // Slightly below center so floor is visible

        if (this.activePreset === 'Stage') {
            this._renderStage(ctx, cx, cy);
        } else if (this.activePreset === 'MovingHead') {
            this._renderSingleMovingHead(ctx, cx, cy);
        } else if (this.activePreset === 'Cube') {
            this._renderCube(ctx, cx, cy);
        }

        // Vignette overlay
        ctx.fillStyle = vignette;
        ctx.fillRect(vpX, vpY, vpW, vpH);

        ctx.restore();

        // 5. Preset buttons row
        const btnY = vpY + vpH + 4;
        const btnH = this.presetBarHeight - 4;
        const gap = 4;
        const btnW = (vpW - gap * (this.presets.length - 1)) / this.presets.length;

        this.renderProps.presetButtons = [];

        this.presets.forEach((preset, idx) => {
            const bx = vpX + idx * (btnW + gap);

            let isActive = this.activePreset === preset.id;
            if (preset.id === 'AutoRotate') isActive = this.autoRotate;

            const bg = isActive ? '#1a3322' : '#111111';
            const border = isActive ? GS.PALETTE.ACCENT_GREEN : '#2a2a2a';
            const textColor = isActive ? GS.PALETTE.ACCENT_GREEN : GS.PALETTE.TEXT_SECONDARY;

            ctx.fillStyle = bg;
            ctx.fillRect(bx, btnY, btnW, btnH);
            ctx.strokeStyle = border;
            ctx.lineWidth = 1;
            ctx.strokeRect(bx + 0.5, btnY + 0.5, btnW - 1, btnH - 1);

            ctx.fillStyle = textColor;
            ctx.font = GS.FONTS.SMALL_BOLD;
            ctx.textAlign = 'center';
            ctx.fillText(preset.label, bx + btnW / 2, btnY + btnH / 2 + 4);

            this.renderProps.presetButtons.push({ preset, x: bx, y: btnY, w: btnW, h: btnH });
        });

        ctx.textAlign = "start";
    }
}

globalThis.HCW3DViewerField = HCW3DViewerField;