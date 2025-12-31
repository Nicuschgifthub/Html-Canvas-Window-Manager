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

        this.rows = [
            { lock: 'PL', no: '0', part: '', name: 'CueZero', trig: { type: '', time: '', sound: '' }, duration: '0', cue: { fade: '0', delay: '0' }, snap: '0', transition: 'Linear' },
            { lock: '', no: '1', part: '0', name: 'Intro', trig: { type: 'Go', time: '0', sound: '' }, duration: '5', cue: { fade: '5', delay: '0' }, snap: '0', release: '<Yes>', transition: 'Linear', active: true },
            { lock: '', no: '2', part: '0', name: 'Limo Pickup', trig: { type: 'Go', time: '0', sound: '' }, duration: '3', cue: { fade: '3', delay: '0' }, snap: '0', break: "'Only Dimmer' Filter", transition: 'Linear', selection: 'full' },
            { lock: '', no: '', part: '2', name: '    [Straight Front]', trig: { type: '', time: '', sound: '' }, duration: '3', cue: { fade: '0', delay: '3' }, snap: '0', transition: 'Linear', selection: 'full' },
            { lock: '', no: '2.5', part: '0', name: 'Limo Ride', trig: { type: 'Follow', time: '+2', sound: '' }, duration: '2', cue: { fade: '2', delay: '0' }, snap: '0', transition: 'Linear' },
            { lock: '', no: '4', part: '0', name: 'Nakatomi Plaza', trig: { type: 'Go', time: '0', sound: '' }, duration: '5', cue: { fade: '5', delay: '0' }, snap: '0', release: 'Yes', transition: 'Linear' },
            { lock: '', no: '4.5', part: '0', name: 'Christmas Party', trig: { type: 'Go', time: '0', sound: '' }, duration: '1', cue: { fade: '1', delay: '0' }, snap: '0', assert: 'X- Assert', transition: 'Linear' },
            { lock: '', no: '', part: '1', name: '    G1 Indiv Dim', trig: { type: '', time: '', sound: '' }, duration: '2', cue: { fade: '0', delay: '0' }, snap: '0', transition: 'Linear' },
            { lock: '', no: '', part: '2', name: '    [Center]', trig: { type: '', time: '', sound: '' }, duration: '0', cue: { fade: '0', delay: '0' }, snap: '0', transition: 'Linear' },
            { lock: '', no: '5', part: '0', name: 'Hollys Office', trig: { type: 'Go', time: '0', sound: '' }, duration: '3', cue: { fade: '3', delay: '0' }, snap: '0', transition: 'Linear' },
            { lock: '', no: '6', part: '0', name: 'End of First Part', trig: { type: 'Go', time: '0', sound: '' }, duration: '0', cue: { fade: '0', delay: '0' }, snap: '0', release: 'Yes', transition: 'Linear' },
            { lock: 'PL', no: '', part: '', name: 'OffCue', trig: { type: '', time: '', sound: '' }, duration: '0', cue: { fade: '0', delay: '0' }, snap: '0', release: 'Yes', assert: 'Assert', transition: 'Linear' },
        ];

        this.scrollY = 0;
        this.scrollX = 0;
        this.rowHeight = 25;
        this.headerHeight = 40;

        this.colors = {
            background: '#0a0a0aff',
            headerBg: '#1a1a1aff',
            headerText: '#ccc',
            grid: '#333',
            text: '#eee',
            activeRow: '#2d4d2d',
            activeLine: '#00ff00',
            selectedRow: '#000080',
            rowAlt: '#141414'
        };
    }

    getType() {
        return 'SEQUENCE_EDITOR';
    }

    _interaction(interaction) {
        if (interaction.type === 'scroll') {
            this.scrollY -= interaction.deltaY;
            this.updateFrame();
        }
    }

    render(contextwindow) {
        const { x, y, sx, sy } = contextwindow;
        const ctx = HCW.ctx;

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
        this.rows.forEach((row, index) => {
            if (currentY + this.rowHeight < y || currentY > y + sy) {
                currentY += this.rowHeight;
                return;
            }
            if (row.selection === 'full') {
                ctx.fillStyle = this.colors.selectedRow;
            } else if (index % 2 === 1) {
                ctx.fillStyle = this.colors.rowAlt;
            } else {
                ctx.fillStyle = 'transparent';
            }
            ctx.fillRect(x, currentY, sx, this.rowHeight);

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

            this.columns.forEach(col => {
                const val = this._getRowValueByCol(row, col);
                if (col.sub) {
                    const subW = col.width / col.sub.length;
                    col.sub.forEach((sub, i) => {
                        const subVal = val[sub.toLowerCase()] || '';
                        ctx.fillText(subVal, currentX + (i * subW) + subW / 2, currentY + 17);
                    });
                } else {
                    ctx.fillText(val, currentX + col.width / 2, currentY + 17);
                }
                currentX += col.width;
            });
            currentY += this.rowHeight;
        });
        ctx.restore();
    }

    _getRowValueByCol(row, col) {
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
