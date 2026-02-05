class HCWKeyboardField extends HCWBaseField {
    constructor(label = 'Keyboard') {
        super(label);
        this.className = 'HCWKeyboardField';
        this._insertClassKeyword();

        this.type = 'keyboard';

        this.value = "";
        this.cursorPos = 0;
        this.isUpperCase = true;

        this.headerHeight = 30;
        this.displayHeight = 40;
        this.gap = 4;

        this.keys = [
            ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'ß'],
            ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O', 'P', 'Ü'],
            ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ö', 'Ä'],
            ['SHIFT', 'Y', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '-'],
            ['DELETE', '<=', 'SPACE', '<', '>', 'ENTER']
        ];

        this.physicalShiftDown = false;

        this.renderProps = {
            colors: {
                background: '#1b1717ff',
                headerText: '#ffffff',
                displayBg: '#000000',
                displayText: '#00ff95',
                cursorColor: '#00ff95',
                keyDefault: '#333333',
                keyActive: '#555555',
                keyText: '#ffffff',
                specialKey: '#005500',
                specialKeyActive: '#007700',
                deleteKey: '#770000',
                deleteKeyActive: '#990000',
                shiftKey: '#444444',
                shiftKeyActive: '#888888'
            },
            startX: null,
            startY: null,
            endX: null,
            endY: null,
            buttons: [],
            displayArea: null
        };

        this._pressedKey = null;
        this._dragLastY = null;
    }

    getType() {
        return GLOBAL_TYPES.CONTEXT_FIELDS.KEYBOARD;
    }

    setValue(val) {
        this.value = String(val);
        this.cursorPos = this.value.length;
        this.updateFrame();
        return this;
    }

    _handleInput(key) {
        const KBD_ACTIONS = GLOBAL_TYPES.ACTIONS.KEYBOARD_UPDATES;
        let actionTriggered = KBD_ACTIONS.KEY_PRESSED;

        if (key === 'ENTER' || key === 'Enter') {
            actionTriggered = KBD_ACTIONS.ENTER_PRESSED;
        } else if (key === '<=' || key === 'Backspace') {
            actionTriggered = KBD_ACTIONS.BACKSPACE_PRESSED;
            if (this.cursorPos > 0) {
                this.value = this.value.slice(0, this.cursorPos - 1) + this.value.slice(this.cursorPos);
                this.cursorPos--;
            }
        } else if (key === 'DELETE') {
            actionTriggered = KBD_ACTIONS.DELETE_ALL_PRESSED;
            this.value = "";
            this.cursorPos = 0;
        } else if (key === 'Delete' || key === 'entf') {
            if (this.cursorPos < this.value.length) {
                this.value = this.value.slice(0, this.cursorPos) + this.value.slice(this.cursorPos + 1);
            }
        } else if (key === 'SPACE' || key === ' ') {
            actionTriggered = KBD_ACTIONS.SPACE_PRESSED;
            this.value = this.value.slice(0, this.cursorPos) + " " + this.value.slice(this.cursorPos);
            this.cursorPos++;
        } else if (key === 'SHIFT' || key === 'Shift') {
            this.isUpperCase = !this.isUpperCase;
        } else if (key === 'ArrowLeft' || key === '<') {
            actionTriggered = KBD_ACTIONS.ARROW_LEFT_PRESSED;
            this.cursorPos = Math.max(0, this.cursorPos - 1);
        } else if (key === 'ArrowRight' || key === '>') {
            actionTriggered = KBD_ACTIONS.ARROW_RIGHT_PRESSED;
            this.cursorPos = Math.min(this.value.length, this.cursorPos + 1);
        } else if (key.length === 1) {
            let char = key;
            const useCaps = this.isUpperCase || this.physicalShiftDown;
            if (useCaps) {
                char = char.toUpperCase();
            } else {
                char = char.toLowerCase();
            }
            this.value = this.value.slice(0, this.cursorPos) + char + this.value.slice(this.cursorPos);
            this.cursorPos++;
        }

        this.emitAction(actionTriggered, {
            key: key,
            value: this.value,
            cursorPos: this.cursorPos,
            length: this.value.length
        });
    }

    _interaction(interaction) {
        if (interaction.type === 'mousedown') {
            const { mouseX, mouseY } = interaction;
            this._potentialClick = true;
            this._clickStartY = mouseY;

            const da = this.renderProps.displayArea;
            if (da && mouseX >= da.x && mouseX <= da.x + da.w && mouseY >= da.y && mouseY <= da.y + da.h) {
                this._setCursorByClick(mouseX);
                this.updateFrame();
                return;
            }

            const hit = this._findHitButton(mouseX, mouseY);
            if (hit) {
                this._pressedKey = hit.key;
                this.updateFrame();
            }

        } else if (interaction.type === 'mousemove') {
            const { mouseX, mouseY } = interaction;
            if (this._potentialClick && Math.abs(mouseY - this._clickStartY) > 5) {
                this._potentialClick = false;
                this._pressedKey = null;
                this.updateFrame();
            }

        } else if (interaction.type === 'mouseup') {

            if (this._potentialClick && this._pressedKey) {
                this._handleInput(this._pressedKey);
            }

            this._potentialClick = false;
            this._pressedKey = null;
            this.updateFrame();
        } else if (interaction.type === 'keydown') {
            if (interaction.key === 'Shift') this.physicalShiftDown = true;
            this._handleInput(interaction.key);
        } else if (interaction.type === 'keyup') {
            if (interaction.key === 'Shift') this.physicalShiftDown = false;
        }
    }

    _setCursorByClick(mouseX) {
        const da = this.renderProps.displayArea;
        if (!da) return;

        HCW.ctx.font = "20px Monospace";
        const metrics = HCW.ctx.measureText(this.value);
        let textStartX;

        if (metrics.width > da.w - 10) {
            textStartX = (da.x + da.w - 10) - metrics.width;
        } else {
            textStartX = da.x + 10;
        }

        let newCursorPos = this.value.length;

        for (let i = 0; i < this.value.length; i++) {
            const prefix = this.value.slice(0, i + 1);
            const charRightEdge = textStartX + HCW.ctx.measureText(prefix).width;

            if (mouseX <= charRightEdge) {
                newCursorPos = i + 1;
                break;
            }
        }

        if (mouseX < textStartX) {
            newCursorPos = 0;
        }

        this.cursorPos = newCursorPos;
    }

    _findHitButton(x, y) {
        return this.renderProps.buttons.find(b =>
            x >= b.x && x <= b.x + b.w &&
            y >= b.y && y <= b.y + b.h
        );
    }

    render(contextwindow) {
        this.renderProps.startX = contextwindow.x;
        this.renderProps.startY = contextwindow.y;
        this.renderProps.endX = contextwindow.x2;
        this.renderProps.endY = contextwindow.y2;

        const { x, y, sx, sy } = contextwindow;

        HCW.ctx.fillStyle = this.renderProps.colors.background;
        HCW.ctx.fillRect(x, y, sx, sy);

        HCW.ctx.fillStyle = this.renderProps.colors.headerText;
        HCW.ctx.font = "bold 14px Arial";
        HCW.ctx.textAlign = "center";
        HCW.ctx.fillText(this.getLabel(), x + (sx / 2), y + 20);
        HCW.ctx.textAlign = "start";

        const displayY = y + this.headerHeight;
        HCW.ctx.fillStyle = this.renderProps.colors.displayBg;
        const daX = x + 5;
        const daW = sx - 10;
        const daH = this.displayHeight;
        HCW.ctx.fillRect(daX, displayY, daW, daH);
        this.renderProps.displayArea = { x: daX, y: displayY, w: daW, h: daH };

        HCW.ctx.fillStyle = this.renderProps.colors.displayText;
        HCW.ctx.font = "20px Monospace";
        HCW.ctx.textAlign = "left";

        let textToDraw = this.value;
        const metrics = HCW.ctx.measureText(textToDraw);
        const textY = displayY + 28;
        let cursorX;

        if (metrics.width > sx - 20) {
            HCW.ctx.textAlign = "right";
            const textX = x + sx - 10;
            HCW.ctx.fillText(textToDraw, textX, textY);

            const prefixWidth = HCW.ctx.measureText(this.value.slice(0, this.cursorPos)).width;
            cursorX = (textX - metrics.width) + prefixWidth;
        } else {
            HCW.ctx.textAlign = "left";
            const textX = x + 10;
            HCW.ctx.fillText(textToDraw, textX, textY);

            const prefixWidth = HCW.ctx.measureText(this.value.slice(0, this.cursorPos)).width;
            cursorX = textX + prefixWidth;
        }

        // Draw Cursor
        HCW.ctx.beginPath();
        HCW.ctx.moveTo(cursorX, textY - 18);
        HCW.ctx.lineTo(cursorX, textY + 4);
        HCW.ctx.strokeStyle = this.renderProps.colors.cursorColor;
        HCW.ctx.lineWidth = 2;
        HCW.ctx.stroke();

        HCW.ctx.textAlign = "start";

        const gridY = displayY + this.displayHeight + 10;
        const gridH = sy - (gridY - y) - 5;
        const gridW = sx - 10;
        const gridX = x + 5;

        const rows = this.keys.length;
        const rowH = (gridH - ((rows - 1) * this.gap)) / rows;

        this.renderProps.buttons = [];

        this.keys.forEach((rowKeys, rowIndex) => {
            const rowY = gridY + (rowIndex * (rowH + this.gap));

            let totalKeyWeight = 0;
            if (rowIndex === 4) {
                rowKeys.forEach(k => {
                    if (k === 'SPACE') totalKeyWeight += 3;
                    else if (k === 'DELETE' || k === 'ENTER') totalKeyWeight += 1.5;
                    else if (k === '<' || k === '>') totalKeyWeight += 0.7;
                    else totalKeyWeight += 1;
                });
            } else if (rowIndex === 3) {
                rowKeys.forEach(k => {
                    if (k === 'SHIFT') totalKeyWeight += 1.5;
                    else totalKeyWeight += 1;
                });
            } else {
                totalKeyWeight = rowKeys.length;
            }

            const unitW = (gridW - ((rowKeys.length - 1) * this.gap)) / totalKeyWeight;

            let currentX = gridX;

            rowKeys.forEach((keyRaw, colIndex) => {
                let colW = unitW;
                if (rowIndex === 4) {
                    if (keyRaw === 'SPACE') colW = unitW * 3;
                    else if (keyRaw === 'DELETE' || keyRaw === 'ENTER') colW = unitW * 1.5;
                    else if (keyRaw === '<' || keyRaw === '>') colW = unitW * 0.7;
                } else if (rowIndex === 3) {
                    if (keyRaw === 'SHIFT') colW = unitW * 1.5;
                }

                let displayLabel = keyRaw;
                if (!this.isUpperCase && keyRaw.length === 1) {
                    displayLabel = keyRaw.toLowerCase();
                }

                let bg = this.renderProps.colors.keyDefault;
                if (keyRaw === 'ENTER') bg = this.renderProps.colors.specialKey;
                else if (keyRaw === 'DELETE' || keyRaw === '<=') bg = this.renderProps.colors.deleteKey;
                else if (keyRaw === 'SHIFT') bg = this.isUpperCase ? this.renderProps.colors.shiftKeyActive : this.renderProps.colors.shiftKey;

                if (this._pressedKey === keyRaw) {
                    if (keyRaw === 'ENTER') bg = this.renderProps.colors.specialKeyActive;
                    else if (keyRaw === 'DELETE' || keyRaw === '<=') bg = this.renderProps.colors.deleteKeyActive;
                    else if (keyRaw === 'SHIFT') { bg = '#aaaaaa'; }
                    else bg = this.renderProps.colors.keyActive;
                }

                HCW.ctx.fillStyle = bg;
                HCW.ctx.fillRect(currentX, rowY, colW, rowH);

                HCW.ctx.fillStyle = this.renderProps.colors.keyText;
                HCW.ctx.font = (displayLabel.length > 1) ? "bold 11px Arial" : "14px Arial";
                HCW.ctx.textAlign = "center";
                HCW.ctx.fillText(displayLabel, currentX + (colW / 2), rowY + (rowH / 2) + 5);
                HCW.ctx.textAlign = "start";

                this.renderProps.buttons.push({
                    key: keyRaw,
                    x: currentX,
                    y: rowY,
                    w: colW,
                    h: rowH
                });

                currentX += colW + this.gap;
            });
        });
    }
}