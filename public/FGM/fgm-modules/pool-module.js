class FGMPoolModule extends FGMFeatureModule {
    constructor() {
        super('pool-manager', '1.0.0');
    }

    init() {
        console.log('[PoolModule] Initializing...');

        this.on(FGMEventTypes.PATCH_CHANGED, {
            handler: () => this.refreshFixturePool(),
            priority: 5
        });

        this.on(FGMEventTypes.SELECTION_CHANGED, {
            handler: () => this.updatePoolSelection(),
            priority: 5
        });

        console.log('[PoolModule] Initialized');
    }

    updatePoolSelection() {
        const hcw = FGMStore.getHCW();
        if (!hcw) return;

        const selection = FGMProgrammer.getSelection();

        hcw.getWindows().forEach(win => {
            const field = win.getSingleContextField();
            if (field && field.getFGMType() === FGMTypes.PROGRAMMER.POOLS.FIXTURE_POOL) {
                field.presets.forEach(preset => {
                    const fixtureId = preset.data?.id;
                    if (fixtureId) {
                        preset.setSelected(selection.includes(fixtureId));
                    }
                });
            }
        });
    }

    refreshFixturePool() {
        const hcw = FGMStore.getHCW();
        if (!hcw) return;

        const poolWindows = hcw.getWindows().filter(win => {
            const field = win.getSingleContextField();
            return field && field.getFGMType() === FGMTypes.PROGRAMMER.POOLS.FIXTURE_POOL;
        });

        const patchedFixtures = FGMStore.getPatchedFixtures();
        const currentSelection = FGMProgrammer.getSelection();

        poolWindows.forEach(win => {
            const field = win.getSingleContextField();
            if (field) {
                field.clearAllPresets();
                patchedFixtures.forEach(fix => {
                    const preset = new HCWPreset(fix.getLabel(), null, null, { id: fix.getId() });
                    if (currentSelection.includes(fix.getId())) {
                        preset.setSelected(true);
                    }
                    field.addPreset(preset);
                });
                field.updateFrame();
            }
        });
    }
}