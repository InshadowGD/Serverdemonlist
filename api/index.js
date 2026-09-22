const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

const DB_PATH = path.join('/tmp', 'database.json');

function readDB() {
    try {
        if (!fs.existsSync(DB_PATH)) {
            const startData = [{ position: 1, name: "Acheron", creator: "Riot", verifier: "Riot", victors: [] }];
            fs.writeFileSync(DB_PATH, JSON.stringify(startData, null, 2), 'utf8');
            return startData;
        }
        return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch (e) { return []; }
}

function writeDB(data) {
    try { 
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8'); 
    } catch (e) {}
}

app.get('/api/demons', (req, res) => {
    res.json(readDB());
});

app.post('/api/demons/add', (req, res) => {
    const { position, name, creator, verifier } = req.body;
    if (!position || !name || !creator || !verifier) return res.status(400).json({ success: false });
    let demons = readDB();
    demons.push({ position: parseInt(position), name, creator, verifier, victors: [] });
    demons.sort((a, b) => a.position - b.position);
    writeDB(demons);
    res.json({ success: true });
});

app.post('/api/demons/update', (req, res) => {
    const { position, name, creator, verifier } = req.body;
    let demons = readDB();
    const demon = demons.find(d => d.position === parseInt(position));
    if (demon) {
        demon.name = name;
        demon.creator = creator;
        demon.verifier = verifier;
    } else {
        demons.push({ position: parseInt(position), name, creator, verifier, victors: [] });
        demons.sort((a, b) => a.position - b.position);
    }
    writeDB(demons);
    res.json({ success: true });
});

app.post('/api/demons/delete/:position', (req, res) => {
    const pos = parseInt(req.params.position);
    let demons = readDB();
    demons = demons.filter(d => d.position !== pos);
    writeDB(demons);
    res.json({ success: true });
});

app.post('/api/demons/:position/victor', (req, res) => {
    const pos = parseInt(req.params.position);
    const { name, video } = req.body;
    let demons = readDB();
    const demon = demons.find(d => d.position === pos);
    if (demon) {
        if (!demon.victors) demon.victors = [];
        demon.victors.push({ name, video });
        writeDB(demons);
        return res.json({ success: true });
    }
    res.status(404).json({ success: false });
});

module.exports = app;

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
