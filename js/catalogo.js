const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : 'https://almacenrefrielectricos-production.up.railway.app';

const catalogGrid = document.getElementById('catalogGrid');
const searchInput = document.getElementById('buscarProducto');
const categorySelect = document.getElementById('filtroCategoria');
const brandSelect = document.getElementById('filtroMarca');
const resultsCount = document.getElementById('resultsCount');
const noResults = document.getElementById('noResults');

let allProducts = [];

// Helper for secure WhatsApp number
const getWppNum = () => {
    const p1 = "57", p2 = "316", p3 = "023", p4 = "4007";
    return p1 + p2 + p3 + p4;
};

// UI Helpers
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

async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/products/`);
        allProducts = await response.json();
        populateFilters();
        filterCards();
    } catch (error) {
        console.error('Error loading products:', error);
        resultsCount.textContent = 'Error al cargar productos. Intenta más tarde.';
    }
}

function populateFilters() {
    const categories = new Set();
    const brands = new Set();

    allProducts.forEach(p => {
        if (p.category) categories.add(p.category);
        if (p.brands) {
            // Split brands by space or comma and trim
            const bList = p.brands.split(/[ ,]+/).filter(Boolean);
            bList.forEach(b => brands.add(b.trim()));
        }
    });

    // Populate Categories
    const sortedCats = Array.from(categories).sort();
    categorySelect.innerHTML = '<option value="all">Todas</option>' +
        sortedCats.map(c => `<option value="${c}">${c.charAt(0).toUpperCase() + c.slice(1)}</option>`).join('');

    // Populate Brands
    const sortedBrands = Array.from(brands).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    brandSelect.innerHTML = '<option value="all">Todas</option>' +
        sortedBrands.map(b => `<option value="${b.toLowerCase()}">${b}</option>`).join('');
}

function renderProduct(product) {
    return `
    <article class="catalog-card" data-id="${product.id}" data-price="${product.price}">
        <div class="catalog-image" onclick="openLightbox('${product.image_url}')" style="cursor: zoom-in;">
            <img src="${product.image_url}" alt="${product.name}" onerror="this.src='images/placeholder.jpg'">
        </div>
        <div class="card-title">
            <i class="fas fa-box"></i>
            <h3>${product.name}</h3>
        </div>
        <p>Marcas: ${product.brands}</p>
        <div class="card-actions">
            <div class="qty-select-wrapper" style="display: flex; align-items: center; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; height: 36px; margin-bottom: 5px;">
                <button onclick="event.stopPropagation(); changeCardQty(${product.id}, -1)" style="padding: 0 10px; border: none; background: #f9f9f9; cursor: pointer;">-</button>
                <input type="number" id="qty-${product.id}" value="1" min="1" readonly style="width: 35px; border: none; text-align: center; font-size: 0.9rem; -moz-appearance: textfield;">
                <button onclick="event.stopPropagation(); changeCardQty(${product.id}, 1)" style="padding: 0 10px; border: none; background: #f9f9f9; cursor: pointer;">+</button>
            </div>
            <button class="btn btn-secondary btn-small" onclick='openModal(${JSON.stringify(product)})'>Ver opciones</button>
            <button class="btn btn-primary btn-small" onclick='addToCart(${JSON.stringify(product)})'>
                <i class="fas fa-plus"></i> Cotizar
            </button>
        </div>
    </article>
    `;
}

function changeCardQty(id, delta) {
    const input = document.getElementById(`qty-${id}`);
    if (input) {
        let val = parseInt(input.value) + delta;
        if (val < 1) val = 1;
        input.value = val;
    }
}

function changeModalQty(delta) {
    const input = document.getElementById('modalQty');
    if (input) {
        let val = parseInt(input.value) + delta;
        if (val < 1) val = 1;
        input.value = val;
    }
}

let currentPage = 1;
const productsPerPage = 12;

function filterCards() {
    const query = (searchInput.value || '').toLowerCase().trim();
    const category = categorySelect.value;
    const brand = brandSelect.value;

    const filtered = allProducts.filter(product => {
        const searchText = (product.name + ' ' + (product.code || '') + ' ' + product.search_tags).toLowerCase();
        const matchesQuery = !query || searchText.includes(query);
        const matchesCategory = category === 'all' || product.category === category;
        const matchesBrand = brand === 'all' || product.brands.toLowerCase().includes(brand);
        return matchesQuery && matchesCategory && matchesBrand;
    });

    // Pagination Logic
    const totalProducts = filtered.length;
    const totalPages = Math.ceil(totalProducts / productsPerPage) || 1;

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    const paginatedProducts = filtered.slice(startIndex, endIndex);

    catalogGrid.innerHTML = '';
    paginatedProducts.forEach(product => {
        catalogGrid.innerHTML += renderProduct(product);
    });

    resultsCount.textContent = `${totalProducts} productos disponibles`;
    noResults.style.display = totalProducts === 0 ? 'block' : 'none';

    // Update Pagination UI
    document.getElementById('pageInfo').textContent = `Página ${currentPage} de ${totalPages}`;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
    document.getElementById('paginationControls').style.display = totalProducts > 0 ? 'flex' : 'none';
}

function changePage(step) {
    currentPage += step;
    filterCards();
    document.getElementById('lista').scrollIntoView({ behavior: 'smooth' });
}

function quoteWhatsapp(productName) {
    const message = `Hola, estoy interesado en cotizar: ${productName}`;
    const url = `https://api.whatsapp.com/send?phone=${getWppNum()}&text=${encodeURIComponent(message)}`;
    window.location.href = url;
}

