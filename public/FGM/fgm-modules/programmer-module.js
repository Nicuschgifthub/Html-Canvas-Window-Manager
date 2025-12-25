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

        this.on(FGMEventTypes.FADER_UPDATE, {
            handler: (event) => this.handleFader(event),
            priority: 10
        });

        this.on(FGMEventTypes.ENCODER_UPDATE, {
            handler: (event) => this.handleEncoder(event),
            priority: 10
        });

        this.on(FGMEventTypes.COLOR_PICKER_UPDATE, {
            handler: (event) => this.handleColorPicker(event),
            priority: 10
        });

        this.on(FGMEventTypes.PRESET_CLICKED, {
            filter: FGMEventFilter.or(
                FGMEventFilter.byPresetData('_actionId', FGMTypes.ACTIONS.BUTTON.CLEAR_ALL),
                FGMEventFilter.byPresetData('_actionId', FGMTypes.ACTIONS.BUTTON.CLEAR_SELECTION),
                FGMEventFilter.byPresetData('_actionId', FGMTypes.ACTIONS.BUTTON.CLEAR_GHOST_VALUES)
            ),
            handler: (event) => {
                const data = event.data.presetData || event.data.data;
                const actionId = data._actionId;

                if (actionId === FGMTypes.ACTIONS.BUTTON.CLEAR_ALL) {
                    FGMProgrammer.clear();
                }

                if (actionId === FGMTypes.ACTIONS.BUTTON.CLEAR_SELECTION) {
                    FGMProgrammer.clearSelection();
                }

                if (actionId === FGMTypes.ACTIONS.BUTTON.CLEAR_GHOST_VALUES) {
                    FGMProgrammer.clearProgrammer();
                }

                if (typeof HCWRender !== 'undefined') HCWRender.updateFrame();
            },
            priority: 10
        });

        this.on(FGMEventTypes.PRESET_CLICKED, {
            filter: FGMEventFilter.byFieldType(FGMTypes.PROGRAMMER.POOLS.FIXTURE_POOL),
            handler: (event) => this.handleFixtureSelection(event),
            priority: 10
        });

        console.log('[ProgrammerModule] Initialized');
    }

    handleFixtureSelection(event) {
        const { field, presetData, preset } = event.data;
        const fixtureId = presetData.id;

        if (FGMProgrammer.getSelection().includes(fixtureId)) {
            FGMProgrammer.unselectFixture(fixtureId);
        } else {
            FGMProgrammer.selectFixture(fixtureId, false);
        }

        if (typeof HCWRender !== 'undefined') HCWRender.updateFrame();
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
            if (data.r !== undefined) FGMProgrammer.setAttributeValue(FGMTypes.PROGRAMMER.COLORS.COLOR_R, data.r);
            if (data.g !== undefined) FGMProgrammer.setAttributeValue(FGMTypes.PROGRAMMER.COLORS.COLOR_G, data.g);
            if (data.b !== undefined) FGMProgrammer.setAttributeValue(FGMTypes.PROGRAMMER.COLORS.COLOR_B, data.b);
            if (data.white !== undefined) FGMProgrammer.setAttributeValue(FGMTypes.PROGRAMMER.COLORS.COLOR_W, data.white);
            if (data.amber !== undefined) FGMProgrammer.setAttributeValue(FGMTypes.PROGRAMMER.COLORS.COLOR_A, data.amber);
            if (data.uv !== undefined) FGMProgrammer.setAttributeValue(FGMTypes.PROGRAMMER.COLORS.COLOR_U, data.uv);
        }
    }
}