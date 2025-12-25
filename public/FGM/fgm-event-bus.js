/**
 * FGM Event Bus System
 * Provides centralized event handling for the FGM system
 */

/**
 * Event type constants
 */
class FGMEventTypes {
    // UI Interaction Events
    static get PRESET_CLICKED() { return 'preset.clicked'; }
    static get WINDOW_CLICKED() { return 'window.clicked'; }
    static get BACKGROUND_CLICKED() { return 'background.clicked'; }

    // Input Field Events
    static get FADER_UPDATE() { return 'fader.update'; }
    static get ENCODER_UPDATE() { return 'encoder.update'; }
    static get COLOR_PICKER_UPDATE() { return 'colorPicker.update'; }

    // Table Events
    static get TABLE_CELL_CLICKED() { return 'table.cell.clicked'; }
    static get TABLE_ROW_DELETED() { return 'table.row.deleted'; }
    static get TABLE_ROW_ADDED() { return 'table.row.added'; }

    // Keyboard Events
    static get KEYBOARD_ENTER() { return 'keyboard.enter'; }
    static get KEYBOARD_UPDATE() { return 'keyboard.update'; }

    // System Events
    static get INIT() { return 'system.init'; }
    static get PAGE_CHANGE() { return 'system.pageChange'; }
    static get PATCH_CHANGED() { return 'system.patchChanged'; }
    static get SELECTION_CHANGED() { return 'programmer.selectionChanged'; } // Added // Added

    // Await action Events
    static get AWAIT_KEYBOARD_INPUT() {}

    // Wildcard - matches all events
    static get ALL() { return '*'; }
}

/**
 * Event data wrapper
 */
class FGMEvent {
    constructor(type, data = {}) {
        this.type = type;
        this.timestamp = Date.now();
        this.data = data;
        this.cancelled = false;
        this.propagationStopped = false;
    }

    /**
     * Cancel the event (prevents default behavior)
     */
    cancel() {
        this.cancelled = true;
    }

    /**
     * Stop event propagation (prevents other handlers from running)
     */
    stopPropagation() {
        this.propagationStopped = true;
    }

    /**
     * Check if event is cancelled
     */
    isCancelled() {
        return this.cancelled;
    }

    /**
     * Check if propagation is stopped
     */
    isPropagationStopped() {
        return this.propagationStopped;
    }
}

/**
 * Event handler wrapper with metadata
 */
class FGMEventHandler {
    /**
     * @param {Function} handler - The handler function
     * @param {Object} options - Handler options
     * @param {Function} options.filter - Filter function to determine if handler should run
     * @param {number} options.priority - Priority (higher = runs first)
     * @param {boolean} options.once - If true, handler runs only once then is removed
     * @param {string} options.name - Optional name for debugging
     * @param {Object} options.context - Context object (owner of the handler)
     */
    constructor(handler, options = {}) {
        this.handler = handler;
        this.filter = options.filter || (() => true);
        this.priority = options.priority || 0;
        this.once = options.once || false;
        this.name = options.name || 'anonymous';
        this.context = options.context || null;
        this.id = FGMEventHandler._generateId();
    }

    static _idCounter = 0;
    static _generateId() {
        return `handler_${++FGMEventHandler._idCounter}`;
    }

    /**
     * Check if this handler should run for the given event
     */
    shouldHandle(event) {
        try {
            return this.filter(event);
        } catch (error) {
            console.error(`Error in filter for handler ${this.name}:`, error);
            return false;
        }
    }

    /**
     * Execute the handler
     */
    execute(event) {
        try {
            return this.handler(event);
        } catch (error) {
            console.error(`Error in handler ${this.name}:`, error);
            throw error;
        }
    }
}

/**
 * Event filter helpers
 */
class FGMEventFilter {
    /**
     * Filter by window ID
     */
    static byWindowId(windowId) {
        return (event) => event.data.window?.getId() === windowId;
    }

    /**
     * Filter by field FGM type
     */
    static byFieldType(fgmType) {
        return (event) => event.data.field?.getFGMType() === fgmType;
    }

    /**
     * Filter by preset data property
     */
    static byPresetData(property, value) {
        return (event) => {
            const presetData = event.data.presetData || event.data.data;
            return presetData?.[property] === value;
        };
    }

    /**
     * Filter by awaiting action
     */
    static byAwaitingAction(actionType) {
        return (event) => FGMSubAction.getAwaitingAction() === actionType;
    }

    /**
     * Combine multiple filters with AND logic
     */
    static and(...filters) {
        return (event) => filters.every(filter => filter(event));
    }

    /**
     * Combine multiple filters with OR logic
     */
    static or(...filters) {
        return (event) => filters.some(filter => filter(event));
    }

    /**
     * Negate a filter
     */
    static not(filter) {
        return (event) => !filter(event);
    }
}

/**
 * Central Event Bus
 */
class FGMEventBus {
    static _instance = null;
    static _handlers = new Map(); // eventType -> Array of FGMEventHandler
    static _middlewares = [];
    static _debug = false;

    /**
     * Get singleton instance
     */
    static getInstance() {
        if (!FGMEventBus._instance) {
            FGMEventBus._instance = new FGMEventBus();
        }
        return FGMEventBus._instance;
    }

