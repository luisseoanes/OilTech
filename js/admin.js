// admin.js

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : 'https://oiltech-production.up.railway.app';

// Configuracion para Cloudinary

const CLOUDINARY_CLOUD_NAME = 'dvoeietxt';
const CLOUDINARY_UPLOAD_PRESET = 'OilTechCMS';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

// Check Auth
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = 'login.html';
}

async function fetchWithAuth(url, options = {}) {
    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };
    const response = await fetch(url, options);
    if (response.status === 401) {
        logout();
    }
    return response;
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}

function switchView(viewId) {
    document.querySelectorAll('.section-view').forEach(el => el.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');

    document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));

    // Handle mobile sidebar auto-close
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth <= 768 && sidebar) {
        sidebar.classList.remove('open');
    }

    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
    }

    if (viewId === 'quotations') loadQuotations();
    if (viewId === 'sales') loadSales();
    if (viewId === 'products') loadProducts();
    if (viewId === 'dashboard') loadDashboardData();
    if (viewId === 'categories') loadCategoriesView();
    if (viewId === 'brands-mgmt') loadBrandsView();
    if (viewId === 'presentations-mgmt') loadPresentationsView();
    if (viewId === 'site-assets') loadSiteAssets();
}

// Sidebar toggle for mobile
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            if (sidebar) sidebar.classList.toggle('open');
        });
    }
});

// --- UI HELPERS ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';

    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <div class="toast-content">${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.5s ease-in forwards';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

function showConfirm(title, message, callback) {
    const modal = document.getElementById('interactiveModal');
    document.getElementById('interactiveModalTitle').textContent = title;
    document.getElementById('interactiveModalMessage').textContent = message;
    document.getElementById('interactiveModalInputContainer').style.display = 'none';

    const confirmBtn = document.getElementById('interactiveModalConfirmBtn');
    confirmBtn.onclick = () => {
        closeModal('interactiveModal');
        callback();
    };

    modal.style.display = 'block';
}

function showPrompt(title, message, defaultValue, callback) {
    const modal = document.getElementById('interactiveModal');
    document.getElementById('interactiveModalTitle').textContent = title;
    document.getElementById('interactiveModalMessage').textContent = message;

    const inputContainer = document.getElementById('interactiveModalInputContainer');
    const input = document.getElementById('interactiveModalInput');
    inputContainer.style.display = 'block';
    input.value = defaultValue;

    const confirmBtn = document.getElementById('interactiveModalConfirmBtn');
    confirmBtn.onclick = () => {
        closeModal('interactiveModal');
        callback(input.value);
    };

    modal.style.display = 'block';
    setTimeout(() => input.focus(), 100);
}

// --- DASHBOARD ---
async function loadDashboardData() {
    try {
        const [statsRes, salesRes, quotationsRes] = await Promise.all([
            fetchWithAuth(`${API_URL}/stats`),
            fetchWithAuth(`${API_URL}/sales/`),
            fetchWithAuth(`${API_URL}/quotations/`)
        ]);
        const stats = await statsRes.json();
        const sales = await salesRes.json();
        const quotations = await quotationsRes.json();

        document.getElementById('totalPurchased').textContent = stats.total_purchased;
        fetchProductsCount();

        const totalRevenue = sales.reduce((sum, s) => sum + (s.price || 0), 0);
        document.getElementById('totalRevenue').textContent =
            totalRevenue.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

        document.getElementById('totalQuotations').textContent = quotations.length;

        // Últimas 5 ventas
        const salesBody = document.querySelector('#recentSalesTable tbody');
        const recentSales = sales.slice(0, 5);
        salesBody.innerHTML = recentSales.length ? recentSales.map(s => `
            <tr>
                <td><strong>VET-${String(s.id).padStart(6, '0')}</strong></td>
                <td>COT-${String(s.quotation_id).padStart(6, '0')}</td>
                <td>${s.customer_name}</td>
                <td>${s.customer_contact}</td>
                <td>${Number(s.price).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}</td>
                <td>${new Date(s.created_at).toLocaleDateString('es-CO')}</td>
            </tr>
        `).join('') : '<tr><td colspan="6" style="text-align:center;color:#888;">No hay ventas registradas.</td></tr>';

        // Últimas 5 cotizaciones
        const statusMap = { Pending: 'Pendiente', Purchased: 'Comprado', Cancelled: 'Cancelado' };
        const quotationsBody = document.querySelector('#recentQuotationsTable tbody');
        const recentQuotations = quotations.slice(0, 5);
        quotationsBody.innerHTML = recentQuotations.length ? recentQuotations.map(q => `
            <tr>
                <td><strong>${q.reference || 'COT-' + String(q.id).padStart(6, '0')}</strong></td>
                <td>${q.customer_name}</td>
                <td>${q.customer_contact}</td>
                <td>${new Date(q.created_at).toLocaleDateString('es-CO')}</td>
                <td><span class="status-badge status-${q.status.toLowerCase()}">${statusMap[q.status] || q.status}</span></td>
            </tr>
        `).join('') : '<tr><td colspan="5" style="text-align:center;color:#888;">No hay cotizaciones.</td></tr>';

    } catch (error) {
        console.error('Error loading dashboard', error);
    }
}

async function fetchProductsCount() {
    const response = await fetch(`${API_URL}/products/`);
    const products = await response.json();
    document.getElementById('totalProducts').textContent = products.length;
}

// --- QUOTATIONS ---
function renderQuotationsTable(quotations) {
    const statusMap = { Pending: 'Pendiente', Purchased: 'Comprado', Cancelled: 'Cancelado' };
    const tbody = document.querySelector('#quotationsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = quotations.length ? quotations.map(q => `
            <tr style="cursor:pointer;" onclick="viewQuotationItems(${q.id})">
                <td><strong>${q.reference || 'COT-' + String(q.id).padStart(6, '0')}</strong></td>
                <td>${q.customer_name}</td>
                <td>${q.customer_contact}</td>
                <td>${new Date(q.created_at).toLocaleDateString('es-CO')}</td>
                <td><span class="status-badge status-${q.status.toLowerCase()}">${statusMap[q.status] || q.status}</span></td>
                <td style="text-align:right;">
                    ${q.status === 'Pending' ? `
                        <button class="btn-action btn-approve" title="Confirmar Venta" onclick="event.stopPropagation();openConfirmSaleModal(${q.id})"><i class="fas fa-check"></i></button>
                        <button class="btn-action btn-cancel" title="Cancelar" onclick="event.stopPropagation();updateStatus(${q.id}, 'Cancelled')"><i class="fas fa-times"></i></button>
                    ` : ''}
                </td>
            </tr>
        `).join('') : '<tr><td colspan="6" style="text-align:center;color:#888;padding:20px;">No hay cotizaciones con esos filtros.</td></tr>';
}

function applyQuotationFilters() {
    if (!window.allQuotations) return;
    const name    = (document.getElementById('qFilterName')?.value || '').toLowerCase();
    const contact = (document.getElementById('qFilterContact')?.value || '').toLowerCase();
    const status  = document.getElementById('qFilterStatus')?.value || '';
    const date    = document.getElementById('qFilterDate')?.value || '';
    const sort    = document.getElementById('qFilterSort')?.value || 'desc';

    let filtered = window.allQuotations.filter(q => {
        const matchName    = !name    || q.customer_name.toLowerCase().includes(name);
        const matchContact = !contact || q.customer_contact.toLowerCase().includes(contact);
        const matchStatus  = !status  || q.status === status;
        const matchDate    = !date    || new Date(q.created_at).toISOString().slice(0,10) === date;
        return matchName && matchContact && matchStatus && matchDate;
    });

    filtered.sort((a, b) => {
        const diff = new Date(a.created_at) - new Date(b.created_at);
        return sort === 'asc' ? diff : -diff;
    });

    renderQuotationsTable(filtered);
}

function clearQuotationFilters() {
    ['qFilterName','qFilterContact','qFilterDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const status = document.getElementById('qFilterStatus');
    const sort   = document.getElementById('qFilterSort');
    if (status) status.value = '';
    if (sort)   sort.value   = 'desc';
    applyQuotationFilters();
}

async function loadQuotations() {
    try {
        const response = await fetchWithAuth(`${API_URL}/quotations/`);
        const quotations = await response.json();

        window.quotationsMap = {};
        quotations.forEach(q => { window.quotationsMap[q.id] = q; });
        window.allQuotations = quotations;

        applyQuotationFilters();
    } catch (error) {
        console.error('Error loading quotations', error);
    }
}

// --- SALES ---
async function loadSales() {
    try {
        const response = await fetchWithAuth(`${API_URL}/sales/`);
        window.allSales = await response.json();
        applySalesFilters();
    } catch (error) { console.error(error); }
}

function renderSalesTable(sales) {
    const tbody = document.querySelector('#salesTable tbody');
    tbody.innerHTML = sales.length ? sales.map(s => `
        <tr style="cursor:pointer;" onclick="viewSaleItems(${s.id})">
            <td><strong>VET-${String(s.id).padStart(6, '0')}</strong></td>
            <td>COT-${String(s.quotation_id).padStart(6, '0')}</td>
            <td>${s.customer_name}</td>
            <td>${s.customer_contact}</td>
            <td>${Number(s.price).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}</td>
            <td>${new Date(s.created_at).toLocaleDateString('es-CO')}</td>
        </tr>
    `).join('') : '<tr><td colspan="6" style="text-align:center;color:#888;padding:20px;">No hay ventas con esos filtros.</td></tr>';
    document.getElementById('salesFilteredTotal').textContent = sales.length;
}

function applySalesFilters() {
    if (!window.allSales) return;
    const quote   = (document.getElementById('sFilterQuote')?.value || '').toLowerCase();
    const name    = (document.getElementById('sFilterName')?.value || '').toLowerCase();
    const contact = (document.getElementById('sFilterContact')?.value || '').toLowerCase();
    const date    = document.getElementById('sFilterDate')?.value || '';
    const sort    = document.getElementById('sFilterSort')?.value || 'desc';

    let filtered = window.allSales.filter(s => {
        const cotRef = `COT-${String(s.quotation_id).padStart(6, '0')}`.toLowerCase();
        const matchQuote   = !quote   || cotRef.includes(quote);
        const matchName    = !name    || s.customer_name.toLowerCase().includes(name);
        const matchContact = !contact || s.customer_contact.toLowerCase().includes(contact);
        const matchDate    = !date    || new Date(s.created_at).toISOString().slice(0, 10) === date;
        return matchQuote && matchName && matchContact && matchDate;
    });

    filtered.sort((a, b) => {
        const diff = new Date(a.created_at) - new Date(b.created_at);
        return sort === 'asc' ? diff : -diff;
    });

    renderSalesTable(filtered);
}

function clearSalesFilters() {
    ['sFilterQuote', 'sFilterName', 'sFilterContact', 'sFilterDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const sort = document.getElementById('sFilterSort');
    if (sort) sort.value = 'desc';
    applySalesFilters();
}

function openConfirmSaleModal(quotationId) {
    const q = window.quotationsMap?.[quotationId];
    if (!q) return;
    document.getElementById('confirmSaleQuoteId').value = quotationId;
    document.getElementById('confirmSaleQuoteRef').textContent =
        `Cotización: ${q.reference || 'COT-' + String(quotationId).padStart(6, '0')} — ${q.customer_name}`;
    document.getElementById('confirmSalePrice').value = '';
    document.getElementById('confirmSaleModal').style.display = 'block';
}

async function confirmSale() {
    const quotationId = parseInt(document.getElementById('confirmSaleQuoteId').value);
    const price = parseFloat(document.getElementById('confirmSalePrice').value);
    const q = window.quotationsMap?.[quotationId];

    if (!price || price <= 0) {
        showToast('Ingresa un precio válido', 'warning');
        return;
    }

    const items = (q.items || []).map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
    }));

    try {
        const response = await fetchWithAuth(`${API_URL}/sales/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quotation_id: quotationId,
                price,
                items,
                customer_name: q.customer_name,
                customer_contact: q.customer_contact,
            })
        });

        if (response.ok) {
            showToast('Venta registrada correctamente', 'success');
            closeModal('confirmSaleModal');
            loadQuotations();
            loadSales();
            loadDashboardData();
        } else {
            const err = await response.json().catch(() => ({}));
            showToast(err.detail || 'Error al registrar venta', 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('Error de conexión', 'error');
    }
}

