# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

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

The backend auto-seeds the admin user (`admin` / `admin123`) and default categories on startup. The admin seed solo corre si no existe ningún usuario `admin` — una vez creado, la contraseña se cambia vía `PUT /admin/change-password` (autenticado) y el seed nunca vuelve a tocarla. It also runs SQLite migrations on every startup via `apply_migrations()` in `main.py`.

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
    : 'https://almacenrefrielectricos-production.up.railway.app';
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
css/           — Per-page stylesheets (admin, catalogo, carrito, login)
js/            — Per-page JS (admin, catalogo, login, productos, index)
imagenes/      — Static assets
index.html     — Landing page
productos.html — Product listing page
admin.html     — Admin panel (auth-gated)
login.html     — Admin login
```

**Auth flow:** JWT tokens via `/token` endpoint (OAuth2 password flow). Token stored in `localStorage`. Admin-only endpoints use `Depends(auth.get_current_user)`.

**Quotation model:** Items stored as JSON column — dicts con `product_id, product_name, quantity, option` (sin `price`). Status values: `Pending`, `Purchased`, `Cancelled`.

**Image uploads:** Cloudinary cloud `dvoeietxt`, unsigned preset `OilTechCMS`. Images → `/image/upload`, PDFs → `/raw/upload` with `fl_attachment:false` inserted after `/upload/`. All upload logic in `admin.js`.

**Railway deployment:** The DB is persisted via a Railway Volume mounted at `RAILWAY_VOLUME_MOUNT_PATH`. Admin endpoints `/admin/upload-db` and `/admin/download-db` exist for manual DB migration between environments.

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

**Cloudinary PDF upload:** Use `/raw/upload` endpoint (not `/image/upload`). Insert `fl_attachment:false` after `/upload/` in the returned URL: `url.replace('/upload/', '/upload/fl_attachment:false/')`.

**search_tags:** Never send from frontend. Backend auto-generates as `",".join(name.split())` on create/update.

**Mobile table pattern:** `cat-actions-col` ya NO se oculta globalmente en móvil — la regla es `#categoriesTable .cat-actions-col { display: none }`. Subcategorías mantienen acciones visibles en móvil. Row tap abre bottom sheet (`openCtxMenu()`).

**quotationsMap pattern:** Cotizaciones se guardan en `window.quotationsMap[id]` al cargar. Los onclick de tabla solo pasan el ID numérico — evita serializar el objeto completo en el atributo HTML (rompe con items JSON anidado).

**Product form (admin):** El formulario de producto es un modal (`productModal`), NO un card inline. Se abre con `openProductModal(product?)` y se cierra con `closeProductModal()`. El antiguo `productFormCard` fue eliminado.

**`/stats` endpoint:** Público (sin auth). Devuelve `{ total_quoted, total_purchased, top_products, sales_history }`. `top_products` cuenta cantidades de items en todas las cotizaciones (independiente del status). El gráfico de ventas consume `/sales/` directamente, no `sales_history`.

**allBrands cache (ya corregido):** `loadBrandsPicker` siempre fetchea fresh — el guard `if (!allBrands.length)` fue eliminado para que marcas nuevas aparezcan en el picker del modal de producto.

**populateProductFilterSelects():** Llamar tras cualquier CRUD de marcas, presentaciones o categorías para mantener los selects de filtro de inventario sincronizados.

**Filter bar pattern:** Todas las barras de filtro usan `.filter-bar card > .filter-bar-row > .filter-group`. Datos en `window.allX`; filtrado client-side sin llamadas al backend.

**CSS `.card`:** `overflow: visible` (era `hidden` — clipaba scroll horizontal de tablas internas). `.main-content` requiere `box-sizing: border-box` para no hacer overflow del viewport.

## Key Constraints

- `SECRET_KEY` se lee de env var (`os.getenv("SECRET_KEY")` en `auth.py`); el backend falla al arrancar si no está definida.
- `bcrypt` must be pinned to `==4.0.1` — newer versions break `passlib` with an `__about__` AttributeError on `/token`.
- No frontend build pipeline; CSS/JS changes are live immediately.
- SQLite is used for simplicity; no ORM migrations framework (migrations are manual `ALTER TABLE` statements in `apply_migrations()`).
- **Backend imports (CRÍTICO):** Los archivos del backend usan imports relativos (`from . import models`, `from .database import Base`). El linter del editor los revierte a absolutos al guardar, rompiendo uvicorn. Si el backend falla con `ModuleNotFoundError: No module named 'models'`, corregir en `main.py`, `auth.py` y `models.py`.
