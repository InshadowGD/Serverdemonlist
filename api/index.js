const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const SECRET_ADMIN_CODE = '090909';

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

async function readDB() {
    if (!KV_URL || !KV_TOKEN) return [];
    try {
        const response = await fetch(`${KV_URL}/get/demons`, {
            headers: { Authorization: `Bearer ${KV_TOKEN}` }
        });
        const result = await response.json();
        if (result && result.result) {
            return typeof result.result === 'string' ? JSON.parse(result.result) : result.result;
        }
        return [];
    } catch (e) { return []; }
}

async function writeDB(data) {
    if (!KV_URL || !KV_TOKEN) return;
    try {
        await fetch(`${KV_URL}/set/demons`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${KV_TOKEN}` },
            body: JSON.stringify(data)
        });
    } catch (e) {}
}

function isNotAdmin(req) {
    return req.headers['x-admin-code'] !== SECRET_ADMIN_CODE;
}

app.get('/api/demons', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    const data = await readDB();
    res.json(data);
});

app.post('/api/demons/add', async (req, res) => {
    if (isNotAdmin(req)) return res.status(403).json({ success: false, error: "Access Denied" });
    const { position, name, creator, verifier, minPercent } = req.body;
    if (!position || !name || !creator || !verifier || !minPercent) return res.status(400).json({ success: false });
    
    let demons = await readDB();
    demons.push({
        id: "id_" + Date.now(),
        position: parseInt(position),
        name: name,
        creator: creator,
        verifier: verifier,
        minPercent: parseInt(minPercent),
        victors: []
    });
    demons.sort((a, b) => a.position - b.position);
    await writeDB(demons);
    res.json({ success: true });
});

app.post('/api/demons/update', async (req, res) => {
    if (isNotAdmin(req)) return res.status(403).json({ success: false, error: "Access Denied" });
    const { position, name, creator, verifier, minPercent, id } = req.body;
    
    let demons = await readDB();
    const demon = demons.find(d => d.id === id);
    if (demon) {
        demon.position = parseInt(position);
        demon.name = name;
        demon.creator = creator;
        demon.verifier = verifier;
        demon.minPercent = parseInt(minPercent);
    }
    await writeDB(demons);
    res.json({ success: true });
});

app.post('/api/demons/delete', async (req, res) => {
    if (isNotAdmin(req)) return res.status(403).json({ success: false, error: "Access Denied" });
    const { id } = req.body;
    
    let demons = await readDB();
    demons = demons.filter(d => d.id !== id);
    await writeDB(demons);
    res.json({ success: true });
});

app.post('/api/demons/add-victor', async (req, res) => {
    if (isNotAdmin(req)) return res.status(403).json({ success: false, error: "Access Denied" });
    const { id, name, percent, video } = req.body;
    
    let demons = await readDB();
    const demon = demons.find(d => d.id === id);
    if (demon) {
        if (!demon.victors) demon.victors = [];
        demon.victors.push({ name, percent: parseInt(percent), video });
        await writeDB(demons);
        return res.json({ success: true });
    }
    res.status(404).json({ success: false });
});

module.exports = app;

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