function viewSaleItems(saleId) {
    const sale = window.allSales?.find(s => s.id === saleId);
    if (!sale) return;
    document.getElementById('saleDetailsRef').textContent = `VET-${String(sale.id).padStart(6, '0')}`;
    const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : (sale.items || []);
    const tbody = document.querySelector('#saleItemsTable tbody');
    tbody.innerHTML = items.map(item => `
        <tr>
            <td>${item.product_name}</td>
            <td>${item.quantity}</td>
        </tr>
    `).join('');
    document.getElementById('saleDetailsModal').style.display = 'block';
}

function filterSalesTable() {
    const query = document.getElementById('salesSearch').value.toLowerCase();
    const startDate = document.getElementById('salesDateStart').value;
    const endDate = document.getElementById('salesDateEnd').value;

    const filtered = window.allSales.filter(q => {
        const matchesSearch = q.customer_name.toLowerCase().includes(query) || q.customer_contact.toLowerCase().includes(query);

        let matchesDates = true;
        const saleDate = new Date(q.created_at).setHours(0, 0, 0, 0);

        if (startDate) {
            const start = new Date(startDate).setHours(0, 0, 0, 0);
            if (saleDate < start) matchesDates = false;
        }
        if (endDate) {
            const end = new Date(endDate).setHours(23, 59, 59, 999);
            if (saleDate > end) matchesDates = false;
        }

        return matchesSearch && matchesDates;
    });

    renderSalesTable(filtered);
}

function clearSalesFilters() {
    document.getElementById('salesSearch').value = '';
    document.getElementById('salesDateStart').value = '';
    document.getElementById('salesDateEnd').value = '';
    renderSalesTable(window.allSales);
}


async function updateStatus(id, status) {
    const ref = window.quotationsMap?.[id]?.reference || 'COT-' + String(id).padStart(6, '0');
    const label = status === 'Purchased' ? 'Comprado' : 'Cancelado';
    showConfirm(
        `Marcar como ${label}`,
        `¿Cambiar el estado de ${ref} a "${label}"?`,
        async () => {
            try {
                await fetchWithAuth(`${API_URL}/quotations/${id}/status?status=${status}`, { method: 'PUT' });
                loadQuotations();
                loadSales();
                loadDashboardData();
            } catch (error) {
                console.error('Error updating status', error);
                showToast('Error al actualizar estado', 'error');
            }
        }
    );
}

function viewQuotationItems(quotationId) {
    const quotation = window.quotationsMap[quotationId];
    if (!quotation) return;
    document.getElementById('modalQuoteRef').textContent = quotation.reference || 'COT-' + String(quotation.id).padStart(6, '0');
    window.currentQuoteId = quotation.id;
    const tbody = document.querySelector('#modalItemsTable tbody');

    let items = [];
    if (quotation.items) {
        items = typeof quotation.items === 'string' ? JSON.parse(quotation.items) : quotation.items;
    }

    // Store current items for editing
    window.currentQuoteItems = items;
    window.originalQuoteItems = JSON.parse(JSON.stringify(items)); // Deep copy for cancel

    renderEditItemsTable(items);

    document.getElementById('quotationDetailsModal').style.display = "block";
}

function enableEditQuoteItems() {
    document.getElementById('editQuoteControls').style.display = 'block';
    document.getElementById('btnEnableEdit').style.display = 'none';
    document.getElementById('btnSaveEdit').style.display = 'inline-block';
    document.getElementById('btnCancelEdit').style.display = 'inline-block';

    renderEditItemsTable(window.currentQuoteItems, true);
}

function cancelEditQuoteItems() {
    // Revert items
    window.currentQuoteItems = JSON.parse(JSON.stringify(window.originalQuoteItems));

    document.getElementById('editQuoteControls').style.display = 'none';
    document.getElementById('btnEnableEdit').style.display = 'inline-block';
    document.getElementById('btnSaveEdit').style.display = 'none';
    document.getElementById('btnCancelEdit').style.display = 'none';

    renderEditItemsTable(window.currentQuoteItems, false);
}

function renderEditItemsTable(items) {
    const tbody = document.querySelector('#modalItemsTable tbody');
    tbody.innerHTML = items.map(item => `
        <tr>
            <td>${item.product_name}</td>
            <td>${item.quantity}</td>
        </tr>
    `).join('');
}

function updateQuoteItem(index, field, value) {
    if (field === 'quantity') value = parseInt(value) || 1;
    window.currentQuoteItems[index][field] = value;
}

function removeQuoteItem(index) {
    window.currentQuoteItems.splice(index, 1);
    renderEditItemsTable(window.currentQuoteItems, true);
}

let searchTimeout;
async function searchProductsForQuote(query) {
    if (!query) {
        document.getElementById('quoteProductSuggestions').style.display = 'none';
        return;
    }

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`${API_URL}/products/`);
            const products = await response.json();

            // Filter locally (could be backend search for optimization)
            const filtered = products.filter(p =>
                p.name.toLowerCase().includes(query.toLowerCase()) ||
                (p.search_tags && p.search_tags.toLowerCase().includes(query.toLowerCase()))
            ).slice(0, 10);

            const suggestions = document.getElementById('quoteProductSuggestions');
            suggestions.innerHTML = filtered.map(p => `
                <div style="padding: 10px; cursor: pointer; border-bottom: 1px solid #eee;" onclick='selectProductForQuote(${JSON.stringify(p)})'>
                    <strong>${p.name}</strong>
                </div>
            `).join('');
            suggestions.style.display = 'block';
        } catch (e) { console.error(e); }
    }, 300);
}

function selectProductForQuote(product) {
    // Add to current items
    const newItem = {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        option: '',
    };

    window.currentQuoteItems.push(newItem);
    renderEditItemsTable(window.currentQuoteItems, true);

    // Clear search
    document.getElementById('quoteProductSearch').value = '';
    document.getElementById('quoteProductSuggestions').style.display = 'none';
}

async function saveQuoteItems() {
    const id = window.currentQuoteId;
    try {
        const response = await fetchWithAuth(`${API_URL}/quotations/${id}/items`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(window.currentQuoteItems)
        });

        if (response.ok) {
            showToast('Cotización actualizada correctamente');
            closeModal('quotationDetailsModal');
            loadQuotations(); // Refresh table
            loadDashboardData(); // Refresh stats
        } else {
            showToast('Error al actualizar cotización', 'error');
        }
    } catch (error) {
        console.error('Error saving quote items', error);
        showToast('Error de conexión', 'error');
    }
}


function closeModal(modalId) {
    document.getElementById(modalId).style.display = "none";
}


// Window onclick to close modal
window.onclick = function (event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = "none";
    }
}

// --- ANALYTICS ---
async function getAnalytics() {
    try {
        const [statsRes, salesRes, quotationsRes] = await Promise.all([
            fetchWithAuth(`${API_URL}/stats`),
            fetchWithAuth(`${API_URL}/sales/`),
            fetchWithAuth(`${API_URL}/quotations/`)
        ]);
        const stats = await statsRes.json();
        const sales = await salesRes.json();
        const quotations = await quotationsRes.json();

        // Top Products
        const topList = document.getElementById('topProductsList');
        topList.innerHTML = stats.top_products.map(p => `
            <li style="padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                <span><i class="fas fa-box" style="margin-right:10px; color: #ccc;"></i> ${p.name}</span>
                <span style="font-weight: bold; color: var(--primary-color); background: #e9f5ff; padding: 2px 8px; border-radius: 10px;">x${p.count}</span>
            </li>
        `).join('');

        // Sales Chart — ingresos reales por día desde la entidad Sale
        const revenueByDate = {};
        sales.forEach(s => {
            const date = new Date(s.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });
            revenueByDate[date] = (revenueByDate[date] || 0) + s.price;
        });
        const history = Object.entries(revenueByDate)
            .sort(([a], [b]) => new Date(a) - new Date(b))
            .map(([date, amount]) => ({ date, amount }));

        renderSalesChart(history);

        // Quotations chart — count per day
        const countByDate = {};
        quotations.forEach(q => {
            const date = new Date(q.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });
            countByDate[date] = (countByDate[date] || 0) + 1;
        });
        const quotationHistory = Object.entries(countByDate)
            .sort(([a], [b]) => new Date(a) - new Date(b))
            .map(([date, count]) => ({ date, count }));

        renderQuotationsChart(quotationHistory);

    } catch (error) {
        console.error('Error loading analytics', error);
    }
}

