class FGMLoadFiles {
    static files() {
        return [
            '/FGM/fgm-ids.js',
            '/FGM/fgm-definitions.js',
            '/FGM/fgm-library.js',
            '/FGM/fgm-store.js',
            '/FGM/fgm-fixtures.js',
            '/FGM/fgm-programmer.js',
            '/FGM/fgm-colors.js',
            '/FGM/fgm-page-handler.js',
            '/FGM/fgm-window-manager.js',
            '/FGM/fmg-kernel-classes.js',
            '/FGM/fgm-action-handlers.js',
            '/FGM/fgm-event-bus.js',                      // Event bus system (MUST load before modules)
            '/FGM/fgm-feature-module.js',                 // Feature module system (MUST load before modules)
            '/FGM/fgm-kernel.js',                         // well this is important
            '/FGM/fgm-modules/awaiting-actions-module.js',// Awaiting actions handler
            '/FGM/fgm-modules/artnet-module.js',          // ArtNet module
            '/FGM/fgm-modules/programmer-module.js',      // Programmer module
            '/FGM/fgm-modules/edit-name-module.js',       // Edit name module
            '/FGM/fgm-modules/fixture-patch-module.js',   // Fixture patch module
            '/FGM/fgm-modules/page-module.js',            // Page module
            '/FGM/fgm-modules/pool-module.js',            // Pool module
            '/FGM/fgm-modules/store-module.js',           // Store module
            '/FGM/fgm-modules/programmer-sheet-module.js',// Programmer sheet module
            '/FGM/fgm-base-windows.js',
            '/FGM/fgm-init.js'
        ]
    }

    static async _loadFiles() {
        const scriptPromises = this.files().map(file => this._loadScript(file));
        return Promise.all(scriptPromises);
    }

    static _loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = src;
            script.type = "text/javascript";
            script.async = true;

            script.onload = () => {
                console.log(`FGM Script loaded: ${src}`);
                resolve();
            }

            script.onerror = () => {
                console.error(`Failed to load script: ${src}`);
                reject(new Error(`Failed to load script: ${src}`));
            }

            document.head.appendChild(script);
        });
    }
}

FGMLoadFiles._loadFiles();