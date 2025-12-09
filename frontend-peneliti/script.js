// ============ ACCESS CONTROL ============
// Cek apakah user punya akses sebagai peneliti
function checkPenelitiAccess() {
    const hasAccess = localStorage.getItem('peneliti_access') === 'granted';
    if (!hasAccess) {
        alert("⚠️ Akses ditolak!\n\nAnda harus login sebagai peneliti untuk menggunakan fitur ini.");
        return false;
    }
    return true;
}

// API URL
const API_URL = 'http://localhost:3000/api';
let currentData = {
    location: '',
    date: '',
    startTime: '07:00',
    interval: 10,
    count: 8,
    trafficData: []
};

// Elements
const elements = {
    location: document.getElementById('location'),
    date: document.getElementById('date'),
    startTime: document.getElementById('startTime'),
    interval: document.getElementById('interval'),
    count: document.getElementById('count'),
    generateBtn: document.getElementById('generateBtn'),
    tableSection: document.getElementById('tableSection'),
    tableBody: document.getElementById('tableBody'),
    sampleBtn: document.getElementById('sampleBtn'),
    saveBtn: document.getElementById('saveBtn'),
    statusMessage: document.getElementById('statusMessage'),
    searchData: document.getElementById('searchData'),
    refreshData: document.getElementById('refreshData'),
    datasetsContainer: document.getElementById('datasetsContainer')
};

// Helper: Add minutes to time
function addMinutes(time, minutes) {
    const [hours, mins] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(mins + minutes);
    return date.toTimeString().slice(0, 5);
}

// Helper: Analyze traffic level
function analyzeTraffic(vehicles) {
    if (vehicles > 500) return { level: 'MACET PARAH', color: '#dc3545', class: 'macet' };
    if (vehicles > 300) return { level: 'MACET', color: '#fd7e14', class: 'macet' };
    if (vehicles > 150) return { level: 'SEDANG', color: '#ffc107', class: 'sedang' };
    return { level: 'LANCAR', color: '#28a745', class: 'lancar' };
}

// ============ INPUT DATA FUNCTIONS ============

// Generate input table
function generateTable() {
    // Cek akses peneliti
    if (!checkPenelitiAccess()) return;
    
    // Get values
    currentData.location = elements.location.value.trim();
    currentData.date = elements.date.value;
    currentData.startTime = elements.startTime.value;
    currentData.interval = parseInt(elements.interval.value);
    currentData.count = parseInt(elements.count.value);

    // Validation
    if (!currentData.location || !currentData.date) {
        showStatus('Harap isi semua field yang wajib!', 'error');
        return;
    }

    // Reset data
    currentData.trafficData = [];
    elements.tableBody.innerHTML = '';

    // Generate rows
    let html = '';
    for (let i = 0; i < currentData.count; i++) {
        const start = addMinutes(currentData.startTime, i * currentData.interval);
        const end = addMinutes(currentData.startTime, (i + 1) * currentData.interval);
        
        html += `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${start} - ${end}</strong></td>
                <td>
                    <input type="number" 
                           class="vehicle-input" 
                           data-index="${i}" 
                           min="0" 
                           value="0" 
                           style="width: 100px; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                </td>
                <td>
                    <input type="text" 
                           class="note-input" 
                           data-index="${i}"
                           placeholder="Kondisi jalan" 
                           style="width: 150px; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                </td>
                <td>
                    <span class="traffic-indicator lancar"></span>
                    <span>LANCAR</span>
                </td>
            </tr>
        `;
    }

    elements.tableBody.innerHTML = html;
    elements.tableSection.classList.remove('hidden');

    // Add event listeners
    document.querySelectorAll('.vehicle-input').forEach(input => {
        input.addEventListener('input', function() {
            updateTrafficData(this);
        });
    });

    showStatus('Tabel berhasil dibuat. Silakan isi data kendaraan.', 'success');
}

// Update traffic data
function updateTrafficData(input) {
    const index = parseInt(input.dataset.index);
    const value = parseInt(input.value) || 0;
    
    if (!currentData.trafficData[index]) {
        currentData.trafficData[index] = {};
    }
    currentData.trafficData[index].vehicles = value;
    
    // Update status display
    const traffic = analyzeTraffic(value);
    const row = input.closest('tr');
    const indicator = row.querySelector('.traffic-indicator');
    const statusText = row.querySelector('span:last-child');
    
    indicator.className = 'traffic-indicator ' + traffic.class;
    indicator.style.backgroundColor = traffic.color;
    statusText.textContent = traffic.level;
    statusText.style.color = traffic.color;
    
    // Auto-fill note
    const noteInput = row.querySelector('.note-input');
    if (noteInput && !noteInput.value) {
        noteInput.value = traffic.level.toLowerCase();
        currentData.trafficData[index].note = traffic.level.toLowerCase();
    }
}

