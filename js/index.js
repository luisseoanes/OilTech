// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const headerHeight = 120;
            const targetPosition = target.offsetTop - headerHeight;
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

document.querySelectorAll('.fade-in, .reveal').forEach(el => {
    observer.observe(el);
});

// WhatsApp Obfuscation
function openSafeWhatsapp() {
    // Number split to avoid simple scrapers
    const p1 = "57";
    const p2 = "305";
    const p3 = "421";
    const p4 = "5783";
    const msg = "Hola! Vengo desde la página web y necesito información.";
    const url = `https://wa.me/${p1}${p2}${p3}${p4}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
}

// Expose to global scope for HTML onclick
window.openSafeWhatsapp = openSafeWhatsapp;

// --- Solicitud de Cotización (formulario del index) ---
const COTIZACION_WPP_NUM = "573054215783";

function setCotFieldError(fieldId, message) {
    const group = document.querySelector(`.fg[data-field="${fieldId}"]`);
    if (!group) return;
    group.classList.remove('has-error');
    void group.offsetWidth; // reinicia la animación de shake si vuelve a errar
    group.classList.add('has-error');
    const txt = group.querySelector('.fg-error-text');
    if (txt) txt.textContent = message;
    const field = document.getElementById(fieldId);
    if (field) field.setAttribute('aria-invalid', 'true');
}

function clearCotFieldError(fieldId) {
    const group = document.querySelector(`.fg[data-field="${fieldId}"]`);
    if (!group) return;
    group.classList.remove('has-error');
    const field = document.getElementById(fieldId);
    if (field) field.removeAttribute('aria-invalid');
}

function clearAllCotErrors() {
    document.querySelectorAll('.cotizacion-form .fg.has-error').forEach(g => g.classList.remove('has-error'));
    document.querySelectorAll('.cotizacion-form [aria-invalid="true"]').forEach(f => f.removeAttribute('aria-invalid'));
}

function bindCotErrorClearing() {
    ['cotNombre', 'cotCorreo', 'cotTelefono', 'cotEmpresa', 'cotLinea', 'cotDescripcion'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const evt = el.tagName === 'SELECT' ? 'change' : 'input';
        el.addEventListener(evt, () => clearCotFieldError(id));
    });
}
document.addEventListener('DOMContentLoaded', bindCotErrorClearing);

function submitCotizacionIndex() {
    const nombre = document.getElementById('cotNombre').value.trim();
    const correo = document.getElementById('cotCorreo').value.trim();
    const telefono = document.getElementById('cotTelefono').value.trim();
    const empresa = document.getElementById('cotEmpresa').value.trim();
    const linea = document.getElementById('cotLinea').value.trim();
    const descripcion = document.getElementById('cotDescripcion').value.trim();

    clearAllCotErrors();

    const errors = [];
    if (!nombre) errors.push(['cotNombre', 'Ingrese su nombre completo']);
    if (!correo) {
        errors.push(['cotCorreo', 'Ingrese su correo electrónico']);
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        errors.push(['cotCorreo', 'Formato inválido (ej: nombre@empresa.com)']);
    }
    if (!telefono) {
        errors.push(['cotTelefono', 'Ingrese su teléfono']);
    } else if (!/^[\d\s+()\-.]+$/.test(telefono)) {
        errors.push(['cotTelefono', 'Solo números y los símbolos + ( ) - .']);
    } else {
        const digits = telefono.replace(/\D/g, '');
        if (digits.length < 7 || digits.length > 15) {
            errors.push(['cotTelefono', 'Debe tener entre 7 y 15 dígitos']);
        }
    }
    if (!empresa) errors.push(['cotEmpresa', 'Ingrese el nombre de su empresa']);
    if (!linea) errors.push(['cotLinea', 'Seleccione una línea de interés']);
    if (!descripcion) errors.push(['cotDescripcion', 'Describa su necesidad']);

    if (errors.length) {
        errors.forEach(([id, msg]) => setCotFieldError(id, msg));
        const [firstId] = errors[0];
        const firstEl = document.getElementById(firstId);
        if (firstEl) {
            firstEl.focus({ preventScroll: true });
            firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }

    if (!sessionStorage.getItem('privacyConsent')) {
        document.getElementById('privacyConsentModal').style.display = 'flex';
        return;
    }

    sendCotizacionToWhatsapp();
}

function acceptPrivacyConsentIndex() {
    sessionStorage.setItem('privacyConsent', '1');
    document.getElementById('privacyConsentModal').style.display = 'none';
    sendCotizacionToWhatsapp();
}

function sendCotizacionToWhatsapp() {
    const nombre = document.getElementById('cotNombre').value.trim();
    const correo = document.getElementById('cotCorreo').value.trim();
    const telefono = document.getElementById('cotTelefono').value.trim();
    const empresa = document.getElementById('cotEmpresa').value.trim();
    const linea = document.getElementById('cotLinea').value.trim();
    const descripcion = document.getElementById('cotDescripcion').value.trim();

    let message = `*Solicitud de Cotización — Oil Tech*\n\n`;
    message += `*Nombre:* ${nombre}\n`;
    message += `*Correo:* ${correo}\n`;
    message += `*Teléfono:* ${telefono}\n`;
    message += `*Empresa:* ${empresa}\n`;
    message += `*Línea de interés:* ${linea}\n`;
    message += `\n*Detalle de la necesidad:*\n${descripcion}\n`;
    message += `\nQuedo atento a su respuesta.`;

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${COTIZACION_WPP_NUM}&text=${encodeURIComponent(message)}`;

    document.getElementById('cotNombre').value = '';
    document.getElementById('cotCorreo').value = '';
    document.getElementById('cotTelefono').value = '';
    document.getElementById('cotEmpresa').value = '';
    document.getElementById('cotLinea').value = '';
    document.getElementById('cotDescripcion').value = '';

    window.open(whatsappUrl, '_blank');
}