[searchInput, categorySelect, brandSelect].forEach(element => {
    if (!element) return;
    element.addEventListener('input', filterCards);
    element.addEventListener('change', filterCards);
});

loadProducts();

const modal = document.getElementById('productoModal');
const modalTitle = document.getElementById('modalTitle');
const modalPrice = document.getElementById('modalPrice');
const modalOptions = document.getElementById('modalOptions');
const closeButtons = document.querySelectorAll('[data-close]');

function openModal(product) {
    const title = product.name;
    const options = (product.options || '').split('|').filter(Boolean);

    modalTitle.textContent = title;
    modalPrice.textContent = ''; // Hidden for end user
    modalOptions.innerHTML = options.length
        ? options.map((option, index) => `
                    <label class="modal-option">
                        <input type="radio" name="opcion" ${index === 0 ? 'checked' : ''} value="${option}">
                        ${option}
                    </label>
                `).join('')
        : '<p class="modal-option">Consulta disponibilidad específica.</p>';

    // Reset quantity to 1
    const qtyInput = document.getElementById('modalQty');
    if (qtyInput) qtyInput.value = 1;

    // Store current product in modal for "Add to Quote" action
    modal.dataset.productId = product.id;
    modal.dataset.productName = product.name;

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
}

// Event listeners for static buttons removed since we use dynamic rendering with onclick

closeButtons.forEach(button => {
    button.addEventListener('click', closeModal);
});

modal.addEventListener('click', event => {
    if (event.target === modal) {
        closeModal();
    }
});

// Cart Logic
let cart = [];
const cartSidebar = document.getElementById('cartSidebar');
const cartItemsContainer = document.getElementById('cartItems');
const cartCountBadge = document.getElementById('cartCount');

function toggleCart() {
    cartSidebar.classList.toggle('open');
}

function addToCart(product, option = null, overrideQty = null) {
    const qtyInput = document.getElementById(`qty-${product.id}`);
    const quantity = overrideQty || (qtyInput ? parseInt(qtyInput.value) : 1);
    const selectedOption = option || 'Estándar';

    // Check if item exists in cart with same option
    const existingIndex = cart.findIndex(item => item.id === product.id && item.option === selectedOption);

    if (existingIndex !== -1) {
        cart[existingIndex].quantity += quantity;
    } else {
        const item = {
            id: product.id,
            name: product.name,
            price: product.price_text,
            price_raw: product.price, // Store raw DB price as fallback
            option: selectedOption,
            quantity: quantity
        };
        cart.push(item);
    }

    updateCartUI();

    // Visual feedback
    const btn = event?.target?.closest('button');
    if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Agregado';
        setTimeout(() => {
            btn.innerHTML = originalText;
        }, 1000);
    }

    // Reset card qty if added from card
    if (qtyInput) qtyInput.value = 1;

    if (!cartSidebar.classList.contains('open')) {
        // Optional: bounce the cart icon
    }
}

// Header Cart Dropdown Logic
function showCartDropdown() {
    if (cart.length > 0) {
        document.getElementById('cartDropdown').classList.add('show');
    }
}

