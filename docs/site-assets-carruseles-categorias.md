# Site Assets con modo carrusel para las 5 categorías del index — plan de implementación

> Planeación (2026-06-07) acordada con el cliente interno tras revisar el problema. Alcance confirmado: **limitado a las 5 tarjetas de categoría** de la sección "Catálogo Visual" (`cat_lubricantes`, `cat_grasas`, `cat_seguridad`, `cat_limpieza`, `cat_herramientas`). No se construye infraestructura genérica para el resto de site assets (logo, hero, badges, benefits, lines) — siguen siendo de imagen única, sin cambios.

## Diagnóstico (resumen)

`seed_site_assets()` en `backend/main.py:300-325` registra `cat_lubricantes`, `cat_grasas`, `cat_seguridad`, `cat_limpieza` como assets administrables apuntando a archivos concretos (`cat_lubricantes.png`, `GrasaIndustrial.png`, `SeguridadIndustrial.avif`, `LimpiadoresIndustriales.png`). Pero en `index.html` (sección `#portafolio`, líneas 175-255) esas cuatro tarjetas son ahora bloques `.carousel-wrapper` con `<img class="carousel-slide">` **hardcodeados y sin `data-asset`** — desconectados del CMS. Solo `cat_herramientas` (línea 247) sigue conectado vía `data-asset`, por pura coincidencia: esa tarjeta nunca recibió carrusel.

Conclusión ya validada con el cliente: no hay "una imagen" a la cual sincronizar en 4 de las 5 tarjetas — la única solución real es que el sistema de site assets entienda listas de imágenes ordenadas (modo carrusel), lo cual resuelve la sincronización por construcción.

## Diseño de datos

Extender `models.SiteAsset` (`backend/models.py:103-108`) con dos columnas nuevas, **aditivas** (no se toca `image_url`, que sigue siendo la portada/imagen única para los ~20 assets restantes):

```python
display_mode = Column(String, nullable=False, default="single")   # "single" | "carousel"
gallery_urls = Column(JSON, nullable=True)                        # lista ordenada de URLs adicionales
```

- Sigue el patrón ya usado para `Quotation.items` / `Sale.items` (`Column(JSON)`, `backend/models.py:87,98`) — en SQLite se almacena como TEXT serializado, sin necesidad de tabla de relación.
- **Composición del carrusel**: `[image_url] + (gallery_urls or [])`. `image_url` es siempre la portada/slide #1, tanto en modo single como carousel — evita ambigüedad sobre "cuál es la imagen principal" para miniaturas, lightbox, etc.
- **"Promover a portada"**: para reordenar de forma que otra imagen quede primero, la operación es un swap entre `image_url` y un elemento de `gallery_urls` (ver endpoints).
- **Reversibilidad del toggle**: al pasar de `carousel` a `single`, `gallery_urls` **se conserva** (no se borra) — solo se deja de renderizar. Así, si el cliente vuelve a `carousel`, no tiene que volver a subir nada. Esto hay que comunicarlo en la UI para que no parezca un bug ("tus imágenes de galería se conservan ocultas").

## Migración

Aditiva e idempotente, siguiendo el patrón ya usado para `sales.customer_name`/`customer_contact` (`backend/main.py:155-164`, chequeo de `PRAGMA table_info` + `ALTER TABLE ADD COLUMN`):

```sql
ALTER TABLE site_assets ADD COLUMN display_mode TEXT NOT NULL DEFAULT 'single'
ALTER TABLE site_assets ADD COLUMN gallery_urls TEXT
```

No se toca `seed_site_assets()` — los seeds solo corren en bases de datos nuevas, y la tabla de producción ya tiene las 5 filas. El cliente reconfigurará manualmente cada categoría tras el deploy (ver "Lo que este cambio NO arregla solo").

## Cambios en la API

Mínima superficie nueva, reusando el endpoint de upload existente como referencia (`backend/main.py:809-841`):

1. **`PUT /admin/site-assets/{key}/mode`** — body `{"mode": "single" | "carousel"}`. Solo cambia el flag; no toca `image_url` ni `gallery_urls`.

