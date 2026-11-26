const express = require('express');
const path = require('path');
const dgram = require('dgram');
const fs = require('fs');

const app = express();
const PORT = 6598;
const udpSocket = dgram.createSocket('udp4');
// allow 255.255.255.255 / x.x.x.255 Art-Net broadcast targets
udpSocket.bind(() => udpSocket.setBroadcast(true));

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