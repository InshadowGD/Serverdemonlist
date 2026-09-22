const express = require('express');
const cors = require('cors');
const { kv } = require('@vercel/kv'); // Используем официальный нативный клиент Vercel KV
const app = express();

app.use(cors());
app.use(express.json());

const SECRET_ADMIN_CODE = '090909';

// Безопасное чтение данных напрямую из облачного хранилища Redis
async function readDB() {
    try {
        const demons = await kv.get('demons');
        if (!demons) {
            // Начальный шаблон, если база абсолютно пустая
            const startData = [{ id: "id_default", position: 1, name: "Acheron", creator: "Riot", verifier: "Riot", minPercent: 100, victors: [] }];
            await kv.set('demons', startData);
            return startData;
        }
        return Array.isArray(demons) ? demons : [];
    } catch (e) {
        console.error("Ошибка чтения KV Redis:", e);
        return [];
    }
}

// Безопасная запись данных напрямую в облако Redis
async function writeDB(data) {
    try {
        await kv.set('demons', data);
    } catch (e) {
        console.error("Ошибка записи KV Redis:", e);
    }
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
    if (!position || !name || !creator || !minPercent) return res.status(400).json({ success: false });
    
    let demons = await readDB();
    demons.push({
        id: "id_" + Date.now(),
        position: parseInt(position),
        name: name,
        creator: creator,
        verifier: verifier || 'Не указан',
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
        demon.verifier = verifier || 'Не указан';
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
