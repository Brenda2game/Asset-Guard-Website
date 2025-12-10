// ========================
// AssetGuard Backend Server
// ========================

console.log('🚀 Starting AssetGuard Server...');

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Basic route to test server
app.get('/api/health', (req, res) => {
    console.log('✅ Health check requested');
    res.json({ status: 'OK', message: 'AssetGuard Server is running' });
});

// Serve frontend for any other route
app.get('*', (req, res) => {
    console.log(`📁 Serving frontend for: ${req.path}`);
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 Local: http://localhost:${PORT}`);
    console.log(`🔗 API: http://localhost:${PORT}/api/health`);
});


// API URL - Change this when you deploy online for anyone doing code changes please
const API_URL = 'http://localhost:3000/api';

// Global variables
let editIndex = -1; // For tracking which asset we're editing
let currentAssets = []; // Store assets from server

// Theme toggle (keep your existing theme code)
const toggle = document.getElementById("themeToggle");
if (toggle) {
    toggle.onclick = function() {
        document.body.classList.toggle("light-mode");
        if (document.body.classList.contains("light-mode")) {
            toggle.innerHTML = '<i class="fas fa-sun"></i> <span>Light</span>';
        } else {
            toggle.innerHTML = '<i class="fas fa-moon"></i> <span>Dark</span>';
        }
    };
}

// ============================================
// API FUNCTIONS - TALK TO THE SERVER
// ============================================

// 1. GET ALL ASSETS FROM SERVER
async function fetchAssets() {
    try {
        const search = document.getElementById('search').value;
        const response = await fetch(`${API_URL}/assets?search=${encodeURIComponent(search)}`);
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        currentAssets = await response.json();
        renderTable(currentAssets);
        updateStats(currentAssets);
        updateLastUpdated();
        
    } catch (error) {
        console.error('Error fetching assets:', error);
        // Fallback: Show empty table with error message
        document.getElementById('tableBody').innerHTML = `
            <tr>
                <td colspan="10" class="text-center p-8 text-red-400">
                    <i class="fas fa-exclamation-triangle mr-2"></i>
                    Cannot connect to server. Please start the backend server.
                </td>
            </tr>
        `;
    }
}

// 2. ADD OR UPDATE ASSET
async function saveAsset() {
    // Get form values
    const assetData = {
        asset_id: document.getElementById('assetId').value.trim(),
        name: document.getElementById('assetName').value.trim(),
        serial: document.getElementById('serial').value.trim(),
        type: document.getElementById('type').value,
        assigned_to: document.getElementById('user').value.trim(),
        department: document.getElementById('dept').value,
        status: document.getElementById('status').value,
        warranty_date: document.getElementById('warranty').value
    };

    // Basic validation
    if (!assetData.asset_id || !assetData.name || !assetData.serial) {
        alert('Please fill in all required fields (Asset ID, Name, and Serial Number)');
        return;
    }

    // Handle photo upload
    const photoInput = document.getElementById('photo');
    const formData = new FormData();
    
    // Add asset data to form
    Object.keys(assetData).forEach(key => {
        formData.append(key, assetData[key]);
    });
    
    // Add photo if selected
    if (photoInput.files[0]) {
        formData.append('photo', photoInput.files[0]);
    }

    try {
        let url = API_URL + '/assets';
        let method = 'POST';
        
        // If editing existing asset
        if (editIndex !== -1 && currentAssets[editIndex]) {
            url = `${API_URL}/assets/${currentAssets[editIndex].id}`;
            method = 'PUT';
        }

        const response = await fetch(url, {
            method: method,
            body: formData
            // Note: Don't set Content-Type header for FormData - browser does it automatically
        });

        if (response.ok) {
            const result = await response.json();
            alert(result.message || (editIndex === -1 ? 'Asset added successfully!' : 'Asset updated successfully!'));
            closeModal();
            fetchAssets(); // Refresh the table
        } else {
            const error = await response.json();
            alert(`Error: ${error.error || 'Failed to save asset'}`);
        }
    } catch (error) {
        console.error('Error saving asset:', error);
        alert('Failed to save asset. Check console for details.');
    }
}

