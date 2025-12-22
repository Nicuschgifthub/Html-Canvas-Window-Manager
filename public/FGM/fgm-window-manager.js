class FGMWindowManager {
    static saveToJson(window) {
        let dataJson = {
            windowJson: {},
            contextFieldJson: {},
            fieldType: ""
        }

        const contextField = window.getSingleContextField();
        dataJson.contextFieldJson = contextField.toJSON();
        dataJson.fieldType = contextField.getType();
        dataJson.windowJson = window.toJSON();

        return dataJson;
    }

    static windowfromJson(dataJson) {
        let contextField = null;

        switch (dataJson.fieldType) {
            case "PRESET_FIELD":
                contextField = new HCWPresetField()
                    .fromJSON(dataJson.contextFieldJson);

                contextField.onPresetPress(FGMKernel.eventPresetClicked)
                break;
            default:
                break;
        }

        const window = new HCWWindow()
            .fromJSON(dataJson.windowJson)

        contextField.setParentWindow(window);

        window.addContextField(contextField);

        return window
    }

    static openKeyboardForWindow(window, placeholderString = "") {
        const keyboardWindow = this.findWindowByFGMType(FGMTypes.ACTIONS.KEYBOARD.MAIN_INPUT);
        this.resolveKeyboardCollision(window, keyboardWindow);

        FGMStore.getHCW()
            .getWindows().forEach(HCWWindow => {
                if (HCWWindow.getId() !== window.getId()) {
                    HCWWindow.setHidden(true);
                } else {
                    HCWWindow.setHidden(false);
                }
            });

        keyboardWindow.setHidden(false).getSingleContextField().setValue(placeholderString);
    }

    static resolveKeyboardCollision(staticWindow, keyboardWindow) {
        if (!keyboardWindow.checkOverlap(staticWindow)) return;

        const canvasWidth = HCW.canvas.width;
        const canvasHeight = HCW.canvas.height;

        const buffer = 20;

        let targetY = staticWindow.y + staticWindow.sy + buffer;
        if (targetY + keyboardWindow.sy <= canvasHeight) {
            keyboardWindow.y = targetY;
        } else {
            targetY = staticWindow.y - keyboardWindow.sy - buffer;
            if (targetY >= 0) {
                keyboardWindow.y = targetY;
            } else {
                const spaceAbove = staticWindow.y;
                const spaceBelow = canvasHeight - (staticWindow.y + staticWindow.sy);

                if (spaceAbove > spaceBelow) {
                    keyboardWindow.y = buffer / 2;
                    if (keyboardWindow.checkOverlap(staticWindow)) {
                        keyboardWindow.sy = Math.max(100, staticWindow.y - buffer);
                    }
                } else {
                    keyboardWindow.sy = Math.max(100, keyboardWindow.sy);
                    keyboardWindow.y = canvasHeight - keyboardWindow.sy - (buffer / 2);
                    if (keyboardWindow.checkOverlap(staticWindow)) {
                        keyboardWindow.sy = Math.max(100, canvasHeight - (staticWindow.y + staticWindow.sy) - buffer);
                        keyboardWindow.y = canvasHeight - keyboardWindow.sy - (buffer / 2);
                    }
                }
            }
        }

        const centerX = staticWindow.x + (staticWindow.sx / 2);
        keyboardWindow.x = centerX - (keyboardWindow.sx / 2);

        if (keyboardWindow.x < buffer) keyboardWindow.x = buffer;
        if (keyboardWindow.x + keyboardWindow.sx > canvasWidth - buffer) {
            keyboardWindow.x = canvasWidth - keyboardWindow.sx - buffer;
        }

        keyboardWindow._init();
    }

    static findWindowByFGMType(FGMType) {
        return FGMStore.getHCW()
            .getWindows()
            .find(HCWWindow => {
                const field = HCWWindow.getSingleContextField();
                return field && field.getFGMType() === FGMType;
            });
    }
}