let chartInstance = null;
let quotationsChartInstance = null;
function renderSalesChart(history) {
    const ctx = document.getElementById('salesChart').getContext('2d');

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: history.map(h => h.date),
            datasets: [{
                label: 'Ingresos (COP)',
                data: history.map(h => h.amount),
                borderColor: '#2ecc71',
                backgroundColor: 'rgba(46, 204, 113, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#2ecc71'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#f0f0f0' },
                    ticks: {
                        callback: value => '$' + Number(value).toLocaleString('es-CO')
                    }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

function renderQuotationsChart(history) {
    const ctx = document.getElementById('quotationsChart').getContext('2d');
    if (quotationsChartInstance) quotationsChartInstance.destroy();

    quotationsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: history.map(h => h.date),
            datasets: [{
                label: 'Cotizaciones',
                data: history.map(h => h.count),
                backgroundColor: 'rgba(0, 123, 255, 0.6)',
                borderColor: '#007bff',
                borderWidth: 1,
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 },
                    grid: { color: '#f0f0f0' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

// --- CATEGORIES ---
let allCategories = [];

async function loadCategories() {
    try {
        const response = await fetch(`${API_URL}/categories/`);
        allCategories = await response.json();

        const select = document.getElementById('prodCategory');
        if (select) {
            select.innerHTML = '<option value="">Seleccione Categoría</option>' +
                allCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }

        const filterSelect = document.getElementById('productFilterCategory');
        if (filterSelect) {
            const currentValue = filterSelect.value;
            filterSelect.innerHTML = '<option value="">Todas las categorías</option>' +
                allCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            if (currentValue) filterSelect.value = currentValue;
        }
    } catch (e) {
        console.error('Error loading categories', e);
    }
}

function openCategoryModal() {
    document.getElementById('categoryModal').style.display = 'block';
}

async function saveCategory() {
    const name = document.getElementById('newCatName').value.trim();
    const tags = document.getElementById('newCatTags').value.trim();

    if (!name) {
        showToast('El nombre es obligatorio', 'warning');
        return;
    }

    try {
        const response = await fetchWithAuth(`${API_URL}/categories/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, tags })
        });

        if (response.ok) {
            showToast('Categoría creada');
            closeModal('categoryModal');
            document.getElementById('newCatName').value = '';
            document.getElementById('newCatTags').value = '';
            await loadCategories();
        } else {
            showToast('Error al crear categoría', 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('Error de conexión', 'error');
    }
}

async function onCategoryChange(categoryId) {
    const id = parseInt(categoryId);

    const subcatSelect = document.getElementById('prodSubcategory');
    subcatSelect.innerHTML = '<option value="">Seleccione Subcategoría</option>';
    if (!id) return;

    try {
        const response = await fetch(`${API_URL}/subcategories/?category_id=${id}`);
        const subcats = await response.json();
        subcatSelect.innerHTML = '<option value="">Seleccione Subcategoría</option>' +
            subcats.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    } catch(e) {
        console.error('Error loading subcategories', e);
    }
}

// --- BRANDS PICKER ---
let allBrands = [];
let selectedBrandIds = new Set();

async function loadBrandsPicker(preselected = []) {
    try {
        const res = await fetch(`${API_URL}/brands/`);
        allBrands = await res.json();
        selectedBrandIds = new Set(preselected);
        renderBrandsPicker();
    } catch (e) {
        console.error('Error loading brands', e);
    }
}

function renderBrandsPicker() {
    const container = document.getElementById('brandsPicker');
    if (!container) return;
    container.innerHTML = allBrands.map(b => `
        <button type="button"
            class="brand-pick-chip ${selectedBrandIds.has(b.id) ? 'selected' : ''}"
            data-brand-id="${b.id}"
            onclick="toggleBrandPick(${b.id})">
            ${b.name}
        </button>
    `).join('');
}

function toggleBrandPick(brandId) {
    if (selectedBrandIds.has(brandId)) {
        selectedBrandIds.delete(brandId);
    } else {
        selectedBrandIds.add(brandId);
    }
    renderBrandsPicker();
}

// --- PRESENTATIONS PICKER ---
let allPresentations = [];
let selectedPresentationIds = new Set();

async function loadPresentationsPicker(preselected = []) {
    try {
        const res = await fetch(`${API_URL}/presentations/`);
        allPresentations = await res.json();
        selectedPresentationIds = new Set(preselected);
        renderPresentationsPicker();
    } catch (e) {
        console.error('Error loading presentations', e);
    }
}

function renderPresentationsPicker() {
    const container = document.getElementById('presentationsPicker');
    if (!container) return;
    container.innerHTML = allPresentations.map(p => `
        <button type="button"
            class="brand-pick-chip ${selectedPresentationIds.has(p.id) ? 'selected' : ''}"
            data-presentation-id="${p.id}"
            onclick="togglePresentationPick(${p.id})">
            ${p.name}
        </button>
    `).join('');
}

function togglePresentationPick(presentationId) {
    if (selectedPresentationIds.has(presentationId)) {
        selectedPresentationIds.delete(presentationId);
    } else {
        selectedPresentationIds.add(presentationId);
    }
    renderPresentationsPicker();
}

// --- PRODUCTS ---
async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/products/`);
        const products = await response.json();
        window.allProducts = products;
        populateProductFilterSelects();
        applyProductFilters();
    } catch (e) { console.error(e); }
}

function populateProductFilterSelects() {
    const catSelect = document.getElementById('pFilterCategory');
    const brandSelect = document.getElementById('pFilterBrand');
    const presSelect = document.getElementById('pFilterPresentation');
    if (!catSelect) return;

    catSelect.innerHTML = '<option value="">Todas</option>' +
        (allCategories || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    brandSelect.innerHTML = '<option value="">Todas</option>' +
        (allBrands || []).map(b => `<option value="${b.id}">${b.name}</option>`).join('');

    presSelect.innerHTML = '<option value="">Todas</option>' +
        (allPresentations || []).map(p => `<option value="${p.id}">${p.name}</option>`).join('');
}

async function onProductFilterCategoryChange() {
    const catId = document.getElementById('pFilterCategory')?.value;
    const subcatSelect = document.getElementById('pFilterSubcategory');
    subcatSelect.innerHTML = '<option value="">Todas</option>';

    if (catId) {
        try {
            const res = await fetch(`${API_URL}/subcategories/?category_id=${catId}`);
            const subcats = await res.json();
            subcatSelect.innerHTML += subcats.map(s =>
                `<option value="${s.id}">${s.name}</option>`
            ).join('');
        } catch (e) { console.error(e); }
    }
    applyProductFilters();
}

function applyProductFilters() {
    if (!window.allProducts) return;
    const name     = (document.getElementById('pFilterName')?.value || '').toLowerCase();
    const catId    = document.getElementById('pFilterCategory')?.value || '';
    const subcatId = document.getElementById('pFilterSubcategory')?.value || '';
    const brandId  = document.getElementById('pFilterBrand')?.value || '';
    const presId   = document.getElementById('pFilterPresentation')?.value || '';

    const filtered = window.allProducts.filter(p => {
        const matchName  = !name    || (p.name || '').toLowerCase().includes(name);
        const matchCat   = !catId   || String(p.category_id) === catId;
        const matchSubcat= !subcatId|| String(p.subcategory_id) === subcatId;
        const matchBrand = !brandId || (p.brands || []).some(b => String(b.id) === brandId);
        const matchPres  = !presId  || (p.presentations || []).some(pr => String(pr.id) === presId);
        return matchName && matchCat && matchSubcat && matchBrand && matchPres;
    });

    renderProductsTable(filtered);
}

function clearProductFilters() {
    const name = document.getElementById('pFilterName');
    const cat  = document.getElementById('pFilterCategory');
    const sub  = document.getElementById('pFilterSubcategory');
    const brand= document.getElementById('pFilterBrand');
    const pres = document.getElementById('pFilterPresentation');
    if (name)  name.value  = '';
    if (cat)   cat.value   = '';
    if (sub)   { sub.innerHTML = '<option value="">Todas</option>'; }
    if (brand) brand.value = '';
    if (pres)  pres.value  = '';
    applyProductFilters();
}

function openProductDetail(productId) {
    const p = window.allProducts?.find(pr => pr.id === productId);
    if (!p) return;

    document.getElementById('pdImage').src = p.image_url || '';
    document.getElementById('pdImage').style.display = p.image_url ? 'block' : 'none';
    document.getElementById('pdName').textContent = p.name;
    document.getElementById('pdCategory').textContent = p.category_name || '—';
    document.getElementById('pdSubcategory').textContent = p.subcategory_name || '';
    document.getElementById('pdSubcategory').style.display = p.subcategory_name ? 'inline-flex' : 'none';

    document.getElementById('pdBrands').innerHTML = (p.brands || []).map(b =>
        `<span class="status-badge" style="background:#fff3cd;color:#856404;">${b.name}</span>`
    ).join('') || '<span style="color:#aaa;font-size:0.8rem;">Sin marcas</span>';

    document.getElementById('pdPresentations').innerHTML = (p.presentations || []).map(pr =>
        `<span class="status-badge" style="background:#f0fff4;color:#28a745;">${pr.name}</span>`
    ).join('') || '';

    const descWrapper = document.getElementById('pdDescriptionWrapper');
    document.getElementById('pdDescription').textContent = p.description || '';
    descWrapper.style.display = p.description ? 'block' : 'none';

    const techWrapper = document.getElementById('pdTechSheetWrapper');
    if (p.technical_sheet_url) {
        const sheetUrl = p.technical_sheet_url.startsWith('/') ? `${API_URL}${p.technical_sheet_url}` : p.technical_sheet_url;
        document.getElementById('pdTechSheet').href = sheetUrl;
        techWrapper.style.display = 'block';
    } else {
        techWrapper.style.display = 'none';
    }

    document.getElementById('pdBtnEdit').onclick = () => { closeModal('productDetailModal'); editProduct(p); };
    document.getElementById('pdBtnDelete').onclick = () => { closeModal('productDetailModal'); deleteProduct(p.id); };

    document.getElementById('productDetailModal').style.display = 'block';
}

function renderProductsTable(products) {
    const tbody = document.querySelector('#productsTable tbody');
    if (!tbody) return;

    if (!products.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#888;padding:20px;">No hay productos.</td></tr>`;
        return;
    }

    tbody.innerHTML = products.map(p => {
        const brandBadges = (p.brands || []).map(b =>
            `<span class="badge" style="background:#fff3cd;color:#856404;margin:2px;">${b.name}</span>`
        ).join('');
        const presentationBadges = (p.presentations || []).map(pr =>
            `<span class="badge" style="background:#f0fff4;color:#28a745;margin:2px;">${pr.name}</span>`
        ).join('');
        return `
            <tr style="cursor:pointer;" onclick="openProductDetail(${p.id})">
                <td><img src="${p.image_url}" style="width:50px;height:50px;object-fit:cover;border-radius:8px;" onerror="this.style.display='none'"></td>
                <td style="font-weight:600;">${p.name}</td>
                <td><span class="badge" style="background:#e9f5ff;color:#007bff;">${p.category_name || '—'}</span></td>
                <td><span style="color:#6f42c1;font-size:0.85rem;">${p.subcategory_name || '—'}</span></td>
                <td>${brandBadges || '<span style="color:#aaa;font-size:0.8rem;">—</span>'}</td>
                <td>${presentationBadges || '<span style="color:#aaa;font-size:0.8rem;">—</span>'}</td>
            </tr>
        `;
    }).join('');
}

function updateProductsCounters(filteredCount, totalCount) {
    const filteredEl = document.getElementById('productsFilteredCount');
    const totalEl = document.getElementById('productsTotalCount');
    if (filteredEl) filteredEl.textContent = filteredCount;
    if (totalEl) totalEl.textContent = totalCount;
}

function filterProducts() {
    if (!window.allProducts) return;

    const searchEl = document.getElementById('productSearch');
    const categoryEl = document.getElementById('productFilterCategory');
    const sortEl = document.getElementById('productSort');

    const query = (searchEl ? searchEl.value : '').trim().toLowerCase();
    const category = categoryEl ? categoryEl.value : '';
    const sort = sortEl ? sortEl.value : 'name_asc';

    const filtered = window.allProducts.filter(p => {
        const name = (p.name || '').toLowerCase();
        const categoryText = (p.category_name || '').toLowerCase();
        const brands = (p.brands || []).map(b => b.name).join(' ').toLowerCase();
        const tagList = (p.search_tags || '').toLowerCase().split(',').map(t => t.trim());

        const matchesQuery = !query ||
            name.includes(query) ||
            categoryText.includes(query) ||
            brands.includes(query) ||
            tagList.some(tag => tag.startsWith(query));

        const matchesCategory = !category || String(p.category_id) === category;

        return matchesQuery && matchesCategory;
    });

    const sorted = [...filtered].sort((a, b) => {
        if (sort === 'name_asc') return (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' });
        if (sort === 'name_desc') return (b.name || '').localeCompare(a.name || '', 'es', { sensitivity: 'base' });
        return 0;
    });

    renderProductsTable(sorted);
    updateProductsCounters(sorted.length, window.allProducts.length);
}

function clearProductFilters() {
    const search = document.getElementById('productSearch');
    const category = document.getElementById('productFilterCategory');
    const minPrice = document.getElementById('productPriceMin');
    const maxPrice = document.getElementById('productPriceMax');
    const sort = document.getElementById('productSort');

    if (search) search.value = '';
    if (category) category.value = '';
    if (minPrice) minPrice.value = '';
    if (maxPrice) maxPrice.value = '';
    if (sort) sort.value = 'name_asc';

    filterProducts();
}

function closeProductModal() {
    document.getElementById('productModal').style.display = 'none';
    document.getElementById('prodId').value = '';
    document.getElementById('prodCode').value = '';
    document.querySelectorAll('#productModal input:not([type=hidden]):not([type=file]), #productModal textarea, #productModal select').forEach(el => el.value = '');
    document.getElementById('imagePreviewContainer').style.display = 'none';
    document.getElementById('imageUploadStatus').style.display = 'none';
    document.getElementById('pdfUploadStatus').style.display = 'none';
    document.getElementById('pdfUploadSuccess').style.display = 'none';
    document.getElementById('prodImageFile').value = '';
    document.getElementById('prodTechSheetFile').value = '';
    selectedBrandIds = new Set();
    selectedPresentationIds = new Set();
}

async function openProductModal(product = null) {
    closeProductModal();
    document.getElementById('productModalTitle').textContent = product ? 'Editar Producto' : 'Nuevo Producto';
    await loadCategories();
    await loadBrandsPicker();
    await loadPresentationsPicker();

    if (product) {
        document.getElementById('prodId').value = product.id;
        document.getElementById('prodCode').value = product.code || '';
        document.getElementById('prodName').value = product.name;
        document.getElementById('prodCategory').value = product.category_id || '';
        if (product.category_id) await onCategoryChange(product.category_id);
        document.getElementById('prodSubcategory').value = product.subcategory_id || '';
        document.getElementById('prodImage').value = product.image_url || '';
        document.getElementById('prodDescription').value = product.description || '';
        document.getElementById('prodTechSheet').value = product.technical_sheet_url || '';
        await loadBrandsPicker(product.brands ? product.brands.map(b => b.id) : []);
        await loadPresentationsPicker(product.presentations ? product.presentations.map(p => p.id) : []);
        if (product.image_url) {
            document.getElementById('imagePreview').src = product.image_url;
            document.getElementById('imagePreviewContainer').style.display = 'block';
        }
    }

    document.getElementById('productModal').style.display = 'block';
}

async function uploadImageToCloudinary(input) {
    const file = input.files[0];
    if (!file) return;

    // Validaciones
    const maxSizeMB = 5;
    if (file.size > maxSizeMB * 1024 * 1024) {
        showToast(`La imagen no puede superar ${maxSizeMB}MB`, 'warning');
        input.value = '';
        return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
        showToast('Solo se permiten imágenes JPG, PNG, WEBP o GIF', 'warning');
        input.value = '';
        return;
    }

    // Mostrar estado de carga
    const statusEl = document.getElementById('imageUploadStatus');
    const previewContainer = document.getElementById('imagePreviewContainer');
    const imageInput = document.getElementById('prodImage');

    statusEl.style.display = 'flex';
    previewContainer.style.display = 'none';
    imageInput.value = '';

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('folder', 'productos');

        const response = await fetch(CLOUDINARY_UPLOAD_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Error al subir imagen');
        }

        const data = await response.json();
        const imageUrl = data.secure_url;

        // Rellenar el campo URL automáticamente
        imageInput.value = imageUrl;

        // Mostrar preview
        document.getElementById('imagePreview').src = imageUrl;
        previewContainer.style.display = 'block';
        statusEl.style.display = 'none';

        showToast('Imagen subida correctamente', 'success');

    } catch (error) {
        console.error('Error subiendo imagen:', error);
        statusEl.style.display = 'none';
        showToast('Error al subir imagen: ' + error.message, 'error');
        input.value = '';
    }
}

async function uploadPdfToCloudinary(input) {
    const file = input.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        showToast('Solo se permiten archivos PDF', 'warning');
        input.value = '';
        return;
    }
    if (file.size > 20 * 1024 * 1024) {
        showToast('El PDF no puede superar 20MB', 'warning');
        input.value = '';
        return;
    }

    const statusEl = document.getElementById('pdfUploadStatus');
    const successEl = document.getElementById('pdfUploadSuccess');
    const urlInput = document.getElementById('prodTechSheet');

    statusEl.style.display = 'flex';
    successEl.style.display = 'none';
    urlInput.value = '';

    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_URL}/upload/pdf`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: formData,
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Error al subir PDF');
        }

        const data = await response.json();
        urlInput.value = data.url;
        statusEl.style.display = 'none';
        successEl.style.display = 'flex';
        document.getElementById('pdfFileName').textContent = file.name;
        showToast('Ficha técnica subida correctamente', 'success');
    } catch (error) {
        console.error('Error subiendo PDF:', error);
        statusEl.style.display = 'none';
        showToast('Error al subir PDF: ' + error.message, 'error');
        input.value = '';
    }
}

async function saveProduct() {
    const id = document.getElementById('prodId').value;
    const product = {
        name: document.getElementById('prodName').value,
        category_id: parseInt(document.getElementById('prodCategory').value) || null,
        subcategory_id: parseInt(document.getElementById('prodSubcategory').value) || null,
        image_url: document.getElementById('prodImage').value,
        brand_ids: [...selectedBrandIds],
        presentation_ids: [...selectedPresentationIds],
        description: document.getElementById('prodDescription').value.trim() || null,
        technical_sheet_url: document.getElementById('prodTechSheet').value.trim() || null,
    };

    if (!product.category_id) {
        showToast('Debe seleccionar una categoría', 'warning');
        return;
    }

    try {
        let url = `${API_URL}/products/`;
        let method = 'POST';

        if (id) {
            url = `${API_URL}/products/${id}`;
            method = 'PUT';
        }

        const response = await fetchWithAuth(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product)
        });

        if (response.ok) {
            showToast(id ? 'Producto actualizado' : 'Producto creado');
            closeProductModal();
            loadProducts();
            loadDashboardData();
        } else {
            showToast('Error al guardar', 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('Error de conexión', 'error');
    }
}

async function editProduct(product) {
    await openProductModal(product);
}

async function deleteProduct(id) {
    showConfirm('Eliminar producto', '¿Está seguro de que desea eliminar este producto? Esta acción no se puede deshacer.', async () => {
        try {
            await fetchWithAuth(`${API_URL}/products/${id}`, { method: 'DELETE' });
            showToast('Producto eliminado');
            loadProducts();
            loadDashboardData();
        } catch (e) {
            console.error(e);
            showToast('Error al eliminar', 'error');
        }
    });
}



// --- EXCEL IMPORT ---
let allSubcategoriesByCategory = {};

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

async function openExcelImportModal() {
    resetExcelImport();
    // Ensure reference data is loaded
    if (!allCategories.length) await loadCategories();
    if (!allBrands.length) await loadBrandsPicker();
    if (!allPresentations.length) await loadPresentationsPicker();
    if (Object.keys(allSubcategoriesByCategory).length === 0) {
        try {
            const res = await fetch(`${API_URL}/subcategories/`);
            const subcats = await res.json();
            allSubcategoriesByCategory = {};
            subcats.forEach(sc => {
                if (!allSubcategoriesByCategory[sc.category_id]) allSubcategoriesByCategory[sc.category_id] = [];
                allSubcategoriesByCategory[sc.category_id].push(sc);
            });
        } catch (e) { console.error('Error cargando subcategorías para importación', e); }
    }
    document.getElementById('excelImportModal').style.display = 'block';
}

function resetExcelImport() {
    window.excelImportRows = [];
    const uploadStep = document.getElementById('excelUploadStep');
    const previewStep = document.getElementById('excelPreviewStep');
    const loading = document.getElementById('excelUploadLoading');
    const fileInput = document.getElementById('excelFileInput');
    if (uploadStep) uploadStep.style.display = 'block';
    if (previewStep) previewStep.style.display = 'none';
    if (loading) loading.style.display = 'none';
    if (fileInput) fileInput.value = '';
}

document.addEventListener('DOMContentLoaded', () => {
    const zone = document.getElementById('excelDropZone');
    if (!zone) return;
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (!file) return;
        const input = document.getElementById('excelFileInput');
        try {
            const dt = new DataTransfer();
            dt.items.add(file);
            input.files = dt.files;
        } catch (_) {}
        handleExcelFile(input, file);
    });
    zone.addEventListener('click', () => document.getElementById('excelFileInput').click());
});

async function handleExcelFile(input, droppedFile) {
    const file = droppedFile || input.files[0];
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xlsm)$/i)) {
        showToast('Solo se aceptan archivos .xlsx o .xlsm', 'warning');
        input.value = '';
        return;
    }
    document.getElementById('excelUploadLoading').style.display = 'block';
    const formData = new FormData();
    formData.append('file', file);
    try {
        const res = await fetchWithAuth(`${API_URL}/products/preview-excel`, {
            method: 'POST',
            body: formData
        });
        document.getElementById('excelUploadLoading').style.display = 'none';
        if (!res.ok) {
            const err = await res.json();
            showToast(err.detail || 'Error al procesar el archivo', 'error');
            return;
        }
        const rows = await res.json();
        if (!rows.length) {
            showToast('El archivo no contiene productos', 'warning');
            return;
        }
        window.excelImportRows = rows;
        document.getElementById('excelUploadStep').style.display = 'none';
        document.getElementById('excelPreviewStep').style.display = 'block';
        renderImportPreview();
    } catch (e) {
        console.error(e);
        document.getElementById('excelUploadLoading').style.display = 'none';
        showToast('Error de conexión al procesar el archivo', 'error');
    }
}

function renderImportPreview() {
    const rows = window.excelImportRows || [];
    const valid = rows.filter(r => r.name && r.category_id).length;
    const errorCount = rows.filter(r => r.status === 'error').length;
    const warnCount = rows.filter(r => r.status === 'warning').length;

    document.getElementById('excelImportStats').innerHTML = [
        `<span style="color:#28a745;font-weight:600;">✅ ${valid} listo${valid !== 1 ? 's' : ''}</span>`,
        warnCount ? `<span style="color:#b58900;font-weight:600;">⚠️ ${warnCount} con advertencias</span>` : '',
        errorCount ? `<span style="color:#dc3545;font-weight:600;">❌ ${errorCount} con errores</span>` : ''
    ].filter(Boolean).join('');

    const btn = document.getElementById('excelImportBtn');
    btn.innerHTML = `<i class="fas fa-file-import"></i> Importar ${valid} producto${valid !== 1 ? 's' : ''}`;
    btn.disabled = valid === 0;

    document.getElementById('excelPreviewBody').innerHTML = rows.map((r, i) => {
        const isError = r.status === 'error';
        const isWarn = r.status === 'warning';
        const statusIcon = isError ? '❌' : isWarn ? '⚠️' : '✅';
        const statusTitle = [...(r.errors || []), ...(r.warnings || [])].join('\n') || 'Sin problemas';
        const rowBg = isError ? 'background:#fff5f5;' : isWarn ? 'background:#fffbf0;' : '';

        const catOptions = (allCategories || []).map(c =>
            `<option value="${c.id}" ${c.id == r.category_id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
        ).join('');

        const subcats = allSubcategoriesByCategory[r.category_id] || [];
        const subcatOptions = subcats.map(s =>
            `<option value="${s.id}" ${s.id == r.subcategory_id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`
        ).join('');

        const brandChips = (r.brand_names || []).map(b =>
            `<span class="badge" style="background:#fff3cd;color:#856404;white-space:nowrap;font-size:0.72rem;">${escapeHtml(b)}</span>`
        ).join(' ') || '<span style="color:#ccc;font-size:0.75rem;">—</span>';

        const presChips = (r.presentation_names || []).map(p =>
            `<span class="badge" style="background:#f0fff4;color:#28a745;white-space:nowrap;font-size:0.72rem;">${escapeHtml(p)}</span>`
        ).join(' ') || '<span style="color:#ccc;font-size:0.75rem;">—</span>';

        return `<tr data-idx="${i}" style="${rowBg}">
            <td style="text-align:center;color:#aaa;font-size:0.75rem;">${r.row}</td>
            <td style="text-align:center;font-size:1rem;" title="${escapeHtml(statusTitle)}">${statusIcon}</td>
            <td><input class="excel-cell-input" value="${escapeHtml(r.name || '')}" oninput="window.excelImportRows[${i}].name=this.value;updateImportBtn()"></td>
            <td>
                <select class="excel-cell-select" onchange="onImportRowCatChange(${i},this.value)">
                    <option value="">Sin categoría</option>
                    ${catOptions}
                </select>
            </td>
            <td>
                <select class="excel-cell-select" id="importSubcat_${i}" onchange="window.excelImportRows[${i}].subcategory_id=parseInt(this.value)||null">
                    <option value="">Sin subcategoría</option>
                    ${subcatOptions}
                </select>
            </td>
            <td>${brandChips}</td>
            <td>${presChips}</td>
            <td><input class="excel-cell-input" value="${escapeHtml(r.description || '')}" oninput="window.excelImportRows[${i}].description=this.value" placeholder="Descripción..."></td>
            <td><input class="excel-cell-input" value="${escapeHtml(r.image_url || '')}" oninput="window.excelImportRows[${i}].image_url=this.value" placeholder="URL..."></td>
            <td>
                <button class="btn-action btn-cancel" title="Eliminar fila" onclick="removeImportRow(${i})" style="padding:4px 8px;">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

function updateImportBtn() {
    const rows = window.excelImportRows || [];
    const valid = rows.filter(r => r.name && r.category_id).length;
    const btn = document.getElementById('excelImportBtn');
    if (!btn) return;
    btn.innerHTML = `<i class="fas fa-file-import"></i> Importar ${valid} producto${valid !== 1 ? 's' : ''}`;
    btn.disabled = valid === 0;
}

async function onImportRowCatChange(idx, catId) {
    catId = parseInt(catId) || null;
    window.excelImportRows[idx].category_id = catId;
    window.excelImportRows[idx].subcategory_id = null;
    updateImportBtn();
    const subcatSel = document.getElementById(`importSubcat_${idx}`);
    subcatSel.innerHTML = '<option value="">Sin subcategoría</option>';
    if (catId) {
        if (!allSubcategoriesByCategory[catId]) {
            try {
                const res = await fetch(`${API_URL}/subcategories/?category_id=${catId}`);
                allSubcategoriesByCategory[catId] = await res.json();
            } catch (e) { console.error(e); }
        }
        (allSubcategoriesByCategory[catId] || []).forEach(s => {
            subcatSel.innerHTML += `<option value="${s.id}">${escapeHtml(s.name)}</option>`;
        });
    }
}

function removeImportRow(idx) {
    window.excelImportRows.splice(idx, 1);
    renderImportPreview();
}

async function executeImport() {
    const rows = window.excelImportRows || [];
    const toImport = rows.filter(r => r.name && r.category_id);
    if (!toImport.length) {
        showToast('No hay productos válidos para importar', 'warning');
        return;
    }
    const btn = document.getElementById('excelImportBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importando...';
    const products = toImport.map(r => ({
        name: r.name,
        category_id: r.category_id,
        subcategory_id: r.subcategory_id || null,
        image_url: r.image_url || null,
        brand_ids: r.brand_ids || [],
        presentation_ids: r.presentation_ids || [],
        description: r.description || null,
        technical_sheet_url: null
    }));
    try {
        const res = await fetchWithAuth(`${API_URL}/products/bulk-import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(products)
        });
        if (res.ok) {
            const result = await res.json();
            const errCount = (result.errors || []).length;
            showToast(
                errCount > 0
                    ? `${result.created} importados, ${errCount} con error`
                    : `${result.created} productos importados exitosamente`,
                errCount > 0 ? 'warning' : 'success'
            );
            closeModal('excelImportModal');
            loadProducts();
            loadDashboardData();
        } else {
            const err = await res.json();
            showToast(err.detail || 'Error al importar', 'error');
            btn.disabled = false;
            btn.innerHTML = `<i class="fas fa-file-import"></i> Importar ${toImport.length} productos`;
        }
    } catch (e) {
        console.error(e);
        showToast('Error de conexión', 'error');
        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-file-import"></i> Importar ${toImport.length} productos`;
    }
}

async function downloadImportTemplate() {
    try {
        const res = await fetchWithAuth(`${API_URL}/products/import-template`);
        if (!res.ok) { showToast('Error al descargar la plantilla', 'error'); return; }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla_productos.xlsx';
        a.click();
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error(e);
        showToast('Error al descargar la plantilla', 'error');
    }
}

async function changePassword() {
    const newPass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmPassword').value;

    if (!newPass || newPass.length < 4) {
        showToast('La contraseña debe tener al menos 4 caracteres', 'warning');
        return;
    }

    if (newPass !== confirmPass) {
        showToast('Las contraseñas no coinciden', 'error');
        return;
    }

    try {
        const response = await fetchWithAuth(`${API_URL}/admin/change-password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: newPass })
        });

        if (response.ok) {
            showToast('Contraseña actualizada correctamente. Por seguridad, inicia sesión nuevamente.');
            setTimeout(() => logout(), 2000);
        } else {
            showToast('Error al actualizar contraseña', 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('Error de conexión', 'error');
    }
}

// --- BRANDS MANAGEMENT VIEW ---
async function loadBrandsView() {
    try {
        const res = await fetch(`${API_URL}/brands/`);
        allBrands = (await res.json()).sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
        const input = document.getElementById('brandFilterName');
        if (input) input.value = '';
        renderBrandsTable();
    } catch (e) {
        console.error(e);
        showToast('Error al cargar marcas', 'error');
    }
}

function filterBrandsTable() {
    const q = (document.getElementById('brandFilterName')?.value || '').toLowerCase();
    const filtered = (q ? allBrands.filter(b => b.name.toLowerCase().includes(q)) : allBrands)
        .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    renderBrandsTableRows(filtered);
}

function renderBrandsTable() {
    renderBrandsTableRows(allBrands);
}

function renderBrandsTableRows(brands) {
    const tbody = document.querySelector('#brandsTable tbody');
    if (!tbody) return;

    if (!brands.length) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#888;">No hay marcas.</td></tr>';
        return;
    }

    tbody.innerHTML = brands.map(b => `
        <tr>
            <td>
                ${b.image_url
                    ? `<img src="${b.image_url}" alt="${b.name}" style="height:36px;max-width:90px;object-fit:contain;border-radius:4px;" onerror="this.style.display='none'">`
                    : '<span style="color:#ccc;font-size:0.8rem;">Sin logo</span>'}
            </td>
            <td style="font-weight:600;">${b.name}</td>
            <td style="text-align:right;">
                <button class="btn-action btn-edit" title="Editar" onclick='openBrandModal(${b.id}, "${b.name.replace(/"/g,"&quot;")}", "${(b.image_url||'').replace(/"/g,"&quot;")}")'><i class="fas fa-edit"></i></button>
                <button class="btn-action btn-delete" title="Eliminar" onclick="deleteBrandMgmt(${b.id}, '${b.name.replace(/'/g,"&#39;")}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function openBrandModal(id = null, name = '', imageUrl = '') {
    document.getElementById('brandModalId').value = id || '';
    document.getElementById('brandModalName').value = name;
    document.getElementById('brandModalImageUrl').value = imageUrl;
    document.getElementById('brandModalTitle').textContent = id ? 'Editar Marca' : 'Nueva Marca';
    document.getElementById('brandLogoUploadStatus').style.display = 'none';
    document.getElementById('brandLogoFile').value = '';

    const preview = document.getElementById('brandLogoPreviewContainer');
    const previewImg = document.getElementById('brandLogoPreview');
    if (imageUrl) {
        previewImg.src = imageUrl;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }

    document.getElementById('brandModal').style.display = 'block';
}

async function uploadBrandLogo(input) {
    const file = input.files[0];
    if (!file) return;

    const maxSizeMB = 5;
    if (file.size > maxSizeMB * 1024 * 1024) {
        showToast(`El logo no puede superar ${maxSizeMB}MB`, 'warning');
        input.value = '';
        return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
        showToast('Solo se permiten imágenes JPG, PNG, WEBP, GIF o SVG', 'warning');
        input.value = '';
        return;
    }

    const statusEl = document.getElementById('brandLogoUploadStatus');
    const previewContainer = document.getElementById('brandLogoPreviewContainer');
    const urlInput = document.getElementById('brandModalImageUrl');

    statusEl.style.display = 'flex';
    previewContainer.style.display = 'none';
    urlInput.value = '';

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('folder', 'logos-marcas');

        const response = await fetch(CLOUDINARY_UPLOAD_URL, { method: 'POST', body: formData });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Error al subir logo');
        }

        const data = await response.json();
        urlInput.value = data.secure_url;
        document.getElementById('brandLogoPreview').src = data.secure_url;
        previewContainer.style.display = 'block';
        statusEl.style.display = 'none';
        showToast('Logo subido correctamente', 'success');
    } catch (error) {
        console.error(error);
        statusEl.style.display = 'none';
        showToast('Error al subir logo: ' + error.message, 'error');
        input.value = '';
    }
}

async function saveBrandMgmt() {
    const id = document.getElementById('brandModalId').value;
    const name = document.getElementById('brandModalName').value.trim();
    const image_url = document.getElementById('brandModalImageUrl').value.trim() || null;

    if (!name) {
        showToast('El nombre es obligatorio', 'warning');
        return;
    }

    const isEdit = !!id;
    const url = isEdit ? `${API_URL}/brands/${id}` : `${API_URL}/brands/`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const response = await fetchWithAuth(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, image_url })
        });

        if (response.ok) {
            showToast(isEdit ? 'Marca actualizada' : 'Marca creada');
            closeModal('brandModal');
            await loadBrandsView();
            populateProductFilterSelects();
        } else {
            const err = await response.json().catch(() => ({}));
            showToast(err.detail || 'Error al guardar', 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('Error de conexión', 'error');
    }
}