// 3. DELETE ASSET
async function deleteAsset(id) {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    
    try {
        const response = await fetch(`${API_URL}/assets/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('Asset deleted successfully!');
            fetchAssets(); // Refresh the table
        } else {
            const error = await response.json();
            alert(`Error: ${error.error || 'Failed to delete asset'}`);
        }
    } catch (error) {
        console.error('Error deleting asset:', error);
        alert('Failed to delete asset. Check console for details.');
    }
}

// 4. EXPORT TO EXCEL
async function exportExcel() {
    try {
        const response = await fetch(`${API_URL}/export`);
        if (!response.ok) throw new Error('Export failed');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'IT-Asset-Register.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error exporting:', error);
        alert('Export failed. Please try again or check server connection.');
    }
}

// ============================================
// UI FUNCTIONS - DISPLAY DATA
// ============================================

// Render table with assets
function renderTable(assets) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    if (!assets || assets.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center p-8 text-gray-400">
                    <i class="fas fa-database mr-2"></i>
                    No assets found. Add your first asset!
                </td>
            </tr>
        `;
        return;
    }

    assets.forEach((asset, index) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-800/50 dark:hover:bg-gray-100/50 transition-colors';

        const textColorClass = document.body.classList.contains('light-mode') ? 'text-gray-800' : 'text-gray-200';
        const secondaryTextColorClass = document.body.classList.contains('light-mode') ? 'text-gray-700' : 'text-gray-300';

        row.innerHTML = `
            <td class="p-4">
                ${asset.photo_path ? 
                    `<img src="${asset.photo_path}" class="w-16 h-16 object-cover rounded-lg border" alt="Asset photo">` : 
                    '<div class="w-16 h-16 bg-gray-700 dark:bg-gray-200 rounded-lg flex items-center justify-center"><i class="fas fa-image text-gray-500 dark:text-gray-400"></i></div>'
                }
            </td>
            <td class="p-4 font-semibold ${textColorClass}">${asset.asset_id}</td>
            <td class="p-4 ${textColorClass}">${asset.name}</td>
            <td class="p-4 font-mono text-sm ${secondaryTextColorClass}">${asset.serial}</td>
            <td class="p-4">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-900/30 dark:bg-blue-100 text-blue-300 dark:text-blue-700">
                    <i class="fas fa-${getAssetIcon(asset.type)} mr-2"></i>${asset.type}
                </span>
            </td>
            <td class="p-4 ${textColorClass}">${asset.assigned_to || '—'}</td>
            <td class="p-4">
                <span class="px-3 py-1 rounded-full bg-gray-800 dark:bg-gray-200 text-gray-300 dark:text-gray-700">
                    ${asset.department}
                </span>
            </td>
            <td class="p-4">
                <span class="px-3 py-1 rounded-full text-sm ${getStatusClass(asset.status)}">
                    ${asset.status}
                </span>
            </td>
            <td class="p-4 ${textColorClass}">${asset.warranty_date || 'Not set'}</td>
            <td class="p-4">
                <button onclick="editAsset(${asset.id}, ${index})" class="text-blue-400 dark:text-blue-600 p-2 hover:bg-blue-900/30 dark:hover:bg-blue-100 rounded" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteAsset(${asset.id})" class="text-red-400 dark:text-red-600 p-2 hover:bg-red-900/30 dark:hover:bg-red-100 rounded" title="Delete">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    document.getElementById("showingCount").textContent = assets.length;
    document.getElementById("totalCount").textContent = assets.length;
}

// Update statistics
function updateStats(assets) {
    const expiring = assets.filter(a => 
        a.warranty_date && new Date(a.warranty_date) < new Date(Date.now() + 90*24*60*60*1000)
    ).length;

    document.getElementById('stats').innerHTML = `
        <div class="stat-card bg-gray-800 dark:bg-white rounded-xl shadow-lg p-6 text-center transition-transform hover:scale-[1.02]">
            <div class="text-4xl font-bold text-blue-400 dark:text-blue-600">${assets.length}</div>
            <p class="text-gray-400 dark:text-gray-600 font-medium">Total Assets</p>
            <div class="mt-3 text-sm text-gray-500 dark:text-gray-500"><i class="fas fa-database mr-1"></i> Managed in system</div>
        </div>
        <div class="stat-card bg-gray-800 dark:bg-white rounded-xl shadow-lg p-6 text-center transition-transform hover:scale-[1.02]">
            <div class="text-4xl font-bold text-green-400 dark:text-green-600">${assets.filter(a=>a.status==='Active').length}</div>
            <p class="text-gray-400 dark:text-gray-600 font-medium">Active</p>
            <div class="mt-3 text-sm text-gray-500 dark:text-gray-500"><i class="fas fa-check-circle mr-1"></i> In use</div>
        </div>
        <div class="stat-card bg-gray-800 dark:bg-white rounded-xl shadow-lg p-6 text-center transition-transform hover:scale-[1.02]">
            <div class="text-4xl font-bold text-purple-400 dark:text-purple-600">${assets.filter(a=>a.type==='Laptop').length}</div>
            <p class="text-gray-400 dark:text-gray-600 font-medium">Laptops</p>
            <div class="mt-3 text-sm text-gray-500 dark:text-gray-500"><i class="fas fa-laptop mr-1"></i> Mobile devices</div>
        </div>
        <div class="stat-card bg-gray-800 dark:bg-white rounded-xl shadow-lg p-6 text-center border border-orange-800 dark:border-orange-200 transition-transform hover:scale-[1.02]">
            <div class="text-4xl font-bold text-orange-400 dark:text-orange-600">${expiring}</div>
            <p class="text-gray-400 dark:text-gray-600 font-medium">Warranty < 90 days</p>
            <div class="mt-3 text-sm ${expiring > 0 ? 'text-orange-500 dark:text-orange-500' : 'text-gray-500 dark:text-gray-500'}">
                <i class="fas fa-exclamation-triangle mr-1"></i> ${expiring > 0 ? 'Requires attention' : 'All good'}
            </div>
        </div>
    `;
}

// Helper functions (keep these from your original)
function getAssetIcon(type) {
    const icons = {
        'Laptop': 'laptop', 'Desktop': 'desktop', 'Monitor': 'tv',
        'Printer': 'print', 'Phone': 'phone', 'Tablet': 'tablet-alt',
        'Server': 'server', 'Network Device': 'network-wired', 'Other': 'hdd'
    };
    return icons[type] || 'hdd';
}

function getStatusClass(status) {
    const classes = {
        'Active': 'status-active',
        'In Repair': 'status-repair',
        'Lost/Stolen': 'status-lost',
    };
    return classes[status] || 'bg-gray-800 dark:bg-gray-200 text-gray-400 dark:text-gray-600';
}

function updateLastUpdated() {
    const now = new Date();
    document.getElementById('lastUpdated').textContent = 
        `Last updated: ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
}

// ============================================
// MODAL FUNCTIONS
// ============================================

function showSection() {
    editIndex = -1;
    document.getElementById("modalTitle").textContent = "Add New Asset";
    
    // Clear form
    document.getElementById("assetId").value = "";
    document.getElementById("assetName").value = "";
    document.getElementById("serial").value = "";
    document.getElementById("user").value = "";
    document.getElementById("type").value = "Laptop";
    document.getElementById("dept").value = "IT";
    document.getElementById("status").value = "Active";
    document.getElementById("warranty").value = "";
    document.getElementById("photo").value = "";
    
    openModal();
}

function editAsset(assetId, index) {
    editIndex = index;
    const asset = currentAssets[index];
    
    document.getElementById('assetId').value = asset.asset_id;
    document.getElementById('assetName').value = asset.name;
    document.getElementById('serial').value = asset.serial;
    document.getElementById('type').value = asset.type;
    document.getElementById('user').value = asset.assigned_to;
    document.getElementById('dept').value = asset.department;
    document.getElementById('status').value = asset.status;
    document.getElementById('warranty').value = asset.warranty_date;
    
    document.getElementById("modalTitle").textContent = "Edit Asset";
    openModal();
}

function openModal() {
    const modal = document.getElementById("modal");
    modal.classList.remove("hidden");
    setTimeout(() => {
        modal.classList.add("flex");
    }, 10);
}

function closeModal() {
    const modal = document.getElementById("modal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
}

// ============================================
// INITIALIZATION
// ============================================

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load assets on page load
    fetchAssets();
    
    // Search functionality
    document.getElementById('search').addEventListener('input', fetchAssets);
    
    // Make functions available globally (for onclick attributes in HTML)
    window.showSection = showSection;
    window.saveAsset = saveAsset;
    window.closeModal = closeModal;
    window.editAsset = editAsset;
    window.deleteAsset = deleteAsset;
    window.exportExcel = exportExcel;
    window.printPage = () => window.print();
    
    // File input display
    const photoInput = document.getElementById('photo');
    if (photoInput) {
        photoInput.addEventListener('change', function(e) {
            const fileName = e.target.files[0] ? e.target.files[0].name : 'No file chosen';
            // You could show the file name somewhere if you want
        });
    }
});