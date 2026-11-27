const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { WebSocketServer } = require('ws');
const ConsoleEngine = require('./server/console-engine.js');

const app = express();
const PORT = Number(process.env.PORT) || 6598;

// The console: output loop, effects, Art-Net. The webpage is a remote over /ws.
const consoleEngine = new ConsoleEngine();

app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

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

const server = http.createServer(app);
// fixture types (parsed GDTF) can be several MB — allow big messages
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 256 * 1024 * 1024 });
wss.on('connection', (ws, req) => consoleEngine.attach(ws, req));

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`Console engine active — remotes connect on ws://localhost:${PORT}/ws`);
});