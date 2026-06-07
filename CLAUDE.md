# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Expected behavior

Challenge the developer's way of thinking, don't validate it. When a plan or technical decision is proposed:

- Point out flaws, edge cases and blind spots
- Disagree when the logic is weak or there are unsupported assumptions
- Say directly when something is a bad idea, instead of making it work anyway

No encouragement or positivity needed. Critical thinking and direct corrections are needed.

## Project Overview

OilTech is an e-commerce/catalog site for industrial lubricants, PPE, and tools. It consists of a vanilla HTML/CSS/JS frontend and a FastAPI + SQLite backend. The app is deployed on Railway.

## Running the Backend

```bash
source venv/bin/activate
cd backend
uvicorn main:app --reload
```

The backend auto-seeds the admin user (`admin` / `admin123`) and default categories on startup. The admin seed only runs if no `admin` user exists — once created, change the password via `PUT /admin/change-password` (auth required); the seed never touches it again. SQLite migrations run on every startup via `apply_migrations()` in `main.py`.

The database path is controlled by the `RAILWAY_VOLUME_MOUNT_PATH` env var (defaults to `./oiltech.db` locally).

## Running the Frontend Locally

```bash
# Serve with HTTP — fetch() for component injection breaks with file://
python3 -m http.server 5500
# Then open http://localhost:5500/index.html
```

## Frontend

The frontend is plain HTML/CSS/JS — no build step, no bundler. Open the HTML files directly in a browser or serve them statically.

**API URL switching** — todos los archivos JS (`admin.js`, `productos.js`, `catalogo.js`) usan el patrón dinámico:
```js
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : 'https://oiltech-production.up.railway.app';
```

## Local Database

The server uses `backend/oiltech.db`, NOT the root `oiltech.db` (which is empty). When running scripts against the DB locally, always target `backend/oiltech.db`.

## Architecture

```
backend/
  main.py      — FastAPI app, all routes, startup seeds and migrations
  models.py    — SQLAlchemy ORM models (User, Category, Subcategory, Brand, Presentation, Product, Quotation, Sale, product_brands junction, product_presentations junction)
  schemas.py   — Pydantic request/response schemas
  database.py  — SQLAlchemy engine setup, DB path resolution
  auth.py      — JWT auth (python-jose), bcrypt password hashing, OAuth2

components/    — Shared HTML components (footer.html injected via fetch)
css/           — Per-page stylesheets (admin, carrito, login, encuentranos, social-floating; catalogo.css es legacy)
js/            — Per-page JS (admin, productos, login, index, site-assets; catalogo.js y constants.js son legacy)
imagenes/      — Static assets
index.css      — Estilos del landing (también lo carga productos.html)
productos.css  — Estilos del catálogo
index.html     — Landing page
productos.html — Product listing page
encuentranos.html — Coverage map (Leaflet)
admin.html     — Admin panel (auth-gated)
login.html     — Admin login
```

**Auth flow:** JWT tokens via `/token` endpoint (OAuth2 password flow). Token stored in `localStorage`. Admin-only endpoints use `Depends(auth.get_current_user)`.

**Quotation model:** Items stored as JSON column — dicts con `product_id, product_name, quantity, option` (sin `price`). Status values: `Pending`, `Purchased`, `Cancelled`.

**Image uploads:** Cloudinary cloud `dvoeietxt`, unsigned preset `OilTechCMS`, endpoint `/image/upload`. All image upload logic in `admin.js`.

**PDF uploads (fichas técnicas):** NO van a Cloudinary. `POST /upload/pdf` al backend (valida magic bytes `%PDF`, máx. 20 MB, nombre randomizado `[a-f0-9]{32}.pdf`). Se guardan en el Railway Volume bajo `backend/fichas-tecnicas/` y se sirven vía `GET /files/pdf/{filename}`.

**Site Assets:** Sistema separado para imágenes editables del sitio (hero, logos, etc.). Modelo `SiteAsset` (`key`, `description`, `image_url`). Endpoints: `GET /admin/site-assets` (auth), `POST /admin/site-assets/{key}` (auth, sube imagen al Volume), `GET /site-assets-map` (público, devuelve dict `{key: url}`), `GET /files/site-images/{filename}` (sirve archivo). Frontend: `js/site-assets.js` se ejecuta en cada página pública, mapea las URLs sobre elementos con `data-asset="<key>"` (`document.querySelectorAll('[data-asset]')`). Admin CRUD en `js/admin.js` desde línea 1930.

**Railway deployment:** The DB is persisted via a Railway Volume mounted at `RAILWAY_VOLUME_MOUNT_PATH`. Admin endpoints `/admin/upload-db` and `/admin/download-db` exist for manual DB migration between environments.

**CORS allowlist:** `allow_origins` está hardcodeado en `backend/main.py` (~línea 341). Al agregar un dominio de producción nuevo, agregarlo ahí (considerar variantes con y sin `www` — los navegadores los tratan como orígenes distintos).

**Footer component:** Extracted to `components/footer.html`, injected via `fetch()` in each page. Edit only that file for footer changes.

