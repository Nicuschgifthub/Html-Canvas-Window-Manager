class FGMSubKernel {
    static awaitingAction = null;
    static actionData = {};

    static setAwaitingAction(actionType, data = {}) {
        this.awaitingAction = actionType;
        this.actionData = data;
        console.log(`Action set: ${actionType}`, data);
    }

    static clearAwaitingAction() {
        this.awaitingAction = null;
        this.actionData = {};
        console.log("Action cleared");
    }

    static getAwaitingAction() {
        return this.awaitingAction;
    }
}


class FGMKernel {
    static handleAwaitingAction(actionType, fromWindow, fromPreset, data, singlePreset) {
        switch (actionType) {
            case FGMTypes.ACTIONS.BUTTON.EDIT_NAME:
                // We have the target preset!
                FGMSubKernel.actionData.targetPreset = singlePreset;
                FGMSubKernel.actionData.fromPresetField = fromPreset;
                FGMSubKernel.actionData.fromWindow = fromWindow;

                // Open keyboard
                FGMWindowManager.openKeyboardForWindow(fromWindow, singlePreset.name);
                break;

            case FGMTypes.ACTIONS.BUTTON.STORE:
                // Example Store logic: just update the name for now to show it works
                fromPreset.updatePreset(singlePreset.id, { name: "Stored!" });
                FGMSubKernel.clearAwaitingAction();
                break;

            default:
                FGMSubKernel.clearAwaitingAction();
                break;
        }
    }

    static eventPresetClicked(fromWindow, fromPreset, data, singlePreset) {
        // 1. Check if we are waiting for a target for an action
        const awaitingValue = FGMSubKernel.getAwaitingAction();


        if (awaitingValue) {
            FGMKernel.handleAwaitingAction(awaitingValue, fromWindow, fromPreset, data, singlePreset);
            return;
        }

        // 2. Handle simple page changes
        if (data._goToPage !== undefined) {
            FGMPageHandler.pageChange(data._goToPage, fromPreset, singlePreset, fromWindow);
            return
        };

        // 3. Handle Programmer Actions (starting an awaiting action)
        if (data._programmerAction !== undefined) {
            switch (data._programmerAction) {
                case FGMTypes.ACTIONS.BUTTON.EDIT_NAME:
                    FGMSubKernel.setAwaitingAction(FGMTypes.ACTIONS.BUTTON.EDIT_NAME);
                    break;
                case FGMTypes.ACTIONS.BUTTON.STORE:
                    FGMSubKernel.setAwaitingAction(FGMTypes.ACTIONS.BUTTON.STORE);
                    break;
                // Add more actions here
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

            if (targetPreset && fromPresetField) {
                fromPresetField.updatePreset(targetPreset.id, { name: string });
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