window.submitCotizacionIndex = submitCotizacionIndex;
window.acceptPrivacyConsentIndex = acceptPrivacyConsentIndex;

// Image Lightbox with Zoom
const lightbox = document.getElementById('imageLightbox');
const lightboxStage = document.getElementById('lightboxStage');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxClose = document.querySelector('.lightbox-close');
const lightboxButtons = document.querySelectorAll('.lightbox-btn');

let lightboxScale = 1;
let lightboxTranslateX = 0;
let lightboxTranslateY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const ZOOM_STEP = 0.2;

function updateLightboxTransform() {
    lightboxImage.style.transform = `translate(${lightboxTranslateX}px, ${lightboxTranslateY}px) scale(${lightboxScale})`;
    lightboxStage.classList.toggle('is-zoomed', lightboxScale > 1);
}

function resetLightboxTransform() {
    lightboxScale = 1;
    lightboxTranslateX = 0;
    lightboxTranslateY = 0;
    updateLightboxTransform();
}

function openImageLightbox(src, altText = '') {
    if (!lightbox || !lightboxImage) return;
    lightboxImage.src = src;
    lightboxImage.alt = altText || 'Imagen ampliada';
    resetLightboxTransform();
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
}

function closeImageLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    lightboxImage.src = '';
}

function zoomLightbox(delta) {
    const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, lightboxScale + delta));
    if (nextScale === MIN_SCALE) {
        lightboxTranslateX = 0;
        lightboxTranslateY = 0;
    }
    lightboxScale = nextScale;
    updateLightboxTransform();
}

if (lightboxStage) {
    lightboxStage.addEventListener('wheel', (event) => {
        if (!lightbox.classList.contains('open')) return;
        event.preventDefault();
        const direction = event.deltaY < 0 ? 1 : -1;
        zoomLightbox(direction * ZOOM_STEP);
    }, { passive: false });

    lightboxStage.addEventListener('pointerdown', (event) => {
        if (lightboxScale <= 1) return;
        isDragging = true;
        dragStartX = event.clientX - lightboxTranslateX;
        dragStartY = event.clientY - lightboxTranslateY;
        lightboxStage.setPointerCapture(event.pointerId);
    });

    lightboxStage.addEventListener('pointermove', (event) => {
        if (!isDragging) return;
        lightboxTranslateX = event.clientX - dragStartX;
        lightboxTranslateY = event.clientY - dragStartY;
        updateLightboxTransform();
    });

    lightboxStage.addEventListener('pointerup', () => {
        isDragging = false;
    });

    lightboxStage.addEventListener('pointercancel', () => {
        isDragging = false;
    });
}

if (lightboxButtons && lightboxButtons.length) {
    lightboxButtons.forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.zoom;
            if (action === 'in') zoomLightbox(ZOOM_STEP);
            if (action === 'out') zoomLightbox(-ZOOM_STEP);
            if (action === 'reset') resetLightboxTransform();
        });
    });
}

if (lightboxClose) {
    lightboxClose.addEventListener('click', closeImageLightbox);
}

if (lightbox) {
    lightbox.addEventListener('click', (event) => {
        if (event.target === lightbox) {
            closeImageLightbox();
        }
    });
}

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && lightbox && lightbox.classList.contains('open')) {
        closeImageLightbox();
    }
});

// Product card image carousels.
// Reentrante a propósito: site-assets.js reconstruye los slides de las tarjetas
// con [data-asset] a partir del CMS y vuelve a llamar a esta función — por eso
// limpia cualquier '.carousel-dots'/temporizador de una corrida anterior antes
// de armar los nuevos.
function initProductCarousel(wrapper) {
    wrapper.querySelectorAll('.carousel-dots').forEach(el => el.remove());
    clearInterval(wrapper._carouselTimer);

    const slides = wrapper.querySelectorAll('.carousel-slide');
    if (slides.length <= 1) return;

    let current = 0;

    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'carousel-dots';
    slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', `Imagen ${i + 1}`);
        dot.addEventListener('click', (e) => {
            e.stopPropagation();
            goTo(i);
            resetTimer();
        });
        dotsContainer.appendChild(dot);
    });
    wrapper.appendChild(dotsContainer);

    const dots = dotsContainer.querySelectorAll('.carousel-dot');

    function goTo(index) {
        slides[current].classList.remove('active');
        dots[current].classList.remove('active');
        current = index;
        slides[current].classList.add('active');
        dots[current].classList.add('active');
    }

    function resetTimer() {
        clearInterval(wrapper._carouselTimer);
        wrapper._carouselTimer = setInterval(() => goTo((current + 1) % slides.length), 3500);
    }

    resetTimer();
}
window.initProductCarousel = initProductCarousel;

// Las tarjetas con [data-asset] son carruseles del CMS — site-assets.js arma
// sus slides según la configuración del admin y luego llama a initProductCarousel.
document.querySelectorAll('.carousel-wrapper:not([data-asset])').forEach(initProductCarousel);

document.querySelectorAll('section img').forEach(img => {
    img.classList.add('zoomable-image');
    img.addEventListener('click', () => {
        openImageLightbox(img.src, img.alt);
    });
});
