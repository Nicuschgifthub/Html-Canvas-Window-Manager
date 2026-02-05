class FGMEvents {

    static backgroundClicked() {
        console.log("BG click");
    }

    static onRenderUpdate() {

    }

    static onWindowChange(type, data = {}) {
        console.log(type, data);
    }

    static onAction(type, data = {}) {
        if (!data.fieldClass) {
            console.warn("Event Action without fieldClass:", type, data);
            return;
        }

        const field = data.fieldClass;
        const keyword = field.getKeyword();
        const location = field.getLocationId();

        let commandString = "";


        switch (type) {
            case GLOBAL_TYPES.ACTIONS.FADER_VALUE_UPDATE:
                commandString = `${keyword} ${location} At ${data.byte}`;
                break;

            case GLOBAL_TYPES.ACTIONS.ENCODER_VALUE_UPDATE:
                commandString = `${keyword} ${location} At ${data.outer.byte} ${data.inner.byte}`;
                break;

            case GLOBAL_TYPES.ACTIONS.PRESET_PRESS:
                const childKw = field.address.childKeyword || 'Preset';
                commandString = `${keyword} ${location} ${childKw} ${data.preset.getId()} Go`;
                break;

            case GLOBAL_TYPES.ACTIONS.COLOR_FIELD_UPDATE:
                const c = data.colors;
                commandString = `${keyword} ${location} At ${c.r} ${c.g} ${c.b} ${c.white || 0} ${c.amber || 0} ${c.uv || 0}`;
                break;

            case GLOBAL_TYPES.ACTIONS.KEYBOARD_UPDATES.ENTER_PRESSED:
                commandString = `${keyword} ${location} Enter '${data.value}'`;
                break;

            case GLOBAL_TYPES.ACTIONS.NUMPAD_UPDATES.ENTER_PRESSED:
                commandString = `${keyword} ${location} Enter '${data.value}'`;
                break;

            case GLOBAL_TYPES.ACTIONS.TABLE_UPDATES.CELL_PRESS:
                commandString = `${keyword} ${location} Cell ${data.rowIndex} ${data.colIndex} Value '${data.value}'`;
                break;

            case GLOBAL_TYPES.ACTIONS.TABLE_UPDATES.CELL_DELETE:
                commandString = `${keyword} ${location} Delete Row ${data.rowIndex}`;
                break;

            case GLOBAL_TYPES.ACTIONS.TABLE_UPDATES.CELL_ADD:
                commandString = `${keyword} ${location} Add Row`;
                break;

            case GLOBAL_TYPES.ACTIONS.SEARCH_UPDATES.RESULT_PRESS:
                commandString = `${keyword} ${location} Load Result '${data.name}'`;
                break;

            case GLOBAL_TYPES.ACTIONS.SEARCH_UPDATES.SEARCH_BAR_PRESS:
                commandString = `${keyword} ${location} Focus '${data.searchValue}'`;
                break;

            case GLOBAL_TYPES.ACTIONS.CUSTOM_ENCODER_VALUE_UPDATE:
                commandString = `${keyword} ${location} At ${data.outer.byte} ${data.inner.byte}`;
                break;

            case 'ACTION_SEQUENCE_EDITOR_UPDATE':
                commandString = `${keyword} ${location} Update`;
                break;

            case GLOBAL_TYPES.ACTIONS.KEYBOARD_UPDATES.KEY_PRESSED:
            case GLOBAL_TYPES.ACTIONS.NUMPAD_UPDATES.KEY_PRESSED:
                break;

            default:
                commandString = `[UNMAPPED] ${keyword} ${location} Action: ${type}`;
                console.log("Raw Data:", data);
                break;
        }

        if (commandString) {
            console.log(`%c CMD >> ${commandString}`, 'background: #222; color: #bada55; font-size: 12px; padding: 2px 5px; border-radius: 2px;');
        }
    }
}