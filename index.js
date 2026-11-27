const express = require('express');
const path = require('path');
const dgram = require('dgram');
const fs = require('fs');

const app = express();
const PORT = 6598;
const ARTNET_PORT = 6454;
let udpSocket = null;

// Art-Net is sent FROM port 6454 (spec) — some nodes drop packets from any other source port.
// If 6454 is taken (another lighting app running) fall back to a random port.
function openSocket(port) {
    const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    sock.once('error', (err) => {
        if (port !== 0) {
            console.warn(`[Art-Net] Cannot bind UDP ${port} (${err.code}) — sending from a random port, some nodes ignore that`);
            sock.close();
            openSocket(0);
        } else {
            console.error('[Art-Net] UDP socket error:', err);
        }
    });
    sock.bind(port, () => {
        sock.setBroadcast(true); // allow 255.255.255.255 / x.x.x.255 targets
        sock.on('error', (err) => console.error('[Art-Net] UDP socket error:', err));
        sock.on('message', () => { }); // ArtPoll etc. from nodes — not handled yet
        console.log(`[Art-Net] UDP socket bound to port ${sock.address().port}`);
        udpSocket = sock;
    });
}
openSocket(ARTNET_PORT);

const _announced = new Set();

app.use(express.json());
app.use(express.raw({ type: 'application/octet-stream', limit: '10mb' }));

app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/artnet/send', (req, res) => {
    const ip = req.headers['x-target-ip'];
    const port = parseInt(req.headers['x-target-port']) || 6454;
    const packet = req.body;

    if (!ip || !packet || packet.length === 0) {
        return res.status(400).send('Missing IP or Packet data');
    }

    if (!udpSocket) return res.status(503).send('Art-Net socket not ready');

    const target = `${ip}:${port}`;
    if (!_announced.has(target)) {
        _announced.add(target);
        const uni = packet.length > 15 ? (packet[15] << 8) | packet[14] : '?';
        console.log(`[Art-Net] sending to ${target} (port-address ${uni})`);
    }

    udpSocket.send(packet, 0, packet.length, port, ip, (err) => {
        if (err) {
            console.error(`[Server] UDP Send Error to ${ip}:`, err);
            return res.status(500).send(err.message);
        }
        res.status(200).send('OK');
    });
});

// ── GDTF fixture library (./gdtf folder) ─────────────────────────────────
const GDTF_DIR = path.join(__dirname, 'gdtf');

app.get('/api/gdtf', (req, res) => {
    fs.readdir(GDTF_DIR, { withFileTypes: true }, (err, entries) => {
        if (err) return res.json({ files: [] });
        const files = entries
            .filter(e => e.isFile() && e.name.toLowerCase().endsWith('.gdtf'))
            .map(e => ({ name: e.name, size: fs.statSync(path.join(GDTF_DIR, e.name)).size }))
            .sort((a, b) => a.name.localeCompare(b.name));
        res.json({ files });
    });
});

app.get('/api/gdtf/:file', (req, res) => {
    const name = path.basename(req.params.file);
    if (!name.toLowerCase().endsWith('.gdtf')) return res.status(400).send('Not a .gdtf file');
    const full = path.join(GDTF_DIR, name);
    if (!fs.existsSync(full)) return res.status(404).send('Not found');
    res.type('application/zip').sendFile(full);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`Art-Net Bridge active on /api/artnet/send`);
});