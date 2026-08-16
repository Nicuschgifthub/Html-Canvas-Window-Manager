class KYEPresetGroup {
    static command(params) {

        switch (params.subKeyword) {
            case 'Preset':
                this.findPresetFunctionAndExecute(params);
                break;

            default:
                break;
        }
    }

    static findPresetFunctionAndExecute(params) {
        if (!params || !params.locationId) return;
        const presetGroup = HCWDB.getContextFieldByLocationId(params.locationId);
        if (!presetGroup) return;
        const preset = typeof presetGroup.getPresetByIndex === 'function' ? presetGroup.getPresetByIndex(params.subId) : null;
        if (!preset) return;
        const presetData = typeof preset.getData === 'function' ? preset.getData() : null;
        if (!presetData) return;

        Object.keys(presetData).forEach(functionName => {
            const thisFunctionData = presetData[functionName];
            const targetFunctions = this.presetFunctions();

            if (targetFunctions[functionName]) {
                targetFunctions[functionName]({ presetGroup, preset, presetData, thisFunctionData });
            } else {
                console.error(`Function ${functionName} not found in presetFunctions`);
            }
        });
    }

    static presetFunctions() {
        return {
            _pageChangeTo(data) {
                const { presetGroup, preset, presetData, thisFunctionData } = data;
                presetGroup.updateAllPresets({ color: null });
                preset.setColor(GS.FIELDS.PRESETS.HIGHLIGHT_COLOR);
                FGMShowHandler.setPageCursor(thisFunctionData);
            },
            _downloadShowFile(data) {
                if (typeof FGMShowHandler !== 'undefined' && typeof FGMShowHandler.exportShowToFile === 'function') {
                    FGMShowHandler.exportShowToFile();
                }
            },
            _openShowfileSettings(data) {
                if (typeof FGMWindowSettings !== 'undefined' && typeof FGMWindowSettings.openAndAwaitShowSettings === 'function') {
                    FGMWindowSettings.openAndAwaitShowSettings();
                }
            }
        };
    }
}

globalThis.KYEPresetGroup = KYEPresetGroup;