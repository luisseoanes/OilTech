const SITE_ASSETS_API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : 'https://oiltech-production.up.railway.app';

function toFullAssetUrl(url) {
    return url.startsWith('/api/') ? `${SITE_ASSETS_API_URL}${url.replace('/api', '')}` : url;
}

// Reconstruye los slides de un carrusel de categoría a partir de la lista
// ordenada que entrega el CMS y delega los puntos/rotación a
// window.initProductCarousel (definida en index.js, reentrante a propósito
// porque esta función puede correr más de una vez por carga de página).
function applyCarouselAsset(wrapper, entry) {
    const urls = entry.mode === 'carousel' ? entry.images : entry.images.slice(0, 1);
    if (!urls.length) return;

    const alt = wrapper.querySelector('.carousel-slide')?.alt || '';
    wrapper.querySelectorAll('.carousel-slide').forEach(el => el.remove());

    urls.forEach((url, i) => {
        const img = document.createElement('img');
        img.src = toFullAssetUrl(url);
        img.alt = alt;
        img.className = 'carousel-slide' + (i === 0 ? ' active' : '');
        wrapper.appendChild(img);
    });

    if (typeof window.initProductCarousel === 'function') {
        window.initProductCarousel(wrapper);
    }
    // Re-sincroniza el relleno difuminado de la card principal con la imagen activa.
    if (typeof window.syncFeaturedBackdrop === 'function') {
        window.syncFeaturedBackdrop(wrapper);
    }
}

async function loadSiteAssets() {
    try {
        const response = await fetch(`${SITE_ASSETS_API_URL}/site-assets-map`);
        const assetsMap = await response.json();

        document.querySelectorAll('[data-asset]').forEach(el => {
            const key = el.dataset.asset;
            const entry = assetsMap[key];
            if (!entry || !entry.images || !entry.images.length) return;

            if (el.classList.contains('carousel-wrapper')) {
                applyCarouselAsset(el, entry);
            } else if (el.tagName === 'IMG') {
                el.src = toFullAssetUrl(entry.images[0]);
            } else if (key === 'hero_bg' || el.classList.contains('hero')) {
                // Special case for hero background which is a background-image
                el.style.backgroundImage = `linear-gradient(rgba(10, 10, 10, 0.6), rgba(10, 10, 10, 0.3)), url('${toFullAssetUrl(entry.images[0])}')`;
            }
        });
    } catch (e) {
        console.error('Error loading site assets:', e);
    }
}

// Auto-load on DOM ready
document.addEventListener('DOMContentLoaded', loadSiteAssets);

// Export for manual calls (e.g. after footer injection)
window.loadSiteAssets = loadSiteAssets;
