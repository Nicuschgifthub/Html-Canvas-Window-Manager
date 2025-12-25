/**
 * Pool Module
 * Manages refreshing and updating of all pool windows (Fixtures, Groups, Presets)
 */
class FGMPoolModule extends FGMFeatureModule {
    constructor() {
        super('pool-manager', '1.0.0');
    }

    init() {
        console.log('[PoolModule] Initializing...');

        // Refresh pools on patch change
        this.on(FGMEventTypes.PATCH_CHANGED, () => this.refreshPools());

        // Update selection highlights on selection change
        this.on(FGMEventTypes.SELECTION_CHANGED, () => this.updatePoolSelection());

        // Refresh everything initially
        this.refreshPools();
        console.log('[PoolModule] Initialized');
    }

    updatePoolSelection() {
        const hcw = FGMStore.getHCW();
        if (!hcw) return;

        const selection = FGMProgrammer.getSelection();

        hcw.getWindows().forEach(win => {
            const field = win.getSingleContextField();
            const poolType = field?.getFGMType();
            if (!field || !poolType || !field.presets) return;

            field.presets.forEach(preset => {
                const data = preset.getData();
                if (!data) {
                    preset.setSelected(false);
                    if (preset.setSelectionState) preset.setSelectionState(0);
                    return;
                }

                if (poolType === FGMTypes.PROGRAMMER.POOLS.FIXTURE_POOL) {
                    const isSel = selection.map(String).includes(String(data.id));
                    if (preset.setSelectionState) preset.setSelectionState(isSel ? 2 : 0);
                    return;
                }

                // Selective Pools (Group, All, or any Map-based data)
                let fixtureIdsInPreset = [];
                if (Array.isArray(data)) {
                    fixtureIdsInPreset = data;
                } else if (typeof data === 'object' && !data._universal) {
                    fixtureIdsInPreset = Object.keys(data);
                }

                if (fixtureIdsInPreset.length > 0) {
                    const selStrings = selection.map(String);
                    const matched = fixtureIdsInPreset.filter(id => selStrings.includes(String(id)));

                    if (matched.length === 0) {
                        if (preset.setSelectionState) preset.setSelectionState(0);
                    } else if (matched.length === fixtureIdsInPreset.length) {
                        if (preset.setSelectionState) preset.setSelectionState(2);
                    } else {
                        if (preset.setSelectionState) preset.setSelectionState(1);
                    }
                } else {
                    if (preset.setSelectionState) preset.setSelectionState(0);
                }
            });
        });
    }

    refreshPools() {
        const hcw = FGMStore.getHCW();
        if (!hcw) return;

        // Refresh Fixture Pool
        this.refreshSpecificPool(FGMTypes.PROGRAMMER.POOLS.FIXTURE_POOL, () => {
            const patchedFixtures = FGMStore.getPatchedFixtures();
            const currentSelection = FGMProgrammer.getSelection();
            return patchedFixtures.map(fix => {
                const preset = new HCWPreset(fix.getLabel(), null, null, { id: fix.getId() });
                preset.setSelected(currentSelection.includes(fix.getId()));
                return preset;
            });
        });

        // Refresh Group Pool
        this.refreshSpecificPool(FGMTypes.PROGRAMMER.POOLS.GROUP_POOL, (preset, index) => {
            const stored = FGMStore.getPreset(FGMTypes.PROGRAMMER.POOLS.GROUP_POOL, index);
            if (stored) {
                preset.setLabel(stored.name).setData(stored.data);
            } else {
                preset.setLabel("").setData(null);
            }
        });

        // Refresh Dimmer Pool
        this.refreshSpecificPool(FGMTypes.PROGRAMMER.POOLS.DIMMER_POOL, (preset, index) => {
            const stored = FGMStore.getPreset(FGMTypes.PROGRAMMER.POOLS.DIMMER_POOL, index);
            if (stored) {
                preset.setLabel(stored.name).setData(stored.data).setColor("#574b4bff");
            } else {
                preset.setLabel("").setData(null).setColor(null);
            }
        });

        // Refresh Color Pool
        this.refreshSpecificPool(FGMTypes.PROGRAMMER.POOLS.COLOR_POOL, (preset, index) => {
            const stored = FGMStore.getPreset(FGMTypes.PROGRAMMER.POOLS.COLOR_POOL, index);
            if (stored) {
                preset.setLabel(stored.name).setData(stored.data).setColor("#8e44ad");
            } else {
                preset.setLabel("").setData(null).setColor(null);
            }
        });

        // Refresh Position Pool
        this.refreshSpecificPool(FGMTypes.PROGRAMMER.POOLS.POSITION_POOL, (preset, index) => {
            const stored = FGMStore.getPreset(FGMTypes.PROGRAMMER.POOLS.POSITION_POOL, index);
            if (stored) {
                preset.setLabel(stored.name).setData(stored.data).setColor("#2980b9");
            } else {
                preset.setLabel("").setData(null).setColor(null);
            }
        });

        // Refresh All Pool
        this.refreshSpecificPool(FGMTypes.PROGRAMMER.POOLS.ALL_POOL, (preset, index) => {
            const stored = FGMStore.getPreset(FGMTypes.PROGRAMMER.POOLS.ALL_POOL, index);
            if (stored) {
                preset.setLabel(stored.name).setData(stored.data).setColor("#27ae60");
            } else {
                preset.setLabel("").setData(null).setColor(null);
            }
        });

        this.updatePoolSelection();
        if (typeof HCWRender !== 'undefined') HCWRender.updateFrame();
    }

    refreshSpecificPool(poolType, presetFactory) {
        const hcw = FGMStore.getHCW();
        hcw.getWindows().forEach(win => {
            const field = win.getSingleContextField();
            if (field && field.getFGMType() === poolType) {
                if (poolType === FGMTypes.PROGRAMMER.POOLS.FIXTURE_POOL) {
                    field.clearAllPresets();
                    const presets = presetFactory();
                    presets.forEach(p => field.addPreset(p));
                } else {
                    field.presets.forEach((preset, index) => {
                        presetFactory(preset, index);
                    });
                }
            }
        });
    }
}