function hideCartDropdown() {
    document.getElementById('cartDropdown').classList.remove('show');
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
    // Update all badges
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCountBadge) cartCountBadge.textContent = totalItems;
    const navBadge = document.getElementById('cartBadge');
    if (navBadge) {
        navBadge.textContent = totalItems;
        navBadge.style.transform = 'scale(1.2)';
        setTimeout(() => navBadge.style.transform = 'scale(1)', 300);
    }

    // Sidebar items
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
                    <div class="cart-empty">
                        <i class="fas fa-shopping-basket" style="font-size: 40px; margin-bottom: 10px;"></i>
                        <p>Tu carrito está vacío</p>
                    </div>`;
        document.getElementById('cartDropdownItems').innerHTML = '<p class="empty-msg">Tu carrito está vacío</p>';
        return;
    }

    cartItemsContainer.innerHTML = cart.map((item, index) => `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <h4>${item.name}</h4>
                        <p>${item.option}</p>
                        <div class="cart-item-qty" style="display: flex; align-items: center; gap: 10px; margin-top: 5px;">
                            <button onclick="changeCartQty(${index}, -1)" style="width: 20px; height: 20px; border-radius: 50%; border: 1px solid #ddd; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.8rem;">-</button>
                            <span style="font-weight: 600; font-size: 0.9rem;">${item.quantity}</span>
                            <button onclick="changeCartQty(${index}, 1)" style="width: 20px; height: 20px; border-radius: 50%; border: 1px solid #ddd; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.8rem;">+</button>
                        </div>
                    </div>
                    <button class="cart-remove" onclick="removeFromCart(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('');

    // Dropdown items
    const dropdownItemsContainer = document.getElementById('cartDropdownItems');
    dropdownItemsContainer.innerHTML = cart.map((item) => `
        <div class="dropdown-item">
            <span>${item.name} x${item.quantity}</span>
            <small>${item.option ? item.option.split(' ')[0] : ''}</small>
        </div>
    `).join('');
}

