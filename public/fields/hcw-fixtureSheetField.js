/**
 * HCWFixtureSheetField — a scrollable grid with frozen leading columns.
 *
 * It only draws what it is given (FGMFixtureSheet fills it):
 *
 *   field.setSheet({
 *       subtitle: '2 selected',
 *       fixed: 2,                                   // frozen columns on the left
 *       columns: [{ label, width, group, groupColor }],
 *       rows: [{ id, selected, cells: [{ text, sub, color, bg }] }]   // sub = small second line
 *   });
 *
 * Tapping a row emits FIXTURE_SHEET_UPDATES.ROW_PRESS { rowId }.
 * Dragging scrolls in both directions, the wheel scrolls vertically.
 * `sheetOptions` is persisted with the window (which groups to show, value display).
 */
class HCWFixtureSheetField extends HCWBaseField {
    constructor(label = 'Fixture Sheet') {
        super(label);
        this.className = 'HCWFixtureSheetField';
        this._insertClassKeyword();

        this.sheetOptions = { groups: null, display: 'auto' };

        this.titleHeight = 24;
        this.groupStripHeight = 4;
        this.headerHeight = 22;
        this.rowHeight = 32;

        this.scrollX = 0;
        this.scrollY = 0;

        this._sheet = { subtitle: '', fixed: 0, columns: [], rows: [] };
        this._drag = null;

        this.renderProps = {
            startX: null, startY: null, endX: null, endY: null, sx: null, sy: null,
            colors: {
                background: '#0e0e0e',
                title: '#141414',
                header: '#1d1d1d',
                rowEven: '#121212',
                rowOdd: '#171717',
                rowSelected: '#123524',
                selectedBar: GS.PALETTE.ACCENT_GREEN,
                grid: '#2a2a2a',
                text: '#d8d8d8',
                textDim: '#6a6a6a',
                textSub: '#b0b0b0'
            }
        };
    }

    getType() {
        return GLOBAL_TYPES.CONTEXT_FIELDS.FIXTURE_SHEET;
    }

    getExcludedJSONKeys() {
        return [...super.getExcludedJSONKeys(), '_sheet', '_drag', 'titleHeight', 'groupStripHeight', 'headerHeight', 'rowHeight'];
    }

    getSheetOptions() {
        if (!this.sheetOptions) this.sheetOptions = { groups: null, display: 'auto' };
        return this.sheetOptions;
    }

    setSheetOptions(changes) {
        this.sheetOptions = { ...this.getSheetOptions(), ...changes };
        return this;
    }

    setSheet(sheet) {
        this._sheet = { subtitle: '', fixed: 0, columns: [], rows: [], ...sheet };
        this._clampScroll();
        this.updateFrame();
        return this;
    }

    // ── geometry ─────────────────────────────────────────────────────────

    _bodyTop(y) {
        return y + this.titleHeight + this.groupStripHeight + this.headerHeight;
    }

    _fixedWidth() {
        return this._sheet.columns.slice(0, this._sheet.fixed).reduce((n, c) => n + c.width, 0);
    }

    _scrollWidth() {
        return this._sheet.columns.slice(this._sheet.fixed).reduce((n, c) => n + c.width, 0);
    }

    _clampScroll() {
        const sx = this.renderProps.sx || 0;
        const sy = this.renderProps.sy || 0;
        const viewW = Math.max(0, sx - this._fixedWidth());
        const viewH = Math.max(0, sy - (this.titleHeight + this.groupStripHeight + this.headerHeight));
        const maxX = Math.max(0, this._scrollWidth() - viewW);
        const maxY = Math.max(0, this._sheet.rows.length * this.rowHeight - viewH);
        this.scrollX = Math.min(0, Math.max(-maxX, this.scrollX));
        this.scrollY = Math.min(0, Math.max(-maxY, this.scrollY));
    }

    // ── interaction ──────────────────────────────────────────────────────

