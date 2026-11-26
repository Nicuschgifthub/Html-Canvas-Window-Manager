/**
 * FGMModal — small helpers for full-screen modal flows (patch, assignments,
 * fixture library …) built on GlobalInterrupter, the same way the window
 * settings and keyboard flows work.
 *
 *   const table = FGMModal.openTable({ title, headers, rows, addLabel, removable });
 *   const action = await FGMModal.nextTableAction();   // { type: 'cell'|'add'|'delete'|'close', rowIndex, colIndex }
 *   const value  = await FGMModal.choose({ title, options: [{ label, value, color }] });
 *   const text   = await FGMModal.input({ label, initial, verify });
 *   FGMModal.showOnly(table.window);   // re-show the table after a sub dialog
 *   FGMModal.close(table.window);
 */
class FGMModal {

    static get TABLE() { return { ID: 1010, LOCATION_ID: '0.010' }; }
    static get MENU() { return { ID: 1011, LOCATION_ID: '0.011' }; }

    static _focusRect() {
        return HCWPositions.getMiddleUserFocusPosition(1) || { x: 100, y: 100, sx: 600, sy: 400 };
    }

    /** Hide everything and show only `win`. */
    static showOnly(win) {
        FGMShowHandler.setPageEmpty();
        if (win) win.setHidden(false);
        HCWRender.updateFrame();
    }

    static close(win) {
        if (win) HCWDB.removeWindowByWindowId(win.getId());
        FGMShowHandler.setPageCursor();
        HCWRender.updateFrame();
    }

    // ── table ────────────────────────────────────────────────────────────

    static openTable({ title, headers, rows, addLabel = null, addColor = null, removable = false, slot = FGMModal.TABLE }) {
        const existing = HCWDB.getWindowById(slot.ID);
        if (existing) HCWDB.removeWindowByWindowId(slot.ID);

        const { x, y, sx, sy } = this._focusRect();
        const field = new HCWTableField(title)
            .setLocationId(slot.LOCATION_ID)
            .setHeaders(headers)
            .setRows(rows)
            .setButtonRemoveRow(removable)
            .setTitleBar(true);

        if (addLabel) {
            field.setButtonAddRowLabel(addLabel);
            if (addColor) field.setButtonAddRowLabelBGColor(addColor);
        }

        const window = new HCWWindow()
            .setTouchZoneColor(GLOBAL_STYLES.FIELDS_GLOBAL.TEMP_TOUCH_ZONE_COLOR)
            .setPosition(x, y)
            .setSize(sx, sy)
            .setContextField(field)
            .setPageId(GLOBAL_CORE.DEFS.PAGES.EMPTY)
            .setId(slot.ID);

        FGMShowHandler.setPageEmpty();
        HCWDB.addWindows([window]);
        HCWRender.updateFrame();
        return { window, field };
    }

    static async nextTableAction() {
        while (true) {
            const { GlobalActionType, resolvedAction } = await GlobalInterrupter.waitForSome(
                GLOBAL_TYPES.ACTIONS.TABLE_UPDATES.CELL_PRESS,
                GLOBAL_TYPES.ACTIONS.TABLE_UPDATES.CELL_ADD,
                GLOBAL_TYPES.ACTIONS.TABLE_UPDATES.CELL_DELETE,
                GLOBAL_TYPES.ACTIONS.BACKGROUND_CLICKED,
                GLOBAL_TYPES.ACTIONS.BACKGROUND_DRAG,
                GLOBAL_TYPES.ACTIONS.WINDOW.CLICKED
            );

            switch (GlobalActionType) {
                case GLOBAL_TYPES.ACTIONS.WINDOW.CLICKED:
                    continue;
                case GLOBAL_TYPES.ACTIONS.TABLE_UPDATES.CELL_PRESS:
                    return { type: 'cell', rowIndex: resolvedAction.rowIndex, colIndex: resolvedAction.colIndex };
                case GLOBAL_TYPES.ACTIONS.TABLE_UPDATES.CELL_ADD:
                    return { type: 'add' };
                case GLOBAL_TYPES.ACTIONS.TABLE_UPDATES.CELL_DELETE:
                    return { type: 'delete', rowIndex: resolvedAction.rowIndex };
                default:
                    return { type: 'close' };
            }
        }
    }

    // ── preset based chooser ─────────────────────────────────────────────

