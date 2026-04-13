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

document.querySelectorAll('.fade-in').forEach(el => {
    observer.observe(el);
});

// WhatsApp Obfuscation
function openSafeWhatsapp() {
    // Number split to avoid simple scrapers
    const p1 = "57";
    const p2 = "316";
    const p3 = "023";
    const p4 = "4007";
    const msg = "Hola! Vengo desde la página web y necesito información.";
    const url = `https://wa.me/${p1}${p2}${p3}${p4}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
}

// Expose to global scope for HTML onclick
window.openSafeWhatsapp = openSafeWhatsapp;

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

document.querySelectorAll('section img').forEach(img => {
    img.classList.add('zoomable-image');
    img.addEventListener('click', () => {
        openImageLightbox(img.src, img.alt);
    });
});
