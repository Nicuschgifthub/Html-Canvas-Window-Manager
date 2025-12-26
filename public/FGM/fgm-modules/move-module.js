class FGMMoveModule extends FGMFeatureModule {
    constructor() {
        super('move', '1.0.0');
        this.isMoving = false;
    }

    init() {
        // Listen for the Move action button click
        this.on(FGMEventTypes.PRESET_CLICKED, {
            filter: FGMEventFilter.byPresetData('_actionId', FGMTypes.ACTIONS.BUTTON.MOVE),
            handler: (event) => this.handleMoveButton(event),
            priority: 20 // Higher priority to intercept before other handlers
        });
    }

    async handleMoveButton(event) {
        if (this.isMoving) return;
        this.isMoving = true;

        console.log("[MoveModule] Starting Move sequence...");
        event.stopPropagation();

        const initiatorPreset = event.data?.singlePreset;

        if (initiatorPreset) {
            initiatorPreset.setFlashing(true);
        }

        try {
            // 1. Await SOURCE preset
            const sourceEvent = await FGMSubAction.awaitAction({
                types: [FGMEventTypes.PRESET_CLICKED, FGMEventTypes.WINDOW_CLICKED],
                filter: (payload) => {
                    // Ignore action buttons (buttons with _actionId)
                    if (payload.singlePreset && payload.singlePreset.data?._actionId) return false;
                    return true;
                }
            });

            if (!sourceEvent || !sourceEvent.singlePreset) {
                console.log("[MoveModule] Move cancelled. Received:", sourceEvent);
                return;
            }

            const sourcePreset = sourceEvent.singlePreset;
            const sourceField = sourceEvent.field;
            const sourcePoolType = sourceField.getFGMType();

            // Find index in the field's preset array
            const sourceIndex = sourceField.presets.indexOf(sourcePreset);

            if (sourceIndex === -1) {
                console.error("[MoveModule] Could not find source index.");
                return;
            }

            console.log(`[MoveModule] Source selected: ${sourcePreset.name} at index ${sourceIndex} in ${sourcePoolType}`);

            // 2. Await DESTINATION preset
            const destEvent = await FGMSubAction.awaitAction({
                types: [FGMEventTypes.PRESET_CLICKED, FGMEventTypes.WINDOW_CLICKED],
                filter: (payload) => {
                    // If it's a preset click, ensure it's in the same pool type and NOT an action button
                    if (payload.singlePreset) {
                        return payload.field.getFGMType() === sourcePoolType && !payload.singlePreset.data?._actionId;
                    }
                    return true;
                }
            });

            if (initiatorPreset) {
                initiatorPreset.setFlashing(false);
            }

            if (!destEvent || !destEvent.singlePreset) {
                console.log("[MoveModule] Move cancelled (destination not a preset or wrong pool).");
                return;
            }

            const destPreset = destEvent.singlePreset;
            const destField = destEvent.field;
            const destIndex = destField.presets.indexOf(destPreset);

            if (destIndex === -1) {
                console.error("[MoveModule] Could not find destination index.");
                return;
            }

            console.log(`[MoveModule] Destination selected: ${destPreset.name} at index ${destIndex}`);

            // 3. Execute SWAP
            FGMStore.swapPresets(sourcePoolType, sourceIndex, destIndex);

            console.log(`[MoveModule] Swap complete for ${sourcePoolType}`);
        } catch (err) {
            console.error("[MoveModule] Error during move:", err);
        } finally {
            this.isMoving = false;
            FGMSubAction.clearAwaitingAction();
        }
    }
}
