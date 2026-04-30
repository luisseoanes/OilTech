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

The backend auto-seeds the admin user (`admin` / `admin123`) and default categories on startup. It also runs SQLite migrations on every startup via `apply_migrations()` in `main.py`.

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
  models.py    — SQLAlchemy ORM models (User, Category, Subcategory, Brand, Product, Quotation, product_brands junction)
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

**Quotation model:** Quotation items are stored as a JSON column (list of dicts with `product_id`, `product_name`, `quantity`, `option`, `price`). Status values: `Pending`, `Purchased`, `Cancelled`.

**Image uploads:** Cloudinary cloud `dvoeietxt`, unsigned preset `OilTechCMS`. Images → `/image/upload`, PDFs → `/raw/upload` with `fl_attachment:false` inserted after `/upload/`. All upload logic in `admin.js`.

**Railway deployment:** The DB is persisted via a Railway Volume mounted at `RAILWAY_VOLUME_MOUNT_PATH`. Admin endpoints `/admin/upload-db` and `/admin/download-db` exist for manual DB migration between environments.

**Footer component:** Extracted to `components/footer.html`, injected via `fetch()` in each page. Edit only that file for footer changes.

**Product schema actual:** `id, name, category_id, subcategory_id, image_url, search_tags, description, technical_sheet_url`. Brands via `product_brands` junction — send `brand_ids: List[int]`, receive `brands: List[Brand]`. Columnas eliminadas: `price`, `code`, `price_text`, `options`, `brands` (string).

**Quotation.reference:** Generado en el backend como `COT-{id:06d}` al crear. No enviarlo desde el frontend.

**Quotation.total_estimated eliminado:** Removido completamente. Las cotizaciones solo tienen `items`, `reference` y `status`.

**js/constants.js:** Contains `BRAND_LOGOS` for the homepage carousel animation only. Brand data for products comes from `/brands/` API, not this file.

**SQLite DROP COLUMN:** Requires SQLite ≥ 3.35. Migration in `apply_migrations()` handles it idempotently.

**Brand model:** `Brand` table (`id, name, image_url`) linked to products via `product_brands` junction table (many-to-many). Seeded from `seed_brands()` on startup. CRUD at `/brands/`. Products send `brand_ids: List[int]` on create/update; response includes `brands: List[Brand]`.

**Product create/update pattern:** `brand_ids` must be `data.pop("brand_ids", [])` before `models.Product(**data)` — it's a relationship, not a column.

**Cloudinary PDF upload:** Use `/raw/upload` endpoint (not `/image/upload`). Insert `fl_attachment:false` after `/upload/` in the returned URL: `url.replace('/upload/', '/upload/fl_attachment:false/')`.

**search_tags:** Never send from frontend. Backend auto-generates as `",".join(name.split())` on create/update.

**Mobile table pattern:** Add `class="cat-actions-col"` to both `<th>` and `<td>` of any action column. CSS hides `.cat-actions-col` at `≤768px`. Row tap opens a bottom sheet (`openCtxMenu()`).

## Key Constraints

- `SECRET_KEY` in `auth.py` is hardcoded — must be moved to an environment variable before production.
- `bcrypt` must be pinned to `==4.0.1` — newer versions break `passlib` with an `__about__` AttributeError on `/token`.
- No frontend build pipeline; CSS/JS changes are live immediately.
- SQLite is used for simplicity; no ORM migrations framework (migrations are manual `ALTER TABLE` statements in `apply_migrations()`).
- **Backend imports (CRÍTICO):** Los archivos del backend usan imports relativos (`from . import models`, `from .database import Base`). El linter del editor los revierte a absolutos al guardar, rompiendo uvicorn. Si el backend falla con `ModuleNotFoundError: No module named 'models'`, corregir en `main.py`, `auth.py` y `models.py`.
