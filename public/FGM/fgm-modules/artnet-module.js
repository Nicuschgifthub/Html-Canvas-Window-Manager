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

            const fields = ['name', 'ip', 'subnet', 'universe', 'softUni'];
            const fieldName = fields[colIndex];
            if (fieldName) {
                // Handle numeric fields
                const finalValue = (fieldName === 'softUni') ? parseInt(string) || 1 : string;
                FGMStore.updateArtNetNode(rowIndex, fieldName, finalValue);
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
            const rows = nodes.map(n => [n.name, n.ip, n.subnet, n.universe, n.softUni]);
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
        this.sockets = new Map(); // Keyed by remote IP
        this.lastBridgeError = 0;
    }

    async send() {
        if (typeof FGMStore === 'undefined') return;

        const universes = FGMStore.getUniverseBuffers();
        const nodes = FGMStore.getArtNetNodes();

        if (Object.keys(universes).length === 0) return;

        for (const node of nodes) {
            if (node.ip && node.ip !== "0.0.0.0") {
                const softUni = (node.softUni !== undefined && node.softUni !== "") ? parseInt(node.softUni) : 1;
                const dmxData = universes[softUni];

                if (dmxData) {
                    const artNetAddr = this.parseArtNetUniverse(node.universe);
                    const packet = this.createArtDmxPacket(artNetAddr, dmxData);
                    this.transmit(node.ip, packet);
                } else if (this.sequence % 100 === 0) {
                    console.warn(`[ArtNet] No DMX data for Software Universe ${softUni} (Node: ${node.ip})`);
                }
            }
        }
        this.sequence = (this.sequence + 1) % 256;
    }

    /**
     * Parses "Net:SubNet:Universe" or a simple number into a 15-bit Art-Net Address
     */
    parseArtNetUniverse(uniString) {
        if (typeof uniString === 'number') return uniString;
        if (!uniString || typeof uniString !== 'string') return 0;

        const parts = uniString.split(':').map(p => parseInt(p.trim()));
        if (parts.length === 3) {
            // Art-Net 3/4: Net (7 bits) | Sub-Net (4 bits) | Universe (4 bits)
            // 15-bit address = (Net << 8) | (SubNet << 4) | Universe
            const net = parts[0] & 0x7F;
            const sub = parts[1] & 0x0F;
            const uni = parts[2] & 0x0F;
            return (net << 8) | (sub << 4) | uni;
        }

        return parseInt(uniString) || 0;
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
        // 1-to-1 Mapping: The UI value directy represents the Port-Address.
        // This allows users to enter 0, 1, 2 etc. to match their node's expected Universe/Port.
        view.setUint16(14, universeNum, true);

        // Length: 512 - Big Endian
        view.setUint16(16, 512, false);

        // Data
        const packetData = new Uint8Array(buffer, 18, 512);
        packetData.set(dmxData);

        return new Uint8Array(buffer);
    }

    async transmit(ip, packet) {
        const now = Date.now();
        const firstTime = !this.sockets.has(ip);

        if (now - this.lastLog > 5000) {
            const uniList = Object.keys(FGMStore.getUniverseBuffers());
            // console.log(`[ArtNet] Streaming to ${ip}. Subscribed Port-Addresses: ${uniList}. Sequence: ${this.sequence}`);

            // Log Header (18 bytes)
            const headerHex = Array.from(packet.slice(0, 18)).map(b => b.toString(16).padStart(2, '0')).join(' ');
            // console.log(`[ArtNet] Header: ${headerHex}`);

            // Scan for non-zero DMX data and log if found
            const dmxData = packet.slice(18);
            let hasData = false;
            for (let i = 0; i < dmxData.length; i++) {
                if (dmxData[i] > 0) {
                    hasData = true;
                    break;
                }
            }

            if (hasData) {
                // Find first non-zero channel
                let firstChan = -1;
                for (let i = 0; i < dmxData.length; i++) {
                    if (dmxData[i] > 0) {
                        firstChan = i + 1;
                        break;
                    }
                }

                const rangeStart = Math.max(0, firstChan - 1);
                const dmxHex = Array.from(dmxData.slice(rangeStart, rangeStart + 32)).map(b => b.toString(16).padStart(2, '0')).join(' ');
                // console.log(`[ArtNet] DMX ACTIVITY! First Active Chan: ${firstChan}. Data from ${firstChan}: ${dmxHex}`);
            } else {
                // console.log(`[ArtNet] DMX Data is currently ALL ZEROS (Blackout).`);
            }

            this.lastLog = now;
        }

        try {
            // STRATEGY 1: Direct Sockets (Chrome PWA/Isolated context or flags)
            if (typeof navigator.directSockets !== 'undefined') {
                let socket = this.sockets.get(ip);
                if (!socket) {
                    // console.log(`[ArtNet] Opening Direct UDP Socket to ${ip}:6454`);
                    socket = await navigator.directSockets.openUDPSocket({
                        remoteAddress: ip,
                        remotePort: 6454
                    });
                    this.sockets.set(ip, socket);
                }
                const writer = socket.writable.getWriter();
                await writer.write({ data: packet });
                writer.releaseLock();
            }
            // STRATEGY 2: Server Bridge Fallback (Standard Browser)
            else {
                this.sockets.set(ip, 'BRIDGE');
                fetch('/api/artnet/send', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/octet-stream',
                        'x-target-ip': ip,
                        'x-target-port': '6454'
                    },
                    body: packet
                }).catch(e => {
                    if (now - this.lastBridgeError > 1000) {
                        console.error("[ArtNet] Server Bridge Error:", e);
                        this.lastBridgeError = now;
                    }
                });
            }
        } catch (e) {
            if (firstTime) console.error(`[ArtNet] Socket Error to ${ip}:`, e);
        }
    }
}