2. **`POST /admin/site-assets/{key}/gallery`** — multipart, sube **una** imagen nueva y la agrega al final de `gallery_urls`. Mismo flujo de validación que el endpoint actual (magic bytes / `content_type.startswith("image/")`, guardar en `SITE_IMAGES_DIR`). **Importante**: el endpoint actual nombra el archivo `f"{key}{ext}"` (sobrescribe en el lugar — sirve para "una imagen por key"). Para galería hace falta un nombre único por imagen, p. ej. `f"{key}_{uuid4().hex[:8]}{ext}"`, porque coexisten varias.

3. **`PUT /admin/site-assets/{key}/gallery`** — body `{"images": ["url1", "url2", ...]}`, **reemplaza la lista completa en orden**. Cubre en una sola operación: reordenar, eliminar y "promover a portada" (si la URL en posición 0 difiere de `image_url` actual, el backend hace el swap: nueva posición 0 → `image_url`, resto → `gallery_urls`). Validar que cada URL ya pertenezca al conjunto conocido del asset (portada actual + galería actual) antes de aceptar — evita que el endpoint se use para inyectar URLs arbitrarias.

4. **`GET /site-assets-map`** (`backend/main.py:854-857`) — cambia de forma `{key: url}` a `{key: {"mode": "single"|"carousel", "images": [url, ...]}}`, donde `images` es siempre la lista completa y ordenada (`[image_url]` en modo single, `[image_url, *gallery_urls]` en modo carousel). **Esto rompe el contrato actual** — confirmé que `js/site-assets.js` es el único consumidor dentro del repo (`grep` no encontró otros usos de `/site-assets-map`), así que es seguro actualizar ambos lados juntos en el mismo cambio.

   Se mantienen ambos campos (`mode` e `images`) aunque parezca redundante: si solo se mandara `images`, el frontend no podría distinguir "single con galería oculta conservada" (longitud > 1 pero debe mostrarse como imagen única) de "carousel" — el campo `mode` es la fuente de verdad para decidir cómo renderizar.

## Frontend: de markup estático a renderizado dirigido por datos

Esta es la parte más delicada — hoy los carruseles son 100% estáticos:

- `index.html` (líneas 178-235): `<img class="carousel-slide active">` hardcodeados dentro de `.carousel-wrapper`, sin `data-asset`.
- `js/index.js:296-334`: recorre `.carousel-wrapper` **una sola vez**, asumiendo que el markup ya existe, y construye los puntos de navegación + rotación automática sobre esos nodos estáticos.
- `js/site-assets.js`: hoy solo sabe pisar `el.src` de un `<img>` o el `background-image` del hero — no sabe construir slides dinámicamente ni reinicializar un carrusel.

Plan de refactor:

1. **`index.html`**: agregar `data-asset="cat_lubricantes"` (etc.) al **contenedor** `.carousel-wrapper` de cada una de las 5 tarjetas (no a los `<img>` individuales, porque la cantidad de slides ahora es dinámica). Simplificar el contenido interno a un único `<img>` de respaldo (fallback visible mientras carga el fetch async — evita una tarjeta vacía).

2. **`js/index.js`**: extraer la lógica de inicialización (líneas 296-334) a una función nombrada y exportada, p. ej. `window.initProductCarousel(wrapper)`, reusable. El `forEach` genérico debe **excluir** los wrappers con `data-asset` (p. ej. `querySelectorAll('.carousel-wrapper:not([data-asset])')`) — esos 5 pasan a ser propiedad exclusiva de `site-assets.js`, que controla su ciclo de vida completo (construir slides → llamar a `initProductCarousel`).

