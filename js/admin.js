// admin.js

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : 'https://almacenrefrielectricos-production.up.railway.app';

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
        const response = await fetchWithAuth(`${API_URL}/stats`);
        const stats = await response.json();

        document.getElementById('totalPurchased').textContent = stats.total_purchased.toLocaleString('es-CO', { style: 'currency', currency: 'COP' });

        // Load products count (need to fetch separately or add to stats, for now separate)
        fetchProductsCount();

        // Load recent sales
        const qResponse = await fetchWithAuth(`${API_URL}/quotations/`);
        const quotations = await qResponse.json();

        const sales = quotations.filter(q => q.status === 'Purchased').slice(0, 5);
        const salesBody = document.querySelector('#recentSalesTable tbody');
        salesBody.innerHTML = sales.map(q => `
                    <tr>
                        <td>#${q.id}</td>
                        <td>${q.customer_name}</td>
                        <td>${new Date(q.created_at).toLocaleDateString()}</td>
                        <td><span class="status-badge status-purchased">Completada</span></td>
                    </tr>
                `).join('');

    } catch (error) {
        console.error('Error loading stats', error);
    }
}

async function fetchProductsCount() {
    const response = await fetch(`${API_URL}/products/`);
    const products = await response.json();
    document.getElementById('totalProducts').textContent = products.length;
}

// --- QUOTATIONS ---
async function loadQuotations() {
    try {
        const response = await fetchWithAuth(`${API_URL}/quotations/`);
        const quotations = await response.json();

        window.quotationsMap = {};
        quotations.forEach(q => { window.quotationsMap[q.id] = q; });

        const tbody = document.querySelector('#quotationsTable tbody');
        tbody.innerHTML = quotations.map(q => `
            <tr>
                <td><strong>${q.reference || 'COT-' + String(q.id).padStart(6, '0')}</strong></td>
                <td>${q.customer_name}</td>
                <td>${q.customer_contact}</td>
                <td>${new Date(q.created_at).toLocaleDateString('es-CO')}</td>
                <td><span class="status-badge status-${q.status.toLowerCase()}">${q.status}</span></td>
                <td>
                    <button class="btn-action bg-blue" title="Ver detalle" onclick="viewQuotationItems(${q.id})"><i class="fas fa-eye"></i></button>
                    ${q.status === 'Pending' ? `
                        <button class="btn-action btn-approve" title="Marcar como Comprado" onclick="updateStatus(${q.id}, 'Purchased')"><i class="fas fa-check"></i></button>
                        <button class="btn-action btn-cancel" title="Cancelar" onclick="updateStatus(${q.id}, 'Cancelled')"><i class="fas fa-times"></i></button>
                    ` : ''}
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading quotations', error);
    }
}

// --- SALES ---
async function loadSales() {
    try {
        const response = await fetchWithAuth(`${API_URL}/quotations/`);
        const quotations = await response.json();
        const sales = quotations.filter(q => q.status === 'Purchased');

        // Store globally for filtering
        window.allSales = sales;

        renderSalesTable(sales);
    } catch (error) { console.error(error); }
}

function renderSalesTable(sales) {
    const tbody = document.querySelector('#salesTable tbody');
    tbody.innerHTML = sales.map(q => `
                <tr>
                    <td>#${q.id}</td>
                    <td>${q.customer_name}</td>
                    <td>${q.customer_contact}</td>
                    <td>${new Date(q.created_at).toLocaleDateString()}</td>
                    <td><span class="status-badge status-purchased">Completada</span></td>
                </tr>
            `).join('');

    document.getElementById('salesFilteredTotal').textContent = sales.length;
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
        const response = await fetchWithAuth(`${API_URL}/stats`);
        const stats = await response.json();

        // Top Products
        const topList = document.getElementById('topProductsList');
        topList.innerHTML = stats.top_products.map(p => `
                    <li style="padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                        <span><i class="fas fa-box" style="margin-right:10px; color: #ccc;"></i> ${p.name}</span>
                        <span style="font-weight: bold; color: var(--primary-color); background: #e9f5ff; padding: 2px 8px; border-radius: 10px;">x${p.count}</span>
                    </li>
                `).join('');

        // Sales Chart
        renderSalesChart(stats.sales_history);

    } catch (error) {
        console.error('Error loading analytics', error);
    }
}

let chartInstance = null;
function renderSalesChart(history) {
    const ctx = document.getElementById('salesChart').getContext('2d');

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: history.map(h => h.date),
            datasets: [{
                label: 'Ventas ($)',
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
        if (!allBrands.length) {
            const res = await fetch(`${API_URL}/brands/`);
            allBrands = await res.json();
        }
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
        if (document.getElementById('productSearch')) {
            filterProducts();
        } else {
            renderProductsTable(products);
            updateProductsCounters(products.length, products.length);
        }
    } catch (e) { console.error(e); }
}

function renderProductsTable(products) {
    const tbody = document.querySelector('#productsTable tbody');
    if (!tbody) return;

    if (!products.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: #888;">No hay productos con esos filtros.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = products.map(p => {
        const presentationBadges = (p.presentations || []).map(pr =>
            `<span class="badge" style="background: #f0fff4; color: #28a745; margin: 2px;">${pr.name}</span>`
        ).join('');
        return `
            <tr>
                <td><img src="${p.image_url}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;" onerror="this.style.display='none'"></td>
                <td style="font-weight: 600; color: var(--black);">${p.name}</td>
                <td><span class="badge" style="background: #e9f5ff; color: #007bff; text-transform: capitalize;">${p.category_name || ''}</span></td>
                <td>${presentationBadges || '<span style="color:#aaa;font-size:0.8rem;">—</span>'}</td>
                <td>
                    <button class="btn-action btn-edit" title="Editar" onclick='editProduct(${JSON.stringify(p).replace(/'/g, "&#39;")})'><i class="fas fa-edit"></i></button>
                    <button class="btn-action btn-delete" title="Eliminar" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>
                </td>
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

