/**
 * EXAMPLE: Simple Demo Module
 * 
 * This demonstrates how easy it is to create new functionality
 * without modifying the FGMKernel!
 * 
 * This module logs all preset clicks to the console.
 */
class FGMDemoModule extends FGMFeatureModule {
    constructor() {
        super('demo-logger', '1.0.0');
    }

    init() {
        console.log('[DemoModule] Initializing...');

        // Log all preset clicks
        this.on(FGMEventTypes.PRESET_CLICKED, {
            handler: (event) => this.logPresetClick(event),
            priority: 1, // Low priority so it runs after other handlers
            name: 'demo-preset-logger'
        });

        // Log all fader updates
        this.on(FGMEventTypes.FADER_UPDATE, {
            handler: (event) => this.logFaderUpdate(event),
            priority: 1
        });

        // Log all window clicks
        this.on(FGMEventTypes.WINDOW_CLICKED, {
            handler: (event) => this.logWindowClick(event),
            priority: 1
        });

        console.log('[DemoModule] Initialized - Now logging all interactions!');
    }

    logPresetClick(event) {
        const { singlePreset, data } = event.data;
        console.log('🔵 Preset clicked:', {
            name: singlePreset?.getName(),
            data: data
        });
    }

    logFaderUpdate(event) {
        const { field, data } = event.data;
        console.log('🎚️ Fader updated:', {
            label: field?.getLabel(),
            value: data?.value
        });
    }

    logWindowClick(event) {
        const { window } = event.data;
        console.log('🪟 Window clicked:', {
            id: window?.getId(),
            label: window?.getSingleContextField()?.getLabel()
        });
    }
}

// To enable this module, uncomment the following line in fgm-hcw-setup.js:
// FGMModuleRegistry.register(new FGMDemoModule());
