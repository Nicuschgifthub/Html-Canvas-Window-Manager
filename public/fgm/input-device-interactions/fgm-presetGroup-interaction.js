class FGMPresetGroupInteraction {
    static field = null;
    static window = null;

    static async openPersistentMenu(menuData, targetObj) {
        const { x, y, sx, sy } = HCWPositions.getMiddleUserFocusPosition(1);

        this.field = new HCWPresetField(menuData.label || "Settings");
        this.window = new HCWWindow()
            .setPosition(x, y)
            .setSize(sx, sy)
            .setContextField(this.field)
            .setPageId(GLOBAL_CORE.CONTEXT_FIELDS._PRESET_GROUP.PAGE)
            .setId(GLOBAL_CORE.CONTEXT_FIELDS._PRESET_GROUP.ID);

        HCWDB.addWindows([this.window]);

        let currentStack = [menuData];

        const rebuild = () => {
            const current = currentStack[currentStack.length - 1];
            this.field.clearAllPresets();
            this.field.setLabel(current.label || "Settings");

            // 1. Navigation: Back Button
            if (currentStack.length > 1) {
                this.field.addPresets(
                    new HCWPreset("<- Back")
                        .setData({ _internalAction: 'BACK' })
                        .setColor('#443333')
                );
            }

            const optionsToRender = current.options || [];
            optionsToRender.forEach(opt => {
                const p = new HCWPreset(opt.label).setData(opt);

                if (opt.children) {
                    p.setColor(opt.color || '#2c3e50');
                } else {
                    if (opt.color) p.setColor(opt.color);

                    const isActive = targetObj[opt.key] === opt.value;
                    p.setSelected(isActive);
                }
                this.field.addPresets(p);
            });

            if (currentStack.length === 1) {
                this.field.addPresets(
                    new HCWPreset("Done")
                        .setData({ _internalAction: 'EXIT' })
                        .setColor(GLOBAL_STYLES.INFO.GOOD)
                );
            }

            HCWRender.updateFrame();
        };

        rebuild();

        while (true) {
            const { GlobalActionType, resolvedAction } = await GlobalInterrupter.waitForSome(
                GLOBAL_TYPES.ACTIONS.PRESET_PRESS,
                GLOBAL_TYPES.ACTIONS.BACKGROUND_CLICKED,
                GLOBAL_TYPES.ACTIONS.WINDOW.CLICKED
            );

            if (GlobalActionType === GLOBAL_TYPES.ACTIONS.WINDOW.CLICKED) continue;
            if (GlobalActionType === GLOBAL_TYPES.ACTIONS.BACKGROUND_CLICKED) break;

            if (GlobalActionType === GLOBAL_TYPES.ACTIONS.PRESET_PRESS) {
                const item = resolvedAction.presetData;
                if (!item) continue;

                if (item._internalAction === 'EXIT') break;

                if (item._internalAction === 'BACK') {
                    currentStack.pop();
                    rebuild();
                    continue;
                }

                if (item.children) {
                    let nextMenu = item.children;
                    if (Array.isArray(item.children)) {
                        nextMenu = { label: item.label, options: item.children };
                    }

                    currentStack.push(nextMenu);
                    rebuild();
                    continue;
                }

                if (item.key !== undefined) {
                    targetObj[item.key] = item.value;
                    if (menuData.onUpdate) menuData.onUpdate(targetObj);
                    rebuild();
                }
            }
        }

        this.close();
        return targetObj;
    }

    static close() {
        if (this.window) {
            HCWDB.removeWindowByWindowId(this.window.getId());
            this.window = null;
            this.field = null;
            HCWRender.updateFrame();
        }
    }
}