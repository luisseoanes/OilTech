// admin.js

const API_URL = 'http://localhost:8000';

// Configuracion para Cloudinary

const CLOUDINARY_CLOUD_NAME = 'dxxicnipr';
const CLOUDINARY_UPLOAD_PRESET = 'refrielectricos_unsigned';
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

        document.getElementById('totalQuoted').textContent = stats.total_quoted.toLocaleString('es-CO', { style: 'currency', currency: 'COP' });
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
                        <td>${q.total_estimated.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</td>
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

        const tbody = document.querySelector('#quotationsTable tbody');
        tbody.innerHTML = quotations.map(q => `
                    <tr>
                        <td>#${q.id}</td>
                        <td>${q.customer_name}</td>
                        <td>${q.customer_contact}</td>
                        <td>${q.total_estimated.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</td>
                        <td>${new Date(q.created_at).toLocaleDateString()}</td>
                        <td>
                            <span class="status-badge status-${q.status.toLowerCase()}">${q.status}</span>
                        </td>
                        <td>
                            ${q.status === 'Pending' ? `
                                <button class="btn-action bg-blue" title="Ver Productos" onclick='viewQuotationItems(${JSON.stringify(q).replace(/'/g, "&#39;")})'><i class="fas fa-eye"></i></button>
                                <button class="btn-action btn-edit" title="Editar Precio" onclick="editQuotationPrice(${q.id}, ${q.total_estimated})"><i class="fas fa-edit"></i></button>
                                <button class="btn-action btn-approve" title="Marcar como Comprado" onclick="updateStatus(${q.id}, 'Purchased')"><i class="fas fa-check"></i></button>
                                <button class="btn-action btn-cancel" title="Cancelar Cotización" onclick="updateStatus(${q.id}, 'Cancelled')"><i class="fas fa-times"></i></button>
                            ` : `
                                <button class="btn-action bg-blue" title="Ver Productos" onclick='viewQuotationItems(${JSON.stringify(q).replace(/'/g, "&#39;")})'><i class="fas fa-eye"></i></button>
                            `}
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
                    <td>${(q.total_estimated || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</td>
                    <td>${new Date(q.created_at).toLocaleDateString()}</td>
                    <td><span class="status-badge status-purchased">Completada</span></td>
                </tr>
            `).join('');

    // Update Total
    const total = sales.reduce((sum, q) => sum + (q.total_estimated || 0), 0);
    document.getElementById('salesFilteredTotal').textContent = total.toLocaleString('es-CO', { style: 'currency', currency: 'COP' });
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
    if (!confirm(`¿Marcar cotización #${id} como ${status}?`)) return;
    try {
        await fetchWithAuth(`${API_URL}/quotations/${id}/status?status=${status}`, { method: 'PUT' });
        // Reload current view context
        loadQuotations();
        loadSales(); // In case we switched
        loadDashboardData(); // Refresh global stats
    } catch (error) {
        console.error('Error updating status', error);
    }
}

