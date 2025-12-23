/**
 * FGM Feature Module System
 * Allows creating self-contained feature modules that register their own events and actions
 */

/**
 * Base class for all feature modules
 */
class FGMFeatureModule {
    /**
     * @param {string} name - Module name (unique identifier)
     * @param {string} version - Module version
     * @param {Array<string>} dependencies - Array of module names this module depends on
     */
    constructor(name, version = '1.0.0', dependencies = []) {
        this.name = name;
        this.version = version;
        this.dependencies = dependencies;
        this.enabled = false;
        this.initialized = false;
        this._eventHandlerIds = new Map(); // eventType -> [handlerIds]
        this._registeredActions = [];
    }

    /**
     * Initialize the module
     * Override this in subclasses to register events and actions
     */
    init() {
        // Override in subclass
        console.warn(`Module ${this.name} has no init() implementation`);
    }

    /**
     * Cleanup when module is disabled
     * Override this in subclasses if needed
     */
    destroy() {
        // Override in subclass if needed
    }

    /**
     * Enable the module
     */
    enable() {
        if (this.enabled) return;

        if (!this.initialized) {
            this.init();
            this.initialized = true;
        }

        this.enabled = true;
        console.log(`[Module] Enabled: ${this.name}`);
    }

    /**
     * Disable the module
     */
    disable() {
        if (!this.enabled) return;

        // Remove all event handlers
        FGMEventBus.offContext(this);

        // Clear tracking
        this._eventHandlerIds.clear();

        this.enabled = false;
        this.destroy();
        console.log(`[Module] Disabled: ${this.name}`);
    }

    /**
     * Register an event handler (convenience wrapper around FGMEventBus.on)
     * @param {string} eventType - Event type to listen for
     * @param {Function|Object} handlerOrOptions - Handler function or options object
     * @param {Object} options - Options if first param is a function
     */
    on(eventType, handlerOrOptions, options = {}) {
        // Add this module as context
        if (typeof handlerOrOptions === 'function') {
            options.context = this;
            options.name = options.name || `${this.name}.${eventType}`;
        } else {
            handlerOrOptions.context = this;
            handlerOrOptions.name = handlerOrOptions.name || `${this.name}.${eventType}`;
        }

        const handlerId = FGMEventBus.on(eventType, handlerOrOptions, options);

        // Track handler ID for cleanup
        if (!this._eventHandlerIds.has(eventType)) {
            this._eventHandlerIds.set(eventType, []);
        }
        this._eventHandlerIds.get(eventType).push(handlerId);

        return handlerId;
    }

    /**
     * Register a one-time event handler
     */
    once(eventType, handlerOrOptions, options = {}) {
        if (typeof handlerOrOptions === 'function') {
            options.once = true;
            return this.on(eventType, handlerOrOptions, options);
        } else {
            handlerOrOptions.once = true;
            return this.on(eventType, handlerOrOptions);
        }
    }

    /**
     * Emit an event (convenience wrapper)
     */
    emit(eventType, data = {}) {
        return FGMEventBus.emit(eventType, data);
    }

    /**
     * Register an action handler
     * @param {string} actionType - Action type constant
     * @param {Object|FGMBaseHandler} handler - Handler object or instance
     */
    registerAction(actionType, handler) {
        // If handler is a plain object with methods, wrap it
        if (!(handler instanceof FGMBaseHandler)) {
            // Capture the handler object in a different variable to avoid recursion
            const handlerObj = handler;

            const HandlerClass = class extends FGMBaseHandler {
                handleInteraction(actionStore) {
                    if (handlerObj.handleInteraction) {
                        return handlerObj.handleInteraction(actionStore);
                    }
                }

                handleKeyboardEnter(value) {
                    if (handlerObj.handleKeyboardEnter) {
                        return handlerObj.handleKeyboardEnter(value);
                    }
                }

                handleKeyboardUpdate(win, field, value) {
                    if (handlerObj.handleKeyboardUpdate) {
                        return handlerObj.handleKeyboardUpdate(win, field, value);
                    }
                }
            };

            handler = new HandlerClass();
        }

        FGMActionRegistry.register(actionType, handler);
        this._registeredActions.push(actionType);

        console.log(`[Module] ${this.name} registered action: ${actionType}`);
    }

    /**
     * Get module info
     */
    getInfo() {
        return {
            name: this.name,
            version: this.version,
            dependencies: this.dependencies,
            enabled: this.enabled,
            initialized: this.initialized,
            eventHandlers: Array.from(this._eventHandlerIds.keys()),
            actions: this._registeredActions
        };
    }
}

/**
 * Module Registry - manages all feature modules
 */
