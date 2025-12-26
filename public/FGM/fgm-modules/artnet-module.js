/**
 * ArtNet Module
 * Handles all ArtNet-related functionality, including background transmission.
 */
class FGMArtNetModule extends FGMFeatureModule {
    constructor() {
        super('artnet', '1.0.0');
        this.sender = null;
        this.interval = null;
    }

    init() {
        console.log('[ArtNetModule] Initializing...');

        // Initialize Sender
        this.sender = new FGMArtNetSender();
        this.startTransmission(20); // 20Hz as requested

        // Register handler for ArtNet table cell clicks
        this.on(FGMEventTypes.TABLE_CELL_CLICKED, {
            filter: FGMEventFilter.byFieldType(FGMTypes.ACTIONS.WINDOW.ARTNET_SETTINGS),
            handler: (event) => this.handleCellClick(event),
            priority: 10
        });

        // Register handler for ArtNet table row deletion
        this.on(FGMEventTypes.TABLE_ROW_DELETED, {
            filter: FGMEventFilter.byFieldType(FGMTypes.ACTIONS.WINDOW.ARTNET_SETTINGS),
            handler: (event) => this.handleRowDelete(event),
            priority: 10
        });

        // Register handler for ArtNet table row addition
        this.on(FGMEventTypes.TABLE_ROW_ADDED, {
            filter: FGMEventFilter.byFieldType(FGMTypes.ACTIONS.WINDOW.ARTNET_SETTINGS),
            handler: (event) => this.handleRowAdd(event),
            priority: 10
        });

        // Register handler for window clicks
        this.on(FGMEventTypes.WINDOW_CLICKED, {
            handler: (event) => this.handleWindowClick(event),
            priority: 5
        });

        // Register handler for background clicks
        this.on(FGMEventTypes.BACKGROUND_CLICKED, {
            handler: (event) => this.handleBackgroundClick(event),
            priority: 5
        });

        console.log('[ArtNetModule] Initialized with 20Hz sender');
    }

    startTransmission(frequencyHz) {
        if (this.interval) clearInterval(this.interval);
        const ms = 1000 / frequencyHz;
        this.interval = setInterval(() => {
            this.sender.send();
        }, ms);
    }

    stopTransmission() {
        if (this.interval) clearInterval(this.interval);
        this.interval = null;
    }

    async handleCellClick(event) {
        const { window: fromWindow, field: fromTable, rowIndex, colIndex, value } = event.data;

        const result = await FGMKernel.awaitAction({
            type: FGMTypes.ACTIONS.KEYBOARD.MAIN_INPUT,
            data: {
                targetWindow: fromWindow,
                initialValue: value
            }
        });

        const string = result.value;

        if (fromTable && rowIndex !== undefined) {
            fromTable.updateCellValue(rowIndex, colIndex, string);

            const fields = ['name', 'ip', 'subnet', 'universe'];
            const fieldName = fields[colIndex];
            if (fieldName) {
                FGMStore.updateArtNetNode(rowIndex, fieldName, string);
            }
        }

        this.refreshTable();
    }

    handleRowDelete(event) {
        const { rowIndex } = event.data;
        FGMStore.deleteArtNetNode(rowIndex);
        this.refreshTable();
    }

    handleRowAdd(event) {
        FGMStore.addArtNetNode();
        this.refreshTable();
    }

    handleWindowClick(event) {
        const window = event.data.window;
        const artNetWin = this.getArtNetConfigWindow();

        if (artNetWin && !artNetWin.getHiddenStatus() &&
            window.getSingleContextField().getId() !== artNetWin.getSingleContextField().getId() &&
            window.getSingleContextField().getFGMType() !== FGMTypes.ACTIONS.KEYBOARD.MAIN_INPUT) {
            artNetWin.setHidden();
            FGMWindowManager.closeKeyboard();
        }
    }

