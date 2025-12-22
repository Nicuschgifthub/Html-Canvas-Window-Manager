class FGMSubKernel {

    static actionsAwait = {
        from: null,
        to: null,


    }

    static awaitNextActionStep() {

    }
}


class FGMKernel {
    static eventPresetClicked(fromWindow, fromPreset, data, singlePreset) {

        if (data._goToPage !== undefined) { FGMPageHandler.pageChange(data._goToPage, fromPreset, singlePreset, fromWindow); return };

        if (data._programmerAction !== undefined) {

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

    static eventColorPickerUpdate(fromWindow, fromColorPicker, data) {

        if (fromColorPicker.getFGMType() == FGMTypes.PROGRAMMER.COLORS.COLOR_PICKER) {
            console.log("Color Picker", data)
        }

    }

    static eventKeyboardOnEnter(fromWindow, fromKeyboard, string) {

    }
}