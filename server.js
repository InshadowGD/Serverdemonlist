const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors()); 
app.use(express.json());
app.use(express.static(__dirname));

let demons = [
    { position: 1, name: "Tidal Wave", creator: "Onilink", verifier: "Trick", video: "https://youtube.com", victors: [] }
];

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/api/demons', (req, res) => res.json(demons));

app.post('/api/demons/update', (req, res) => {
    const { position, name, creator, verifier, video } = req.body;
    const index = demons.findIndex(d => d.position === parseInt(position));
    if (index !== -1) {
        demons[index] = { ...demons[index], name, creator, verifier, video };
    } else {
        demons.push({ position: parseInt(position), name, creator, verifier, video, victors: [] });
    }
    demons.sort((a, b) => a.position - b.position);
    res.json({ success: true });
});

app.delete('/api/demons/delete/:position', (req, res) => {
    demons = demons.filter(d => d.position !== parseInt(req.params.position));
    res.json({ success: true });
});

app.post('/api/demons/:position/victor', (req, res) => {
    const demon = demons.find(d => d.position === parseInt(req.params.position));
    if (demon) {
        if (!demon.victors) demon.victors = [];
        demon.victors.push({ name: req.body.name, video: req.body.video });
        return res.json({ success: true });
    }
    res.status(404).json({ success: false });
});

app.post('/api/demons/:position/victor/delete', (req, res) => {
    const demon = demons.find(d => d.position === parseInt(req.params.position));
    if (demon && demon.victors) {
        demon.victors = demon.victors.filter(v => v.name !== req.body.name);
        return res.json({ success: true });
    }
    res.status(404).json({ success: false });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
