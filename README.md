# Oil Tech de Colombia S.A.S.

Catálogo y panel administrativo para la distribuidora de **lubricantes industriales, grasas, EPP, productos de limpieza y herramientas técnicas** Oil Tech de Colombia S.A.S. (Bogotá, Colombia).

El sitio público permite navegar el portafolio, armar una cotización (carrito) y enviarla. El backend administra el inventario, las cotizaciones y las ventas, y autentica al admin. La aplicación está desplegada en Railway.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | HTML, CSS y JS *vanilla* — sin bundler, sin build |
| Backend | FastAPI + SQLAlchemy |
| Base de datos | SQLite (persistida en un Railway Volume en producción) |
| Auth | OAuth2 *password flow* + JWT (`python-jose`) + `bcrypt` vía `passlib` |
| Imágenes de productos/marcas | Cloudinary (cloud `dvoeietxt`, preset *unsigned* `OilTechCMS`) |
| Fichas técnicas (PDF) | Almacenadas en el Volume del backend, servidas vía `/files/pdf/{filename}` |
| Mapa de cobertura | Leaflet (CDN) |
| Iconos / fuentes | Font Awesome 6.5, Google Fonts (Montserrat, Inter, Poppins) |
| Despliegue | Railway |

---

## Estructura del proyecto

```
OilTech/
├── index.html                  Landing pública
├── productos.html              Catálogo público (tabs por categoría, carrito, cotización)
├── encuentranos.html           Mapa de cobertura nacional (Leaflet)
├── login.html                  Login de admin
├── admin.html                  Panel administrativo (auth-gated)
│
├── index.css                   Estilos del landing
├── productos.css               Estilos del catálogo
│
├── components/
│   └── footer.html             Footer compartido, inyectado vía fetch() en cada página
│
├── css/
│   ├── admin.css               Panel de admin
│   ├── carrito.css             Sidebar del carrito de cotización
│   ├── catalogo.css            Estilos legacy de catálogo
│   ├── encuentranos.css        Página de cobertura
│   ├── login.css               Login
│   └── social-floating.css     Botones flotantes (WhatsApp, IG, LinkedIn)
│
├── js/
│   ├── admin.js                Panel de admin (CRUD productos, marcas, presentaciones,
│   │                           categorías, cotizaciones, ventas, dashboard, Cloudinary)
│   ├── productos.js            Catálogo + carrito + envío de cotización al backend
│   ├── catalogo.js             Listado legacy (no usado por productos.html)
│   ├── index.js                Animaciones del landing + lightbox de imágenes
│   ├── login.js                Login (POST /token, guarda JWT en localStorage)
│   └── constants.js            Código muerto — el carrusel de marcas se alimenta de /brands/
│
├── imagenes/                   Logos, hero, sellos, iconos de líneas
├── fichasTecnicas/             PDFs históricos sueltos (NO se sirven desde aquí)
├── docs/TODO.md                Pendientes de producto/diseño
│
├── backend/
│   ├── main.py                 App FastAPI, rutas, migraciones y seeds en startup
│   ├── models.py               Modelos SQLAlchemy
│   ├── schemas.py              Schemas Pydantic
│   ├── database.py             Engine, sesión, resolución del path de SQLite
│   ├── auth.py                 JWT + bcrypt
│   ├── requirements.txt
│   ├── oiltech.db              SQLite (gitignored — el de la raíz está vacío, no usar)
│   ├── fichas-tecnicas/        PDFs subidos vía POST /upload/pdf (nombre = uuid hex)
│   ├── init_db.py              Script one-off: siembra de productos desde fichas técnicas
│   └── sync_technical_sheets.py  Script one-off: mapea PDFs a productos por nombre
│
├── scratch/                    Scripts de inspección de la BD
├── replace_emojis.py           One-off de limpieza (raíz)
├── replace_script.py           One-off de limpieza (raíz)
├── venv/                       Virtualenv (gitignored)
├── CLAUDE.md                   Guía interna para agentes de IA
└── .gitignore
```

---

## Modelo de datos