function deleteBrandMgmt(id, name) {
    showConfirm(
        'Eliminar marca',
        `¿Eliminar "${name}"? Los productos que la tengan asignada perderán esta marca.`,
        async () => {
            try {
                const response = await fetchWithAuth(`${API_URL}/brands/${id}`, { method: 'DELETE' });
                if (response.ok) {
                    showToast('Marca eliminada');
                    await loadBrandsView();
                    populateProductFilterSelects();
                } else {
                    showToast('Error al eliminar', 'error');
                }
            } catch (e) {
                console.error(e);
                showToast('Error de conexión', 'error');
            }
        }
    );
}

// --- CATEGORY MANAGEMENT ---
let currentCatMgmtId = null;

async function loadCategoriesView() {
    await loadCategories();
    renderCategoriesTable();
    resetSubcatPanel();
}

function filterCategoriesTable() {
    const q = (document.getElementById('catFilterName')?.value || '').toLowerCase();
    const filtered = q ? allCategories.filter(c => c.name.toLowerCase().includes(q)) : allCategories;
    renderCategoriesTableRows(filtered);
}

function renderCategoriesTable() {
    renderCategoriesTableRows(allCategories);
}

function renderCategoriesTableRows(categories) {
    const tbody = document.querySelector('#categoriesTable tbody');
    if (!tbody) return;

    if (!categories.length) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:#888;">No hay categorías.</td></tr>';
        return;
    }

    tbody.innerHTML = categories.map(c => {
        const safeName = c.name.replace(/'/g,"&#39;");
        const safeTags = (c.tags||'').replace(/'/g,"&#39;");
        return `
        <tr onclick="onCatRowTap(${c.id}, '${safeName}', '${safeTags}')">
            <td style="font-weight:600;">${c.name}</td>
            <td class="cat-actions-col" style="text-align:right;">
                <button class="btn-action bg-blue" title="Ver subcategorías" onclick="event.stopPropagation();selectCategoryForSubcats(${c.id}, '${safeName}')"><i class="fas fa-list"></i></button>
                <button class="btn-action btn-edit" title="Editar" onclick="event.stopPropagation();openCatMgmtModal(${c.id}, '${safeName}', '${safeTags}')"><i class="fas fa-edit"></i></button>
                <button class="btn-action btn-delete" title="Eliminar" onclick="event.stopPropagation();deleteCatMgmt(${c.id}, '${safeName}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
}

function openCatMgmtModal(id = null, name = '', tags = '') {
    currentCatMgmtId = id;
    document.getElementById('catMgmtId').value = id || '';
    document.getElementById('catMgmtName').value = name;
    document.getElementById('catMgmtTags').value = tags;
    document.getElementById('catMgmtTitle').textContent = id ? 'Editar Categoría' : 'Nueva Categoría';
    document.getElementById('catMgmtModal').style.display = 'block';
}

async function saveCatMgmt() {
    const id = document.getElementById('catMgmtId').value;
    const name = document.getElementById('catMgmtName').value.trim();
    const tags = document.getElementById('catMgmtTags').value.trim();

    if (!name) {
        showToast('El nombre es obligatorio', 'warning');
        return;
    }

    const isEdit = !!id;
    const url = isEdit ? `${API_URL}/categories/${id}` : `${API_URL}/categories/`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const response = await fetchWithAuth(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, tags })
        });

        if (response.ok) {
            showToast(isEdit ? 'Categoría actualizada' : 'Categoría creada');
            closeModal('catMgmtModal');
            await loadCategoriesView();
            populateProductFilterSelects();
        } else {
            const err = await response.json().catch(() => ({}));
            showToast(err.detail || 'Error al guardar', 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('Error de conexión', 'error');
    }
}

function deleteCatMgmt(id, name) {
    showConfirm(
        'Eliminar categoría',
        `¿Eliminar "${name}"? Sus productos quedarán sin categoría y sus subcategorías serán eliminadas.`,
        async () => {
            try {
                const response = await fetchWithAuth(`${API_URL}/categories/${id}`, { method: 'DELETE' });
                if (response.ok) {
                    showToast('Categoría eliminada');
                    await loadCategoriesView();
                    populateProductFilterSelects();
                } else {
                    showToast('Error al eliminar', 'error');
                }
            } catch (e) {
                console.error(e);
                showToast('Error de conexión', 'error');
            }
        }
    );
}

function openCtxMenu(label, actions) {
    document.getElementById('ctxMenuLabel').textContent = label;
    document.getElementById('ctxMenuActions').innerHTML = actions.map(a => `
        <button class="ctx-menu-btn ${a.danger ? 'danger' : ''}" onclick="closeCtxMenu();${a.action}">
            <i class="fas fa-${a.icon}"></i> ${a.label}
        </button>
    `).join('');
    document.getElementById('ctxMenuOverlay').classList.add('open');
    const menu = document.getElementById('ctxMenu');
    menu.style.display = 'block';
    requestAnimationFrame(() => menu.classList.add('open'));
}

function closeCtxMenu() {
    const menu = document.getElementById('ctxMenu');
    menu.classList.remove('open');
    document.getElementById('ctxMenuOverlay').classList.remove('open');
    setTimeout(() => { menu.style.display = 'none'; }, 250);
}

function onCatRowTap(id, name, tags) {
    if (window.innerWidth <= 768) {
        openCtxMenu(name, [
            { icon: 'list', label: 'Ver subcategorías', action: `selectCategoryForSubcats(${id}, '${name}')` },
            { icon: 'edit', label: 'Editar categoría',  action: `openCatMgmtModal(${id}, '${name}', '${tags}')` },
            { icon: 'trash', label: 'Eliminar',         action: `deleteCatMgmt(${id}, '${name}')`, danger: true },
        ]);
    } else {
        openCatMgmtModal(id, name, tags);
    }
}

function onSubcatRowTap(id, name) {
    if (window.innerWidth <= 768) {
        openCtxMenu(name, [
            { icon: 'edit',  label: 'Editar subcategoría', action: `openSubcatMgmtModal(${id}, '${name}')` },
            { icon: 'trash', label: 'Eliminar',             action: `deleteSubcatMgmt(${id}, '${name}')`, danger: true },
        ]);
    } else {
        openSubcatMgmtModal(id, name);
    }
}

// --- SUBCATEGORY MANAGEMENT ---
let currentSubcatCategoryId = null;

function resetSubcatPanel() {
    currentSubcatCategoryId = null;
    document.getElementById('subcatPanelTitle').textContent = 'Subcategorías';
    document.getElementById('subcatPanelHint').style.display = 'block';
    document.getElementById('subcategoriesTable').style.display = 'none';
    document.getElementById('btnAddSubcat').style.display = 'none';
}

async function selectCategoryForSubcats(categoryId, categoryName) {
    currentSubcatCategoryId = categoryId;
    document.getElementById('subcatPanelTitle').textContent = `Subcategorías de "${categoryName}"`;
    document.getElementById('subcatPanelHint').style.display = 'none';
    document.getElementById('btnAddSubcat').style.display = 'inline-block';
    document.getElementById('subcategoriesTable').style.display = 'table';

    document.getElementById('subcategoriesPanel').scrollIntoView({ behavior: 'smooth' });
    await renderSubcategoriesTable(categoryId);
}

function filterSubcategoriesTable() {
    const q = (document.getElementById('subcatFilterName')?.value || '').toLowerCase();
    const filtered = q ? (window.currentSubcats || []).filter(s => s.name.toLowerCase().includes(q)) : (window.currentSubcats || []);
    renderSubcatRows(filtered);
}

function renderSubcatRows(subcats) {
    const tbody = document.querySelector('#subcategoriesTable tbody');
    if (!tbody) return;
    if (!subcats.length) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:#888;">No hay subcategorías.</td></tr>';
        return;
    }
    tbody.innerHTML = subcats.map(s => {
        const safeName = s.name.replace(/'/g,"&#39;");
        return `
        <tr onclick="onSubcatRowTap(${s.id}, '${safeName}')">
            <td style="font-weight:600;">${s.name}</td>
            <td class="cat-actions-col" style="text-align:right;">
                <button class="btn-action btn-edit" title="Editar" onclick="event.stopPropagation();openSubcatMgmtModal(${s.id}, '${safeName}')"><i class="fas fa-edit"></i></button>
                <button class="btn-action btn-delete" title="Eliminar" onclick="event.stopPropagation();deleteSubcatMgmt(${s.id}, '${safeName}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
}

async function renderSubcategoriesTable(categoryId) {
    try {
        const response = await fetch(`${API_URL}/subcategories/?category_id=${categoryId}`);
        const subcats = await response.json();
        window.currentSubcats = subcats;

        const searchWrapper = document.getElementById('subcatSearchWrapper');
        const input = document.getElementById('subcatFilterName');
        if (searchWrapper) searchWrapper.style.display = subcats.length ? 'block' : 'none';
        if (input) input.value = '';

        renderSubcatRows(subcats);
    } catch (e) {
        console.error(e);
        const tbody = document.querySelector('#subcategoriesTable tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:#c00;">Error al cargar subcategorías.</td></tr>';
    }
}

function openSubcatMgmtModal(id = null, name = '') {
    document.getElementById('subcatMgmtId').value = id || '';
    document.getElementById('subcatMgmtCategoryId').value = currentSubcatCategoryId || '';
    document.getElementById('subcatMgmtName').value = name;
    document.getElementById('subcatMgmtTitle').textContent = id ? 'Editar Subcategoría' : 'Nueva Subcategoría';
    document.getElementById('subcatMgmtModal').style.display = 'block';
}

async function saveSubcatMgmt() {
    const id = document.getElementById('subcatMgmtId').value;
    const name = document.getElementById('subcatMgmtName').value.trim();
    const categoryId = parseInt(document.getElementById('subcatMgmtCategoryId').value);

    if (!name) {
        showToast('El nombre es obligatorio', 'warning');
        return;
    }
    if (!categoryId) {
        showToast('No hay categoría seleccionada', 'error');
        return;
    }

    const isEdit = !!id;
    const url = isEdit ? `${API_URL}/subcategories/${id}` : `${API_URL}/subcategories/`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const response = await fetchWithAuth(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, category_id: categoryId })
        });

        if (response.ok) {
            showToast(isEdit ? 'Subcategoría actualizada' : 'Subcategoría creada');
            closeModal('subcatMgmtModal');
            await renderSubcategoriesTable(categoryId);
        } else {
            const err = await response.json().catch(() => ({}));
            showToast(err.detail || 'Error al guardar', 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('Error de conexión', 'error');
    }
}

function deleteSubcatMgmt(id, name) {
    showConfirm(
        'Eliminar subcategoría',
        `¿Eliminar "${name}"? Los productos asignados a esta subcategoría quedarán sin subcategoría.`,
        async () => {
            try {
                const response = await fetchWithAuth(`${API_URL}/subcategories/${id}`, { method: 'DELETE' });
                if (response.ok) {
                    showToast('Subcategoría eliminada');
                    await renderSubcategoriesTable(currentSubcatCategoryId);
                } else {
                    showToast('Error al eliminar', 'error');
                }
            } catch (e) {
                console.error(e);
                showToast('Error de conexión', 'error');
            }
        }
    );
}

// --- PRESENTATIONS MANAGEMENT VIEW ---
async function loadPresentationsView() {
    try {
        const res = await fetch(`${API_URL}/presentations/`);
        allPresentations = (await res.json()).sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
        const input = document.getElementById('presFilterName');
        if (input) input.value = '';
        renderPresentationsTable();
    } catch (e) {
        console.error(e);
        showToast('Error al cargar presentaciones', 'error');
    }
}

function filterPresentationsTable() {
    const q = (document.getElementById('presFilterName')?.value || '').toLowerCase();
    const filtered = (q ? allPresentations.filter(p => p.name.toLowerCase().includes(q)) : allPresentations)
        .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    renderPresentationsTableRows(filtered);
}

function renderPresentationsTable() {
    renderPresentationsTableRows(allPresentations);
}

function renderPresentationsTableRows(presentations) {
    const tbody = document.querySelector('#presentationsTable tbody');
    if (!tbody) return;

    if (!presentations.length) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:#888;">No hay presentaciones.</td></tr>';
        return;
    }

    tbody.innerHTML = presentations.map(p => `
        <tr>
            <td style="font-weight:600;">${p.name}</td>
            <td style="text-align:right;">
                <button class="btn-action btn-edit" title="Editar" onclick='openPresentationModal(${p.id}, "${p.name.replace(/"/g,"&quot;")}")'><i class="fas fa-edit"></i></button>
                <button class="btn-action btn-delete" title="Eliminar" onclick="deletePresentationMgmt(${p.id}, '${p.name.replace(/'/g,"&#39;")}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function openPresentationModal(id = null, name = '') {
    document.getElementById('presentationModalId').value = id || '';
    document.getElementById('presentationModalName').value = name;
    document.getElementById('presentationModalTitle').textContent = id ? 'Editar Presentación' : 'Nueva Presentación';
    document.getElementById('presentationModal').style.display = 'block';
}

async function savePresentationMgmt() {
    const id = document.getElementById('presentationModalId').value;
    const name = document.getElementById('presentationModalName').value.trim();

    if (!name) {
        showToast('El nombre es obligatorio', 'warning');
        return;
    }

    const isEdit = !!id;
    const url = isEdit ? `${API_URL}/presentations/${id}` : `${API_URL}/presentations/`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const response = await fetchWithAuth(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });

        if (response.ok) {
            showToast(isEdit ? 'Presentación actualizada' : 'Presentación creada');
            closeModal('presentationModal');
            await loadPresentationsView();
            populateProductFilterSelects();
        } else {
            const err = await response.json().catch(() => ({}));
            showToast(err.detail || 'Error al guardar', 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('Error de conexión', 'error');
    }
}

function deletePresentationMgmt(id, name) {
    showConfirm(
        'Eliminar presentación',
        `¿Eliminar "${name}"? Los productos que la tengan asignada perderán esta presentación.`,
        async () => {
            try {
                const response = await fetchWithAuth(`${API_URL}/presentations/${id}`, { method: 'DELETE' });
                if (response.ok) {
                    showToast('Presentación eliminada');
                    await loadPresentationsView();
                    populateProductFilterSelects();
                } else {
                    showToast('Error al eliminar', 'error');
                }
            } catch (e) {
                console.error(e);
                showToast('Error de conexión', 'error');
            }
        }
    );
}

// --- LIGHTBOX ---
function openAdminLightbox(src) {
    if (!src) return;
    const lb = document.getElementById('adminLightbox');
    document.getElementById('adminLightboxImg').src = src;
    lb.style.display = 'flex';
}

function closeAdminLightbox() {
    document.getElementById('adminLightbox').style.display = 'none';
}

// --- SITE ASSETS ---
// Las 5 tarjetas de categoría del index pueden alternar entre imagen única y
// carrusel; el resto de assets (logo, hero, badges, etc.) son siempre de imagen única.
const CAROUSEL_CAPABLE_SITE_ASSET_KEYS = ['cat_lubricantes', 'cat_grasas', 'cat_seguridad', 'cat_limpieza', 'cat_herramientas'];

function siteAssetFullUrl(url) {
    return url.startsWith('/api/') ? `${API_URL}${url.replace('/api', '')}` : url;
}

async function loadSiteAssets() {
    try {
        const response = await fetchWithAuth(`${API_URL}/admin/site-assets`);
        // logo_navbar ya no es editable: el logo del menú es fijo (oiltech_logo_sin_fondo.png en el HTML).
        const assets = (await response.json()).filter(a => a.key !== 'logo_navbar');

        // Igual que quotationsMap: se guarda el objeto completo por key y los
        // onclick de la tabla solo pasan el key — evita serializar el asset en el atributo HTML.
        window.siteAssetsMap = {};
        assets.forEach(a => { window.siteAssetsMap[a.key] = a; });

        const tbody = document.querySelector('#siteAssetsTable tbody');
        if (!tbody) return;

        tbody.innerHTML = assets.map(a => {
            const fullUrl = siteAssetFullUrl(a.image_url);
            const isCarousel = a.display_mode === 'carousel';
            const modeBadge = CAROUSEL_CAPABLE_SITE_ASSET_KEYS.includes(a.key)
                ? `<span style="display:inline-block;margin-top:4px;font-size:0.68rem;font-weight:600;padding:2px 7px;border-radius:5px;background:${isCarousel ? '#e8f0fe' : '#f0f0f0'};color:${isCarousel ? 'var(--primary-color)' : '#888'};">
                       <i class="fas ${isCarousel ? 'fa-images' : 'fa-image'}"></i> ${isCarousel ? 'Carrusel' : 'Imagen única'}
                   </span>`
                : '';

            return `
                <tr onclick="openSiteAssetModal('${a.key}')">
                    <td><code style="background:#f0f0f0;padding:2px 5px;border-radius:4px;font-weight:600;">${a.key}</code></td>
                    <td>${a.description}${modeBadge}</td>
                    <td>
                        <img src="${fullUrl}" alt="${a.key}"
                             style="max-height: 50px; max-width: 100px; object-fit: contain; border-radius: 4px; background: #f9f9f9; border: 1px solid #eee; cursor: zoom-in;"
                             onclick="event.stopPropagation(); openAdminLightbox('${fullUrl}')"
                             onerror="this.src='https://via.placeholder.com/100x50?text=Error'">
                    </td>
                    <td style="text-align: right;">
                        <button class="btn-action btn-edit" onclick="event.stopPropagation(); openSiteAssetModal('${a.key}')" title="Actualizar">
                            <i class="fas fa-upload"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading site assets', error);
        showToast('Error al cargar recursos del sitio', 'error');
    }
}

function openSiteAssetModal(key) {
    const asset = window.siteAssetsMap?.[key];
    if (!asset) return;

    document.getElementById('siteAssetKey').value = key;
    document.getElementById('siteAssetModalTitle').textContent = `Actualizar: ${key}`;
    document.getElementById('siteAssetModalDesc').textContent = asset.description;
    document.getElementById('siteAssetFileNameDisplay').textContent = 'Haz clic para seleccionar o arrastra una imagen';
    document.getElementById('siteAssetPreviewContainer').style.display = 'none';
    document.getElementById('siteAssetFileInput').value = '';

    const modeToggle = document.getElementById('siteAssetModeToggle');
    if (CAROUSEL_CAPABLE_SITE_ASSET_KEYS.includes(key)) {
        modeToggle.style.display = 'flex';
        document.getElementById('siteAssetModeSingleBtn').onclick = () => setSiteAssetMode(key, 'single');
        document.getElementById('siteAssetModeCarouselBtn').onclick = () => setSiteAssetMode(key, 'carousel');
        renderSiteAssetModeSections(key, asset);
    } else {
        modeToggle.style.display = 'none';
        document.getElementById('siteAssetSingleSection').style.display = 'block';
        document.getElementById('siteAssetGallerySection').style.display = 'none';
    }

    document.getElementById('siteAssetModal').style.display = 'block';
}

// Muestra el uploader de imagen única o el gestor de galería según el modo
// activo del asset, y refleja ese modo en los botones del toggle.
function renderSiteAssetModeSections(key, asset) {
    const isCarousel = asset.display_mode === 'carousel';
    document.getElementById('siteAssetModeSingleBtn').classList.toggle('active', !isCarousel);
    document.getElementById('siteAssetModeCarouselBtn').classList.toggle('active', isCarousel);
    document.getElementById('siteAssetSingleSection').style.display = isCarousel ? 'none' : 'block';
    document.getElementById('siteAssetGallerySection').style.display = isCarousel ? 'block' : 'none';

    if (isCarousel) {
        renderSiteAssetGallery(key, asset);
    }
}

async function setSiteAssetMode(key, mode) {
    if (window.siteAssetsMap[key]?.display_mode === mode) return;

    try {
        const response = await fetchWithAuth(`${API_URL}/admin/site-assets/${key}/mode`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode })
        });
        if (!response.ok) throw new Error('No se pudo cambiar el modo');

        const updated = await response.json();
        window.siteAssetsMap[key] = updated;
        renderSiteAssetModeSections(key, updated);
        showToast(mode === 'carousel' ? 'Modo carrusel activado' : 'Modo imagen única activado');
        loadSiteAssets();
    } catch (error) {
        console.error('Error changing site asset mode', error);
        showToast('Error al cambiar el modo de visualización', 'error');
    }
}