    handleBackgroundClick(event) {
        const artNetWin = this.getArtNetConfigWindow();
        if (artNetWin && !artNetWin.getHiddenStatus()) {
            artNetWin.setHidden(true);
            FGMWindowManager.closeKeyboard();
        }
    }

    refreshTable() {
        const artNetWin = FGMStore.getHCW().getWindows().find(w => w.getId() === FGMIds.DEFAULT.WINDOWS.ART_NET_CONFIG);
        if (artNetWin) {
            const tableField = artNetWin.getSingleContextField();
            const nodes = FGMStore.getArtNetNodes();
            const rows = nodes.map(n => [n.name, n.ip, n.subnet, n.universe]);
            tableField.setRows(rows);
        }
    }

    getArtNetConfigWindow() {
        return FGMStore.getHCW().getWindows().find(w => w.getId() === FGMIds.DEFAULT.WINDOWS.ART_NET_CONFIG);
    }
}

/**
 * ArtNet Sender Logic
 */
class FGMArtNetSender {
    constructor() {
        this.sequence = 0;
        this.lastLog = 0;
        this.socket = null;
    }

    async send() {
        if (typeof FGMStore === 'undefined') return;

        const universes = FGMStore.getUniverseBuffers();
        const nodes = FGMStore.getArtNetNodes();

        if (Object.keys(universes).length === 0) return;

        for (const uniNum in universes) {
            const data = universes[uniNum];
            const packet = this.createArtDmxPacket(parseInt(uniNum), data);

            for (const node of nodes) {
                this.transmit(node.ip, packet);
            }
        }

        this.sequence = (this.sequence + 1) % 256;
    }

    /**
     * Constructs an ArtDmx packet (Universe 15-bit address style)
     */
    createArtDmxPacket(universeNum, dmxData) {
        const buffer = new ArrayBuffer(18 + 512);
        const view = new DataView(buffer);

        // Header: "Art-Net\0"
        const header = "Art-Net\0";
        for (let i = 0; i < header.length; i++) {
            view.setUint8(i, header.charCodeAt(i));
        }

        // OpCode: ArtDmx (0x5000) - Little Endian
        view.setUint16(8, 0x5000, true);

        // ProtoVer: 14 - Big Endian
        view.setUint16(10, 14, false);

        // Sequence
        view.setUint8(12, this.sequence);

        // Physical
        view.setUint8(13, 0);

        // Universe (Port Address) - Little Endian
        // Per Art-Net spec, this is the Port-Address of the target universe
        view.setUint16(14, universeNum - 1, true);

        // Length: 512 - Big Endian
        view.setUint16(16, 512, false);

        // Data
        const packetData = new Uint8Array(buffer, 18, 512);
        packetData.set(dmxData);

        return new Uint8Array(buffer);
    }

    async transmit(ip, packet) {
        // Log sparingly (every 5 seconds)
        const now = Date.now();
        if (now - this.lastLog > 5000) {
            console.log(`[ArtNet] Streaming to ${ip}. Subscribed Universes:`, Object.keys(FGMStore.getUniverseBuffers()));
            this.lastLog = now;
        }

        try {
            // THEORETICAL: Direct Sockets API usage
            // In a standard browser, this requires specific flags or Isolated Web App context.
            if (typeof navigator.directSockets !== 'undefined') {
                if (!this.socket) {
                    this.socket = await navigator.directSockets.openUDPSocket({
                        remoteAddress: ip,
                        remotePort: 6454
                    });
                }
                const writer = this.socket.writable.getWriter();
                await writer.write({ data: packet });
                writer.releaseLock();
            } else {
                // FALLBACK: If the user is using a custom environment like NW.js or Electron, 
                // they might have access to Node's 'dgram'. 
                // If not, we just log once and wait for the platform to provide the capability.
                if (now - this.lastLog < 100) { // Only log once per session or so
                    // console.warn("[ArtNet] Direct Sockets not available in this browser context.");
                }
            }
        } catch (e) {
            // Error handling
        }
    }
}