3. **`js/site-assets.js`**: al recibir `{mode, images}` para un `data-asset` que sea `.carousel-wrapper`:
   - Si `mode === 'single'` o `images.length <= 1`: limpiar el wrapper y dejar un único `<img>` plano (sin puntos ni rotación).
   - Si `mode === 'carousel'` y `images.length > 1`: generar un `<img class="carousel-slide">` por cada URL (el primero `active`), limpiar cualquier `.carousel-dots` previo, y llamar a `window.initProductCarousel(wrapper)`.
   - Para los demás `[data-asset]` (los ~20 simples), el comportamiento actual no cambia.

   Esto requiere coordinar el orden de carga: el carrusel de estas 5 tarjetas no debe auto-inicializarse hasta que `site-assets.js` termine de inyectar las imágenes correctas — de lo contrario se inicializa sobre el placeholder y luego se rompe al reemplazar el DOM bajo los listeners ya enganchados.

## Admin UI: gestor de galería

El modal actual `#siteAssetModal` (`admin.html:852-883`, lógica en `js/admin.js:1966-2024`) es genérico: un selector de archivo único + preview + botón de subida, igual para los ~25 assets.

Cambios:

1. **Detectar si el asset es "carousel-capable"**: lista fija de las 5 keys (`cat_lubricantes`, `cat_grasas`, `cat_seguridad`, `cat_limpieza`, `cat_herramientas`) hardcodeada en `admin.js` — coherente con la decisión de NO generalizar.

2. **Para esas 5, agregar al modal**:
   - Un **toggle de modo** ("Imagen única" / "Carrusel"), que llama a `PUT .../mode` y guarda inmediatamente (evita estado "sucio" que el admin olvide guardar; mostrar toast de confirmación).
   - En modo **Carrusel**: un **gestor de galería** — grid de miniaturas en orden (portada primero), con por cada una: botón "usar como portada", mover izquierda/derecha, eliminar; más un control para agregar nuevas imágenes (llama a `POST .../gallery`). Cada acción de reordenar/eliminar/promover dispara `PUT .../gallery` con la lista resultante completa.
   - En modo **Imagen única**: el subidor actual, sin cambios — actúa sobre `image_url` exactamente como hoy.

3. **Para el resto de assets (~20)**: el modal se ve y funciona exactamente igual que hoy — cero cambios visibles.

4. Estilos nuevos para el grid de miniaturas en `css/admin.css`.

## Plan de implementación por fases

**Fase 1 — Backend (modelo, migración, endpoints)**
1. Columnas `display_mode` / `gallery_urls` en `models.SiteAsset` + migración idempotente en `apply_migrations()`.
2. Actualizar `schemas.SiteAssetBase`/`SiteAsset` con los campos nuevos.
3. Endpoint `PUT /admin/site-assets/{key}/mode`.
4. Endpoint `POST /admin/site-assets/{key}/gallery` (subir y anexar, con nombre de archivo único por imagen).
5. Endpoint `PUT /admin/site-assets/{key}/gallery` (reemplazar lista completa: cubre reordenar/eliminar/promover).
6. Reescribir `GET /site-assets-map` con la nueva forma `{key: {mode, images}}`.

**Fase 2 — Frontend público (contrato y renderizado)**
1. Extraer `initProductCarousel(wrapper)` de `js/index.js` y excluir wrappers `[data-asset]` del `forEach` genérico.
2. Agregar `data-asset` a los 5 `.carousel-wrapper` en `index.html` y simplificar su markup interno a un placeholder.
3. Reescribir `js/site-assets.js` para construir slides dinámicamente y reinicializar el carrusel según `{mode, images}`.

**Fase 3 — Admin (gestor de galería)**
1. Extender `#siteAssetModal` en `admin.html`: toggle de modo + sección de galería (condicionales a las 5 keys).
2. Extender `js/admin.js`: detección de keys carousel-capable, render de miniaturas, wiring de los 3 endpoints nuevos.
3. Estilos del grid de miniaturas en `css/admin.css`.

**Fase 4 — Validación** ✅ completada

