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
# From the project root
uvicorn backend.main:app --reload --port 8000
```

The backend auto-seeds the admin user (`admin` / `admin123`) and default categories on startup. It also runs SQLite migrations on every startup via `apply_migrations()` in `main.py`.

The database path is controlled by the `RAILWAY_VOLUME_MOUNT_PATH` env var (defaults to `./oiltech.db` locally).

## Frontend

The frontend is plain HTML/CSS/JS — no build step, no bundler. Open the HTML files directly in a browser or serve them statically.

**API URL switching** (in `js/catalogo.js`, `js/productos.js`, etc.):
```js
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : 'https://almacenrefrielectricos-production.up.railway.app';
```
Note: `js/admin.js` currently hardcodes `http://localhost:8000` — it must be updated if the admin panel needs to work in production.

## Architecture

```
backend/
  main.py      — FastAPI app, all routes, startup seeds and migrations
  models.py    — SQLAlchemy ORM models (User, Category, Product, Quotation)
  schemas.py   — Pydantic request/response schemas
  database.py  — SQLAlchemy engine setup, DB path resolution
  auth.py      — JWT auth (python-jose), bcrypt password hashing, OAuth2

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

**Image uploads:** Product images use Cloudinary (cloud name `dxxicnipr`, unsigned upload preset `refrielectricos_unsigned`). The upload URL is constructed in `admin.js`.

**Railway deployment:** The DB is persisted via a Railway Volume mounted at `RAILWAY_VOLUME_MOUNT_PATH`. Admin endpoints `/admin/upload-db` and `/admin/download-db` exist for manual DB migration between environments.

## Key Constraints

- `SECRET_KEY` in `auth.py` is hardcoded — must be moved to an environment variable before production.
- No frontend build pipeline; CSS/JS changes are live immediately.
- SQLite is used for simplicity; no ORM migrations framework (migrations are manual `ALTER TABLE` statements in `apply_migrations()`).
