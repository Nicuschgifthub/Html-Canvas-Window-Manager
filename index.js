const express = require('express');
const path = require('path');
const dgram = require('dgram');

const app = express();
const PORT = 6598;
const udpSocket = dgram.createSocket('udp4');

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

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`Art-Net Bridge active on /api/artnet/send`);
});