```
User (admin)            ── login JWT
Category ─┬─ Subcategory
          └─ Product ─┬─ Brand          (m2m: product_brands)
                      └─ Presentation   (m2m: product_presentations)
Quotation ── items: JSON [{ product_id, product_name, quantity, option }]
            ── status: Pending | Purchased | Cancelled
            ── reference: COT-{id:06d}  (lo genera el backend al crear)
Sale       ── FK única a Quotation, marca la cotización como Purchased
            ── items: JSON, price: float, customer_name, customer_contact
            ── frontend muestra serial VET-{id:06d}
```

`Product`:
- Sin `price` ni `code` (eliminados).
- `search_tags` lo genera el backend (`",".join(name.split())`); no enviar desde el front.
- En *create/update* se mandan `brand_ids: List[int]` y `presentation_ids: List[int]`; se reciben los objetos `brands` y `presentations` completos.

---

## Endpoints principales (backend)

Públicos (sin auth):
- `GET /products/`, `GET /categories/`, `GET /subcategories/`, `GET /brands/`, `GET /presentations/`
- `POST /quotations/` — crea cotización desde el carrito del catálogo público
- `GET /stats` — métricas para el dashboard (`total_quoted`, `total_purchased`, `top_products`, `sales_history`)
- `GET /files/pdf/{filename}` — sirve fichas técnicas (valida que el nombre sea `[a-f0-9]{32}\.pdf`)

Auth requerida (`Depends(auth.get_current_user)`):
- `POST /token` — login (form `username`, `password`) → `{access_token, token_type}`
- `GET /users/me`
- CRUD completo de `categories`, `subcategories`, `brands`, `presentations`, `products`
- `GET /quotations/`, `PUT /quotations/{id}/status`, `PUT /quotations/{id}/items`
- `GET /sales/`, `POST /sales/` (auto-marca la cotización como `Purchased`)
- `POST /upload/pdf` — sube ficha técnica al Volume (valida magic bytes `%PDF`, máx. 20 MB, nombre randomizado)
- `POST /admin/upload-db`, `GET /admin/download-db` — backup/restore manual de la BD
- `DELETE /admin/clear-quotations` — wipe selectivo de cotizaciones
- `PUT /admin/change-password` — cambia contraseña del admin actual

CORS está abierto a `*`.

---

## Cómo correrlo localmente

### Requisitos
- Python 3.10+
- SQLite ≥ 3.35 (necesario para `ALTER TABLE … DROP COLUMN` en las migraciones de `apply_migrations()`)

### Backend

```bash
# 1. Crear/activar venv
python3 -m venv venv
source venv/bin/activate

# 2. Instalar deps
pip install -r backend/requirements.txt

# 3. Variables de entorno (mínimo SECRET_KEY)
export SECRET_KEY="cambia-esto-por-algo-largo-y-aleatorio"
# Opcional: forzar otra ruta del Volume (por defecto es backend/oiltech.db)
# export RAILWAY_VOLUME_MOUNT_PATH=/ruta/al/volume

# 4. Levantar
cd backend
uvicorn main:app --reload
# Por defecto en http://localhost:8000 — Swagger en /docs
```

En el primer arranque el backend:
1. Crea las tablas (`Base.metadata.create_all`).
2. Aplica migraciones idempotentes (`apply_migrations()` en `main.py`).
3. Siembra el usuario admin (`admin` / `admin123`), las categorías, subcategorías y marcas iniciales.

> **Cambia la contraseña del admin** apenas el sistema esté corriendo. El seed siembra `admin` / `admin123` solo si no existe ningún admin previo; una vez cambiada vía `PUT /admin/change-password`, el seed no vuelve a tocarla.

### Frontend

```bash
# Desde la raíz del repo (NO desde backend/)
python3 -m http.server 5500
# Abrir http://localhost:5500/index.html
```

Servir por HTTP es obligatorio: `productos.html` y otras páginas inyectan `components/footer.html` con `fetch()`, y `file://` rompe esa carga.

El switching de URL del API es por hostname:

```js
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : 'https://almacenrefrielectricos-production.up.railway.app';
```

### Acceso al admin

```
URL:       /login.html
Usuario:   admin
Pass:      admin123   (cambiar inmediatamente)
```

El JWT se guarda en `localStorage.token`. `admin.html` redirige a `login.html` si no lo encuentra.

---

## Despliegue (Railway)

