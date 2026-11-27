/**
 * Art-Net sender — one UDP socket, ArtDmx packets.
 *
 * Sent FROM port 6454 (spec) — some nodes drop packets from any other source
 * port. If 6454 is taken (another lighting app running) it falls back to a
 * random port and says so.
 */
const dgram = require('dgram');

const ARTNET_PORT = 6454;

class ArtNetSender {
    constructor() {
        this.socket = null;
        this.boundPort = null;
        this.stats = { packets: 0, errors: 0, lastError: null };
        this._sequence = 0;
        this._announced = new Set();
        this._open(ARTNET_PORT);
    }

    _open(port) {
        const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
        sock.once('error', (err) => {
            if (port !== 0) {
                console.warn(`[Art-Net] Cannot bind UDP ${port} (${err.code}) — sending from a random port, some nodes ignore that`);
                sock.close();
                this._open(0);
            } else {
                console.error('[Art-Net] UDP socket error:', err);
            }
        });
        sock.bind(port, () => {
            sock.setBroadcast(true); // 255.255.255.255 / x.x.x.255 targets
            sock.on('error', (err) => console.error('[Art-Net] UDP socket error:', err));
            sock.on('message', () => { }); // ArtPoll etc. from nodes — not handled yet
            this.boundPort = sock.address().port;
            console.log(`[Art-Net] UDP socket bound to port ${this.boundPort}`);
            this.socket = sock;
        });
    }

    static buildArtDmx(portAddress, data, sequence = 0) {
        const length = Math.max(2, data.length + (data.length % 2)); // even, 2..512
        const packet = Buffer.alloc(18 + length);
        packet.write('Art-Net', 0, 'ascii');
        packet[7] = 0;
        packet[8] = 0x00; packet[9] = 0x50;          // OpDmx 0x5000, little endian
        packet[10] = 0; packet[11] = 14;             // protocol version 14
        packet[12] = sequence & 0xff;
        packet[13] = 0;                              // physical
        packet[14] = portAddress & 0xff;             // SubUni
        packet[15] = (portAddress >> 8) & 0x7f;      // Net
        packet[16] = (length >> 8) & 0xff;           // length hi
        packet[17] = length & 0xff;                  // length lo
        packet.set(data.subarray(0, length), 18);
        return packet;
    }

    /** universe is 1-based (patch numbering), settings: { ip, port, universeStart } */
    send(universe, data, settings) {
        if (!this.socket) return;
        const portAddress = (universe - 1) + (Number(settings.universeStart) || 0);
        if (portAddress < 0 || portAddress > 0x7fff) return;

        this._sequence = (this._sequence % 255) + 1;
        const packet = ArtNetSender.buildArtDmx(portAddress, data, this._sequence);
        const ip = settings.ip;
        const port = Number(settings.port) || ARTNET_PORT;

        const target = `${ip}:${port}/${portAddress}`;
        if (!this._announced.has(target)) {
            this._announced.add(target);
            console.log(`[Art-Net] sending universe ${universe} to ${ip}:${port} (port-address ${portAddress})`);
        }

        this.socket.send(packet, 0, packet.length, port, ip, (err) => {
            if (err) {
                this.stats.errors++;
                if (this.stats.lastError !== err.message) console.error(`[Art-Net] send to ${ip} failed:`, err.message);
                this.stats.lastError = err.message;
            } else {
                this.stats.packets++;
            }
        });
    }
}

module.exports = ArtNetSender;