// Fill sample data
function fillSampleData() {
    // Cek akses peneliti
    if (!checkPenelitiAccess()) return;
    
    const inputs = document.querySelectorAll('.vehicle-input');
    const baseValue = 400;
    
    inputs.forEach((input, index) => {
        // Create pattern: low → peak → low
        const center = (inputs.length - 1) / 2;
        const distance = Math.abs(index - center);
        const value = Math.max(50, Math.round(baseValue - distance * 60 + Math.random() * 80));
        
        input.value = value;
        updateTrafficData(input);
        
        // Auto-fill note
        const noteInput = document.querySelector(`.note-input[data-index="${index}"]`);
        const traffic = analyzeTraffic(value);
        noteInput.value = traffic.level.toLowerCase();
        
        currentData.trafficData[index] = {
            vehicles: value,
            note: traffic.level.toLowerCase()
        };
    });
    
    showStatus('Data contoh berhasil diisi!', 'success');
}

// Save to server
async function saveToServer() {
    // Cek akses peneliti
    if (!checkPenelitiAccess()) return;
    
    // Validation
    if (currentData.trafficData.length === 0) {
        showStatus('Harap isi data kendaraan terlebih dahulu!', 'error');
        return;
    }
    
    // Check if all intervals have data
    const hasEmptyData = currentData.trafficData.some(item => !item.vehicles && item.vehicles !== 0);
    if (hasEmptyData) {
        showStatus('Harap isi jumlah kendaraan untuk semua interval!', 'error');
        return;
    }
    
    // Prepare data
    const timeSlots = [];
    for (let i = 0; i < currentData.count; i++) {
        const start = addMinutes(currentData.startTime, i * currentData.interval);
        const end = addMinutes(currentData.startTime, (i + 1) * currentData.interval);
        timeSlots.push(`${start}-${end}`);
    }
    
    // Calculate statistics
    const vehicles = currentData.trafficData.map(item => item.vehicles || 0);
    const totalVehicles = vehicles.reduce((a, b) => a + b, 0);
    const averageVehicles = Math.round(totalVehicles / vehicles.length);
    const peakVehicles = Math.max(...vehicles);
    const trafficAnalysis = analyzeTraffic(averageVehicles);
    
    // Build dataset
    const dataset = {
        location: currentData.location,
        date: currentData.date,
        startTime: currentData.startTime,
        intervalMinutes: currentData.interval,
        intervalCount: currentData.count,
        timeSlots: timeSlots,
        trafficData: currentData.trafficData,
        totalVehicles: totalVehicles,
        averageVehicles: averageVehicles,
        peakVehicles: peakVehicles,
        trafficCondition: {
            level: trafficAnalysis.level,
            color: trafficAnalysis.color
        }
    };
    
    // Send to server
    try {
        showStatus('⏳ Mengirim data ke server...', 'info');
        
        const response = await fetch(`${API_URL}/datasets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dataset)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showStatus(`
                ✅ <strong>DATA BERHASIL DISIMPAN!</strong><br>
                Lokasi: ${dataset.location}<br>
                Tanggal: ${dataset.date}<br>
                Total Kendaraan: ${totalVehicles}<br>
                Status Lalu Lintas: ${trafficAnalysis.level}<br>
                <small>Data sekarang dapat dilihat oleh semua pengguna</small>
            `, 'success');
            
            // Reset form after 5 seconds
            setTimeout(() => {
                elements.tableSection.classList.add('hidden');
                elements.location.value = '';
                currentData.trafficData = [];
                showStatus('', 'success');
                
                // Refresh data list
                if (document.querySelector('.tab-btn[data-tab="manage"]').classList.contains('active')) {
                    loadMyDatasets();
                }
            }, 5000);
            
        } else {
            showStatus(`❌ Gagal: ${result.message}`, 'error');
        }
        
    } catch (error) {
        showStatus(`❌ Error koneksi: ${error.message}`, 'error');
    }
}

// ============ MANAGE DATA FUNCTIONS ============

// Load my datasets
async function loadMyDatasets() {
    // Cek akses peneliti
    if (!checkPenelitiAccess()) {
        elements.datasetsContainer.innerHTML = `
            <div class="no-data">
                <h3>🔒 Akses Ditolak</h3>
                <p>Anda harus login sebagai peneliti untuk melihat data.</p>
            </div>
        `;
        return;
    }
    
    try {
        elements.datasetsContainer.innerHTML = '<div class="loading">Memuat data...</div>';
        
        const response = await fetch(`${API_URL}/datasets`);
        const result = await response.json();
        
        if (result.success) {
            displayMyDatasets(result.datasets);
        } else {
            showMyDatasetsError('Gagal memuat data dari server');
        }
        
    } catch (error) {
        showMyDatasetsError(`Error: ${error.message}`);
    }
}

// Display my datasets
function displayMyDatasets(datasets) {
    if (!datasets || datasets.length === 0) {
        elements.datasetsContainer.innerHTML = `
            <div class="no-data">
                <h3>📭 Belum Ada Data</h3>
                <p>Anda belum menginput data apapun.</p>
                <p>Klik tab "Input Data Baru" untuk mulai.</p>
            </div>
        `;
        return;
    }
    
    // Sort by latest first
    datasets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    let html = '';
    
    datasets.forEach(dataset => {
        const level = dataset.trafficCondition?.level || 'LANCAR';
        const color = dataset.trafficCondition?.color || '#28a745';
        
        // Format date
        const date = new Date(dataset.date);
        const formattedDate = date.toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        html += `
            <div class="dataset-item" style="border-left: 5px solid ${color}">
                <div class="dataset-header">
                    <div>
                        <h3 style="margin: 0; color: #333;">
                            📍 ${dataset.location}
                            <span style="color: ${color}; font-size: 14px; margin-left: 10px;">
                                (${level})
                            </span>
                        </h3>
                        <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">
                            📅 ${formattedDate} | ⏰ ${dataset.startTime}
                        </p>
                    </div>
                    <div class="dataset-actions">
                        <button class="btn btn-info" onclick="viewDataset('${dataset.id}')">
                            👁️ Lihat
                        </button>
                        <button class="btn btn-danger" onclick="deleteDataset('${dataset.id}')">
                            🗑️ Hapus
                        </button>
                    </div>
                </div>
                
                <div class="dataset-details">
                    <div>
                        <strong>Interval:</strong> ${dataset.intervalMinutes} menit × ${dataset.intervalCount}
                    </div>
                    <div>
                        <strong>Total Kendaraan:</strong> ${dataset.totalVehicles}
                    </div>
                    <div>
                        <strong>Rata-rata:</strong> ${dataset.averageVehicles}/interval
                    </div>
                    <div>
                        <strong>Puncak:</strong> ${dataset.peakVehicles} kendaraan
                    </div>
                </div>
                
                <div style="margin-top: 10px; color: #999; font-size: 12px;">
                    ID: ${dataset.id} | Dibuat: ${new Date(dataset.createdAt).toLocaleString('id-ID')}
                </div>
            </div>
        `;
    });
    
    elements.datasetsContainer.innerHTML = html;
}

// Delete dataset
async function deleteDataset(datasetId) {
    // Cek akses peneliti
    if (!checkPenelitiAccess()) return;
    
    if (!confirm('Yakin hapus data ini? Data akan dihapus permanen dari server dan tidak bisa dikembalikan.')) {
        return;
    }
    
    try {
        showStatus('⏳ Menghapus data...', 'info');
        
        const response = await fetch(`${API_URL}/datasets/${datasetId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showStatus('✅ Data berhasil dihapus!', 'success');
            await loadMyDatasets(); // Refresh list
            
            // Auto-hide status after 3 seconds
            setTimeout(() => {
                showStatus('', 'success');
            }, 3000);
            
        } else {
            showStatus(`❌ Gagal: ${result.message}`, 'error');
        }
        
    } catch (error) {
        showStatus(`❌ Error: ${error.message}`, 'error');
    }
}

// View dataset in user mode
function viewDataset(datasetId) {
    window.open(`http://localhost:3000/pengguna`, '_blank');
}

// Show error in my datasets
function showMyDatasetsError(message) {
    elements.datasetsContainer.innerHTML = `
        <div class="no-data">
            <h3>❌ Error</h3>
            <p>${message}</p>
            <button class="btn btn-primary" onclick="loadMyDatasets()">Coba Lagi</button>
        </div>
    `;
}

// ============ UTILITY FUNCTIONS ============

// Show status message
function showStatus(message, type) {
    if (!elements.statusMessage) return;
    
    elements.statusMessage.textContent = '';
    elements.statusMessage.innerHTML = message;
    elements.statusMessage.className = 'status ' + type;
}

// Tab switching
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Update active tab button
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Show active tab content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `tab-${tabId}`) {
                    content.classList.add('active');
                }
            });
            
            // Load data if on manage tab
            if (tabId === 'manage') {
                loadMyDatasets();
            }
        });
    });
}

