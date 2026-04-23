class FGMKeyboardInteractionSettings {
    constructor() {
        this.config = {
            initialValue: "",
            label: "Keyboard",
            onEnter: () => { },
            onCancel: () => { },
            verify: () => { return { valid: true, infoText: "" } },
            isNumeric: false,
            sizeX: undefined,
            sizeY: undefined
        };
    }

    static create() {
        return new FGMKeyboardInteractionSettings();
    }

    setInitialValue(val) {
        this.config.initialValue = val;
        return this;
    }

    setLabel(text) {
        this.config.label = text;
        return this;
    }

    setSize(x, y) {
        this.config.sizeX = x;
        this.config.sizeY = y;
        return this;
    }

    onEnter(fn) {
        this.config.onEnter = fn;
        return this;
    }

    onCancel(fn) {
        this.config.onCancel = fn;
        return this;
    }

    setVerify(fn) {
        this.config.verify = fn;
        return this;
    }

    numericOnly() {
        this.config.isNumeric = true;
        this.config.verify = (val) => /^\d+$/.test(val);
        return this;
    }

    getConfig() {
        return this.config;
    }
}

class FGMKeyboardInteraction {
    static keyboardField = null;
    static keyboardWindow = null;

    static createKeyboard(settings) {
        const { x, y, sx, sy } = HCWPositions.getMiddleUserFocusPosition(1);


        const width = settings.sizeX || sx;
        const height = settings.sizeY || sy;

        this.keyboardField = new HCWKeyboardField(settings.label)
            .setValue(settings.initialValue);

        this.keyboardWindow = new HCWWindow()
            .setTouchZoneColor(GLOBAL_STYLES.FIELDS_GLOBAL.TEMP_INPUT_FIELD_TOUCH_ZONE_COLOR)
            .setPosition(x, y)
            .setSize(width, height)
            .setContextField(this.keyboardField)
            .setPageId(GLOBAL_CORE.CONTEXT_FIELDS._KEYBOARD.PAGE)
            .setId(GLOBAL_CORE.CONTEXT_FIELDS._KEYBOARD.ID);

        FGMShowHandler.setPageEmpty();

        HCWDB.addWindows([this.keyboardWindow]);

        HCWPointerOverride.setFocusFieldToContextWindow(this.keyboardField);
    }

    static async openKeyboard(settingsInstance) {
        const settings = settingsInstance.getConfig();

        this.createKeyboard(settings);

        while (true) {
            const { GlobalActionType, resolvedAction } = await GlobalInterrupter.waitForSome(
                GLOBAL_TYPES.ACTIONS.KEYBOARD_UPDATES.KEY_PRESSED,
                GLOBAL_TYPES.ACTIONS.KEYBOARD_UPDATES.ENTER_PRESSED,
                GLOBAL_TYPES.ACTIONS.KEYBOARD_UPDATES.BACKSPACE_PRESSED,
                GLOBAL_TYPES.ACTIONS.KEYBOARD_UPDATES.DELETE_ALL_PRESSED,
                GLOBAL_TYPES.ACTIONS.KEYBOARD_UPDATES.ARROW_LEFT_PRESSED,
                GLOBAL_TYPES.ACTIONS.KEYBOARD_UPDATES.ARROW_RIGHT_PRESSED,
                GLOBAL_TYPES.ACTIONS.KEYBOARD_UPDATES.SPACE_PRESSED,
                GLOBAL_TYPES.ACTIONS.BACKGROUND_CLICKED,
                GLOBAL_TYPES.ACTIONS.BACKGROUND_DRAG,
                GLOBAL_TYPES.ACTIONS.WINDOW.CLICKED
            );

            const isKeyboardUpdate = Object.values(GLOBAL_TYPES.ACTIONS.KEYBOARD_UPDATES).includes(GlobalActionType);

            if (GlobalActionType === GLOBAL_TYPES.ACTIONS.WINDOW.CLICKED) {
                continue;
            }

            if (GlobalActionType === GLOBAL_TYPES.ACTIONS.KEYBOARD_UPDATES.KEY_PRESSED ||
                GlobalActionType === GLOBAL_TYPES.ACTIONS.KEYBOARD_UPDATES.BACKSPACE_PRESSED ||
                GlobalActionType === GLOBAL_TYPES.ACTIONS.KEYBOARD_UPDATES.DELETE_ALL_PRESSED
            ) {
                const { valid, infoText } = settings.verify(resolvedAction.value);

                this.keyboardField.setTextColor(valid ? GLOBAL_STYLES.INFO.GOOD : GLOBAL_STYLES.INFO.ERROR);

                const baseLabel = settings.label;
                const displayLabel = valid ? baseLabel : `${baseLabel} || ${infoText}`;
                this.keyboardField.setLabel(displayLabel);

                HCWRender.updateFrame();
                continue;
            }

            if (isKeyboardUpdate && GlobalActionType !== GLOBAL_TYPES.ACTIONS.KEYBOARD_UPDATES.ENTER_PRESSED) {
                const isValid = settings.verify(resolvedAction.value);
                this.keyboardField.setTextColor(isValid ? GLOBAL_STYLES.INFO.GOOD : GLOBAL_STYLES.INFO.ERROR);
                continue;
            }

            if (GlobalActionType === GLOBAL_TYPES.ACTIONS.KEYBOARD_UPDATES.ENTER_PRESSED) {
                const { valid } = settings.verify(resolvedAction.value);
                if (valid) {
                    settings.onEnter(resolvedAction.value);
                    this.closeKeyboard();
                    return resolvedAction.value;
                }
                continue;
            }

            if (GlobalActionType === GLOBAL_TYPES.ACTIONS.BACKGROUND_CLICKED ||
                GlobalActionType === GLOBAL_TYPES.ACTIONS.BACKGROUND_DRAG) {

                settings.onCancel();
                this.closeKeyboard();
                return null;
            }
        }
    }

    static closeKeyboard() {
        if (this.keyboardWindow) {
            HCWPointerOverride.setFocusFieldToContextWindow(null);
            HCWDB.removeWindowByWindowId(this.keyboardWindow.getId());
            FGMShowHandler.setPageCursor();
            this.keyboardWindow = null;
            this.keyboardField = null;
        }
    }
}