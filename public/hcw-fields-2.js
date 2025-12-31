class HCWSequenceEditor extends HCWBaseField {
    constructor(text = 'Sequence Editor', id = Date.now()) {
        super(text, id);

        this.columns = [
            { label: 'Lock', width: 40 },
            { label: 'No', width: 40 },
            { label: 'Part', width: 40 },
            { label: '▼', width: 30 },
            { label: 'Name', width: 250 },
            { label: 'Trig', width: 150, sub: ['Type', 'Time', 'Sound'] },
            { label: 'Duration', width: 80 },
            { label: 'Cue', width: 100, sub: ['Fade', 'Delay'] },
            { label: 'Snap Delay', width: 60 },
            { label: 'Release', width: 70 },
            { label: 'Break', width: 100 },
            { label: 'Assert', width: 60 },
            { label: 'Allow Duplicates', width: 70 },
            { label: 'Tracking Distance', width: 70 },
            { label: 'Sync', width: 50 },
            { label: 'Morph', width: 50 },
            { label: 'Transition', width: 80 }
        ];

        this.rows = []; // Rows will be populated from sequence if available
        this.sequence = null;

        this.scrollY = 0;
        this.scrollX = 0;
        this.rowHeight = 25;
        this.headerHeight = 40;

        this.selectedCell = null; // { rowIndex, colIndex, subIndex }

        this.colors = {
            background: '#0a0a0aff',
            headerBg: '#1a1a1aff',
            headerText: '#ccc',
            grid: '#333',
            text: '#eee',
            activeRow: '#2d4d2d',
            activeLine: '#00ff00',
            selectedRow: '#000080',
            selectedCell: '#0000ff', // Blue for single cell
            rowAlt: '#141414'
        };

        // Mock generic data if no sequence is present for testing
        this._initMockData();
    }

    _initMockData() {
        this.rows = [
            { lock: 'PL', no: '0', part: '', name: 'CueZero', trig: { type: '', time: '', sound: '' }, duration: '0', cue: { fade: '0', delay: '0' }, snap: '0', transition: 'Linear' },
            { lock: '', no: '1', part: '0', name: 'Intro', trig: { type: 'Go', time: '0', sound: '' }, duration: '5', cue: { fade: '5', delay: '0' }, snap: '0', release: '<Yes>', transition: 'Linear', active: true },
            { lock: '', no: '2', part: '0', name: 'Limo Pickup', trig: { type: 'Go', time: '0', sound: '' }, duration: '3', cue: { fade: '3', delay: '0' }, snap: '0', break: "'Only Dimmer' Filter", transition: 'Linear' },
            { lock: '', no: '', part: '2', name: '    [Straight Front]', trig: { type: '', time: '', sound: '' }, duration: '3', cue: { fade: '0', delay: '3' }, snap: '0', transition: 'Linear' },
        ];
    }

    setSequence(sequence) {
        this.sequence = sequence;
        this.updateRowsFromSequence();
        return this;
    }

    updateRowsFromSequence() {
        if (!this.sequence) return;
        this.rows = this.sequence.cues.map((cue, index) => {
            return {
                id: cue.id,
                lock: '',
                no: (index + 1).toString(),
                part: '0',
                name: cue.name,
                trig: { type: 'Go', time: '0', sound: '' },
                duration: cue.inFade.toString(),
                cue: { fade: cue.inFade.toString(), delay: cue.delay.toString() },
                snap: '0',
                transition: 'Linear'
            };
        });
        this.updateFrame();
    }

    addCue(name = "New Cue") {
        if (!this.sequence) {
            console.warn("No sequence assigned to editor.");
            return;
        }
        const newCue = new Cue(name);
        this.sequence.addCue(newCue);
        this.updateRowsFromSequence();
        return this;
    }

    removeCueAt(index) {
        if (!this.sequence) return;
        this.sequence.removeCue(index);
        this.updateRowsFromSequence();
        return this;
    }

    selectCell(rowIndex, colIndex, subIndex = -1) {
        console.log(`[HCWSequenceEditor] selectCell called for Row: ${rowIndex}, Col: ${colIndex}, Sub: ${subIndex}`);
        this.selectedCell = { rowIndex, colIndex, subIndex };
        this.updateFrame();
        return this;
    }

    getType() {
        return 'SEQUENCE_EDITOR';
    }

    _interaction(interaction) {
        console.log(`[HCWSequenceEditor] Interaction: ${interaction.type}`, interaction);

        if (interaction.type === 'scroll') {
            this.scrollY -= interaction.deltaY;
            this.updateFrame();
            return;
        }

        if (interaction.type === 'mousedown' || interaction.type === 'press' || interaction.type === 'click') {
            const relX = (interaction.mouseX || 0) - this.parentWindow.contextwindow.x;
            const relY = (interaction.mouseY || 0) - this.parentWindow.contextwindow.y;

            console.log(`[HCWSequenceEditor] Rel Coordinates: (${relX}, ${relY}), ContextWindow:`, this.parentWindow.contextwindow);

            if (relY > this.headerHeight) {
                const rowIndex = Math.floor((relY - this.headerHeight - this.scrollY) / this.rowHeight);
                console.log(`[HCWSequenceEditor] Calculated Row Index: ${rowIndex}, ScrollY: ${this.scrollY}`);

                if (rowIndex >= 0 && rowIndex < this.rows.length) {
                    // Find Column
                    let currentX = -this.scrollX;
                    let colIndex = -1;
                    let subIndex = -1;

                    for (let i = 0; i < this.columns.length; i++) {
                        const col = this.columns[i];
                        if (relX >= currentX && relX < currentX + col.width) {
                            colIndex = i;
                            if (col.sub) {
                                const subW = col.width / col.sub.length;
                                subIndex = Math.floor((relX - currentX) / subW);
                            }
                            break;
                        }
                        currentX += col.width;
                    }

                    if (colIndex !== -1) {
                        console.log(`[HCWSequenceEditor] Selecting Cell: Row ${rowIndex}, Col ${colIndex} (${this.columns[colIndex].label}), Sub ${subIndex}`);
                        this.selectCell(rowIndex, colIndex, subIndex);
                    } else {
                        console.log(`[HCWSequenceEditor] No column found for relX: ${relX}`);
                    }
                } else {
                    console.log(`[HCWSequenceEditor] Row index out of bounds or above header.`);
                }
            } else {
                console.log(`[HCWSequenceEditor] Clicked on header area.`);
            }
        }
    }

    render(contextwindow) {
        const { x, y, sx, sy } = contextwindow;
        const ctx = HCW.ctx;

        // Update renderProps for hit detection
        this.renderProps.startX = x;
        this.renderProps.startY = y;
        this.renderProps.endX = x + sx;
        this.renderProps.endY = y + sy;

        ctx.fillStyle = this.colors.background;
        ctx.fillRect(x, y, sx, sy);

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, sx, sy);
        ctx.clip();

        this._renderHeaders(ctx, x, y, sx);
        this._renderRows(ctx, x, y + this.headerHeight, sx, sy - this.headerHeight);

        ctx.restore();
    }

    _renderHeaders(ctx, x, y, sx) {
        ctx.fillStyle = this.colors.headerBg;
        ctx.fillRect(x, y, sx, this.headerHeight);

        ctx.strokeStyle = this.colors.grid;
        ctx.lineWidth = 1;
        ctx.beginPath();
        let currentX = x - this.scrollX;
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = this.colors.headerText;

        this.columns.forEach(col => {
            const colWidth = col.width;
            ctx.moveTo(currentX + colWidth, y);
            ctx.lineTo(currentX + colWidth, y + this.headerHeight);

            if (col.sub) {
                ctx.fillText(col.label, currentX + colWidth / 2, y + 15);
                ctx.moveTo(currentX, y + 20);
                ctx.lineTo(currentX + colWidth, y + 20);
                const subW = colWidth / col.sub.length;
                col.sub.forEach((sub, i) => {
                    ctx.fillText(sub, currentX + (i * subW) + subW / 2, y + 35);
                    if (i > 0) {
                        ctx.moveTo(currentX + (i * subW), y + 20);
                        ctx.lineTo(currentX + (i * subW), y + this.headerHeight);
                    }
                });
            } else {
                ctx.fillText(col.label, currentX + colWidth / 2, y + 25);
            }
            currentX += colWidth;
        });
        ctx.moveTo(x, y + this.headerHeight);
        ctx.lineTo(x + sx, y + this.headerHeight);
        ctx.stroke();
    }

    _renderRows(ctx, x, y, sx, sy) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, sx, sy);
        ctx.clip();

        let currentY = y + this.scrollY;
        this.rows.forEach((row, rowIndex) => {
            if (currentY + this.rowHeight < y || currentY > y + sy) {
                currentY += this.rowHeight;
                return;
            }

            // Alternating background
            if (rowIndex % 2 === 1) {
                ctx.fillStyle = this.colors.rowAlt;
                ctx.fillRect(x, currentY, sx, this.rowHeight);
            }

            if (row.active) {
                ctx.strokeStyle = this.colors.activeLine;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x, currentY);
                ctx.lineTo(x + sx, currentY);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x, currentY + this.rowHeight);
                ctx.lineTo(x + sx, currentY + this.rowHeight);
                ctx.stroke();
            }

            let currentX = x - this.scrollX;
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = this.colors.text;

            this.columns.forEach((col, colIndex) => {
                const val = this._getRowValueByCol(row, col);
                const isCellSelected = this.selectedCell && this.selectedCell.rowIndex === rowIndex && this.selectedCell.colIndex === colIndex;

                if (col.sub) {
                    const subW = col.width / col.sub.length;
                    col.sub.forEach((sub, subIndex) => {
                        const subVal = val[sub.toLowerCase()] || '';
                        const isSubCellSelected = isCellSelected && this.selectedCell.subIndex === subIndex;

                        if (isSubCellSelected) {
                            // Sub-cell highlight
                            ctx.fillStyle = this.colors.selectedCell;
                            ctx.fillRect(currentX + (subIndex * subW), currentY, subW, this.rowHeight);

                            // Light up effect (inner glow)
                            ctx.strokeStyle = '#66a3ff';
                            ctx.lineWidth = 1;
                            ctx.strokeRect(currentX + (subIndex * subW) + 1, currentY + 1, subW - 2, this.rowHeight - 2);
                        }

                        ctx.fillStyle = this.colors.text;
                        ctx.fillText(subVal, currentX + (subIndex * subW) + subW / 2, currentY + 17);
                    });
                } else {
                    if (isCellSelected) {
                        // Main cell highlight
                        ctx.fillStyle = this.colors.selectedCell;
                        ctx.fillRect(currentX, currentY, col.width, this.rowHeight);

                        // Light up effect (inner glow)
                        ctx.strokeStyle = '#66a3ff';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(currentX + 1, currentY + 1, col.width - 2, this.rowHeight - 2);
                    }
                    ctx.fillStyle = this.colors.text;
                    ctx.fillText(val, currentX + col.width / 2, currentY + 17);
                }
                currentX += col.width;
            });
            currentY += this.rowHeight;
        });
        ctx.restore();
    }

    _getRowValueByCol(row, col) {
        // If row is a Cue object, map its properties
        if (this.sequence) {
            const cue = this.sequence.cues[this.rows.indexOf(row)];
            if (cue) {
                switch (col.label) {
                    case 'Lock': return '';
                    case 'No': return (this.rows.indexOf(row) + 1).toString();
                    case 'Part': return '0';
                    case 'Name': return cue.name || '';
                    case 'Duration': return (cue.inFade || 0).toString();
                    case 'Cue': return { fade: (cue.inFade || 0).toString(), delay: (cue.delay || 0).toString() };
                    case 'Trig': return { type: 'Go', time: '0', sound: '' };
                    case 'Transition': return 'Linear';
                    default: return '';
                }
            }
        }

        // Fallback for mock data (when no sequence is assigned)
        switch (col.label) {
            case 'Lock': return row.lock || '';
            case 'No': return row.no || '';
            case 'Part': return row.part || '';
            case '▼': return row.arrow || '';
            case 'Name': return row.name || '';
            case 'Trig': return row.trig || {};
            case 'Duration': return row.duration || '';
            case 'Cue': return row.cue || {};
            case 'Snap Delay': return row.snap || '';
            case 'Release': return row.release || '';
            case 'Break': return row.break || '';
            case 'Assert': return row.assert || '';
            case 'Allow Duplicates': return row.allowDuplicates || '';
            case 'Tracking Distance': return row.trackingDistance || '';
            case 'Sync': return row.sync || '';
            case 'Morph': return row.morph || '';
            case 'Transition': return row.transition || '';
            default: return '';
        }
    }
}