- La BD SQLite vive en un Railway Volume montado en `RAILWAY_VOLUME_MOUNT_PATH`. `database.py` arma el path absoluto desde esa variable.
- Las fichas técnicas también se guardan en ese mismo Volume bajo `fichas-tecnicas/`.
- `SECRET_KEY` debe estar configurada como variable de entorno en Railway. Sin ella, el backend no arranca (`auth.py` lanza `RuntimeError`).
- Para mover la BD entre entornos hay endpoints temporales `POST /admin/upload-db` y `GET /admin/download-db`.

---

## Convenciones del frontend

- **Sin build step.** Editar HTML/CSS/JS y refrescar.
- **Imports relativos en backend** (`from . import models` …) — el linter de algunos editores los revierte a absolutos al guardar y rompe `uvicorn` con `ModuleNotFoundError: No module named 'models'`. Si pasa, revisar `main.py`, `auth.py` y `models.py`.
- **Imágenes de productos / marcas:** Cloudinary, endpoint `/image/upload` con preset *unsigned* `OilTechCMS`.
- **Fichas técnicas (admin):** se suben al backend (`POST /upload/pdf`), no a Cloudinary.
- **Filtros de inventario / catálogo:** todo el filtrado es client-side sobre `window.allX` — no hay llamadas extra al backend.
- **Pinneo crítico:** `bcrypt==4.0.1`. Versiones más nuevas rompen `passlib` con `AttributeError: __about__` al hacer `/token`.

---

## Deuda técnica y cosas a corregir

Esto NO es ruido — son problemas reales que vi mapeando el repo:

1. **URLs de producción inconsistentes entre archivos JS.**
   - `login.js` → `https://oiltech-production.up.railway.app`
   - `catalogo.js` → `https://oiltech-production.up.railway.app` *incluso desde localhost* (la rama `localhost` y la rama prod apuntan al mismo dominio remoto). Esto rompe el desarrollo local en cuanto se use ese archivo.
   Hay que centralizar la URL del API en una sola constante (`window.API_URL` en un script común) y borrar las copias.

2. **Credenciales por defecto `admin / admin123`** sembradas en `seed_admin()` solo cuando la BD no tiene admin. El endpoint `PUT /admin/change-password` permite rotarla; el riesgo real es la ventana entre el primer arranque de un deploy nuevo y el primer cambio de contraseña — durante ese tiempo cualquiera con la URL pública entra.

3. **CORS abierto (`allow_origins=["*"]`).** Aceptable mientras todo es público, pero los endpoints `auth-gated` también responden a cualquier origen — bajar el alcance a los dominios reales (Railway + localhost).

4. **Código muerto:**
   - `js/constants.js` — el carrusel de marcas se alimenta de `/brands/`, `BRAND_LOGOS` no se usa.
   - `js/catalogo.js` y `css/catalogo.css` — la página actual de productos es `productos.html` con `productos.js`. `catalogo.js` ya no está enlazado.
   - `replace_emojis.py` y `replace_script.py` en la raíz — scripts one-off que ya no se ejecutan.

5. **Dos ubicaciones de PDFs no relacionadas:**
   - `fichasTecnicas/` (raíz) — PDFs originales sueltos, no servidos por la app.
   - `backend/fichas-tecnicas/` — fuente real, contenido subido vía `/upload/pdf`.
   Vale la pena documentar internamente o mover/borrar la carpeta de la raíz para no confundir.

6. **`apply_migrations()` hace múltiples `DROP COLUMN`** sin verificación de pérdida de datos. Como son idempotentes (chequea con `PRAGMA table_info`) está bien hoy, pero hace que cualquier rollback sea manual. No hay framework de migraciones (ni Alembic ni similar).

7. **Sin tests** — ni de backend ni de frontend.

8. **WhatsApp obfuscado pero el número es placeholder** (`573000000000`) en `index.js`, `productos.js`, `catalogo.js` y `components/footer.html`. Si el número real entra, hay que cambiarlo en cuatro lugares.

9. **`stats.total_quoted` y `stats.total_purchased` se tipan como `float`** en `schemas.py`, pero son cuentas (`db.query(...).count()` → int). Funciona por casteo pero es engañoso.