    /**
     * Show options as preset buttons.
     * single: resolves with the chosen value, or null when cancelled (background click).
     * multi:  options toggle, resolves with the array of chosen values on "Done".
     */
    static async choose({ title, options, multi = false, selected = [], doneLabel = 'Done' }) {
        const { x, y, sx, sy } = this._focusRect();
        const field = new HCWPresetField(title).setLocationId(FGMModal.MENU.LOCATION_ID);
        const chosen = new Set(selected);

        const rebuild = () => {
            field.clearAllPresets();
            options.forEach((opt, i) => {
                const p = new HCWPreset(opt.label)
                    .setDefaultColor(opt.color || GS.FIELDS.PRESETS.DEFAULT_COLOR)
                    .setData({ _modalIndex: i });
                if (multi ? chosen.has(opt.value) : opt.selected) p.setSelected(true);
                field.addPresets(p);
            });
            if (multi) {
                field.addPresets(new HCWPreset(doneLabel).setDefaultColor('#006633').setData({ _modalDone: true }));
            }
            HCWRender.updateFrame();
        };

        const window = new HCWWindow()
            .setTouchZoneColor(GLOBAL_STYLES.FIELDS_GLOBAL.TEMP_TOUCH_ZONE_COLOR)
            .setPosition(x, y)
            .setSize(sx, sy)
            .setContextField(field)
            .setPageId(GLOBAL_CORE.DEFS.PAGES.EMPTY)
            .setId(FGMModal.MENU.ID);

        FGMShowHandler.setPageEmpty();
        HCWDB.addWindows([window]);
        rebuild();

        let result = null;
        while (true) {
            const { GlobalActionType, resolvedAction } = await GlobalInterrupter.waitForSome(
                GLOBAL_TYPES.ACTIONS.PRESET_PRESS,
                GLOBAL_TYPES.ACTIONS.BACKGROUND_CLICKED,
                GLOBAL_TYPES.ACTIONS.BACKGROUND_DRAG,
                GLOBAL_TYPES.ACTIONS.WINDOW.CLICKED
            );
            if (GlobalActionType === GLOBAL_TYPES.ACTIONS.WINDOW.CLICKED) continue;
            if (GlobalActionType !== GLOBAL_TYPES.ACTIONS.PRESET_PRESS) break;

            const data = resolvedAction.presetData || {};
            if (data._modalDone) { result = [...chosen]; break; }
            const opt = options[data._modalIndex];
            if (!opt) continue;

            if (!multi) { result = opt.value; break; }
            if (chosen.has(opt.value)) chosen.delete(opt.value); else chosen.add(opt.value);
            rebuild();
        }

        HCWDB.removeWindowByWindowId(window.getId());
        HCWRender.updateFrame();
        return result;
    }

    // ── keyboard ─────────────────────────────────────────────────────────

    /** Resolves with the entered text, or null when cancelled. */
    static async input({ label, initial = '', verify = null }) {
        const settings = FGMKeyboardInteractionSettings.create()
            .setLabel(label)
            .setInitialValue(String(initial));
        if (verify) settings.setVerify(verify);
        return FGMKeyboardInteraction.openKeyboard(settings);
    }

    // ── shared verifiers ─────────────────────────────────────────────────

    static verifyInt(min, max) {
        return (v) => {
            const s = String(v).trim();
            if (!/^\d+$/.test(s)) return { valid: false, infoText: 'Whole number' };
            const n = Number(s);
            if (n < min || n > max) return { valid: false, infoText: `${min} - ${max}` };
            return { valid: true, infoText: '' };
        };
    }

    /** "1.001", "1.1", "2/17" or a plain address "17" (universe 1) */
    static parseAddress(text) {
        const s = String(text).trim();
        const m = /^(?:(\d+)[./])?(\d+)$/.exec(s);
        if (!m) return null;
        const universe = m[1] ? Number(m[1]) : 1;
        const address = Number(m[2]);
        if (universe < 1 || universe > 32768 || address < 1 || address > 512) return null;
        return { universe, address };
    }

    static verifyAddress() {
        return (v) => FGMModal.parseAddress(v)
            ? { valid: true, infoText: '' }
            : { valid: false, infoText: 'Universe.Address e.g. 1.001' };
    }
}

globalThis.FGMModal = FGMModal;
