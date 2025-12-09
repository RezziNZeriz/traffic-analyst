// API URL
const API_URL = 'http://localhost:3000/api';
let allDatasets = [];
let currentDataset = null;
let chart = null;

// Elements
const elements = {
    statsContainer: document.getElementById('statsContainer'),
    statTotal: document.getElementById('statTotal'),
    statLocations: document.getElementById('statLocations'),
    statVehicles: document.getElementById('statVehicles'),
    search: document.getElementById('search'),
    dateFilter: document.getElementById('dateFilter'),
    conditionFilter: document.getElementById('conditionFilter'),
    applyFilter: document.getElementById('applyFilter'),
    resetFilter: document.getElementById('resetFilter'),
    refreshBtn: document.getElementById('refreshBtn'),
    datasetsContainer: document.getElementById('datasetsContainer'),
    loadingData: document.getElementById('loadingData'),
    chartContainer: document.getElementById('chartContainer'),
    chartTitle: document.getElementById('chartTitle'),
    backBtn: document.getElementById('backBtn'),
    trafficChart: document.getElementById('trafficChart'),
    chartStats: document.getElementById('chartStats'),
    peakInfo: document.getElementById('peakInfo'),
    recommendations: document.getElementById('recommendations')
};

// Load all data
async function loadData() {
    try {
        // Show loading
        elements.loadingData.style.display = 'block';
        
        // Load datasets
        const response = await fetch(`${API_URL}/datasets`);
        const result = await response.json();
        
        if (result.success) {
            allDatasets = result.datasets;
            displayDatasets(allDatasets);
            updateStats();
        } else {
            showError('Gagal memuat data dari server');
        }
        
    } catch (error) {
        showError(`Error: ${error.message}`);
    } finally {
        elements.loadingData.style.display = 'none';
    }
}

