class FGMLoadFiles {
    static files() {
        return [
            // build structs
            '/fgm/build-structs/defs-store.js',
            // .settings
            '/fgm/build-structs/settings/defs-window-settings.js',
            // .windows
            '/fgm/build-structs/windows/config-menu-window.js',
            '/fgm/build-structs/windows/page-menu-window.js',
            '/fgm/build-structs/windows/add-window-menu.js',
            '/fgm/build-structs/fgm-build-structs.js',
            // fgm root manager
            '/fgm/fgm-command-engine.js',
            '/fgm/fgm-context-class-helper.js',
            '/fgm/fgm-show-file.js',
            '/fgm/fgm-event-bridge.js',
            '/fgm/fgm-window-manager.js',
            '/fgm/fgm-window-settings.js',
            // Input devices
            'fgm/input-device-interactions/fgm-keyboard-interaction.js',
            'fgm/input-device-interactions/fgm-presetGroup-interaction.js',
            // List of Keyword executor
            'fgm/key-word-executor/PresetGroup.js',
            'fgm/key-word-executor/Fader.js',
            'fgm/key-word-executor/Encoder.js',
            'fgm/key-word-executor/ColorMap.js',
            'fgm/key-word-executor/Table.js',
            'fgm/key-word-executor/XYPad.js',
        ]
    }

    static async _loadFiles() {
        for (const file of this.files()) {
            await this._loadScript(file);
        }
    }

    static _loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = src;
            script.type = "text/javascript";
            script.async = false;

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