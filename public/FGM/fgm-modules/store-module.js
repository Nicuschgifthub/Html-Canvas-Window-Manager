/**
 * Store Module
 * Handles storing and recalling presets and groups (gMA3 style)
 */
class FGMStoreModule extends FGMFeatureModule {
    constructor() {
        super('store-manager', '1.0.0');
    }

    init() {
        console.log('[StoreModule] Initializing...');

        // Register Store button handler
        this.on(FGMEventTypes.PRESET_CLICKED, {
            filter: FGMEventFilter.byPresetData('_actionId', FGMTypes.ACTIONS.BUTTON.STORE),
            handler: (event) => this.handleStoreAction(event),
            priority: 10
        });

        // Register Delete button handler
        this.on(FGMEventTypes.PRESET_CLICKED, {
            filter: FGMEventFilter.byPresetData('_actionId', FGMTypes.ACTIONS.BUTTON.DELETE),
            handler: (event) => this.handleDeleteAction(event),
            priority: 10
        });

        // Handle Pool Clicks (Groups, Dimmer, Color, All, etc.)
        this.on(FGMEventTypes.PRESET_CLICKED, {
            filter: (event) => {
                const type = event.data.field?.getFGMType();
                const pools = FGMTypes.PROGRAMMER.POOLS;
                return type &&
                    [pools.GROUP_POOL, pools.DIMMER_POOL, pools.COLOR_POOL, pools.POSITION_POOL, pools.ALL_POOL].includes(type);
            },
            handler: (event) => this.handlePoolPresetClick(event),
            priority: 10
        });

        console.log('[StoreModule] Initialized');
    }

    async handleStoreAction(event) {
        const { singlePreset } = event.data;

        if (singlePreset) singlePreset.setFlashing(true);

        console.log("[StoreModule] Store active, waiting for target pool...");

        // Wait for a preset to be clicked
        const interaction = await FGMKernel.awaitAction({
            type: FGMEventTypes.PRESET_CLICKED,
            filter: (payload) => {
                const type = payload.field?.getFGMType();
                const pools = FGMTypes.PROGRAMMER.POOLS;
                return type && [pools.GROUP_POOL, pools.DIMMER_POOL, pools.COLOR_POOL, pools.POSITION_POOL, pools.ALL_POOL].includes(type);
            }
        });

        if (singlePreset) singlePreset.setFlashing(false);

        if (interaction) {
            this.executeStore(interaction);
        }
    }

    async handleDeleteAction(event) {
        const { singlePreset } = event.data;

        if (singlePreset) singlePreset.setFlashing(true);

        console.log("[StoreModule] Delete active, waiting for target pool...");

        // Wait for a preset to be clicked
        const interaction = await FGMKernel.awaitAction({
            type: FGMEventTypes.PRESET_CLICKED,
            filter: (payload) => {
                const type = payload.field?.getFGMType();
                const pools = FGMTypes.PROGRAMMER.POOLS;
                return type && [pools.GROUP_POOL, pools.DIMMER_POOL, pools.COLOR_POOL, pools.POSITION_POOL, pools.ALL_POOL].includes(type);
            }
        });

        if (singlePreset) singlePreset.setFlashing(false);

        if (interaction) {
            this.executeDelete(interaction);
        }
    }

    executeDelete(interaction) {
        const { field, singlePreset } = interaction;
        const poolType = field.getFGMType();
        const presetIndex = field.presets.indexOf(singlePreset);

        if (presetIndex === -1) return;

        if (FGMStore.deletePreset(poolType, presetIndex)) {
            console.log(`[StoreModule] Deleted preset at index ${presetIndex} in ${poolType}`);
        }

        if (typeof HCWRender !== 'undefined') HCWRender.updateFrame();
    }

    executeStore(interaction) {
        const { field, data, singlePreset } = interaction;
        const poolType = field.getFGMType();
        const presetIndex = field.presets.indexOf(singlePreset);

        if (presetIndex === -1) return;

        let storeData = null;
        let namePrefix = "";

        if (poolType === FGMTypes.PROGRAMMER.POOLS.GROUP_POOL) {
            storeData = [...FGMProgrammer.getSelection()];
            namePrefix = "Group";
        } else {
            // Dimmer, Color, and Position pools are Universal by default (per user request)
            const isUniversal = [
                FGMTypes.PROGRAMMER.POOLS.DIMMER_POOL,
                FGMTypes.PROGRAMMER.POOLS.COLOR_POOL,
                FGMTypes.PROGRAMMER.POOLS.POSITION_POOL
            ].includes(poolType);

            storeData = FGMProgrammer.getValuesForPool(poolType, isUniversal);
            namePrefix = "Preset";
        }

        if (!storeData || (Array.isArray(storeData) && storeData.length === 0) || (typeof storeData === 'object' && Object.keys(storeData).length === 0)) {
            console.warn("[StoreModule] Nothing to store for this pool type.");
            return;
        }

        const currentName = singlePreset.getName();
        const newName = (currentName.startsWith("Group") || currentName.startsWith("Preset") || currentName === "")
            ? `${namePrefix} ${presetIndex + 1}`
            : currentName;

        FGMStore.savePreset(poolType, presetIndex, newName, storeData);

        console.log(`[StoreModule] Stored to ${poolType} at index ${presetIndex}`);

        if (typeof HCWRender !== 'undefined') HCWRender.updateFrame();
    }

    handlePoolPresetClick(event) {
        if (FGMSubAction.getAwaitingAction() !== null) return;

        const { field, presetData, singlePreset } = event.data;
        const poolType = field.getFGMType();
        const presetIndex = field.presets.indexOf(singlePreset);

        const stored = FGMStore.getPreset(poolType, presetIndex);
        if (stored && stored.data) {
            FGMProgrammer.applyPreset(poolType, stored.data);
            if (typeof HCWRender !== 'undefined') HCWRender.updateFrame();
        } else {
            console.log("[StoreModule] Preset is empty, nothing to recall.");
        }
    }
}