function toggleProductForm() {
    const form = document.getElementById('productFormCard');
    const isShowing = form.style.display === 'block';

    if (!isShowing) {
        form.style.display = 'block';
        loadCategories();
        loadBrandsPicker();
        loadPresentationsPicker();
    } else {
        form.style.display = 'none';
        document.getElementById('imagePreviewContainer').style.display = 'none';
        document.getElementById('imageUploadStatus').style.display = 'none';
        document.getElementById('prodImageFile').value = '';
        selectedBrandIds = new Set();
        selectedPresentationIds = new Set();
    }
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
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('folder', 'fichas-tecnicas');

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`,
            { method: 'POST', body: formData }
        );

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Error al subir PDF');
        }

        const data = await response.json();
        // Insert fl_attachment:false so the PDF opens in browser instead of downloading
        const url = data.secure_url.replace('/upload/', '/upload/fl_attachment:false/');

        urlInput.value = url;
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
            document.getElementById('productFormCard').style.display = 'none';
            loadProducts();
            // Clear form
            document.getElementById('prodId').value = '';
            document.getElementById('prodCode').value = '';
            document.querySelectorAll('#productFormCard input, #productFormCard textarea, #productFormCard select').forEach(i => {
                if (i.id !== 'prodCode' && i.id !== 'prodId') i.value = '';
            });
            selectedBrandIds = new Set();
            selectedPresentationIds = new Set();
            loadDashboardData(); // Update count
        } else {
            showToast('Error al guardar', 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('Error de conexión', 'error');
    }
}

async function editProduct(product) {
    document.getElementById('prodId').value = product.id;
    document.getElementById('prodCode').value = product.code || '';
    document.getElementById('prodName').value = product.name;

    await loadCategories();
    document.getElementById('prodCategory').value = product.category_id || '';
    if (product.category_id) await onCategoryChange(product.category_id);
    document.getElementById('prodSubcategory').value = product.subcategory_id || '';

    document.getElementById('prodImage').value = product.image_url || '';
    document.getElementById('prodDescription').value = product.description || '';
    document.getElementById('prodTechSheet').value = product.technical_sheet_url || '';
    const pdfSuccess = document.getElementById('pdfUploadSuccess');
    const pdfStatus = document.getElementById('pdfUploadStatus');
    if (pdfSuccess) pdfSuccess.style.display = 'none';
    if (pdfStatus) pdfStatus.style.display = 'none';
    document.getElementById('prodTechSheetFile').value = '';
    await loadBrandsPicker(product.brands ? product.brands.map(b => b.id) : []);
    await loadPresentationsPicker(product.presentations ? product.presentations.map(p => p.id) : []);

    // Mostrar preview si ya tiene imagen
    const previewContainer = document.getElementById('imagePreviewContainer');
    const previewImg = document.getElementById('imagePreview');
    if (product.image_url) {
        previewImg.src = product.image_url;
        previewContainer.style.display = 'block';
    } else {
        previewContainer.style.display = 'none';
    }
    document.getElementById('imageUploadStatus').style.display = 'none';
    document.getElementById('prodImageFile').value = '';

    const form = document.getElementById('productFormCard');
    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth' });
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
        allBrands = await res.json();
        renderBrandsTable();
    } catch (e) {
        console.error(e);
        showToast('Error al cargar marcas', 'error');
    }
}

function renderBrandsTable() {
    const tbody = document.querySelector('#brandsTable tbody');
    if (!tbody) return;

    if (!allBrands.length) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#888;">No hay marcas creadas.</td></tr>';
        return;
    }

    tbody.innerHTML = allBrands.map(b => `
        <tr>
            <td>
                ${b.image_url
                    ? `<img src="${b.image_url}" alt="${b.name}" style="height:36px;max-width:90px;object-fit:contain;border-radius:4px;" onerror="this.style.display='none'">`
                    : '<span style="color:#ccc;font-size:0.8rem;">Sin logo</span>'}
            </td>
            <td style="font-weight:600;">${b.name}</td>
            <td>
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
            allBrands = [];
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
                    allBrands = [];
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

function renderCategoriesTable() {
    const tbody = document.querySelector('#categoriesTable tbody');
    if (!tbody) return;

    if (!allCategories.length) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#888;">No hay categorías creadas.</td></tr>';
        return;
    }

    tbody.innerHTML = allCategories.map(c => {
        const safeName = c.name.replace(/'/g,"&#39;");
        const safeTags = (c.tags||'').replace(/'/g,"&#39;");
        return `
        <tr onclick="onCatRowTap(${c.id}, '${safeName}', '${safeTags}')">
            <td style="font-weight:600;">${c.name}</td>
            <td style="color:#666;font-size:0.85rem;">${c.tags || '—'}</td>
            <td class="cat-actions-col">
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
    if (window.innerWidth > 768) return;
    openCtxMenu(name, [
        { icon: 'list', label: 'Ver subcategorías', action: `selectCategoryForSubcats(${id}, '${name}')` },
        { icon: 'edit', label: 'Editar categoría',  action: `openCatMgmtModal(${id}, '${name}', '${tags}')` },
        { icon: 'trash', label: 'Eliminar',         action: `deleteCatMgmt(${id}, '${name}')`, danger: true },
    ]);
}

function onSubcatRowTap(id, name) {
    if (window.innerWidth > 768) return;
    openCtxMenu(name, [
        { icon: 'edit',  label: 'Editar subcategoría', action: `openSubcatMgmtModal(${id}, '${name}')` },
        { icon: 'trash', label: 'Eliminar',             action: `deleteSubcatMgmt(${id}, '${name}')`, danger: true },
    ]);
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

async function renderSubcategoriesTable(categoryId) {
    const tbody = document.querySelector('#subcategoriesTable tbody');
    if (!tbody) return;

    try {
        const response = await fetch(`${API_URL}/subcategories/?category_id=${categoryId}`);
        const subcats = await response.json();

        if (!subcats.length) {
            tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:#888;">No hay subcategorías en esta categoría.</td></tr>';
            return;
        }

        tbody.innerHTML = subcats.map(s => {
            const safeName = s.name.replace(/'/g,"&#39;");
            return `
            <tr onclick="onSubcatRowTap(${s.id}, '${safeName}')">
                <td style="font-weight:600;">${s.name}</td>
                <td class="cat-actions-col">
                    <button class="btn-action btn-edit" title="Editar" onclick="event.stopPropagation();openSubcatMgmtModal(${s.id}, '${safeName}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-action btn-delete" title="Eliminar" onclick="event.stopPropagation();deleteSubcatMgmt(${s.id}, '${safeName}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        }).join('');
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:#c00;">Error al cargar subcategorías.</td></tr>';
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
        allPresentations = await res.json();
        renderPresentationsTable();
    } catch (e) {
        console.error(e);
        showToast('Error al cargar presentaciones', 'error');
    }
}

function renderPresentationsTable() {
    const tbody = document.querySelector('#presentationsTable tbody');
    if (!tbody) return;

    if (!allPresentations.length) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:#888;">No hay presentaciones creadas.</td></tr>';
        return;
    }

    tbody.innerHTML = allPresentations.map(p => `
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

// Init
loadDashboardData();
loadCategories();
