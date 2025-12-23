/**
 * Programmer Module
 * Handles all programmer input controls (faders, encoders, color pickers)
 */
class FGMProgrammerModule extends FGMFeatureModule {
    constructor() {
        super('programmer', '1.0.0');
    }

    init() {
        console.log('[ProgrammerModule] Initializing...');

        // Register handler for fader updates
        this.on(FGMEventTypes.FADER_UPDATE, {
            handler: (event) => this.handleFader(event),
            priority: 10
        });

        // Register handler for encoder updates
        this.on(FGMEventTypes.ENCODER_UPDATE, {
            handler: (event) => this.handleEncoder(event),
            priority: 10
        });

        // Register handler for color picker updates
        this.on(FGMEventTypes.COLOR_PICKER_UPDATE, {
            handler: (event) => this.handleColorPicker(event),
            priority: 10
        });

        console.log('[ProgrammerModule] Initialized');
    }

    handleFader(event) {
        const { field: fromFader, data } = event.data;
        const type = fromFader.getFGMType();

        if (type) {
            FGMProgrammer.setAttributeValue(type, data.value * 255);
        }
    }

    handleEncoder(event) {
        const { field: fromEncoder, data } = event.data;
        const type = fromEncoder.getFGMType();

        if (!type) return;

        if (type === FGMTypes.PROGRAMMER.POSITION.PAN_ENCODER) {
            FGMProgrammer.setAttributeValue(FGMTypes.PROGRAMMER.POSITION.PAN_8Bit, data.outer.value * 255);
            FGMProgrammer.setAttributeValue(FGMTypes.PROGRAMMER.POSITION.PAN_16Bit, data.inner.value * 255);
        }

        if (type === FGMTypes.PROGRAMMER.POSITION.TILT_ENCODER) {
            FGMProgrammer.setAttributeValue(FGMTypes.PROGRAMMER.POSITION.TILT_8Bit, data.outer.value * 255);
            FGMProgrammer.setAttributeValue(FGMTypes.PROGRAMMER.POSITION.TILT_16Bit, data.inner.value * 255);
        }
    }

    handleColorPicker(event) {
        const { field: fromColorPicker, data } = event.data;
        const type = fromColorPicker.getFGMType();

        if (type === FGMTypes.PROGRAMMER.COLORS.COLOR_PICKER) {
            // Split the color object into individual attribute updates
            if (data.r !== undefined) FGMProgrammer.setAttributeValue(FGMTypes.PROGRAMMER.COLORS.COLOR_R, data.r);
            if (data.g !== undefined) FGMProgrammer.setAttributeValue(FGMTypes.PROGRAMMER.COLORS.COLOR_G, data.g);
            if (data.b !== undefined) FGMProgrammer.setAttributeValue(FGMTypes.PROGRAMMER.COLORS.COLOR_B, data.b);
            if (data.white !== undefined) FGMProgrammer.setAttributeValue(FGMTypes.PROGRAMMER.COLORS.COLOR_W, data.white);
            if (data.amber !== undefined) FGMProgrammer.setAttributeValue(FGMTypes.PROGRAMMER.COLORS.COLOR_A, data.amber);
            if (data.uv !== undefined) FGMProgrammer.setAttributeValue(FGMTypes.PROGRAMMER.COLORS.COLOR_U, data.uv);
        }
    }
}
