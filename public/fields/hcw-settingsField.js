class HCWSettingsField extends HCWBaseField {
    constructor(label = 'Settings') {
        super(label);
        this.className = 'HCWSettingsField';
        this._insertClassKeyword();

        this.scrollOffset = 0;
        this.totalContentHeight = 0;
        this._maxScrollOffset = 0;

        this._isDraggingScroll = false;
        this._dragStartY = 0;
        this._dragStartScroll = 0;
        this._hasDragged = false;

        this._hoverTarget = null;
        this._pressedTarget = null;

        // Default Settings Schema with Folders & Controls
        this.schema = {
            title: "System Properties",
            items: [
                {
                    type: "folder",
                    id: "net_folder",
                    title: "Network Config",
                    collapsed: false,
                    items: [
                        { type: "text", id: "ip_addr", label: "IP Address", value: "192.168.1.100" },
                        { type: "text", id: "subnet", label: "Subnet Mask", value: "255.255.255.0" },
                        { type: "radio", id: "net_protocol", label: "Protocol", options: ["Art-Net", "sACN", "DMX512"], value: "Art-Net" },
                        { type: "toggle", id: "dhcp", label: "Auto DHCP", value: true }
                    ]
                },
                {
                    type: "folder",
                    id: "output_folder",
                    title: "Output & Hardware",
                    collapsed: false,
                    items: [
                        { type: "slider", id: "brightness", label: "Display Brightness", min: 0, max: 100, step: 5, value: 80 },
                        { type: "radio", id: "dmx_rate", label: "Refresh Rate", options: ["30 Hz", "40 Hz", "44 Hz"], value: "40 Hz" },
                        { type: "button", id: "btn_test_packet", label: "Send Test Packet" }
                    ]
                },
                {
                    type: "folder",
                    id: "audio_folder",
                    title: "Audio & Sync",
                    collapsed: true,
                    items: [
                        { type: "toggle", id: "bpm_sync", label: "BPM Sound Sync", value: false },
                        { type: "radio", id: "audio_input", label: "Input Device", options: ["Line In", "Mic", "Internal"], value: "Line In" }
                    ]
                }
            ]
        };

        this.headerHeight = 28;

        this.renderProps = {
            colors: {
                background: '#0a0a0a',
                headerBg: '#141414',
                accent: GS.PALETTE.ACCENT_GREEN,
                text: GS.PALETTE.TEXT_PRIMARY,
                textSub: GS.PALETTE.TEXT_SECONDARY,
                boxBg: '#111111',
                boxBorder: '#222222',
                folderBg: '#181818',
                folderHeaderActive: '#222222',
                folderBorder: '#282828',
                buttonBg: '#222222',
                buttonActive: '#00ff95',
                radioBg: '#161616',
                radioActive: '#1b3b28'
            },
            hitTargets: []
        };
    }

    getType() {
        return GLOBAL_TYPES.CONTEXT_FIELDS.SETTINGS || 'CONTEXT_FIELD_SETTINGS';
    }

    setSchema(schema) {
        if (typeof schema === 'string') {
            try { this.schema = JSON.parse(schema); } catch (e) { console.error("HCWSettingsField invalid JSON schema:", e); }
        } else if (typeof schema === 'object') {
            this.schema = schema;
        }
        this.scrollOffset = 0;
        this.updateFrame();
        return this;
    }

    getValues() {
        const values = {};
        const collect = (items) => {
            if (!Array.isArray(items)) return;
            items.forEach(item => {
                if (item.type === 'folder' && item.items) {
                    collect(item.items);
                } else if (item.id && item.value !== undefined) {
                    values[item.id] = item.value;
                }
            });
        };
        if (this.schema && this.schema.items) collect(this.schema.items);
        return values;
    }

    getValue(id) {
        return this.getValues()[id];
    }

    setValue(id, newValue) {
        const update = (items) => {
            if (!Array.isArray(items)) return false;
            for (let item of items) {
                if (item.type === 'folder' && item.items) {
                    if (update(item.items)) return true;
                } else if (item.id === id) {
                    item.value = newValue;
                    return true;
                }
            }
            return false;
        };
        if (this.schema && this.schema.items) {
            update(this.schema.items);
            this.updateFrame();
        }
        return this;
    }

    _interaction(interaction) {
        if (interaction.type === 'mousedown') {
            this._isDraggingScroll = true;
            this._dragStartY = interaction.mouseY;
            this._dragStartScroll = this.scrollOffset;
            this._hasDragged = false;
            this._pressedTarget = null;

            const targets = this.renderProps.hitTargets || [];
            targets.forEach(t => {
                if (interaction.mouseX >= t.x && interaction.mouseX <= t.x + t.w &&
                    interaction.mouseY >= t.y && interaction.mouseY <= t.y + t.h) {
                    this._pressedTarget = t;
                }
            });

        } else if (interaction.type === 'mousemove') {
            if (this._isDraggingScroll) {
                const dy = interaction.mouseY - this._dragStartY;
                if (Math.abs(dy) > 4) {
                    this._hasDragged = true;
                }
                this.scrollOffset = Math.max(0, Math.min(this._maxScrollOffset, this._dragStartScroll - dy));
                this.updateFrame();
            }

            this._hoverTarget = null;
            const targets = this.renderProps.hitTargets || [];
            targets.forEach(t => {
                if (interaction.mouseX >= t.x && interaction.mouseX <= t.x + t.w &&
                    interaction.mouseY >= t.y && interaction.mouseY <= t.y + t.h) {
                    this._hoverTarget = t;
                }
            });

        } else if (interaction.type === 'mouseup') {
            if (this._isDraggingScroll && !this._hasDragged && this._pressedTarget) {
                const t = this._pressedTarget;

                if (t.targetType === 'folderToggle') {
                    t.item.collapsed = !t.item.collapsed;
                } else if (t.targetType === 'radioOption') {
                    t.item.value = t.optValue;
                    this.emitAction(GLOBAL_TYPES.ACTIONS.SETTINGS_UPDATE || 'ACTION_SETTINGS_UPDATE', {
                        id: t.item.id,
                        value: t.optValue,
                        item: t.item
                    });
                } else if (t.targetType === 'button') {
                    this.emitAction(GLOBAL_TYPES.ACTIONS.SETTINGS_BUTTON_PRESS || 'ACTION_SETTINGS_BUTTON_PRESS', {
                        id: t.item.id,
                        action: t.item.id,
                        item: t.item
                    });
                } else if (t.targetType === 'toggle') {
                    t.item.value = !t.item.value;
                    this.emitAction(GLOBAL_TYPES.ACTIONS.SETTINGS_UPDATE || 'ACTION_SETTINGS_UPDATE', {
                        id: t.item.id,
                        value: t.item.value,
                        item: t.item
                    });
                } else if (t.targetType === 'textInput') {
                    const newInput = prompt(`Edit value for "${t.item.label}":`, t.item.value || '');
                    if (newInput !== null) {
                        t.item.value = newInput;
                        this.emitAction(GLOBAL_TYPES.ACTIONS.SETTINGS_UPDATE || 'ACTION_SETTINGS_UPDATE', {
                            id: t.item.id,
                            value: t.item.value,
                            item: t.item
                        });
                    }
                }
            }

            this._isDraggingScroll = false;
            this._hasDragged = false;
            this._pressedTarget = null;
            this.updateFrame();

        } else if (interaction.type === 'scroll') {
            const scrollDelta = interaction.deltaY * 0.4;
            this.scrollOffset = Math.max(0, Math.min(this._maxScrollOffset, this.scrollOffset + scrollDelta));
            this.updateFrame();
        }
    }

    render(contextwindow) {
        const ctx = HCW.ctx;
        if (!ctx) return;

        const { x, y, sx, sy } = contextwindow;
        const colors = this.renderProps.colors;

        this.renderProps.hitTargets = [];

        // 1. Field Background
        ctx.fillStyle = colors.background;
        ctx.fillRect(x, y, sx, sy);

        // 2. Header Bar
        ctx.fillStyle = GS.HEADER.BG;
        ctx.fillRect(x, y, sx, this.headerHeight);
        ctx.fillStyle = GS.HEADER.ACCENT_LINE;
        ctx.fillRect(x, y + this.headerHeight - 2, sx, 2);

        ctx.fillStyle = GS.PALETTE.TEXT_PRIMARY;
        ctx.font = GS.FONTS.TITLE;
        ctx.textAlign = 'left';
        ctx.fillText(this.getLabel(), x + 10, y + 18);

        // 3. Viewport Boundaries & Canvas Clipping
        const vpX = x + 4;
        const vpY = y + this.headerHeight + 2;
        const vpW = sx - 8;
        const vpH = sy - this.headerHeight - 4;

        ctx.save();
        ctx.beginPath();
        ctx.rect(vpX, vpY, vpW, vpH);
        ctx.clip();

        // 4. Render Dynamic Settings Controls & Folders Tree (offset by scrollOffset)
        let unrolledY = y + this.headerHeight + 8;
        const itemsAreaW = vpW - 12;
        const startX = vpX + 4;

        const renderItems = (items, depth = 0) => {
            if (!Array.isArray(items)) return;

            items.forEach(item => {
                const indent = depth * 14;
                const itemX = startX + indent;
                const itemW = itemsAreaW - indent;

                if (item.type === 'folder') {
                    // --- Folder Collapsible Header Bar ---
                    const folderH = 30;
                    const isCollapsed = !!item.collapsed;
                    const isPressed = this._pressedTarget && this._pressedTarget.item === item;
                    const drawY = unrolledY - this.scrollOffset;

                    // Only render if within or near visible viewport
                    if (drawY + folderH >= vpY && drawY <= vpY + vpH) {
                        const bg = isPressed ? colors.folderHeaderActive : colors.folderBg;
                        ctx.fillStyle = bg;
                        ctx.fillRect(itemX, drawY, itemW, folderH);

                        ctx.strokeStyle = colors.folderBorder;
                        ctx.lineWidth = 1;
                        ctx.strokeRect(itemX + 0.5, drawY + 0.5, itemW - 1, folderH - 1);

                        // Left Green Accent Line for Folder
                        ctx.fillStyle = GS.PALETTE.ACCENT_GREEN;
                        ctx.fillRect(itemX, drawY, 4, folderH);

                        // Chevron Arrow (v or >)
                        const chevron = isCollapsed ? '▶' : '▼';
                        ctx.fillStyle = GS.PALETTE.ACCENT_GREEN;
                        ctx.font = GS.FONTS.SMALL_BOLD;
                        ctx.textAlign = 'left';
                        ctx.fillText(chevron, itemX + 12, drawY + 19);

                        // Folder Title
                        ctx.fillStyle = GS.PALETTE.TEXT_PRIMARY;
                        ctx.font = GS.FONTS.LABEL;
                        ctx.fillText(item.title || item.label || 'Folder', itemX + 28, drawY + 20);

                        // Item Count Badge at Right Side
                        if (item.items && item.items.length > 0) {
                            ctx.fillStyle = GS.PALETTE.TEXT_SECONDARY;
                            ctx.font = GS.FONTS.SMALL;
                            ctx.textAlign = 'right';
                            ctx.fillText(`${item.items.length} items`, itemX + itemW - 10, drawY + 20);
                        }

                        this.renderProps.hitTargets.push({
                            targetType: 'folderToggle',
                            item: item,
                            x: itemX, y: drawY, w: itemW, h: folderH
                        });
                    }

                    unrolledY += folderH + 4;

                    // --- Render Children inside Recessed Container if Expanded ---
                    if (!isCollapsed && item.items && item.items.length > 0) {
                        const childStartY = unrolledY - this.scrollOffset;

                        renderItems(item.items, depth + 1);

                        const childEndY = unrolledY - this.scrollOffset;

                        // Vertical Left Connector Tree Line
                        if (childEndY >= vpY && childStartY <= vpY + vpH) {
                            ctx.strokeStyle = GS.PALETTE.ACCENT_GREEN + '44';
                            ctx.lineWidth = 1.5;
                            ctx.beginPath();
                            ctx.moveTo(itemX + 8, Math.max(vpY, childStartY - 2));
                            ctx.lineTo(itemX + 8, Math.min(vpY + vpH, childEndY - 6));
                            ctx.stroke();
                        }

                        unrolledY += 4;
                    }

                } else if (item.type === 'radio') {
                    // --- Radio Button Group ---
                    const labelH = 18;
                    const options = item.options || [];
                    const optH = 24;
                    const totalRadioH = labelH + optH + 8;
                    const drawY = unrolledY - this.scrollOffset;

                    if (drawY + totalRadioH >= vpY && drawY <= vpY + vpH) {
                        ctx.fillStyle = GS.PALETTE.TEXT_SECONDARY;
                        ctx.font = GS.FONTS.SMALL_BOLD;
                        ctx.textAlign = 'left';
                        ctx.fillText(item.label || item.id, itemX, drawY + 13);

                        const optGap = 4;
                        const optW = (itemW - optGap * (options.length - 1)) / Math.max(1, options.length);
                        const optY = drawY + labelH;

                        options.forEach((opt, idx) => {
                            const optValue = (typeof opt === 'object') ? opt.value : opt;
                            const optLabel = (typeof opt === 'object') ? opt.label : opt;
                            const isSelected = item.value === optValue;

                            const bx = itemX + idx * (optW + optGap);
                            const bg = isSelected ? colors.radioActive : colors.radioBg;
                            const border = isSelected ? GS.PALETTE.ACCENT_GREEN : '#2a2a2a';

                            ctx.fillStyle = bg;
                            ctx.fillRect(bx, optY, optW, optH);
                            ctx.strokeStyle = border;
                            ctx.lineWidth = 1;
                            ctx.strokeRect(bx + 0.5, optY + 0.5, optW - 1, optH - 1);

                            ctx.fillStyle = isSelected ? GS.PALETTE.ACCENT_GREEN : GS.PALETTE.TEXT_PRIMARY;
                            ctx.font = GS.FONTS.SMALL_BOLD;
                            ctx.textAlign = 'center';
                            ctx.fillText(String(optLabel), bx + optW / 2, optY + 16);

                            this.renderProps.hitTargets.push({
                                targetType: 'radioOption',
                                item: item,
                                optValue: optValue,
                                x: bx, y: optY, w: optW, h: optH
                            });
                        });
                    }

                    unrolledY += totalRadioH;

                } else if (item.type === 'button') {
                    // --- Action Button ---
                    const btnH = 26;
                    const drawY = unrolledY - this.scrollOffset;

                    if (drawY + btnH >= vpY && drawY <= vpY + vpH) {
                        ctx.fillStyle = colors.buttonBg;
                        ctx.fillRect(itemX, drawY, itemW, btnH);
                        ctx.strokeStyle = '#333333';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(itemX + 0.5, drawY + 0.5, itemW - 1, btnH - 1);

                        ctx.fillStyle = GS.PALETTE.ACCENT_GREEN;
                        ctx.font = GS.FONTS.SMALL_BOLD;
                        ctx.textAlign = 'center';
                        ctx.fillText(item.label || item.id, itemX + itemW / 2, drawY + 17);

                        this.renderProps.hitTargets.push({
                            targetType: 'button',
                            item: item,
                            x: itemX, y: drawY, w: itemW, h: btnH
                        });
                    }

                    unrolledY += btnH + 6;

                } else if (item.type === 'toggle') {
                    // --- Toggle Switch ---
                    const rowH = 24;
                    const drawY = unrolledY - this.scrollOffset;
                    const isChecked = !!item.value;

                    if (drawY + rowH >= vpY && drawY <= vpY + vpH) {
                        ctx.fillStyle = GS.PALETTE.TEXT_PRIMARY;
                        ctx.font = GS.FONTS.LABEL;
                        ctx.textAlign = 'left';
                        ctx.fillText(item.label || item.id, itemX, drawY + 16);

                        const switchW = 44;
                        const switchH = 20;
                        const switchX = itemX + itemW - switchW;
                        const switchY = drawY + 2;

                        ctx.fillStyle = isChecked ? '#1b3b28' : '#1c1c1c';
                        ctx.fillRect(switchX, switchY, switchW, switchH);
                        ctx.strokeStyle = isChecked ? GS.PALETTE.ACCENT_GREEN : '#333333';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(switchX + 0.5, switchY + 0.5, switchW - 1, switchH - 1);

                        const knobW = 18;
                        const knobX = isChecked ? switchX + switchW - knobW - 2 : switchX + 2;
                        ctx.fillStyle = isChecked ? GS.PALETTE.ACCENT_GREEN : '#666666';
                        ctx.fillRect(knobX, switchY + 2, knobW, switchH - 4);

                        this.renderProps.hitTargets.push({
                            targetType: 'toggle',
                            item: item,
                            x: itemX, y: drawY, w: itemW, h: rowH
                        });
                    }

                    unrolledY += rowH + 6;

                } else if (item.type === 'text') {
                    // --- Text Input / Display Box ---
                    const rowH = 26;
                    const drawY = unrolledY - this.scrollOffset;

                    if (drawY + rowH >= vpY && drawY <= vpY + vpH) {
                        ctx.fillStyle = GS.PALETTE.TEXT_PRIMARY;
                        ctx.font = GS.FONTS.LABEL;
                        ctx.textAlign = 'left';
                        ctx.fillText(item.label || item.id, itemX, drawY + 17);

                        const boxW = Math.min(180, itemW * 0.5);
                        const boxX = itemX + itemW - boxW;

                        ctx.fillStyle = '#050505';
                        ctx.fillRect(boxX, drawY, boxW, rowH);
                        ctx.strokeStyle = '#222222';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(boxX + 0.5, drawY + 0.5, boxW - 1, rowH - 1);

                        ctx.fillStyle = GS.PALETTE.ACCENT_GREEN;
                        ctx.font = GS.FONTS.MONO_READOUT;
                        ctx.textAlign = 'right';
                        ctx.fillText(String(item.value || ''), boxX + boxW - 8, drawY + 17);

                        this.renderProps.hitTargets.push({
                            targetType: 'textInput',
                            item: item,
                            x: boxX, y: drawY, w: boxW, h: rowH
                        });
                    }

                    unrolledY += rowH + 6;
                }
            });
        };

        if (this.schema && this.schema.items) {
            renderItems(this.schema.items, 0);
        }

        // Calculate total content height & max scroll bounds
        this.totalContentHeight = unrolledY - (y + this.headerHeight + 8);
        this._maxScrollOffset = Math.max(0, this.totalContentHeight - vpH);
        this.scrollOffset = Math.max(0, Math.min(this._maxScrollOffset, this.scrollOffset));

        ctx.restore();

        // 5. Sleek MA3 Vertical Scrollbar Indicator
        if (this._maxScrollOffset > 0) {
            const trackX = x + sx - 5;
            const trackY = vpY;
            const trackW = 3;
            const trackH = vpH;

            const thumbH = Math.max(18, (vpH / this.totalContentHeight) * trackH);
            const thumbY = trackY + (this.scrollOffset / this._maxScrollOffset) * (trackH - thumbH);

            ctx.fillStyle = '#1e1e1e';
            ctx.fillRect(trackX, trackY, trackW, trackH);

            ctx.fillStyle = GS.PALETTE.ACCENT_GREEN + 'aa';
            ctx.fillRect(trackX, thumbY, trackW, thumbH);
        }

        ctx.textAlign = 'start';
    }
}

globalThis.HCWSettingsField = HCWSettingsField;
