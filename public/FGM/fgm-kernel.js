class FGMSubKernel {
    static awaitingAction = null;
    static actionData = {};
    static initiatorPreset = null;

    static setAwaitingAction(actionType, data = {}, initiatorPreset = null) {
        this.clearAwaitingAction(); // Clear any previous action

        this.awaitingAction = actionType;
        this.actionData = data;
        this.initiatorPreset = initiatorPreset;

        console.log(`Action set: ${actionType}`, data);
    }

    static clearAwaitingAction() {
        this.awaitingAction = null;
        this.actionData = {};
        this.initiatorPreset = null;
        console.log("Action cleared");
    }

    static getAwaitingAction() {
        return this.awaitingAction;
    }
}


class FGMKernel {
    static getAwaitingColor() {
        if (typeof FGMColors === 'undefined') return '#ffffff';

        const pulse = (Math.sin(Date.now() / 150) + 1) / 2; // 0 to 1
        const target = FGMColors.PAGES.AWAITING;

        // target is #RRGGBBAA or #RRGGBB
        const r = parseInt(target.slice(1, 3), 16);
        const g = parseInt(target.slice(3, 5), 16);
        const b = parseInt(target.slice(5, 7), 16);

        // Interpolate with black (0,0,0)
        const fr = Math.round(r * pulse);
        const fg = Math.round(g * pulse);
        const fb = Math.round(b * pulse);

        return `rgb(${fr}, ${fg}, ${fb})`;
    }

    static handleAwaitingAction(actionType, fromWindow, fromPreset, data, singlePreset) {
        switch (actionType) {
            case FGMTypes.ACTIONS.BUTTON.EDIT_NAME:
                if (singlePreset) {
                    FGMSubKernel.actionData.targetPreset = singlePreset;
                    FGMSubKernel.actionData.fromPresetField = fromPreset;
                    FGMSubKernel.actionData.fromWindow = fromWindow;
                    FGMWindowManager.openKeyboardForWindow(fromWindow, singlePreset.getName());
                } else {
                    // Renaming the window itself
                    FGMSubKernel.actionData.targetWindow = fromWindow;
                    FGMSubKernel.actionData.fromWindow = fromWindow;
                    FGMWindowManager.openKeyboardForWindow(fromWindow, fromWindow.getSingleContextField().getLabel());
                }
                FGMSubKernel.initiatorPreset = null; // Stop flashing once keyboard is open
                break;

            case FGMTypes.ACTIONS.BUTTON.STORE:
                if (singlePreset) {
                    fromPreset.updatePreset(singlePreset.getId(), { name: "Stored!" });
                }
                FGMSubKernel.clearAwaitingAction();
                break;

            default:
                FGMSubKernel.clearAwaitingAction();
                break;
        }
    }

    // all events

    static eventWindowClicked(fromWindow) {
        const awaitingValue = FGMSubKernel.getAwaitingAction();
        if (awaitingValue === FGMTypes.ACTIONS.BUTTON.EDIT_NAME) {
            FGMKernel.handleAwaitingAction(awaitingValue, fromWindow, null, {}, null);
        }
    }

    static eventPresetClicked(fromWindow, fromPreset, data, singlePreset) {
        const awaitingValue = FGMSubKernel.getAwaitingAction();


        if (awaitingValue) {
            FGMKernel.handleAwaitingAction(awaitingValue, fromWindow, fromPreset, data, singlePreset);
            return;
        }

        if (data._goToPage !== undefined) {
            FGMPageHandler.pageChange(data._goToPage, fromPreset, singlePreset, fromWindow);
            return
        };

        if (data._programmerAction !== undefined) {
            switch (data._programmerAction) {
                case FGMTypes.ACTIONS.BUTTON.EDIT_NAME:
                    FGMSubKernel.setAwaitingAction(FGMTypes.ACTIONS.BUTTON.EDIT_NAME, {}, singlePreset);
                    break;
                case FGMTypes.ACTIONS.BUTTON.STORE:
                    FGMSubKernel.setAwaitingAction(FGMTypes.ACTIONS.BUTTON.STORE, {}, singlePreset);
                    break;
                default:
                    console.warn("Unhandled programmer action:", data._programmerAction);
                    break;
            }
            return;
        }
    }

    static eventFaderUpdate(fromWindow, fromFader, data) {
        if (fromFader.getFGMType() == FGMTypes.PROGRAMMER.DIMMERS.MAIN) {
            console.log("main Dimmer", data)
        }
    }

    static eventEncoderUpdate(fromWindow, fromEncoder, data) {
        if (fromEncoder.getFGMType() == FGMTypes.PROGRAMMER.POSITION.PAN_16Bit) {
            console.log("Pan", data)
        }

        if (fromEncoder.getFGMType() == FGMTypes.PROGRAMMER.POSITION.TILT_16Bit) {
            console.log("Tilt", data)
        }
    }

    static eventKeyboardOnEnter(fromWindow, fromKeyboard, string) {
        const actionType = FGMSubKernel.getAwaitingAction();

        if (actionType === FGMTypes.ACTIONS.BUTTON.EDIT_NAME) {
            const targetPreset = FGMSubKernel.actionData.targetPreset;
            const fromPresetField = FGMSubKernel.actionData.fromPresetField;
            const targetWindow = FGMSubKernel.actionData.targetWindow;

            if (targetPreset && fromPresetField) {
                fromPresetField.updatePreset(targetPreset.getId(), { name: string });
            } else if (targetWindow) {
                targetWindow.getSingleContextField().setLabel(string);
                if (typeof HCWRender !== 'undefined') HCWRender.updateFrame();
            }

            FGMSubKernel.clearAwaitingAction();
            FGMWindowManager.closeKeyboard();
        }
    }

    static eventColorPickerUpdate(fromWindow, fromColorPicker, data) {
        if (fromColorPicker.getFGMType() == FGMTypes.PROGRAMMER.COLORS.COLOR_PICKER) {
            console.log("Color Picker", data)
        }
    }
}