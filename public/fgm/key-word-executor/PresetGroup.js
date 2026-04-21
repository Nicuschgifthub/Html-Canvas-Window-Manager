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
        const presetGroup = HCWDB.getContextFieldByLocationId(params.locationId)
        const preset = presetGroup.getPresetByIndex(params.subId)
        const presetData = preset.getData();

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
            }
        };
    }
}

globalThis.KYEPresetGroup = KYEPresetGroup;