**Product schema actual:** `id, name, category_id, subcategory_id, image_url, search_tags, description, technical_sheet_url`. Brands via `product_brands` junction — send `brand_ids: List[int]`, receive `brands: List[Brand]`. Columnas eliminadas: `price`, `code`, `price_text`, `options`, `brands` (string).

**Quotation.reference:** Generado en el backend como `COT-{id:06d}` al crear. No enviarlo desde el frontend.


**js/constants.js:** Archivo eliminado del flujo activo. El carrusel de marcas en `productos.html` se alimenta del endpoint `/brands/` vía `initBrandsCarousel()` en `productos.js`. El array `BRAND_LOGOS` ya no se usa.

**SQLite DROP COLUMN:** Requires SQLite ≥ 3.35. Migration in `apply_migrations()` handles it idempotently.

**Brand model:** `Brand` table (`id, name, image_url`) linked to products via `product_brands` junction table (many-to-many). Seeded from `seed_brands()` on startup. CRUD at `/brands/`. Products send `brand_ids: List[int]` on create/update; response includes `brands: List[Brand]`.

**Product create/update pattern:** Both `brand_ids` and `presentation_ids` must be `data.pop("brand_ids", [])` / `data.pop("presentation_ids", [])` before `models.Product(**data)` — they're relationships, not columns.

**Presentation model:** `Presentation` table (`id, name`) linked to products via `product_presentations` junction (many-to-many). CRUD at `/presentations/`. Send `presentation_ids: List[int]`, receive `presentations: List[Presentation]`.

**Sale model:** `Sale` table (`id, quotation_id UNIQUE FK, price FLOAT, items JSON, customer_name, customer_contact, created_at`). CRUD at `/sales/`. `POST /sales/` auto-sets quotation status to `Purchased`. Serial frontend: `VET-{id:06d}`. Quotation serial: `COT-{id:06d}`.

**QuotationItem:** `price` field eliminado — schema solo tiene `product_id, product_name, quantity, option`.

**search_tags:** Never send from frontend. Backend auto-generates as `",".join(name.split())` on create/update.

**Mobile table pattern:** la regla global `.cat-actions-col { display: none }` fue eliminada (commit `e4852ff`) — las acciones de categorías/subcategorías ya NO se ocultan en móvil. Lo que queda en `admin.css` es solo `#categoriesTable .cat-actions-col:last-child` / `#subcategoriesTable ...:last-child` para alineación (`text-align: right`), no visibilidad. Row tap abre bottom sheet (`openCtxMenu()`).

**quotationsMap pattern:** Cotizaciones se guardan en `window.quotationsMap[id]` al cargar. Los onclick de tabla solo pasan el ID numérico — evita serializar el objeto completo en el atributo HTML (rompe con items JSON anidado).

**Product form (admin):** El formulario de producto es un modal (`productModal`), NO un card inline. Se abre con `openProductModal(product?)` y se cierra con `closeProductModal()`. El antiguo `productFormCard` fue eliminado.

**`/stats` endpoint:** Público (sin auth). Devuelve `{ total_quoted, total_purchased, top_products, sales_history }`. `top_products` cuenta cantidades de items en todas las cotizaciones (independiente del status). El gráfico de ventas consume `/sales/` directamente, no `sales_history`.

**`loadBrandsPicker`:** siempre fetchea fresh (no cachea `allBrands`) — necesario para que marcas nuevas aparezcan en el picker del modal de producto.

**populateProductFilterSelects():** Llamar tras cualquier CRUD de marcas, presentaciones o categorías para mantener los selects de filtro de inventario sincronizados.

**Filter bar pattern:** Todas las barras de filtro usan `.filter-bar card > .filter-bar-row > .filter-group`. Datos en `window.allX`; filtrado client-side sin llamadas al backend.

**CSS `.card`:** `overflow: visible` (era `hidden` — clipaba scroll horizontal de tablas internas). `.main-content` requiere `box-sizing: border-box` para no hacer overflow del viewport.

## Key Constraints

- `SECRET_KEY` se lee de env var (`os.getenv("SECRET_KEY")` en `auth.py`); el backend falla al arrancar si no está definida.
- `bcrypt` must be pinned to `==4.0.1` — newer versions break `passlib` with an `__about__` AttributeError on `/token`.
- No frontend build pipeline; CSS/JS changes are live immediately.
- SQLite is used for simplicity; no ORM migrations framework (migrations are manual `ALTER TABLE` statements in `apply_migrations()`).
- **AGENTS.md:** Espejo de CLAUDE.md para Codex — tiende a desincronizarse (en una revisión se encontró que aún documentaba el flujo viejo de PDFs vía Cloudinary `/raw/upload`, ya reemplazado por `/upload/pdf` al backend). Al agregar o corregir patrones/gotchas en CLAUDE.md, revisar y sincronizar también AGENTS.md.
- **Backend imports (CRÍTICO):** Los archivos del backend usan imports ABSOLUTOS (`import models, schemas, database`), NO relativos — `backend/` no tiene `__init__.py`, así que `from . import models` rompería con `ImportError: attempted relative import with no known parent package` al correr `cd backend && uvicorn main:app`. Si un editor/linter "corrige" estos imports a forma relativa, revertirlos a absolutos en `main.py`, `auth.py` y `models.py`.
