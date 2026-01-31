class HCWSequenceEditor extends HCWBaseField {
    constructor(text = 'Sequence Editor', id = Date.now()) {
        super(text, id);

        this.columns = [
            { label: 'Lock', width: 40 },
            { label: 'No', width: 40 },
            { label: 'Part', width: 40 },
            { label: '▼', width: 30 },
            { label: 'Name', width: 250 },
            { label: 'Trig', width: 150, sub: ['Type', 'Time'] },
            { label: 'Duration', width: 80 },
            { label: 'Fade', width: 100, sub: ['In', 'Out'] },
            { label: 'Delay', width: 100, sub: ['In', 'Out'] },
            { label: 'CMD', width: 300 }, // Command
            { label: 'MIB', width: 70 }, // Move In Black
            { label: 'Release', width: 70 },
            { label: 'Assert', width: 60 },
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

    getFGMType() {
        return GLOBAL_TYPES.CONTEXT_FIELDS.SEQUENCE_EDITOR;
    }

    _initMockData() {
        this.rows = [
            { lock: 'PL', no: '0', part: '', name: 'CueZero', trig: { type: '', time: '' }, duration: '0', fade: { in: '0', out: '0' }, delay: { in: '0', out: '0' }, transition: 'Linear', cmd: '', mib: '' },
            { lock: '', no: '1', part: '0', name: 'Intro', trig: { type: 'Go', time: '0' }, duration: '5', fade: { in: '5', out: '5' }, delay: { in: '0', out: '0' }, transition: 'Linear', active: true, cmd: '', mib: '' },
        ];
    }

    setSequence(sequence) {
        this.sequence = sequence;
        this.updateRowsFromSequence();
        return this;
    }

    updateRowsFromSequence() {
        if (!this.sequence) return;
        this.rows = this.sequence.cues;
        this.updateFrame();
    }

    setCellValue(rowIndex, colIndex, subIndex, newValue) {
        if (rowIndex < 0 || rowIndex >= this.rows.length) return;

        const row = this.rows[rowIndex];
        const col = this.columns[colIndex];

        console.log(`[HCWSequenceEditor] Setting Value: Row ${rowIndex}, Col ${col.label}, Sub ${subIndex} -> ${newValue}`);

        if (this.sequence) {
            // Updating real Cue object
            const cue = row; // Assuming rows are the cue objects now
            switch (col.label) {
                case 'Name': cue.name = newValue; break;
                case 'Fade':
                    if (subIndex === 0) cue.inFade = parseFloat(newValue) || 0;
                    else cue.outFade = newValue === "" ? null : (parseFloat(newValue) || 0);
                    break;
                case 'Delay':
                    if (subIndex === 0) cue.inDelay = parseFloat(newValue) || 0;
                    else cue.outDelay = newValue === "" ? null : (parseFloat(newValue) || 0);
                    break;
                case 'Trig':
                    if (subIndex === 0) cue.trigType = newValue;
                    else cue.trigTime = parseFloat(newValue) || 0;
                    break;
                case 'CMD': cue.cmd = newValue; break;
                case 'MIB': cue.mib = newValue; break;
            }
        } else {
            // Updating mock data
            // (Similar logic for mock data if needed)
        }

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
        this.selectedCell = { rowIndex, colIndex, subIndex };
        this.updateFrame();
        return this;
    }

    getType() {
        return 'SEQUENCE_EDITOR';
    }

    _interaction(interaction) {
        if (interaction.type === 'scroll') {
            this.scrollY -= interaction.deltaY;
            this.updateFrame();
            return;
        }

        if (interaction.type === 'mousedown' || interaction.type === 'press' || interaction.type === 'click') {
            const relX = (interaction.mouseX || 0) - this.parentWindow.contextwindow.x;
            const relY = (interaction.mouseY || 0) - this.parentWindow.contextwindow.y;

            if (relY > this.headerHeight) {
                const rowIndex = Math.floor((relY - this.headerHeight - this.scrollY) / this.rowHeight);

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
                        this.selectCell(rowIndex, colIndex, subIndex);
                    }
                }
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
            const cue = row;
            if (cue) {
                switch (col.label) {
                    case 'Lock': return '';
                    case 'No': return (this.rows.indexOf(row) + 1).toString();
                    case 'Part': return '0';
                    case 'Name': return cue.name || '';
                    case 'Duration': return '0'; // Logic for duration later
                    case 'Fade': return { in: (cue.inFade || 0).toString(), out: (cue.getOutFade()).toString() };
                    case 'Delay': return { in: (cue.inDelay || 0).toString(), out: (cue.getOutDelay()).toString() };
                    case 'Trig': return { type: cue.trigType || 'Go', time: (cue.trigTime || 0).toString() };
                    case 'CMD': return cue.cmd || '';
                    case 'MIB': return cue.mib || 'None';
                    case 'Release': return '';
                    case 'Assert': return '';
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
            case 'Fade': return row.fade || {};
            case 'Delay': return row.delay || {};
            case 'CMD': return row.cmd || '';
            case 'MIB': return row.mib || '';
            case 'Release': return row.release || '';
            case 'Assert': return row.assert || '';
            case 'Transition': return row.transition || '';
            default: return '';
        }
    }
}
