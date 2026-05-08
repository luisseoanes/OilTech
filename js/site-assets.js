const SITE_ASSETS_API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : 'https://oiltech-production.up.railway.app';

async function loadSiteAssets() {
    try {
        const response = await fetch(`${SITE_ASSETS_API_URL}/site-assets-map`);
        const assetsMap = await response.json();
        
        document.querySelectorAll('[data-asset]').forEach(el => {
            const key = el.dataset.asset;
            const url = assetsMap[key];
            if (!url) return;
            
            const fullUrl = url.startsWith('/api/') ? `${SITE_ASSETS_API_URL}${url.replace('/api', '')}` : url;
            
            if (el.tagName === 'IMG') {
                el.src = fullUrl;
            } else if (key === 'hero_bg' || el.classList.contains('hero')) {
                // Special case for hero background which is a background-image
                el.style.backgroundImage = `linear-gradient(rgba(10, 10, 10, 0.6), rgba(10, 10, 10, 0.3)), url('${fullUrl}')`;
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