// Las imágenes de un asset en modo carrusel son siempre [portada, ...galería] —
// es la misma lista que entrega /site-assets-map y la que espera PUT .../gallery.
function siteAssetImageList(asset) {
    return [asset.image_url, ...(asset.gallery_urls || [])].filter(Boolean);
}

function renderSiteAssetGallery(key, asset) {
    const grid = document.getElementById('siteAssetGalleryGrid');
    const images = siteAssetImageList(asset);

    grid.innerHTML = images.map((url, i) => `
        <div class="site-asset-gallery-item ${i === 0 ? 'is-cover' : ''}">
            <img src="${siteAssetFullUrl(url)}" alt="${asset.key} ${i + 1}" onclick="openAdminLightbox('${siteAssetFullUrl(url)}')">
            ${i === 0 ? '<span class="site-asset-cover-badge">Portada</span>' : ''}
            <div class="site-asset-gallery-actions">
                <button title="Mover a la izquierda" ${i === 0 ? 'disabled' : ''} onclick="moveSiteAssetGalleryImage('${key}', ${i}, -1)"><i class="fas fa-arrow-left"></i></button>
                <button title="Usar como portada" ${i === 0 ? 'disabled' : ''} onclick="promoteSiteAssetGalleryImage('${key}', ${i})"><i class="fas fa-star"></i></button>
                <button title="Mover a la derecha" ${i === images.length - 1 ? 'disabled' : ''} onclick="moveSiteAssetGalleryImage('${key}', ${i}, 1)"><i class="fas fa-arrow-right"></i></button>
                <button title="Quitar del carrusel" ${images.length <= 1 ? 'disabled' : ''} onclick="removeSiteAssetGalleryImage('${key}', ${i})"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

async function saveSiteAssetGalleryOrder(key, images) {
    try {
        const response = await fetchWithAuth(`${API_URL}/admin/site-assets/${key}/gallery`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ images })
        });
        if (!response.ok) throw new Error('No se pudo actualizar la galería');

        const updated = await response.json();
        window.siteAssetsMap[key] = updated;
        renderSiteAssetGallery(key, updated);
        loadSiteAssets();
    } catch (error) {
        console.error('Error updating site asset gallery', error);
        showToast('Error al actualizar el carrusel', 'error');
    }
}

function moveSiteAssetGalleryImage(key, index, direction) {
    const images = siteAssetImageList(window.siteAssetsMap[key]);
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    [images[index], images[target]] = [images[target], images[index]];
    saveSiteAssetGalleryOrder(key, images);
}

function promoteSiteAssetGalleryImage(key, index) {
    const images = siteAssetImageList(window.siteAssetsMap[key]);
    if (index <= 0) return;
    const [picked] = images.splice(index, 1);
    images.unshift(picked);
    saveSiteAssetGalleryOrder(key, images);
}

function removeSiteAssetGalleryImage(key, index) {
    const images = siteAssetImageList(window.siteAssetsMap[key]);
    if (images.length <= 1) return;
    images.splice(index, 1);
    saveSiteAssetGalleryOrder(key, images);
}

function handleSiteAssetGalleryFileSelect(input) {
    const key = document.getElementById('siteAssetKey').value;
    if (input.files && input.files[0]) {
        addSiteAssetGalleryImage(key, input.files[0]);
        input.value = '';
    }
}

async function addSiteAssetGalleryImage(key, file) {
    const formData = new FormData();
    formData.append('file', file);

    document.getElementById('siteAssetGalleryUploadProgress').style.display = 'block';

    try {
        const response = await fetchWithAuth(`${API_URL}/admin/site-assets/${key}/gallery`, {
            method: 'POST',
            body: formData
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'No se pudo subir la imagen');
        }

        const updated = await response.json();
        window.siteAssetsMap[key] = updated;
        renderSiteAssetGallery(key, updated);
        loadSiteAssets();
        showToast('Imagen agregada al carrusel');
    } catch (error) {
        console.error('Error adding site asset gallery image', error);
        showToast(error.message || 'Error al subir la imagen', 'error');
    } finally {
        document.getElementById('siteAssetGalleryUploadProgress').style.display = 'none';
    }
}

function handleSiteAssetFileSelect(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        document.getElementById('siteAssetFileNameDisplay').textContent = file.name;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('siteAssetPreview');
            preview.src = e.target.result;
            document.getElementById('siteAssetPreviewContainer').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

async function uploadSiteAsset() {
    const key = document.getElementById('siteAssetKey').value;
    const fileInput = document.getElementById('siteAssetFileInput');
    
    if (!fileInput.files || !fileInput.files[0]) {
        showToast('Por favor selecciona un archivo', 'warning');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    
    document.getElementById('siteAssetUploadProgress').style.display = 'block';
    document.getElementById('btnUploadSiteAsset').disabled = true;
    
    try {
        const response = await fetchWithAuth(`${API_URL}/admin/site-assets/${key}`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            showToast('Imagen actualizada correctamente');
            closeModal('siteAssetModal');
            loadSiteAssets();
        } else {
            const err = await response.json();
            showToast(err.detail || 'Error al subir imagen', 'error');
        }
    } catch (error) {
        console.error('Error uploading site asset', error);
        showToast('Error de conexión', 'error');
    } finally {
        document.getElementById('siteAssetUploadProgress').style.display = 'none';
        document.getElementById('btnUploadSiteAsset').disabled = false;
    }
}

// Init
loadDashboardData();
loadCategories();
