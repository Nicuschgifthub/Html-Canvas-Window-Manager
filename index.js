const express = require('express');
const path = require('path');

const app = express();
const PORT = 6598; // Default HTTP port

// Serve the 'public' directory as static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html by default on http://localhost
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});