// Update statistics
async function updateStats() {
    try {
        const response = await fetch(`${API_URL}/stats`);
        const result = await response.json();
        
        if (result.success) {
            const stats = result.stats;
            elements.statTotal.textContent = stats.totalDatasets;
            elements.statLocations.textContent = stats.totalLocations;
            elements.statVehicles.textContent = stats.totalVehicles.toLocaleString();
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Display datasets in grid
function displayDatasets(datasets) {
    if (datasets.length === 0) {
        elements.datasetsContainer.innerHTML = `
            <div class="no-data">
                <h3>📭 Tidak Ada Data</h3>
                <p>Belum ada data lalu lintas yang tersimpan.</p>
                <p>Silakan input data di <a href="http://localhost:3000/peneliti">Website Peneliti</a></p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="datasets-grid">';
    
    datasets.forEach(dataset => {
        const level = dataset.trafficCondition?.level || 'LANCAR';
        const levelClass = getLevelClass(level);
        
        // Format date
        const date = new Date(dataset.date);
        const formattedDate = date.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        html += `
            <div class="dataset-card" onclick="showDataset('${dataset.id}')">
                <h3>
                    <span style="color: ${dataset.trafficCondition?.color || '#28a745'}">📍</span>
                    ${dataset.location}
                </h3>
                
                <div class="traffic-level ${levelClass}">
                    ${level}
                </div>
                
                <div class="details">
                    <p>📅 ${formattedDate}</p>
                    <p>⏰ ${dataset.startTime} | 🔄 ${dataset.intervalMinutes} menit</p>
                    <p>🚗 Rata-rata: <strong>${dataset.averageVehicles}</strong> kendaraan/interval</p>
                    <p>📊 Total: <strong>${dataset.totalVehicles}</strong> kendaraan</p>
                </div>
                
                <div style="margin-top: 10px; color: #999; font-size: 12px;">
                    ${dataset.intervalCount} interval | ID: ${dataset.id.substring(0, 8)}...
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    elements.datasetsContainer.innerHTML = html;
}

// Show dataset detail
async function showDataset(datasetId) {
    try {
        const response = await fetch(`${API_URL}/datasets/${datasetId}`);
        const result = await response.json();
        
        if (result.success) {
            currentDataset = result.dataset;
            displayDatasetDetail();
        }
    } catch (error) {
        showError('Gagal memuat detail dataset');
    }
}

// Display dataset detail with chart
function displayDatasetDetail() {
    // Hide list, show chart
    elements.datasetsContainer.style.display = 'none';
    elements.chartContainer.classList.add('active');
    
    // Update title
    elements.chartTitle.textContent = `📊 ${currentDataset.location}`;
    
    // Create chart
    createChart();
    
    // Update statistics
    updateChartStats();
    
    // Update recommendations
    updateRecommendations();
}

// Create Chart.js chart
function createChart() {
    // Destroy old chart
    if (chart) {
        chart.destroy();
    }
    
    const ctx = elements.trafficChart.getContext('2d');
    const labels = currentDataset.timeSlots;
    const data = currentDataset.trafficData.map(item => item.vehicles || 0);
    const notes = currentDataset.trafficData.map(item => item.note || '');
    
    // Colors based on traffic level
    const backgroundColors = data.map(value => {
        if (value > 500) return 'rgba(220, 53, 69, 0.7)';
        if (value > 300) return 'rgba(253, 126, 20, 0.7)';
        if (value > 150) return 'rgba(255, 193, 7, 0.7)';
        return 'rgba(40, 167, 69, 0.7)';
    });
    
    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Jumlah Kendaraan',
                data: data,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
                borderWidth: 2,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const index = context.dataIndex;
                            return [
                                `Kendaraan: ${context.parsed.y}`,
                                `Keterangan: ${notes[index] || 'Tidak ada'}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Jumlah Kendaraan'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Interval Waktu'
                    }
                }
            }
        }
    });
}

// Update chart statistics
function updateChartStats() {
    const ds = currentDataset;
    
    // Find peak time
    let peakIndex = 0;
    let maxVehicles = 0;
    ds.trafficData.forEach((item, index) => {
        if (item.vehicles > maxVehicles) {
            maxVehicles = item.vehicles;
            peakIndex = index;
        }
    });
    
    elements.chartStats.innerHTML = `
        <div class="stat-card">
            <span class="stat-number">${ds.totalVehicles.toLocaleString()}</span>
            <span class="stat-label">Total Kendaraan</span>
        </div>
        <div class="stat-card">
            <span class="stat-number">${ds.averageVehicles}</span>
            <span class="stat-label">Rata-rata / Interval</span>
        </div>
        <div class="stat-card">
            <span class="stat-number">${ds.peakVehicles}</span>
            <span class="stat-label">Puncak Tertinggi</span>
        </div>
        <div class="stat-card">
            <span class="stat-number">${ds.intervalCount}</span>
            <span class="stat-label">Jumlah Interval</span>
        </div>
    `;
    
    elements.peakInfo.innerHTML = `
        <h4 style="margin-top: 0; color: #856404;">⏰ JAM PUNCAK</h4>
        <p>Puncak kepadatan: <strong>${ds.timeSlots[peakIndex]}</strong></p>
        <p>Dengan <strong>${maxVehicles}</strong> kendaraan</p>
        <p>Keterangan: ${ds.trafficData[peakIndex]?.note || 'Tidak ada keterangan'}</p>
    `;
}

// Update recommendations based on traffic condition
function updateRecommendations() {
    const level = currentDataset.trafficCondition?.level || 'LANCAR';
    const color = currentDataset.trafficCondition?.color || '#28a745';
    let recommendations = '';
    
    switch(level) {
        case 'MACET PARAH':
            recommendations = `
                <h4 style="margin-top: 0; color: ${color};">🚨 KONDISI: MACET PARAH</h4>
                <p><strong>Rekomendasi:</strong></p>
                <ul>
                    <li>Hindari area ini pada jam tersebut</li>
                    <li>Cari alternatif rute lain</li>
                    <li>Perkirakan waktu tambahan 45-60 menit</li>
                    <li>Pertimbangkan transportasi umum</li>
                </ul>
            `;
            break;
        case 'MACET':
            recommendations = `
                <h4 style="margin-top: 0; color: ${color};">⚠️ KONDISI: MACET</h4>
                <p><strong>Rekomendasi:</strong></p>
                <ul>
                    <li>Pertimbangkan waktu tambahan 30-45 menit</li>
                    <li>Cek rute alternatif sebelum berangkat</li>
                    <li>Hindari jam ini jika memungkinkan</li>
                </ul>
            `;
            break;
        case 'SEDANG':
            recommendations = `
                <h4 style="margin-top: 0; color: ${color};">🟡 KONDISI: SEDANG</h4>
                <p><strong>Rekomendasi:</strong></p>
                <ul>
                    <li>Waktu tempuh normal</li>
                    <li>Perkirakan waktu tambahan 15-30 menit</li>
                    <li>Pantau kondisi lalu lintas</li>
                </ul>
            `;
            break;
        default:
            recommendations = `
                <h4 style="margin-top: 0; color: ${color};">✅ KONDISI: LANCAR</h4>
                <p><strong>Rekomendasi:</strong></p>
                <ul>
                    <li>Waktu tempuh optimal</li>
                    <li>Tidak perlu alternatif rute</li>
                    <li>Kondisi jalan sangat baik</li>
                </ul>
            `;
    }
    
    elements.recommendations.innerHTML = recommendations;
}

// Filter datasets
function filterDatasets() {
    const searchText = elements.search.value.toLowerCase();
    const dateFilter = elements.dateFilter.value;
    const conditionFilter = elements.conditionFilter.value;
    
    let filtered = [...allDatasets];
    
    // Search filter
    if (searchText) {
        filtered = filtered.filter(ds => 
            ds.location.toLowerCase().includes(searchText)
        );
    }
    
    // Date filter
    if (dateFilter) {
        filtered = filtered.filter(ds => ds.date === dateFilter);
    }
    
    // Condition filter
    if (conditionFilter) {
        filtered = filtered.filter(ds => 
            ds.trafficCondition?.level === conditionFilter
        );
    }
    
    displayDatasets(filtered);
}

// Helper functions
function getLevelClass(level) {
    switch(level) {
        case 'MACET PARAH':
        case 'MACET':
            return 'level-macet';
        case 'SEDANG':
            return 'level-sedang';
        default:
            return 'level-lancar';
    }
}

function showError(message) {
    elements.datasetsContainer.innerHTML = `
        <div class="no-data">
            <h3>❌ Error</h3>
            <p>${message}</p>
            <button class="btn btn-primary" onclick="loadData()">Coba Lagi</button>
        </div>
    `;
}

function showMessage(text, type) {
    const message = document.createElement('div');
    message.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#28a745' : '#dc3545'};
        color: white;
        border-radius: 10px;
        z-index: 10000;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    `;
    message.textContent = text;
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.remove();
    }, 3000);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Set date filter to today
    const today = new Date().toISOString().split('T')[0];
    elements.dateFilter.value = today;
    
    // Load initial data
    loadData();
    
    // Event Listeners
    elements.applyFilter.addEventListener('click', filterDatasets);
    
    elements.resetFilter.addEventListener('click', function() {
        elements.search.value = '';
        elements.dateFilter.value = today;
        elements.conditionFilter.value = '';
        displayDatasets(allDatasets);
    });
    
    elements.refreshBtn.addEventListener('click', function() {
        loadData();
        showMessage('Data berhasil direfresh!', 'success');
    });
    
    elements.backBtn.addEventListener('click', function() {
        elements.chartContainer.classList.remove('active');
        elements.datasetsContainer.style.display = 'block';
    });
    
    // Auto-filter when typing
    elements.search.addEventListener('input', function() {
        setTimeout(filterDatasets, 300);
    });
});

// Make showDataset available globally
window.showDataset = showDataset;