async function sendBatchQuote() {
    if (cart.length === 0) {
        showToast('Agrega productos al carrito primero.', 'warning');
        return;
    }

    const name = document.getElementById('quoteName').value.trim();
    const contact = document.getElementById('quoteContact').value.trim();

    if (!name || !contact) {
        showToast('Por favor completa tu nombre y contacto para realizar la cotización.', 'warning');
        return;
    }

    const btn = document.querySelector('.cart-footer .btn-whatsapp');
    const originalText = btn.innerHTML;

    // Generate a quick random reference (4 chars)
    const ref = 'REF-' + Math.random().toString(36).substring(2, 6).toUpperCase();

    // Prepare payload for backend
    let totalEstimated = 0;
    const items = cart.map(item => {
        let price = 0;
        const priceMatch = item.option ? item.option.match(/\$\s*([\d.]+)/) : null;
        if (priceMatch) {
            price = parseFloat(priceMatch[1].replace(/\./g, ''));
        }
        if (!price && item.price) {
            const basePriceMatch = item.price.match(/\$\s*([\d.]+)/);
            if (basePriceMatch) {
                price = parseFloat(basePriceMatch[1].replace(/\./g, ''));
            }
        }
        if (!price) {
            price = item.price_raw || 0;
        }
        totalEstimated += (price * item.quantity);
        return {
            product_id: item.id,
            product_name: item.name,
            quantity: item.quantity,
            option: item.option,
            price: price
        };
    });

    const quotationData = {
        customer_name: name,
        customer_contact: contact,
        items: items,
        total_estimated: totalEstimated,
        reference: ref
    };

    // 1. SAVE IN BACKGROUND (no await)
    // keepalive: true ensures the request finishes even if we redirect
    fetch(`${API_URL}/quotations/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quotationData),
        keepalive: true
    }).catch(err => console.error('Background save failed:', err));

    // 2. IMMEDIATE REDIRECT (The 1-Click experience)
    let message = `Hola, soy ${name}. Me gustaría cotizar estos productos (Ref: ${ref}):\n\n`;
    cart.forEach((item, index) => {
        const qtyText = item.quantity > 1 ? ` (Cant: ${item.quantity})` : '';
        message += `${index + 1}. ${item.name} - ${item.option}${qtyText}\n`;
    });
    message += `\nContacto: ${contact}\nQuedo atento a su respuesta. Gracias.`;

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${getWppNum()}&text=${encodeURIComponent(message)}`;

    // Visual feedback
    btn.innerHTML = '<i class="fas fa-check"></i> Redirigiendo...';
    btn.disabled = true;

    // Clear UI but store reference for success toast if needed (optional)
    cart = [];
    updateCartUI();
    document.getElementById('quoteName').value = '';
    document.getElementById('quoteContact').value = '';

    // Redirect now
    window.location.href = whatsappUrl;
}

// Modal "Add" Action
document.querySelector('#productoModal .btn-primary').addEventListener('click', () => {
    // Get selected option
    const selectedOption = document.querySelector('input[name="opcion"]:checked')?.value;
    const productId = modal.dataset.productId;
    const productName = modal.dataset.productName;
    const quantity = parseInt(document.getElementById('modalQty').value) || 1;

    // Find product object
    const product = allProducts.find(p => p.id == productId);

    if (product) {
        addToCart(product, selectedOption, quantity);
        closeModal();
        toggleCart(); // Open cart to show addition
    }
});

// Remove old "Cotizar" button from modal since we now rely on the batch quote
// OR change it to "Agregar y salir"
const modalActions = document.querySelector('.modal-actions');
// We render these buttons dynamically or just change their text in HTML?
// The HTML has:
// <button class="btn btn-primary btn-small" type="button">Agregar a cotización</button>
// <button class="btn btn-whatsapp btn-small" type="button"><i class="fab fa-whatsapp"></i> Cotizar</button>

// Let's hide the individual "Cotizar" button in CSS or JS since user wants bulk quote
// For now, let's just make the "Agregar" button work (listener added above)

const lightboxModal = document.getElementById('lightboxModal');
const lightboxStage = document.getElementById('lightboxStage');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxButtons = document.querySelectorAll('#lightboxModal .lightbox-btn');

let lightboxScale = 1;
let lightboxTranslateX = 0;
let lightboxTranslateY = 0;
let isLightboxDragging = false;
let lightboxDragStartX = 0;
let lightboxDragStartY = 0;

const LIGHTBOX_MIN_SCALE = 1;
const LIGHTBOX_MAX_SCALE = 4;
const LIGHTBOX_ZOOM_STEP = 0.2;

function updateLightboxTransform() {
    lightboxImg.style.transform = `translate(${lightboxTranslateX}px, ${lightboxTranslateY}px) scale(${lightboxScale})`;
    if (lightboxStage) {
        lightboxStage.classList.toggle('is-zoomed', lightboxScale > 1);
    }
}

function resetLightboxTransform() {
    lightboxScale = 1;
    lightboxTranslateX = 0;
    lightboxTranslateY = 0;
    updateLightboxTransform();
}

function openLightbox(url) {
    if (!lightboxModal || !lightboxImg) return;
    lightboxImg.src = url;
    lightboxImg.alt = 'Imagen ampliada';
    resetLightboxTransform();
    lightboxModal.classList.add('open');
    lightboxModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
}

function closeLightbox() {
    if (!lightboxModal) return;
    lightboxModal.classList.remove('open');
    lightboxModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    if (lightboxImg) lightboxImg.src = '';
}

function zoomLightbox(delta) {
    const nextScale = Math.min(LIGHTBOX_MAX_SCALE, Math.max(LIGHTBOX_MIN_SCALE, lightboxScale + delta));
    if (nextScale === LIGHTBOX_MIN_SCALE) {
        lightboxTranslateX = 0;
        lightboxTranslateY = 0;
    }
    lightboxScale = nextScale;
    updateLightboxTransform();
}

if (lightboxStage) {
    lightboxStage.addEventListener('wheel', (event) => {
        if (!lightboxModal.classList.contains('open')) return;
        event.preventDefault();
        const direction = event.deltaY < 0 ? 1 : -1;
        zoomLightbox(direction * LIGHTBOX_ZOOM_STEP);
    }, { passive: false });

    lightboxStage.addEventListener('pointerdown', (event) => {
        if (lightboxScale <= 1) return;
        isLightboxDragging = true;
        lightboxDragStartX = event.clientX - lightboxTranslateX;
        lightboxDragStartY = event.clientY - lightboxTranslateY;
        lightboxStage.setPointerCapture(event.pointerId);
    });

    lightboxStage.addEventListener('pointermove', (event) => {
        if (!isLightboxDragging) return;
        lightboxTranslateX = event.clientX - lightboxDragStartX;
        lightboxTranslateY = event.clientY - lightboxDragStartY;
        updateLightboxTransform();
    });

    lightboxStage.addEventListener('pointerup', () => {
        isLightboxDragging = false;
    });

    lightboxStage.addEventListener('pointercancel', () => {
        isLightboxDragging = false;
    });
}

if (lightboxButtons && lightboxButtons.length) {
    lightboxButtons.forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.zoom;
            if (action === 'in') zoomLightbox(LIGHTBOX_ZOOM_STEP);
            if (action === 'out') zoomLightbox(-LIGHTBOX_ZOOM_STEP);
            if (action === 'reset') resetLightboxTransform();
        });
    });
}

if (lightboxModal) {
    lightboxModal.addEventListener('click', (event) => {
        if (event.target === lightboxModal) {
            closeLightbox();
        }
    });
}

document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
        if (modal.classList.contains('open')) closeModal();
        if (cartSidebar.classList.contains('open')) toggleCart();
        closeLightbox();
    }
});