    _interaction(interaction) {
        const { type, mouseX, mouseY } = interaction;

        if (type === 'mousedown') {
            this._drag = { x: mouseX, y: mouseY, lastX: mouseX, lastY: mouseY, moved: false };
        } else if (type === 'mousemove' && this._drag) {
            const dx = mouseX - this._drag.lastX;
            const dy = mouseY - this._drag.lastY;
            this._drag.lastX = mouseX;
            this._drag.lastY = mouseY;
            if (Math.abs(mouseX - this._drag.x) > 6 || Math.abs(mouseY - this._drag.y) > 6) this._drag.moved = true;
            if (this._drag.moved) {
                this.scrollX += dx;
                this.scrollY += dy;
                this._clampScroll();
                this.updateFrame();
            }
        } else if (type === 'mouseup') {
            const drag = this._drag;
            this._drag = null;
            if (!drag || drag.moved) return;

            const top = this._bodyTop(this.renderProps.startY);
            if (drag.y < top) return;
            const index = Math.floor((drag.y - top - this.scrollY) / this.rowHeight);
            const row = this._sheet.rows[index];
            if (row) this.emitAction(GLOBAL_TYPES.ACTIONS.FIXTURE_SHEET_UPDATES.ROW_PRESS, { rowId: row.id });
        } else if (type === 'scroll') {
            this.scrollY -= interaction.deltaY;
            this._clampScroll();
            this.updateFrame();
        }
    }

    // ── rendering ────────────────────────────────────────────────────────

    _fit(ctx, text, maxWidth) {
        text = String(text ?? '');
        if (maxWidth <= 4) return '';
        if (ctx.measureText(text).width <= maxWidth) return text;
        while (text.length > 1 && ctx.measureText(text + '…').width > maxWidth) text = text.slice(0, -1);
        return text + '…';
    }

    render(w) {
        const ctx = HCW.ctx;
        if (!ctx) return;
        const { x, y, sx, sy } = w;
        const c = this.renderProps.colors;
        const sheet = this._sheet;
        this.renderProps.sx = sx;
        this.renderProps.sy = sy;
        this._clampScroll();

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, sx, sy);
        ctx.clip();

        ctx.fillStyle = c.background;
        ctx.fillRect(x, y, sx, sy);

        // title
        ctx.fillStyle = c.title;
        ctx.fillRect(x, y, sx, this.titleHeight);
        ctx.fillStyle = GS.PALETTE.ACCENT_GREEN;
        ctx.fillRect(x, y + this.titleHeight - 2, sx, 2);
        ctx.font = GS.FONTS.TITLE;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillStyle = GS.PALETTE.TEXT_PRIMARY;
        const title = this._fit(ctx, this.getLabel(), sx * 0.6);
        ctx.fillText(title, x + 8, y + this.titleHeight / 2);
        if (sheet.subtitle) {
            ctx.font = GS.FONTS.SMALL;
            ctx.fillStyle = GS.PALETTE.TEXT_SECONDARY;
            ctx.textAlign = 'right';
            ctx.fillText(this._fit(ctx, sheet.subtitle, sx * 0.4 - 16), x + sx - 8, y + this.titleHeight / 2);
        }

        const fixedW = this._fixedWidth();
        const headY = y + this.titleHeight;
        const bodyTop = this._bodyTop(y);

        // column x positions (scrolled part offset by scrollX)
        const colX = [];
        let acc = 0;
        sheet.columns.forEach((col, i) => {
            if (i === sheet.fixed) acc = fixedW + this.scrollX;
            colX.push(x + acc);
            acc += col.width;
        });

        const drawColumns = (fromIdx, toIdx, clipX, clipW, drawRowCells) => {
            ctx.save();
            ctx.beginPath();
            ctx.rect(clipX, y + this.titleHeight, clipW, sy - this.titleHeight);
            ctx.clip();
            for (let i = fromIdx; i < toIdx; i++) {
                const col = sheet.columns[i];
                const cx = colX[i];
                if (cx > x + sx || cx + col.width < clipX) continue;

                // feature group strip + header
                ctx.fillStyle = col.groupColor || c.header;
                ctx.fillRect(cx, headY, col.width, this.groupStripHeight);
                ctx.fillStyle = c.header;
                ctx.fillRect(cx, headY + this.groupStripHeight, col.width, this.headerHeight);
                ctx.font = GS.FONTS.SMALL_BOLD;
                ctx.textAlign = 'center';
                ctx.fillStyle = GS.PALETTE.TEXT_PRIMARY;
                ctx.fillText(this._fit(ctx, col.label, col.width - 6), cx + col.width / 2, headY + this.groupStripHeight + this.headerHeight / 2);

                drawRowCells(i, cx, col);

                ctx.strokeStyle = c.grid;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(cx + col.width - 0.5, headY);
                ctx.lineTo(cx + col.width - 0.5, y + sy);
                ctx.stroke();
            }
            ctx.restore();
        };

