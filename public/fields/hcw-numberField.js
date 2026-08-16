class HCWNumberField extends HCWBaseField {
    constructor(label = 'Numpad') {
        super(label);
        this.className = 'HCWNumberField';
        this._insertClassKeyword();

        this.type = 'numpad';

        this.value = "";
        this.cursorPos = 0;

        this.headerHeight = 30;
        this.displayHeight = 40;
        this.gap = 4;

        this.keys = [
            ['7', '8', '9'],
            ['4', '5', '6'],
            ['1', '2', '3'],
            ['.', '0', ','],
            ['<=', 'C', 'ENTER'],
            ['<', '>']
        ];

        this.physicalShiftDown = false;

        this.renderProps = {
            colors: {
                background: GS.FIELDS.NUMBER_KEYPAD.BACKGROUND,
                headerText: GS.FIELDS.NUMBER_KEYPAD.HEADER_TEXT,
                displayBg: GS.FIELDS.NUMBER_KEYPAD.DISPLAY_BG,
                displayText: GS.FIELDS.NUMBER_KEYPAD.DISPLAY_TEXT,
                cursorColor: GS.FIELDS.NUMBER_KEYPAD.CURSOR_COLOR,
                keyDefault: GS.FIELDS.NUMBER_KEYPAD.KEY_DEFAULT,
                keyActive: GS.FIELDS.NUMBER_KEYPAD.KEY_ACTIVE,
                keyText: GS.FIELDS.NUMBER_KEYPAD.KEY_TEXT,
                enterKey: GS.FIELDS.NUMBER_KEYPAD.ENTER_KEY,
                enterKeyActive: GS.FIELDS.NUMBER_KEYPAD.ENTER_KEY_ACTIVE
            },
            startX: null,
            startY: null,
            endX: null,
            endY: null,
            buttons: [],
            displayArea: null
        };

        this._pressedKey = null;
    }

    getType() {
        return GLOBAL_TYPES.CONTEXT_FIELDS.NUMBER_KEYPAD;
    }

    setValue(val) {
        this.value = String(val);
        this.cursorPos = this.value.length;
        this.updateFrame();
        return this;
    }

    _handleInput(key) {
        const NUM_ACTIONS = GLOBAL_TYPES.ACTIONS.NUMPAD_UPDATES;
        let actionTriggered = NUM_ACTIONS.KEY_PRESSED;

        if (key === 'ENTER' || key === 'Enter') {
            actionTriggered = NUM_ACTIONS.ENTER_PRESSED;
        } else if (key === 'C') {
            actionTriggered = NUM_ACTIONS.CLEAR_PRESSED;
            this.value = "";
            this.cursorPos = 0;
        } else if (key === '<=' || key === 'Backspace') {
            actionTriggered = NUM_ACTIONS.BACKSPACE_PRESSED;
            if (this.cursorPos > 0) {
                this.value = this.value.slice(0, this.cursorPos - 1) + this.value.slice(this.cursorPos);
                this.cursorPos--;
            }
        } else if (key === 'ArrowLeft' || key === '<') {
            actionTriggered = NUM_ACTIONS.ARROW_LEFT_PRESSED;
            this.cursorPos = Math.max(0, this.cursorPos - 1);
        } else if (key === 'ArrowRight' || key === '>') {
            actionTriggered = NUM_ACTIONS.ARROW_RIGHT_PRESSED;
            this.cursorPos = Math.min(this.value.length, this.cursorPos + 1);
        } else {
            const char = (key === ',') ? '.' : key;
            if (/^[0-9.]$/.test(char) || (key.length === 1 && !isNaN(key))) {
                this.value = this.value.slice(0, this.cursorPos) + char + this.value.slice(this.cursorPos);
                this.cursorPos++;
            }
        }

        this.emitAction(actionTriggered, {
            key: key,
            value: this.value,
            cursorPos: this.cursorPos
        });

        this.updateFrame();
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

        } else if (interaction.type === 'mouseup') {
            if (this._potentialClick && this._pressedKey) {
                this._handleInput(this._pressedKey);
            }
            this._potentialClick = false;
            this._pressedKey = null;
            this.updateFrame();
        } else if (interaction.type === 'keydown') {
            this._handleInput(interaction.key);
        }
    }

    _setCursorByClick(mouseX) {
        const da = this.renderProps.displayArea;
        if (!da) return;

        HCW.ctx.font = GS.FONTS.MONO_DISPLAY;
        const metrics = HCW.ctx.measureText(this.value);
        const textX = da.x + da.w - 15;
        const textStartX = textX - metrics.width;

        let newCursorPos = this.value.length;
        for (let i = 0; i < this.value.length; i++) {
            const prefix = this.value.slice(0, i + 1);
            const charRightEdge = textStartX + HCW.ctx.measureText(prefix).width;
            if (mouseX <= charRightEdge) {
                newCursorPos = i + 1;
                break;
            }
        }

        if (mouseX < textStartX) newCursorPos = 0;
        this.cursorPos = newCursorPos;
    }

    _findHitButton(x, y) {
        return this.renderProps.buttons.find(b =>
            x >= b.x && x <= b.x + b.w &&
            y >= b.y && y <= b.y + b.h
        );
    }

    render(contextwindow) {
        const ctx = HCW.ctx;
        if (!ctx) return;

        const { x, y, sx, sy } = contextwindow;

        // 1. Background
        ctx.fillStyle = this.renderProps.colors.background;
        ctx.fillRect(x, y, sx, sy);

        // 2. Header Bar
        ctx.fillStyle = '#141414';
        ctx.fillRect(x, y, sx, this.headerHeight);

        ctx.fillStyle = GS.PALETTE.ACCENT_GREEN;
        ctx.fillRect(x, y + this.headerHeight - 2, sx, 2);

        ctx.fillStyle = this.renderProps.colors.headerText;
        ctx.font = GS.FONTS.HEADER;
        ctx.textAlign = "center";
        ctx.fillText(this.getLabel(), x + (sx / 2), y + 18);
        ctx.textAlign = "start";

        // 3. Display Area Box
        const displayY = y + this.headerHeight + 4;
        const daX = x + 6;
        const daW = sx - 12;
        const daH = this.displayHeight;

        ctx.fillStyle = this.renderProps.colors.displayBg;
        ctx.fillRect(daX, displayY, daW, daH);
        ctx.strokeStyle = '#282828';
        ctx.lineWidth = 1;
        ctx.strokeRect(daX, displayY, daW, daH);

        this.renderProps.displayArea = { x: daX, y: displayY, w: daW, h: daH };

        ctx.fillStyle = this.renderProps.colors.displayText;
        ctx.font = GS.FONTS.MONO_DISPLAY;
        ctx.textAlign = "right";

        const textX = x + sx - 15;
        const textY = displayY + 28;
        ctx.fillText(this.value, textX, textY);

        const fullTextWidth = ctx.measureText(this.value).width;
        const prefixWidth = ctx.measureText(this.value.slice(0, this.cursorPos)).width;
        const cursorX = (textX - fullTextWidth) + prefixWidth;

        // Draw Cursor
        ctx.beginPath();
        ctx.moveTo(cursorX, textY - 18);
        ctx.lineTo(cursorX, textY + 4);
        ctx.strokeStyle = this.renderProps.colors.cursorColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.textAlign = "start";

        // 4. Key Grid
        const gridY = displayY + this.displayHeight + 8;
        const gridH = sy - (gridY - y) - 6;
        const gridW = sx - 12;
        const gridX = x + 6;

        const rows = this.keys.length;
        const rowH = (gridH - ((rows - 1) * this.gap)) / rows;
        this.renderProps.buttons = [];

        this.keys.forEach((rowKeys, rowIndex) => {
            const rowY = gridY + (rowIndex * (rowH + this.gap));
            const cols = rowKeys.length;
            const colW = (gridW - ((cols - 1) * this.gap)) / cols;

            rowKeys.forEach((key, colIndex) => {
                const btnX = gridX + (colIndex * (colW + this.gap));
                let bg = (key === 'ENTER') ? this.renderProps.colors.enterKey : this.renderProps.colors.keyDefault;
                let borderColor = '#383838';

                if (key === 'ENTER' || key === 'Please') {
                    bg = this.renderProps.colors.enterKey;
                    borderColor = GS.PALETTE.ACCENT_GREEN;
                } else if (key === 'CLR' || key === '<=') {
                    bg = GS.PALETTE.KEY_DELETE;
                    borderColor = '#880000';
                }

                if (this._pressedKey === key) {
                    bg = (key === 'ENTER') ? this.renderProps.colors.enterKeyActive : this.renderProps.colors.keyActive;
                }

                ctx.fillStyle = bg;
                ctx.fillRect(btnX, rowY, colW, rowH);

                ctx.strokeStyle = borderColor;
                ctx.lineWidth = 1;
                ctx.strokeRect(btnX + 0.5, rowY + 0.5, colW - 1, rowH - 1);

                ctx.fillStyle = (key === 'ENTER') ? GS.PALETTE.ACCENT_GREEN : this.renderProps.colors.keyText;
                ctx.font = (key === 'ENTER') ? GS.FONTS.TITLE : GS.FONTS.HEADER;
                ctx.textAlign = "center";
                ctx.fillText(key, btnX + (colW / 2), rowY + (rowH / 2) + 6);

                this.renderProps.buttons.push({ key, x: btnX, y: rowY, w: colW, h: rowH });
            });
        });
    }
}