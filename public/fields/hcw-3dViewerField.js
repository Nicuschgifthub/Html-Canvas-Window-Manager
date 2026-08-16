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

        // Perspective depth scale multiplied directly by camera zoom factor
        const baseDistance = 450;
        const scale = (fov / (fov + z2 + baseDistance)) * this.zoom;

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

    // Render a full moving head fixture with true 3D ray-plane floor intercept & dual-layer volumetric beam
    _renderMovingHeadFixture(ctx, cx, cy, wx, color = '#00ff95', panNorm = 0.5, tiltNorm = 0.6) {
        const floorY = 120;
        const mountY = -120;
        const mountX = wx;

        // --- 1. Base Mount & Yoke 3D Geometry ---
        const yokeSpread = 18;
        const yokeBottom = mountY + 65;

        // Pan angle rotates Yoke around Y axis (-135° to +135°)
        const panAngle = (panNorm - 0.5) * Math.PI * 1.5;
        // Tilt angle rotates Head around local X axis (-100° to +100°)
        const tiltAngle = (tiltNorm - 0.5) * Math.PI * 1.1;

        // Yoke 3D offsets with Pan rotation
        const yokeCosP = Math.cos(panAngle);
        const yokeSinP = Math.sin(panAngle);

        const yokeL1 = this._project3D(mountX - yokeSpread * yokeCosP, mountY, -yokeSpread * yokeSinP, cx, cy);
        const yokeL2 = this._project3D(mountX - yokeSpread * yokeCosP, yokeBottom, -yokeSpread * yokeSinP, cx, cy);
        const yokeR1 = this._project3D(mountX + yokeSpread * yokeCosP, mountY, yokeSpread * yokeSinP, cx, cy);
        const yokeR2 = this._project3D(mountX + yokeSpread * yokeCosP, yokeBottom, yokeSpread * yokeSinP, cx, cy);

        // Draw Yoke Structure
        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(yokeL1.x, yokeL1.y); ctx.lineTo(yokeL2.x, yokeL2.y);
        ctx.moveTo(yokeR1.x, yokeR1.y); ctx.lineTo(yokeR2.x, yokeR2.y);
        ctx.stroke();

        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // --- 2. Head Center & Direction Vector ---
        const headX = mountX;
        const headY = yokeBottom;
        const headZ = 0;

        // Direction Vector D = (Dx, Dy, Dz) derived from Pan (yaw) & Tilt (pitch)
        // When Tilt = 0, Dy = 1 (pointing straight down towards floor Y=120)
        const sinP = Math.sin(panAngle);
        const cosP = Math.cos(panAngle);
        const sinT = Math.sin(tiltAngle);
        const cosT = Math.cos(tiltAngle);

        const Dx = sinT * sinP;
        const Dy = cosT;
        const Dz = sinT * cosP;

        // Lens Origin in 3D (offset 16 units along direction D from head center)
        const lensR = 16;
        const lensX = headX + Dx * lensR;
        const lensY = headY + Dy * lensR;
        const lensZ = headZ + Dz * lensR;
        const lensPt = this._project3D(lensX, lensY, lensZ, cx, cy);

        // --- 3. Ray-Plane Intersection Math (Floor Y = 120) ---
        const deltaY = floorY - lensY;
        let hitsFloor = false;
        let tCenter = 400; // max length in air if not hitting floor

        if (Dy > 0.03) {
            const tIntersect = deltaY / Dy;
            if (tIntersect > 0 && tIntersect < 800) {
                hitsFloor = true;
                tCenter = tIntersect;
            }
        }

        const hitCenterX = lensX + Dx * tCenter;
        const hitCenterY = lensY + Dy * tCenter;
        const hitCenterZ = lensZ + Dz * tCenter;
        const hitCenterPt = this._project3D(hitCenterX, hitCenterY, hitCenterZ, cx, cy);

        // --- 4. Volumetric Cone & Floor Intercept Polygon Calculations ---
        const beamAngleRad = 16 * (Math.PI / 180); // 16 degree beam cone
        const tanHalfAngle = Math.tan(beamAngleRad / 2);

        // Perpendicular Basis Vectors U and V for Cone Sampling
        let Ux = 1, Uy = 0, Uz = 0;
        const horizLen = Math.sqrt(Dx * Dx + Dz * Dz);
        if (horizLen > 0.001) {
            Ux = Dz / horizLen;
            Uy = 0;
            Uz = -Dx / horizLen;
        }
        const Vx = Dy * Uz - Dz * Uy;
        const Vy = Dz * Ux - Dx * Uz;
        const Vz = Dx * Uy - Dy * Ux;

        const numSamples = 16;
        const boundaryPts3D = [];
        const boundaryPts2D = [];

        for (let i = 0; i < numSamples; i++) {
            const a = (i / numSamples) * Math.PI * 2;
            const cosA = Math.cos(a);
            const sinA = Math.sin(a);

            // Ray direction for sample perimeter ray
            const Rx = Dx + tanHalfAngle * (cosA * Ux + sinA * Vx);
            const Ry = Dy + tanHalfAngle * (cosA * Uy + sinA * Vy);
            const Rz = Dz + tanHalfAngle * (cosA * Uz + sinA * Vz);

            const Rlen = Math.sqrt(Rx * Rx + Ry * Ry + Rz * Rz);
            const normRx = Rx / Rlen;
            const normRy = Ry / Rlen;
            const normRz = Rz / Rlen;

            let pt3D;
            if (hitsFloor && normRy > 0.01) {
                const tSample = deltaY / normRy;
                pt3D = {
                    x: lensX + normRx * tSample,
                    y: floorY,
                    z: lensZ + normRz * tSample
                };
            } else {
                pt3D = {
                    x: lensX + normRx * tCenter,
                    y: lensY + normRy * tCenter,
                    z: lensZ + normRz * tCenter
                };
            }

            boundaryPts3D.push(pt3D);
            boundaryPts2D.push(this._project3D(pt3D.x, pt3D.y, pt3D.z, cx, cy));
        }

        // --- 5. Step A: Render Floor Intercept Light Pool & Surface Reflection ---
        if (hitsFloor) {
            // Calculate floor pool radius for gradient scaling
            let maxPoolRadius = 5;
            boundaryPts2D.forEach(pt => {
                const d = Math.hypot(pt.x - hitCenterPt.x, pt.y - hitCenterPt.y);
                if (d > maxPoolRadius) maxPoolRadius = d;
            });

            // A1. Outer Floor Light Pool (Projected 3D Polygon)
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(boundaryPts2D[0].x, boundaryPts2D[0].y);
            for (let i = 1; i < boundaryPts2D.length; i++) {
                ctx.lineTo(boundaryPts2D[i].x, boundaryPts2D[i].y);
            }
            ctx.closePath();

            const poolGrad = ctx.createRadialGradient(
                hitCenterPt.x, hitCenterPt.y, 0,
                hitCenterPt.x, hitCenterPt.y, Math.max(8, maxPoolRadius)
            );
            poolGrad.addColorStop(0, color + 'ff');
            poolGrad.addColorStop(0.35, color + 'aa');
            poolGrad.addColorStop(0.75, color + '35');
            poolGrad.addColorStop(1, color + '00');

            ctx.fillStyle = poolGrad;
            ctx.fill();

            // A2. Intense Inner Hotspot Spot
            ctx.beginPath();
            ctx.ellipse(hitCenterPt.x, hitCenterPt.y, Math.max(3, maxPoolRadius * 0.35), Math.max(2, maxPoolRadius * 0.2), 0, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffffdd';
            ctx.fill();

            // A3. Subtle Floor Specular Ring Outline
            ctx.strokeStyle = color + '88';
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.restore();
        }

        // --- 6. Step B: Render Dual-Layer Volumetric Atmosphere Beam Cone ---
        ctx.save();
        ctx.globalCompositeOperation = 'lighter'; // Additive blending for volumetric light realism!

        // B1. Outer Volumetric Haze Cone
        ctx.beginPath();
        ctx.moveTo(lensPt.x, lensPt.y);
        for (let i = 0; i < boundaryPts2D.length; i++) {
            ctx.lineTo(boundaryPts2D[i].x, boundaryPts2D[i].y);
        }
        ctx.closePath();

        const beamGrad = ctx.createLinearGradient(lensPt.x, lensPt.y, hitCenterPt.x, hitCenterPt.y);
        beamGrad.addColorStop(0, color + 'ee');
        beamGrad.addColorStop(0.15, color + '88');
        beamGrad.addColorStop(0.5, color + '44');
        beamGrad.addColorStop(0.85, color + '22');
        beamGrad.addColorStop(1, color + '05');

        ctx.fillStyle = beamGrad;
        ctx.fill();

        // B2. Intense Inner Core Beam (Laser Shaft)
        const innerRatio = 0.45;
        ctx.beginPath();
        ctx.moveTo(lensPt.x, lensPt.y);
        for (let i = 0; i < boundaryPts2D.length; i++) {
            const ix = lensPt.x + (boundaryPts2D[i].x - lensPt.x) * innerRatio;
            const iy = lensPt.y + (boundaryPts2D[i].y - lensPt.y) * innerRatio;
            ctx.lineTo(ix, iy);
        }
        ctx.closePath();

        const coreGrad = ctx.createLinearGradient(lensPt.x, lensPt.y, hitCenterPt.x, hitCenterPt.y);
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.2, color + 'cc');
        coreGrad.addColorStop(0.7, color + '66');
        coreGrad.addColorStop(1, color + '10');

        ctx.fillStyle = coreGrad;
        ctx.fill();

        // B3. Atmospheric Dust Strands (Subtle volumetric rays)
        ctx.strokeStyle = '#ffffff35';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let s = 0; s < 3; s++) {
            const idx = Math.floor((s + 0.5) * (numSamples / 3));
            ctx.moveTo(lensPt.x, lensPt.y);
            ctx.lineTo(boundaryPts2D[idx].x, boundaryPts2D[idx].y);
        }
        ctx.stroke();

        ctx.restore();

        // --- 7. Step C: Fixture Head Optics & Lens Bloom Flare ---
        const headPt = this._project3D(headX, headY, headZ, cx, cy);
        const headRadius = Math.max(5, 14 * headPt.scale);

        // Head Housing Cylinder
        ctx.fillStyle = '#262626';
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(headPt.x, headPt.y, headRadius, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // Lens Flare / Source Bloom at Lens Position
        const flareR = Math.max(3, headRadius * 0.7);
        const flareGrad = ctx.createRadialGradient(lensPt.x, lensPt.y, 0, lensPt.x, lensPt.y, flareR * 1.8);
        flareGrad.addColorStop(0, '#ffffff');
        flareGrad.addColorStop(0.35, color + 'ff');
        flareGrad.addColorStop(0.8, color + '55');
        flareGrad.addColorStop(1, color + '00');

        ctx.fillStyle = flareGrad;
        ctx.beginPath();
        ctx.arc(lensPt.x, lensPt.y, flareR * 1.8, 0, Math.PI * 2);
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

    // Full stage scene: truss + 5 moving heads with back-to-front depth sorting
    _renderStage(ctx, cx, cy) {
        this._renderFloor(ctx, cx, cy);
        this._renderTruss(ctx, cx, cy, -240, 240, -120, 0);

        const fixturePositions = [
            { x: -180, pan: 0.35, tilt: 0.65, color: '#00ff95' },
            { x: -90, pan: 0.55, tilt: 0.55, color: '#4499ff' },
            { x: 0, pan: 0.50, tilt: 0.70, color: '#ffffff' },
            { x: 90, pan: 0.45, tilt: 0.60, color: '#ff4499' },
            { x: 180, pan: 0.62, tilt: 0.50, color: '#ffaa00' }
        ];

        // Sort fixtures back-to-front based on camera depth Z
        const sortedFixtures = fixturePositions.map(f => {
            const proj = this._project3D(f.x, -120, 0, cx, cy);
            return { ...f, depth: proj.depth };
        }).sort((a, b) => b.depth - a.depth);

        sortedFixtures.forEach(f => {
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
            this.pitch += dy * 0.008;
            this.pitch = Math.max(-1.3, Math.min(1.3, this.pitch));
            this._lastMouseX = interaction.mouseX;
            this._lastMouseY = interaction.mouseY;
            this.updateFrame();
        } else if (interaction.type === 'mouseup') {
            this._isDragging = false;
            this._pressedPreset = null;
            this.updateFrame();
        } else if (interaction.type === 'scroll') {
            // Multiplicative geometric zoom: constant percentage scale change at all zoom levels
            const factor = interaction.deltaY > 0 ? 0.88 : 1.14;
            this.zoom = Math.max(0.02, Math.min(50.0, this.zoom * factor));
            this.updateFrame();
        } else if (interaction.type === 'pinch') {
            if (interaction.ratio) {
                this.zoom = Math.max(0.02, Math.min(50.0, this.zoom * interaction.ratio));
                this.updateFrame();
            }
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