1. **Pruebas funcionales end-to-end** (backend levantado en `:8000`, frontend en `:5500`, automatizadas vía CDP crudo sobre Chrome headless con `Runtime.evaluate` simulando clics reales — `playwright`/`selenium` no estaban disponibles en el entorno):
   - Toggle imagen única ↔ carrusel: cambia clases activas, oculta/muestra secciones, persiste vía `PUT /mode` y el badge de la tabla refleja el modo.
   - Subida de imágenes a galería (`POST /gallery`): nombres de archivo únicos, el grid crece y `siteAssetsMap` se sincroniza.
   - Reordenar/promover/quitar (`PUT /gallery`): los 4 botones (mover-izquierda, usar-como-portada, mover-derecha, quitar-del-carrusel) producen el reordenamiento esperado y persisten correctamente — verificado contra `GET /site-assets-map` después de cada acción.
   - **Reversibilidad confirmada**: cambiar carrusel → imagen única preserva `gallery_urls` intacto en el backend (oculto, no borrado); volver a carrusel restaura la galería completa sin re-subir nada.
   - El carrusel del index consume exactamente `{mode, images}` de `/site-assets-map` — sin desfases entre lo que se ve en el admin y en el sitio público.
2. **Responsive/mobile** (Chrome headless emulando 375×812 y 768×1024):
   - Tarjetas de categoría (`#portafolio`): ~325-327px de ancho, sin overflow horizontal de página (`scrollWidth === clientWidth`).
   - Modal de galería en admin: `.modal-content` cabe en el viewport (356px en 375px de pantalla), botones de modo (~159px c/u) y miniaturas (~157px, acciones de ~39px cada una, solo íconos) sin desbordes ni solapamientos. Capturas de pantalla revisadas visualmente — sin regresiones.
3. **Deploy** — la migración corre sola en el próximo arranque vía `apply_migrations()` (columnas `display_mode`/`gallery_urls` agregadas idempotentemente). No requiere pasos manuales adicionales en Railway.

Después de cada corrida de pruebas se restauró `cat_lubricantes` a su estado original (`image_url`, `display_mode = single`, `gallery_urls = NULL`) y se borraron los archivos de imagen de prueba de `backend/site-images/` — no quedó basura en la base de datos ni en el volumen.

## Riesgos y decisiones a validar antes de empezar

1. **Archivos huérfanos en el volumen**: el endpoint de upload actual sobrescribe en el lugar (`f"{key}{ext}"`); la galería necesita nombres únicos por imagen, y al eliminar una imagen de la galería su archivo queda huérfano en `SITE_IMAGES_DIR` (no hay garbage collection en ningún punto del sistema hoy — ni siquiera al reemplazar la imagen única). ¿Se acepta esa acumulación (consistente con el resto del sistema) o vale la pena limpiar al eliminar?
2. **Límite de imágenes por carrusel**: ¿libre o se impone un máximo razonable (p. ej. 5-6, en línea con lo que ya existe hardcodeado)?
3. **UX de reordenar**: ¿botones mover-izquierda/derecha son suficientes, o se espera drag-and-drop? (Botones es notablemente más simple de implementar y de mantener sin librerías nuevas — recomendado dado que no hay pipeline de build).
4. **Reversibilidad del toggle**: confirmar que conservar `gallery_urls` ocultos al volver a "single" es el comportamiento deseado (mi recomendación) y no algo que confunda al cliente ("¿por qué siguen ahí mis imágenes viejas?").

## Lo que este cambio NO arregla solo

Una vez desplegado, las 5 categorías **no van a mostrar automáticamente lo correcto** — los valores actuales en la base de datos de producción (`cat_lubricantes.png`, `GrasaIndustrial.png`, `SeguridadIndustrial.avif`, `LimpiadoresIndustriales.png`, y la imagen real de `cat_herramientas`) no necesariamente coinciden con lo que hoy se ve en los carruseles hardcodeados (`Aceite Oil Tech.jpeg`, `Grasa industrial polea.png` + `Grasa industrial.png`, `Casco 1.png` + `Casco 2.png`, las 3 imágenes de limpieza). **El cliente va a tener que entrar al CMS después del deploy y configurar manualmente cada una de las 5 categorías** (elegir modo y subir/seleccionar las imágenes que realmente quiere mostrar) — el pipeline resuelve la *capacidad* de mantenerlas sincronizadas hacia adelante, no migra automáticamente el estado actual. Vale la pena avisarle esto de antemano para que no espere un "ya quedó igual que antes" automático.
