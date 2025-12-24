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
        const canvasW = HCW.canvas.width;
        const canvasH = HCW.canvas.height;
        const buffer = 20;
        const targetRatio = 2.0;

        const zones = [
            { id: 'top', w: canvasW - (buffer * 2), h: staticWindow.y - (buffer * 2) },
            { id: 'bottom', w: canvasW - (buffer * 2), h: canvasH - (staticWindow.y + staticWindow.sy) - (buffer * 2) },
            { id: 'left', w: staticWindow.x - (buffer * 2), h: canvasH - (buffer * 2) },
            { id: 'right', w: canvasW - (staticWindow.x + staticWindow.sx) - (buffer * 2), h: canvasH - (buffer * 2) }
        ];

        let bestZone = null;
        let maxArea = 0;

        zones.forEach(zone => {
            if (zone.w < 100 || zone.h < 60) return;

            let fitW = Math.min(zone.w, zone.h * targetRatio);
            let fitH = fitW / targetRatio;

            let area = fitW * fitH;

            if (area > maxArea) {
                maxArea = area;
                bestZone = { ...zone, fitW, fitH };
            }
        });

        if (bestZone) {
            keyboardWindow.sx = bestZone.fitW;
            keyboardWindow.sy = bestZone.fitH;

            if (bestZone.id === 'top') {
                keyboardWindow.x = (canvasW - keyboardWindow.sx) / 2;
                keyboardWindow.y = staticWindow.y - buffer - keyboardWindow.sy;
            } else if (bestZone.id === 'bottom') {
                keyboardWindow.x = (canvasW - keyboardWindow.sx) / 2;
                keyboardWindow.y = staticWindow.y + staticWindow.sy + buffer;
            } else if (bestZone.id === 'left') {
                keyboardWindow.x = staticWindow.x - buffer - keyboardWindow.sx;
                keyboardWindow.y = (canvasH - keyboardWindow.sy) / 2;
            } else if (bestZone.id === 'right') {
                keyboardWindow.x = staticWindow.x + staticWindow.sx + buffer;
                keyboardWindow.y = (canvasH - keyboardWindow.sy) / 2;
            }
        }

        keyboardWindow.x = Math.max(buffer, Math.min(keyboardWindow.x, canvasW - keyboardWindow.sx - buffer));
        keyboardWindow.y = Math.max(buffer, Math.min(keyboardWindow.y, canvasH - keyboardWindow.sy - buffer));

        keyboardWindow._init();
    }

    static closeKeyboard() {
        FGMPageHandler.reloadPage();
        this.findWindowByFGMType(FGMTypes.ACTIONS.KEYBOARD.MAIN_INPUT).setHidden(true);
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