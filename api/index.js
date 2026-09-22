const express = require('express');
const cors = require('cors');
const { kv } = require('@vercel/kv'); // Подключаем облачное хранилище
const app = express();

app.use(cors());
app.use(express.json());

const SECRET_ADMIN_CODE = '090909';

// Чтение данных из вечного облака Vercel KV
async function readDB() {
    try {
        const demons = await kv.get('demons');
        if (!demons) {
            const startData = [{ position: 1, name: "Acheron", creator: "Riot", verifier: "Riot", victors: [] }];
            await kv.set('demons', startData);
            return startData;
        }
        return demons;
    } catch (e) {
        return [];
    }
}

// Запись данных в облако
async function writeDB(data) {
    try {
        await kv.set('demons', data);
    } catch (e) {}
}

function isNotAdmin(req) {
    return req.headers['x-admin-code'] !== SECRET_ADMIN_CODE;
}

app.get('/api/demons', async (req, res) => {
    const data = await readDB();
    res.json(data);
});

app.post('/api/demons/add', async (req, res) => {
    if (isNotAdmin(req)) return res.status(403).json({ success: false, error: "Неверный код!" });
    const { position, name, creator, verifier } = req.body;
    if (!position || !name || !creator || !verifier) return res.status(400).json({ success: false });
    
    let demons = await readDB();
    demons.push({ position: parseInt(position), name, creator, verifier, victors: [] });
    demons.sort((a, b) => a.position - b.position);
    await writeDB(demons);
    res.json({ success: true });
});

app.post('/api/demons/update', async (req, res) => {
    if (isNotAdmin(req)) return res.status(403).json({ success: false, error: "Неверный код!" });
    const { position, name, creator, verifier } = req.body;
    
    let demons = await readDB();
    const demon = demons.find(d => d.position === parseInt(position));
    if (demon) {
        demon.name = name;
        demon.creator = creator;
        demon.verifier = verifier;
    } else {
        demons.push({ position: parseInt(position), name, creator, verifier, victors: [] });
        demons.sort((a, b) => a.position - b.position);
    }
    await writeDB(demons);
    res.json({ success: true });
});

app.post('/api/demons/delete/:position', async (req, res) => {
    if (isNotAdmin(req)) return res.status(403).json({ success: false, error: "Неверный код!" });
    const pos = parseInt(req.params.position);
    
    let demons = await readDB();
    demons = demons.filter(d => d.position !== pos);
    await writeDB(demons);
    res.json({ success: true });
});

app.post('/api/demons/:position/victor', async (req, res) => {
    if (isNotAdmin(req)) return res.status(403).json({ success: false, error: "Неверный код!" });
    const pos = parseInt(req.params.position);
    const { name, video } = req.body;
    
    let demons = await readDB();
    const demon = demons.find(d => d.position === pos);
    if (demon) {
        if (!demon.victors) demon.victors = [];
        demon.victors.push({ name, video });
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
