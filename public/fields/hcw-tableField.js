class HCWTableField extends HCWBaseField {
    constructor(label = 'Settings') {
        super(label);
        this.className = 'HCWTableField';
        this._insertClassKeyword();

        this.headers = [];
        this.rows = [];
        this.renderMode = 'table'; // 'table' or 'list'

        this.addRowLabel = null;
        this.showRemoveButton = false;

        this.rowHeight = 35;
        this.headerHeight = 40;
        this.addBtnHeight = 40;

        this.scrollY = 0;
        this._dragLastY = null;
        this._clickStartY = null;
        this._clickStartX = null;
        this._potentialClick = false;

        this.renderProps = {
            startX: null,
            startY: null,
            endX: null,
            endY: null,
            sx: null,
            sy: null,
            cells: [],
            deleteButtons: [],
            addButton: null
        };
    }

    getType() {
        return GLOBAL_TYPES.CONTEXT_FIELDS.TABLE;
    }

    setHeaders(headers) {
        this.headers = headers;
        this.updateFrame();
        return this;
    }

    setRows(rows) {
        this.rows = rows;
        this.updateFrame();
        return this;
    }

    setButtonAddRowLabel(label) {
        this.addRowLabel = label;
        return this;
    }

    setButtonRemoveRow(addButton = true) {
        this.showRemoveButton = addButton;
        return this;
    }

    setRenderMode(mode) {
        this.renderMode = mode;
        this.updateFrame();
        return this;
    }

    _interaction(interaction) {
        const { mouseX, mouseY, type, deltaY } = interaction;

        if (type === 'mousedown') {
            this._clickStartX = mouseX;
            this._clickStartY = mouseY;
            this._dragLastY = mouseY;
            this._potentialClick = true;

        } else if (type === 'mousemove') {
            if (this._dragLastY !== null) {
                const dy = mouseY - this._dragLastY;

                if (Math.abs(mouseY - this._clickStartY) > 10) {
                    this._potentialClick = false;
                }

                this.scrollY += dy;
                this._clampScroll();
                this.updateFrame();
                this._dragLastY = mouseY;
            }

        } else if (type === 'mouseup') {
            if (this._potentialClick) {
                const clickX = this._clickStartX;
                const clickY = this._clickStartY;

                const hitCell = this.renderProps.cells.find(c =>
                    clickX >= c.x && clickX <= c.x + c.w &&
                    clickY >= c.y && clickY <= c.y + c.h
                );

                const hitDelete = this.renderProps.deleteButtons.find(b =>
                    clickX >= b.x && clickX <= b.x + b.w &&
                    clickY >= b.y && clickY <= b.y + b.h
                );

                if (hitCell && !hitDelete) {
                    this.emitAction(GLOBAL_TYPES.ACTIONS.TABLE_UPDATES.CELL_PRESS, {
                        rowIndex: hitCell.rowIndex,
                        colIndex: hitCell.colIndex,
                        value: hitCell.value
                    });
                    return;
                }

                if (hitDelete) {
                    this.emitAction(GLOBAL_TYPES.ACTIONS.TABLE_UPDATES.CELL_DELETE, {
                        rowIndex: hitDelete.rowIndex,
                    });
                    return;
                }

                const hitAdd = this.renderProps.addButton;
                if (hitAdd && clickX >= hitAdd.x && clickX <= hitAdd.x + hitAdd.w &&
                    clickY >= hitAdd.y && clickY <= hitAdd.y + hitAdd.h) {
                    this.emitAction(GLOBAL_TYPES.ACTIONS.TABLE_UPDATES.CELL_ADD);
                }
            }

            this._dragLastY = null;
            this._potentialClick = false;

        } else if (type === 'scroll') {
            this.scrollY -= deltaY;
            this._clampScroll();
            this.updateFrame();
        }
    }

    _clampScroll() {
        const rowH = this._getEffectiveRowHeight();
        const rowsHeight = this.rows.length * rowH;

        const addBtnTotalH = (this.addRowLabel != null) ? (this.addBtnHeight + 20) : 10;
        const contentHeight = rowsHeight + addBtnTotalH;

        const hH = this.renderMode === 'table' ? this.headerHeight : 0;
        const viewHeight = this.renderProps.sy - hH;

        if (contentHeight <= viewHeight) {
            this.scrollY = 0;
        } else {
            const minScroll = -(contentHeight - viewHeight);
            this.scrollY = Math.min(0, Math.max(minScroll, this.scrollY));
        }
    }

    _getEffectiveRowHeight() {
        if (this.renderMode === 'list') {
            return (this.headers.length) * 20 + 20;
        }
        return this.rowHeight;
    }

    updateCellValue(rowIndex, colIndex, newValue) {
        if (this.rows[rowIndex] && this.rows[rowIndex][colIndex] !== undefined) {
            this.rows[rowIndex][colIndex] = newValue;
            this.updateFrame();
        }
    }

    render(w) {
        this.renderProps.startX = w.x;
        this.renderProps.startY = w.y;
        this.renderProps.endX = w.x2;
        this.renderProps.endY = w.y2;
        this.renderProps.sx = w.sx;
        this.renderProps.sy = w.sy;

        this.renderProps.cells = [];
        this.renderProps.deleteButtons = [];
        this.renderProps.addButton = null;

        const ctx = HCW.ctx;
        if (!ctx) return;

        if (this.renderMode === 'list') {
            this._renderList(w, ctx);
        } else {
            this._renderTable(w, ctx);
        }

        ctx.restore();
        ctx.textAlign = 'start';
    }

    _renderTable(w, ctx) {
        const pad = 10;
        const deleteColW = 40;
        const availableW = w.sx - pad * 2 - deleteColW;
        const colW = availableW / (this.headers.length || 1);

        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(w.x, w.y, w.sx, w.sy);

        ctx.fillStyle = '#333';
        ctx.fillRect(w.x, w.y, w.sx, this.headerHeight);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';

        this.headers.forEach((header, i) => {
            const x = w.x + pad + i * colW;
            ctx.fillText(header, x + colW / 2, w.y + this.headerHeight / 2 + 5);
        });

        ctx.save();
        const contentAreaY = w.y + this.headerHeight;
        const contentAreaH = w.sy - this.headerHeight;

        ctx.beginPath();
        ctx.rect(w.x, contentAreaY, w.sx, contentAreaH);
        ctx.clip();

        const startDrawY = contentAreaY + this.scrollY;

        ctx.font = '13px Arial';
        this.rows.forEach((row, rowIndex) => {
            const rowY = startDrawY + rowIndex * this.rowHeight;
            if (rowY + this.rowHeight < contentAreaY || rowY > w.y + w.sy) return;

            ctx.fillStyle = rowIndex % 2 === 0 ? '#252525' : '#1e1e1e';
            ctx.fillRect(w.x, rowY, w.sx, this.rowHeight);

            row.forEach((cell, colIndex) => {
                const cellX = w.x + pad + colIndex * colW;
                ctx.fillStyle = '#bbb';
                ctx.fillText(cell, cellX + colW / 2, rowY + this.rowHeight / 2 + 5);

                this.renderProps.cells.push({
                    x: cellX, y: rowY, w: colW, h: this.rowHeight, rowIndex, colIndex, value: cell
                });
            });

            if (this.showRemoveButton) {
                const b = this._getDeleteButtonProps(w, rowY, pad, deleteColW);
                ctx.fillStyle = '#770000';
                ctx.fillRect(b.x, b.y, b.w, b.h);
                ctx.fillStyle = '#fff';
                ctx.fillText('X', b.x + b.w / 2, b.y + b.h / 2 + 5);
                this.renderProps.deleteButtons.push({ ...b, rowIndex });
            }

            ctx.strokeStyle = '#333';
            ctx.beginPath();
            ctx.moveTo(w.x, rowY + this.rowHeight);
            ctx.lineTo(w.x2, rowY + this.rowHeight);
            ctx.stroke();
        });

        ctx.strokeStyle = '#333';
        for (let i = 1; i < this.headers.length; i++) {
            const x = w.x + pad + i * colW;
            ctx.beginPath();
            ctx.moveTo(x, w.y + this.headerHeight);
            ctx.lineTo(x, w.y2);
            ctx.stroke();
        }

        if (this.addRowLabel != null) {
            this._drawAddButton(w, ctx, contentAreaY, startDrawY);
        }

        ctx.restore();
    }

    _renderList(w, ctx) {
        const pad = 10;
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(w.x, w.y, w.sx, w.sy);

        ctx.save();
        ctx.beginPath();
        ctx.rect(w.x, w.y, w.sx, w.sy);
        ctx.clip();

        const startDrawY = w.y + this.scrollY;
        const rowH = this._getEffectiveRowHeight();

        this.rows.forEach((row, rowIndex) => {
            const rowY = startDrawY + rowIndex * rowH;
            if (rowY + rowH < w.y || rowY > w.y + w.sy) return;

            ctx.fillStyle = rowIndex % 2 === 0 ? '#252525' : '#1e1e1e';
            ctx.fillRect(w.x, rowY, w.sx, rowH);

            ctx.textAlign = 'left';
            row.forEach((cell, colIndex) => {
                const header = this.headers[colIndex] || "";
                const lineY = rowY + colIndex * 20 + 20;

                if (colIndex === 0) {
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 13px Arial';
                    ctx.fillText(cell, w.x + pad, lineY);
                } else {
                    ctx.fillStyle = '#888';
                    ctx.font = '12px Monospace';
                    ctx.fillText(`${header}:`, w.x + pad, lineY);
                    ctx.fillStyle = '#bbb';
                    ctx.fillText(cell, w.x + pad + 100, lineY);
                }

                this.renderProps.cells.push({
                    x: w.x, y: lineY - 15, w: w.sx, h: 20, rowIndex, colIndex, value: cell
                });
            });

            ctx.strokeStyle = '#444';
            ctx.beginPath();
            ctx.moveTo(w.x, rowY + rowH);
            ctx.lineTo(w.x2, rowY + rowH);
            ctx.stroke();
        });

        if (this.addRowLabel != null) {
            this._drawAddButton(w, ctx, w.y, startDrawY);
        }
        ctx.restore();
    }

    _getDeleteButtonProps(w, rowY, pad, deleteColW) {
        return {
            x: w.x2 - pad - deleteColW + 5,
            y: rowY + 5,
            w: deleteColW - 10,
            h: this.rowHeight - 10
        };
    }

    _drawAddButton(w, ctx, contentAreaY, startDrawY) {
        const rowH = this._getEffectiveRowHeight();
        const addBtnY = startDrawY + (this.rows.length * rowH) + 10;
        const x = w.x + 10;
        const w_btn = w.sx - 20;

        this.renderProps.addButton = { x, y: addBtnY, w: w_btn, h: this.addBtnHeight };

        if (addBtnY < w.y + w.sy && addBtnY + this.addBtnHeight > contentAreaY) {
            ctx.fillStyle = '#1e1e1e';
            ctx.fillRect(x, addBtnY, w_btn, this.addBtnHeight);

            ctx.fillStyle = '#006600';
            ctx.fillRect(x, addBtnY, w_btn, this.addBtnHeight);

            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.font = 'bold 13px Arial';
            ctx.fillText(this.addRowLabel, x + w_btn / 2, addBtnY + this.addBtnHeight / 2 + 5);
        }
    }
}