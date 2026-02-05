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
                commandString = `${keyword} ${location} At byte ${data.byte}`;
                break;

            case GLOBAL_TYPES.ACTIONS.ENCODER_VALUE_UPDATE:
                commandString = `${keyword} ${location} At inner ${data.outer.byte} outer ${data.inner.byte}`;
                break;

            case GLOBAL_TYPES.ACTIONS.PRESET_PRESS:
                const childKw = field.address.childKeyword || 'Preset';
                commandString = `${keyword} ${location} ${childKw} ${data.preset.getId()} Go+`;
                break;

            case GLOBAL_TYPES.ACTIONS.COLOR_FIELD_UPDATE:
                const c = data.colors;
                commandString = `${keyword} ${location} At r ${c.r} g ${c.g} b ${c.b} c ${c.white || 0} a ${c.amber || 0} u ${c.uv || 0}`;
                break;

            case GLOBAL_TYPES.ACTIONS.KEYBOARD_UPDATES.ENTER_PRESSED:
                commandString = `${keyword} ${location} Enter '${data.value}'`;
                break;

            case GLOBAL_TYPES.ACTIONS.NUMPAD_UPDATES.ENTER_PRESSED:
                commandString = `${keyword} ${location} Enter '${data.value}'`;
                break;

            case GLOBAL_TYPES.ACTIONS.TABLE_UPDATES.CELL_PRESS:
                commandString = `${keyword} ${location} Press Row ${data.rowIndex} Index ${data.colIndex} Value '${data.value}'`;
                break;

            case GLOBAL_TYPES.ACTIONS.TABLE_UPDATES.CELL_DELETE:
                commandString = `${keyword} ${location} Delete Row ${data.rowIndex}`;
                break;

            case GLOBAL_TYPES.ACTIONS.TABLE_UPDATES.CELL_ADD:
                commandString = `${keyword} ${location} Add`;
                break;

            case GLOBAL_TYPES.ACTIONS.SEARCH_UPDATES.RESULT_PRESS:
                commandString = `${keyword} ${location} Load Result '${data.name}'`;
                break;

            case GLOBAL_TYPES.ACTIONS.SEARCH_UPDATES.SEARCH_BAR_PRESS:
                commandString = `${keyword} ${location} Focus '${data.searchValue}'`;
                break;

            case GLOBAL_TYPES.ACTIONS.CUSTOM_ENCODER_VALUE_UPDATE:
                commandString = `${keyword} ${location} At outer ${data.outer.byte} inner ${data.inner.byte}`;
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

        commandString += ` <Internal>`; // so the element doesnt fire itself since when typing a command manuel it will update

        if (commandString) {
            console.log(`%c CMD >> ${commandString}`, 'background: #222; color: #bada55; font-size: 12px; padding: 2px 5px; border-radius: 2px;');
        }

        FGMCommandEngine.command(commandString);
    }
}