function viewQuotationItems(quotation) {
    document.getElementById('modalQuoteId').textContent = quotation.id;
    const tbody = document.querySelector('#modalItemsTable tbody');

    let items = [];
    if (quotation.items) {
        // Handle if items is string or object (SQLite JSON sometimes returns string)
        items = typeof quotation.items === 'string' ? JSON.parse(quotation.items) : quotation.items;
    }

    // Store current items for editing
    window.currentQuoteItems = items;
    window.originalQuoteItems = JSON.parse(JSON.stringify(items)); // Deep copy for cancel

    renderEditItemsTable(items, false); // Render properly (read-only initially)

    document.getElementById('quotationDetailsModal').style.display = "block";

    // Reset edit state
    document.getElementById('editQuoteControls').style.display = 'none';
    document.getElementById('btnEnableEdit').style.display = 'inline-block';
    document.getElementById('btnSaveEdit').style.display = 'none';
    document.getElementById('btnCancelEdit').style.display = 'none';
    document.querySelectorAll('.edit-col').forEach(el => el.style.display = 'none');
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

function renderEditItemsTable(items, isEditable) {
    const tbody = document.querySelector('#modalItemsTable tbody');
    const headEditCol = document.querySelector('#modalItemsTable thead .edit-col');

    if (isEditable) {
        headEditCol.style.display = 'table-cell';
    } else {
        headEditCol.style.display = 'none';
    }

    tbody.innerHTML = items.map((item, index) => `
        <tr>
            <td>${item.product_name}</td>
            <td>
                ${isEditable ? `<input type="text" value="${item.option || ''}" onchange="updateQuoteItem(${index}, 'option', this.value)" style="width: 80px;">` : (item.option || '')}
            </td>
            <td>
                ${isEditable ? `<input type="number" value="${item.quantity}" min="1" onchange="updateQuoteItem(${index}, 'quantity', this.value)" style="width: 60px;">` : item.quantity}
            </td>
            <td>${(item.price || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</td>
            <td class="edit-col" style="display: ${isEditable ? 'table-cell' : 'none'};">
                <button class="btn-action btn-delete" onclick="removeQuoteItem(${index})"><i class="fas fa-trash"></i></button>
            </td>
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
                    <strong>${p.name}</strong> - ${p.price_text}
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
        option: product.options ? product.options.split('|')[0] : '',
        price: product.price
    };

    window.currentQuoteItems.push(newItem);
    renderEditItemsTable(window.currentQuoteItems, true);

    // Clear search
    document.getElementById('quoteProductSearch').value = '';
    document.getElementById('quoteProductSuggestions').style.display = 'none';
}

async function saveQuoteItems() {
    const id = document.getElementById('modalQuoteId').textContent;
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

async function editQuotationPrice(id, currentPrice) {
    showPrompt("Editar Precio", "Ingrese el nuevo valor total de la venta:", currentPrice, async (newPrice) => {
        const priceValue = parseFloat(newPrice);
        if (isNaN(priceValue) || priceValue < 0) {
            showToast("Por favor ingrese un valor numérico válido.", 'warning');
            return;
        }

        try {
            const response = await fetchWithAuth(`${API_URL}/quotations/${id}/total?total=${priceValue}`, { method: 'PUT' });
            if (response.ok) {
                showToast("Precio actualizado correctamente");
                loadQuotations();
                loadDashboardData(); // Refresh stats
            } else {
                const err = await response.json();
                showToast("Error al actualizar: " + err.detail, 'error');
            }
        } catch (error) {
            console.error('Error updating price', error);
            showToast("Error de conexión", 'error');
        }
    });
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
            // Keep "Seleccione" option
            select.innerHTML = '<option value="">Seleccione Categoría</option>' +
                allCategories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        }

        const filterSelect = document.getElementById('productFilterCategory');
        if (filterSelect) {
            const currentValue = filterSelect.value;
            filterSelect.innerHTML = '<option value="">Todas las categorías</option>' +
                allCategories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
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

function onCategoryChange(catName) {
    const category = allCategories.find(c => c.name === catName);
    if (category && category.tags) {
        const tagsInput = document.getElementById('prodTags');
        // Only set if tags are empty or if user wants governance (overwriting for now)
        tagsInput.value = category.tags;
    }
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
        const options = (p.options || '').split('|').filter(Boolean).join(', ') || 'Única';
        return `
            <tr>
                <td><img src="${p.image_url}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;" onerror="this.style.display='none'"></td>
                <td style="font-weight: 600; color: var(--black);">${p.name}</td>
                <td><span class="badge" style="background: #e9f5ff; color: #007bff; text-transform: capitalize;">${p.category}</span></td>
                <td style="font-size: 0.85rem; color: #666; max-width: 200px;">${options}</td>
                <td style="font-weight: 700;">${p.price_text}</td>
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
    const minPriceEl = document.getElementById('productPriceMin');
    const maxPriceEl = document.getElementById('productPriceMax');
    const sortEl = document.getElementById('productSort');

    const query = (searchEl ? searchEl.value : '').trim().toLowerCase();
    const category = categoryEl ? categoryEl.value : '';
    const minPriceRaw = minPriceEl ? minPriceEl.value : '';
    const maxPriceRaw = maxPriceEl ? maxPriceEl.value : '';
    const minPrice = minPriceRaw === '' ? NaN : parseFloat(minPriceRaw);
    const maxPrice = maxPriceRaw === '' ? NaN : parseFloat(maxPriceRaw);
    const sort = sortEl ? sortEl.value : 'name_asc';

    const filtered = window.allProducts.filter(p => {
        const name = (p.name || '').toLowerCase();
        const code = (p.code || '').toLowerCase();
        const categoryText = (p.category || '').toLowerCase();
        const brands = (p.brands || '').toLowerCase();
        const tags = (p.search_tags || '').toLowerCase();
        const options = (p.options || '').toLowerCase();
        const priceVal = Number(p.price) || 0;

        const matchesQuery = !query ||
            name.includes(query) ||
            code.includes(query) ||
            categoryText.includes(query) ||
            brands.includes(query) ||
            tags.includes(query) ||
            options.includes(query);

        const matchesCategory = !category || (p.category || '') === category;
        const matchesMin = isNaN(minPrice) || priceVal >= minPrice;
        const matchesMax = isNaN(maxPrice) || priceVal <= maxPrice;

        return matchesQuery && matchesCategory && matchesMin && matchesMax;
    });

    const sorted = [...filtered].sort((a, b) => {
        if (sort === 'name_asc') return (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' });
        if (sort === 'name_desc') return (b.name || '').localeCompare(a.name || '', 'es', { sensitivity: 'base' });
        if (sort === 'price_asc') return (Number(a.price) || 0) - (Number(b.price) || 0);
        if (sort === 'price_desc') return (Number(b.price) || 0) - (Number(a.price) || 0);
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
    } else {
        form.style.display = 'none';
        // Limpiar preview de imagen
        document.getElementById('imagePreviewContainer').style.display = 'none';
        document.getElementById('imageUploadStatus').style.display = 'none';
        document.getElementById('prodImageFile').value = '';
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

async function saveProduct() {
    const id = document.getElementById('prodId').value;
    const product = {
        name: document.getElementById('prodName').value,
        code: document.getElementById('prodCode').value,
        category: document.getElementById('prodCategory').value,
        price: parseFloat(document.getElementById('prodPrice').value) || 0,
        price_text: document.getElementById('prodPriceText').value,
        image_url: document.getElementById('prodImage').value,
        brands: document.getElementById('prodBrands').value,
        search_tags: document.getElementById('prodTags').value,
        options: document.getElementById('prodOptions').value
    };

    if (!product.category) {
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
    document.getElementById('prodCategory').value = product.category;

    document.getElementById('prodPrice').value = product.price;
    document.getElementById('prodPriceText').value = product.price_text;
    document.getElementById('prodImage').value = product.image_url;
    document.getElementById('prodBrands').value = product.brands;
    document.getElementById('prodTags').value = product.search_tags;
    document.getElementById('prodOptions').value = product.options;

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

// Init
loadDashboardData();
loadCategories();
