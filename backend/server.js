// backend/server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database sederhana (file JSON)
const DB_FILE = path.join(__dirname, 'database.json');

// Inisialisasi database jika belum ada
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ datasets: [] }));
}

// Baca database
function readDatabase() {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { datasets: [] };
    }
}

// Tulis ke database
function writeDatabase(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ============ ROUTES ============

// GET: Ambil semua data (untuk pengguna)
app.get('/api/datasets', (req, res) => {
    const db = readDatabase();
    res.json({
        success: true,
        count: db.datasets.length,
        datasets: db.datasets
    });
});

// POST: Simpan data baru (untuk peneliti)
app.post('/api/datasets', (req, res) => {
    try {
        const dataset = req.body;
        
        // Validasi data
        if (!dataset.location || !dataset.trafficData) {
            return res.status(400).json({
                success: false,
                message: 'Data tidak lengkap'
            });
        }
        
        // Generate ID
        dataset.id = 'ds_' + Date.now();
        dataset.createdAt = new Date().toISOString();
        
        // Simpan ke database
        const db = readDatabase();
        db.datasets.push(dataset);
        writeDatabase(db);
        
        res.status(201).json({
            success: true,
            message: 'Data berhasil disimpan',
            id: dataset.id
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
});

// GET: Ambil 1 dataset by ID
app.get('/api/datasets/:id', (req, res) => {
    const db = readDatabase();
    const dataset = db.datasets.find(ds => ds.id === req.params.id);
    
    if (dataset) {
        res.json({
            success: true,
            dataset: dataset
        });
    } else {
        res.status(404).json({
            success: false,
            message: 'Dataset tidak ditemukan'
        });
    }
});

// DELETE: Hapus dataset
app.delete('/api/datasets/:id', (req, res) => {
    const db = readDatabase();
    const initialLength = db.datasets.length;
    
    db.datasets = db.datasets.filter(ds => ds.id !== req.params.id);
    
    if (db.datasets.length < initialLength) {
        writeDatabase(db);
        res.json({
            success: true,
            message: 'Dataset berhasil dihapus'
        });
    } else {
        res.status(404).json({
            success: false,
            message: 'Dataset tidak ditemukan'
        });
    }
});

// Stats: Data statistik
app.get('/api/stats', (req, res) => {
    const db = readDatabase();
    const datasets = db.datasets;
    
    const stats = {
        totalDatasets: datasets.length,
        totalLocations: [...new Set(datasets.map(ds => ds.location))].length,
        totalVehicles: datasets.reduce((sum, ds) => sum + (ds.totalVehicles || 0), 0),
        byCondition: {
            macetParah: datasets.filter(ds => ds.trafficCondition?.level === 'MACET PARAH').length,
            macet: datasets.filter(ds => ds.trafficCondition?.level === 'MACET').length,
            sedang: datasets.filter(ds => ds.trafficCondition?.level === 'SEDANG').length,
            lancar: datasets.filter(ds => ds.trafficCondition?.level === 'LANCAR').length
        }
    };
    
    res.json({
        success: true,
        stats: stats
    });
});

// Serve frontend files
app.use('/peneliti', express.static(path.join(__dirname, '../frontend-peneliti')));
app.use('/pengguna', express.static(path.join(__dirname, '../frontend-pengguna')));

// Root redirect
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>Traffic Analysis System</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
                    h1 { color: #333; }
                    .links { margin-top: 40px; }
                    a { 
                        display: inline-block; 
                        margin: 10px; 
                        padding: 15px 30px; 
                        background: #4CAF50; 
                        color: white; 
                        text-decoration: none; 
                        border-radius: 5px;
                        font-size: 18px;
                    }
                    a.peneliti { background: #2196F3; }
                    a.pengguna { background: #4CAF50; }
                </style>
            </head>
            <body>
                <h1>🚦 Traffic Analysis System</h1>
                <p>Pilih mode yang ingin diakses:</p>
                <div class="links">
                    <a href="/peneliti" class="peneliti">🔬 Mode Peneliti</a>
                    <a href="/pengguna" class="pengguna">👥 Mode Pengguna</a>
                </div>
                <p style="margin-top: 40px; color: #666;">
                    Backend API berjalan di port ${PORT}<br>
                    Total datasets: ${readDatabase().datasets.length}
                </p>
            </body>
        </html>
    `);
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Backend berjalan di: http://localhost:${PORT}`);
    console.log(`🔬 Peneliti: http://localhost:${PORT}/peneliti`);
    console.log(`👥 Pengguna: http://localhost:${PORT}/pengguna`);
});