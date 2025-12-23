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
            '/FGM/fgm-kernel.js',
            '/FGM/fgm-base-windows.js',
            '/FGM/fgm-hcw-setup.js'
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