// Search functionality
function initSearch() {
    if (elements.searchData) {
        elements.searchData.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const datasetItems = document.querySelectorAll('.dataset-item');
            
            datasetItems.forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(searchTerm) ? 'block' : 'none';
            });
        });
    }
    
    if (elements.refreshData) {
        elements.refreshData.addEventListener('click', loadMyDatasets);
    }
}

// ============ INITIALIZATION ============

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    if (elements.date) elements.date.value = today;
    currentData.date = today;
    
    // Event listeners for input tab
    if (elements.generateBtn) elements.generateBtn.addEventListener('click', generateTable);
    if (elements.sampleBtn) elements.sampleBtn.addEventListener('click', fillSampleData);
    if (elements.saveBtn) elements.saveBtn.addEventListener('click', saveToServer);
    
    // Auto-update
    if (elements.location) {
        elements.location.addEventListener('input', function() {
            currentData.location = this.value;
        });
    }
    
    // Initialize tabs and search
    initTabs();
    initSearch();
    
    // Welcome message only if authenticated
    const hasAccess = localStorage.getItem('peneliti_access') === 'granted';
    if (hasAccess && elements.statusMessage) {
        showStatus('✅ Anda login sebagai Peneliti. Selamat bekerja!', 'success');
    }
});

// Make functions available globally
window.viewDataset = viewDataset;
window.deleteDataset = deleteDataset;