    /**
     * Enable/disable debug logging
     */
    static setDebug(enabled) {
        FGMEventBus._debug = enabled;
    }

    /**
     * Register an event handler
     * @param {string} eventType - Event type to listen for
     * @param {Function|Object} handlerOrOptions - Handler function or options object
     * @param {Object} options - Options if first param is a function
     * @returns {string} Handler ID for later removal
     */
    static on(eventType, handlerOrOptions, options = {}) {
        let handler;

        if (typeof handlerOrOptions === 'function') {
            handler = new FGMEventHandler(handlerOrOptions, options);
        } else {
            // handlerOrOptions is an options object with handler property
            const opts = handlerOrOptions;
            handler = new FGMEventHandler(opts.handler, opts);
        }

        if (!this._handlers.has(eventType)) {
            this._handlers.set(eventType, []);
        }

        const handlers = this._handlers.get(eventType);
        handlers.push(handler);

        // Sort by priority (higher priority first)
        handlers.sort((a, b) => b.priority - a.priority);

        if (this._debug) {
            console.log(`[EventBus] Registered handler "${handler.name}" for event "${eventType}" (priority: ${handler.priority})`);
        }

        return handler.id;
    }

    /**
     * Register a one-time event handler
     */
    static once(eventType, handlerOrOptions, options = {}) {
        if (typeof handlerOrOptions === 'function') {
            options.once = true;
            return this.on(eventType, handlerOrOptions, options);
        } else {
            handlerOrOptions.once = true;
            return this.on(eventType, handlerOrOptions);
        }
    }

    /**
     * Remove an event handler
     * @param {string} eventType - Event type
     * @param {string} handlerId - Handler ID returned from on()
     */
    static off(eventType, handlerId) {
        if (!this._handlers.has(eventType)) return;

        const handlers = this._handlers.get(eventType);
        const index = handlers.findIndex(h => h.id === handlerId);

        if (index !== -1) {
            handlers.splice(index, 1);
            if (this._debug) {
                console.log(`[EventBus] Removed handler ${handlerId} from event "${eventType}"`);
            }
        }
    }

    /**
     * Remove all handlers for a specific context (e.g., a module)
     */
    static offContext(context) {
        let removedCount = 0;

        for (const [eventType, handlers] of this._handlers.entries()) {
            const originalLength = handlers.length;
            this._handlers.set(
                eventType,
                handlers.filter(h => h.context !== context)
            );
            removedCount += originalLength - this._handlers.get(eventType).length;
        }

        if (this._debug) {
            console.log(`[EventBus] Removed ${removedCount} handlers for context`, context);
        }
    }

    /**
     * Emit an event
     * @param {string} eventType - Event type
     * @param {Object} data - Event data
     * @returns {FGMEvent} The event object
     */
    static emit(eventType, data = {}) {
        const event = new FGMEvent(eventType, data);

        if (this._debug) {
            console.log(`[EventBus] Emitting event "${eventType}"`, data);
        }

        // Run middlewares first
        for (const middleware of this._middlewares) {
            try {
                middleware(event);
                if (event.isCancelled() || event.isPropagationStopped()) {
                    if (this._debug) {
                        console.log(`[EventBus] Event "${eventType}" cancelled by middleware`);
                    }
                    return event;
                }
            } catch (error) {
                console.error('[EventBus] Middleware error:', error);
            }
        }

        // Get handlers for this specific event type
        const specificHandlers = this._handlers.get(eventType) || [];

        // Get wildcard handlers
        const wildcardHandlers = this._handlers.get(FGMEventTypes.ALL) || [];

        // Combine and sort by priority
        const allHandlers = [...specificHandlers, ...wildcardHandlers]
            .sort((a, b) => b.priority - a.priority);

        const handlersToRemove = [];

        for (const handler of allHandlers) {
            if (event.isPropagationStopped()) {
                if (this._debug) {
                    console.log(`[EventBus] Event "${eventType}" propagation stopped`);
                }
                break;
            }

            if (handler.shouldHandle(event)) {
                if (this._debug) {
                    console.log(`[EventBus] Running handler "${handler.name}" for event "${eventType}"`);
                }

                handler.execute(event);

                if (handler.once) {
                    handlersToRemove.push({ eventType, handlerId: handler.id });
                }
            }
        }

        // Remove one-time handlers
        for (const { eventType: type, handlerId } of handlersToRemove) {
            this.off(type, handlerId);
        }

        return event;
    }

    /**
     * Add middleware that runs before all handlers
     * @param {Function} middleware - Middleware function that receives the event
     */
    static use(middleware) {
        this._middlewares.push(middleware);
    }

    /**
     * Clear all handlers (useful for testing)
     */
    static clear() {
        this._handlers.clear();
        this._middlewares = [];
        if (this._debug) {
            console.log('[EventBus] Cleared all handlers and middlewares');
        }
    }

    /**
     * Get all registered handlers for debugging
     */
    static getHandlers(eventType = null) {
        if (eventType) {
            return this._handlers.get(eventType) || [];
        }
        return Object.fromEntries(this._handlers);
    }
}