class FGMModuleRegistry {
    static _modules = new Map(); // name -> FGMFeatureModule
    static _initOrder = []; // Modules in dependency-resolved order

    /**
     * Register a module
     * @param {FGMFeatureModule} module - Module instance
     */
    static register(module) {
        if (!(module instanceof FGMFeatureModule)) {
            throw new Error('Module must extend FGMFeatureModule');
        }

        if (this._modules.has(module.name)) {
            console.warn(`[ModuleRegistry] Module ${module.name} already registered, replacing...`);
        }

        this._modules.set(module.name, module);
        console.log(`[ModuleRegistry] Registered module: ${module.name} v${module.version}`);
    }

    /**
     * Get a module by name
     * @param {string} name - Module name
     * @returns {FGMFeatureModule|null}
     */
    static get(name) {
        return this._modules.get(name) || null;
    }

    /**
     * Get all registered modules
     * @returns {Array<FGMFeatureModule>}
     */
    static getAll() {
        return Array.from(this._modules.values());
    }

    /**
     * Initialize all modules in dependency order
     */
    static initializeAll() {
        console.log('[ModuleRegistry] Initializing all modules...');

        // Resolve dependencies and get init order
        this._initOrder = this._resolveDependencies();

        // Initialize in order
        for (const module of this._initOrder) {
            try {
                module.enable();
            } catch (error) {
                console.error(`[ModuleRegistry] Failed to initialize module ${module.name}:`, error);
            }
        }

        console.log(`[ModuleRegistry] Initialized ${this._initOrder.length} modules`);
    }

    /**
     * Resolve module dependencies and return modules in init order
     * @returns {Array<FGMFeatureModule>}
     */
    static _resolveDependencies() {
        const modules = Array.from(this._modules.values());
        const resolved = [];
        const seen = new Set();

        const visit = (module) => {
            if (seen.has(module.name)) {
                return;
            }

            seen.add(module.name);

            // Visit dependencies first
            for (const depName of module.dependencies) {
                const dep = this._modules.get(depName);
                if (!dep) {
                    throw new Error(`Module ${module.name} depends on ${depName}, but it's not registered`);
                }
                visit(dep);
            }

            resolved.push(module);
        };

        for (const module of modules) {
            visit(module);
        }

        return resolved;
    }

    /**
     * Enable a specific module
     * @param {string} name - Module name
     */
    static enable(name) {
        const module = this._modules.get(name);
        if (!module) {
            console.error(`[ModuleRegistry] Module ${name} not found`);
            return;
        }

        // Check dependencies
        for (const depName of module.dependencies) {
            const dep = this._modules.get(depName);
            if (!dep || !dep.enabled) {
                console.error(`[ModuleRegistry] Cannot enable ${name}: dependency ${depName} is not enabled`);
                return;
            }
        }

        module.enable();
    }

    /**
     * Disable a specific module
     * @param {string} name - Module name
     */
    static disable(name) {
        const module = this._modules.get(name);
        if (!module) {
            console.error(`[ModuleRegistry] Module ${name} not found`);
            return;
        }

        // Check if other modules depend on this one
        const dependents = this.getAll().filter(m =>
            m.enabled && m.dependencies.includes(name)
        );

        if (dependents.length > 0) {
            console.warn(`[ModuleRegistry] Disabling ${name} will affect: ${dependents.map(m => m.name).join(', ')}`);
        }

        module.disable();
    }

    /**
     * Get module info for debugging
     */
    static getInfo() {
        return this.getAll().map(m => m.getInfo());
    }

    /**
     * Clear all modules (for testing)
     */
    static clear() {
        for (const module of this._modules.values()) {
            if (module.enabled) {
                module.disable();
            }
        }
        this._modules.clear();
        this._initOrder = [];
        console.log('[ModuleRegistry] Cleared all modules');
    }
}

/**
 * Module Loader - utility for loading modules from files
 */
class FGMModuleLoader {
    /**
     * Load a module from a constructor
     * @param {Function} ModuleClass - Module class constructor
     * @param {Array} args - Constructor arguments
     */
    static load(ModuleClass, ...args) {
        try {
            const module = new ModuleClass(...args);
            FGMModuleRegistry.register(module);
            return module;
        } catch (error) {
            console.error('[ModuleLoader] Failed to load module:', error);
            return null;
        }
    }

    /**
     * Load multiple modules
     * @param {Array<Function>} moduleClasses - Array of module class constructors
     */
    static loadMultiple(moduleClasses) {
        const loaded = [];

        for (const ModuleClass of moduleClasses) {
            const module = this.load(ModuleClass);
            if (module) {
                loaded.push(module);
            }
        }

        return loaded;
    }
}
