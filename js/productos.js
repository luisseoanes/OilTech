const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : 'https://almacenrefrielectricos-production.up.railway.app';

let allProducts = [];

// Helper for secure WhatsApp number
const getWppNum = () => {
    return "573000000000"; // Oil Tech placeholder number
};

// UI Helpers
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
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

// Fetch categories and products, then build tabs and grids dynamically
async function loadProducts() {
    try {
        const [prodRes, catRes] = await Promise.all([
            fetch(`${API_URL}/products/`),
            fetch(`${API_URL}/categories/`)
        ]);
        allProducts = await prodRes.json();
        const categories = await catRes.json();
        buildTabsAndGrids(categories, allProducts);
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function buildTabsAndGrids(categories, products) {
    const tabsContainer = document.getElementById('tabs-container');
    const gridsContainer = document.getElementById('grids-container');

    tabsContainer.innerHTML =
        `<button class="tab-btn active" data-target="todos" onclick="switchTab('todos')">Todos</button>` +
        categories.map(c =>
            `<button class="tab-btn" data-target="cat-${c.id}" onclick="switchTab('cat-${c.id}')">${c.name}</button>`
        ).join('');

    gridsContainer.innerHTML =
        `<div class="subcat-grid active" id="grid-todos"></div>` +
        categories.map(c => `<div class="subcat-grid" id="grid-cat-${c.id}"></div>`).join('');

    renderGrid('todos', products);
    categories.forEach(c => {
        renderGrid(`cat-${c.id}`, products.filter(p => p.category_id === c.id));
    });
}

function renderGrid(targetId, products) {
    const grid = document.getElementById(`grid-${targetId}`);
    if (!grid) return;

    if (!products.length) {
        grid.innerHTML = '<p style="text-align:center;color:#888;padding:40px 0;width:100%;grid-column:1/-1;">No hay productos en esta categoría.</p>';
        return;
    }

    grid.innerHTML = products.map(p => `
        <div class="subcat-card" onclick='openProductModal(${JSON.stringify(p).replace(/'/g, "&#39;")})'>
            <div class="subcat-img-wrapper">
                <img src="${p.image_url}" alt="${p.name}" onerror="this.src='https://placehold.co/400x400?text=Sin+Imagen'">
            </div>
            <div class="subcat-content">
                <div class="subcat-title">${p.name}</div>
                <div class="subcat-desc">${p.description || ''}</div>
            </div>
        </div>
    `).join('');
}

let selectedSubcats = new Set();
let currentCategorySubcats = [];
let currentGridTarget = null;

async function switchTab(targetId) {
    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.subcat-grid').forEach(g => g.classList.remove('active'));
    const tab = document.querySelector(`[data-target="${targetId}"]`);
    const grid = document.getElementById(`grid-${targetId}`);
    if (tab) tab.classList.add('active');
    if (grid) grid.classList.add('active');

    if (targetId === 'todos') {
        clearSubcatBar();
        return;
    }

    const catId = parseInt(targetId.replace('cat-', ''));
    currentGridTarget = targetId;
    await buildSubcatBar(catId);
}

async function buildSubcatBar(catId) {
    try {
        const res = await fetch(`${API_URL}/subcategories/?category_id=${catId}`);
        const subcats = await res.json();
        currentCategorySubcats = subcats;

        if (!subcats.length) {
            clearSubcatBar();
            return;
        }

        selectedSubcats = new Set(subcats.map(s => s.id));
        renderSubcatBar();
    } catch (e) {
        console.error(e);
        clearSubcatBar();
    }
}

function renderSubcatBar() {
    const bar = document.getElementById('subcat-filter-bar');
    bar.style.display = 'flex';
    bar.innerHTML = currentCategorySubcats.map(s => {
        const active = selectedSubcats.has(s.id);
        return `<button class="subcat-chip ${active ? 'selected' : 'deselected'}" onclick="toggleSubcat(${s.id})">
            ${s.name}
            ${active ? `<span class="subcat-chip-x">✕</span>` : ''}
        </button>`;
    }).join('');

    applySubcatFilter();
}

function toggleSubcat(subcatId) {
    if (selectedSubcats.has(subcatId)) {
        selectedSubcats.delete(subcatId);
    } else {
        selectedSubcats.add(subcatId);
    }
    renderSubcatBar();
}

function applySubcatFilter() {
    if (!currentGridTarget) return;
    const catId = parseInt(currentGridTarget.replace('cat-', ''));
    const catProducts = allProducts.filter(p => p.category_id === catId);

    const filtered = catProducts.filter(p =>
        p.subcategory_id === null || p.subcategory_id === undefined || selectedSubcats.has(p.subcategory_id)
    );

    renderGrid(currentGridTarget, filtered);
}

function clearSubcatBar() {
    const bar = document.getElementById('subcat-filter-bar');
    bar.style.display = 'none';
    bar.innerHTML = '';
    selectedSubcats = new Set();
    currentCategorySubcats = [];
    currentGridTarget = null;
}

// Modal Logic
const overlay = document.getElementById('detailModal');
const dTitle = document.getElementById('d-title');
const dCategory = document.getElementById('d-category');
const dIcon = document.getElementById('d-icon');
const sizeChips = document.getElementById('size-chips');
const brandChips = document.getElementById('brand-chips');
let currentProduct = null;

function openProductModal(product) {
    currentProduct = product;
    dCategory.textContent = product.category_name || '';
    dTitle.textContent = product.name;
    
    sizeChips.innerHTML = '';
    
    // Set brands
    const brands = product.brands || [];
    brandChips.innerHTML = brands.length ? brands.map(b => `
        <div class="chip brand-chip" onclick="selectSingleChip(this, 'brand-chip')">${b.name}</div>
    `).join('') : '';

    // Handle technical sheet
    const technicalSheetSection = document.getElementById('technical-sheet-section');
    const btnTechnicalSheet = document.getElementById('btn-technical-sheet');
    
    if (product.technical_sheet_url) {
        technicalSheetSection.style.display = 'block';
        btnTechnicalSheet.href = product.technical_sheet_url;
        btnTechnicalSheet.onclick = function() {
            window.open(product.technical_sheet_url, '_blank');
            return false;
        };
    } else {
        technicalSheetSection.style.display = 'none';
    }

    // Auto select first options
    const firstSize = document.querySelector('.size-chip');
    if (firstSize) firstSize.classList.add('selected');
    
    const firstBrand = document.querySelector('.brand-chip');
    if (firstBrand) firstBrand.classList.add('selected');

    overlay.classList.add('active');
}

function selectSingleChip(chip, groupClass) {
    // Single selection for cart item
    document.querySelectorAll(`.${groupClass}`).forEach(c => c.classList.remove('selected'));
    chip.classList.add('selected');
}

function closeModal() {
    overlay.classList.remove('active');
}

function addToCartFromModal() {
    if (!currentProduct) return;
    
    const selectedSize = document.querySelector('.size-chip.selected');
    const selectedBrand = document.querySelector('.brand-chip.selected');
    
    let optionString = '';
    if (selectedSize) optionString += selectedSize.textContent;
    if (selectedBrand) optionString += (optionString ? ' - ' : '') + selectedBrand.textContent;
    
    if (!optionString) optionString = 'General';

    addToCart(currentProduct, optionString, 1);
    closeModal();
    toggleCart();
}

// Cart Logic
let cart = [];
const cartSidebar = document.getElementById('cartSidebar');
const cartItemsContainer = document.getElementById('cartItems');
const cartCountBadge = document.getElementById('cartCount');

function toggleCart() {
    cartSidebar.classList.toggle('open');
}

function addToCart(product, option = null, quantity = 1) {
    const existingIndex = cart.findIndex(item => item.id === product.id && item.option === option);

    if (existingIndex !== -1) {
        cart[existingIndex].quantity += quantity;
    } else {
        const item = {
            id: product.id,
            name: product.name,
            option: option,
            quantity: quantity
        };
        cart.push(item);
    }
    updateCartUI();
    showToast('Añadido a cotización', 'success');
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

function changeCartQty(index, delta) {
    cart[index].quantity += delta;
    if (cart[index].quantity < 1) {
        removeFromCart(index);
    } else {
        updateCartUI();
    }
}

function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCountBadge) cartCountBadge.textContent = totalItems;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="cart-empty" style="text-align: center; padding: 40px 20px; color: var(--mid);">
                <p>Tu lista de cotización está vacía</p>
            </div>`;
        return;
    }

    cartItemsContainer.innerHTML = cart.map((item, index) => `
        <div class="cart-item" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding: 15px 0;">
            <div class="cart-item-info">
                <h4 style="font-size: 0.9rem; margin-bottom: 4px;">${item.name}</h4>
                <p style="font-size: 0.75rem; color: var(--soft);">${item.option}</p>
                <div class="cart-item-qty" style="display: flex; align-items: center; gap: 10px; margin-top: 5px;">
                    <button onclick="changeCartQty(${index}, -1)" style="width: 20px; height: 20px; border-radius: 50%; border: 1px solid var(--border); background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.8rem;">-</button>
                    <span style="font-weight: 600; font-size: 0.9rem;">${item.quantity}</span>
                    <button onclick="changeCartQty(${index}, 1)" style="width: 20px; height: 20px; border-radius: 50%; border: 1px solid var(--border); background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.8rem;">+</button>
                </div>
            </div>
            <button class="cart-remove" onclick="removeFromCart(${index})" style="background: transparent; border: none; color: var(--red); cursor: pointer;">
                Eliminar
            </button>
        </div>
    `).join('');
}

async function sendBatchQuote() {
    if (cart.length === 0) {
        showToast('Agrega productos primero.', 'warning');
        return;
    }

    const name = document.getElementById('quoteName').value.trim();
    const contact = document.getElementById('quoteContact').value.trim();

    if (!name || !contact) {
        showToast('Por favor completa tu nombre y contacto.', 'warning');
        return;
    }

    const btn = document.getElementById('btnSubmitQuote');
    const originalText = btn.innerHTML;

    const items = cart.map(item => ({
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        option: item.option,
        price: 0
    }));

    const quotationData = {
        customer_name: name,
        customer_contact: contact,
        items: items
    };

    let ref = '';
    try {
        const res = await fetch(`${API_URL}/quotations/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(quotationData)
        });
        if (res.ok) {
            const saved = await res.json();
            ref = saved.reference || '';
        }
    } catch (err) {
        console.error('Error saving quotation:', err);
    }

    let message = `Hola, soy ${name}. Me gustaría cotizar estos productos${ref ? ` (Ref: ${ref})` : ''}:\n\n`;
    cart.forEach((item, index) => {
        const qtyText = item.quantity > 1 ? ` (Cant: ${item.quantity})` : '';
        message += `${index + 1}. ${item.name} - ${item.option}${qtyText}\n`;
    });
    message += `\nContacto: ${contact}\nQuedo atento a su respuesta.`;

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${getWppNum()}&text=${encodeURIComponent(message)}`;

    btn.innerHTML = 'Redirigiendo...';
    btn.disabled = true;

    cart = [];
    updateCartUI();
    document.getElementById('quoteName').value = '';
    document.getElementById('quoteContact').value = '';

    window.location.href = whatsappUrl;
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
});