        // row backgrounds (full width)
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, bodyTop, sx, sy - (bodyTop - y));
        ctx.clip();
        sheet.rows.forEach((row, r) => {
            const ry = bodyTop + this.scrollY + r * this.rowHeight;
            if (ry + this.rowHeight < bodyTop || ry > y + sy) return;
            ctx.fillStyle = row.selected ? c.rowSelected : (r % 2 ? c.rowOdd : c.rowEven);
            ctx.fillRect(x, ry, sx, this.rowHeight);
        });
        ctx.restore();

        const cellPainter = (i, cx, col) => {
            ctx.save();
            ctx.beginPath();
            ctx.rect(cx, bodyTop, col.width, sy - (bodyTop - y));
            ctx.clip();
            ctx.font = i < sheet.fixed ? GS.FONTS.LABEL : GS.FONTS.MONO_READOUT;
            ctx.textAlign = i < sheet.fixed && i > 0 ? 'left' : 'center';
            sheet.rows.forEach((row, r) => {
                const ry = bodyTop + this.scrollY + r * this.rowHeight;
                if (ry + this.rowHeight < bodyTop || ry > y + sy) return;
                const cell = row.cells[i];
                if (!cell) return;
                if (cell.bg) {
                    ctx.fillStyle = cell.bg;
                    ctx.fillRect(cx + 1, ry + 1, col.width - 2, this.rowHeight - 2);
                }
                if (cell.text === undefined || cell.text === null || cell.text === '') return;
                ctx.fillStyle = cell.color || c.text;
                const tx = ctx.textAlign === 'left' ? cx + 6 : cx + col.width / 2;
                if (cell.sub) {
                    ctx.fillText(this._fit(ctx, cell.text, col.width - 8), tx, ry + this.rowHeight * 0.34 + 1);
                    ctx.font = GS.FONTS.SMALL;
                    ctx.fillStyle = c.textSub || '#b0b0b0';
                    ctx.fillText(this._fit(ctx, cell.sub, col.width - 6), tx, ry + this.rowHeight * 0.72);
                    ctx.font = i < sheet.fixed ? GS.FONTS.LABEL : GS.FONTS.MONO_READOUT;
                } else {
                    ctx.fillText(this._fit(ctx, cell.text, col.width - 8), tx, ry + this.rowHeight / 2 + 1);
                }
            });
            ctx.restore();
        };

        // scrolled columns first, frozen columns on top
        drawColumns(sheet.fixed, sheet.columns.length, x + fixedW, sx - fixedW, cellPainter);
        drawColumns(0, sheet.fixed, x, fixedW, cellPainter);

        // selected bar + horizontal grid lines
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, bodyTop, sx, sy - (bodyTop - y));
        ctx.clip();
        sheet.rows.forEach((row, r) => {
            const ry = bodyTop + this.scrollY + r * this.rowHeight;
            if (ry + this.rowHeight < bodyTop || ry > y + sy) return;
            if (row.selected) {
                ctx.fillStyle = c.selectedBar;
                ctx.fillRect(x, ry, 3, this.rowHeight);
            }
            ctx.strokeStyle = c.grid;
            ctx.beginPath();
            ctx.moveTo(x, ry + this.rowHeight - 0.5);
            ctx.lineTo(x + sx, ry + this.rowHeight - 0.5);
            ctx.stroke();
        });
        ctx.restore();

        // frozen edge
        if (fixedW > 0) {
            ctx.fillStyle = '#3a3a3a';
            ctx.fillRect(x + fixedW - 1, headY, 2, sy - this.titleHeight);
        }

        if (!sheet.rows.length) {
            ctx.font = GS.FONTS.SMALL;
            ctx.textAlign = 'center';
            ctx.fillStyle = c.textDim;
            ctx.fillText('No fixtures patched — Menu → Patch', x + sx / 2, bodyTop + 30);
        }

        ctx.restore();
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
    }
}

globalThis.HCWFixtureSheetField = HCWFixtureSheetField;
