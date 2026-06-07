# Carga masiva de productos desde Excel — análisis de viabilidad

> Análisis exploratorio (2026-06-07) ante una solicitud del cliente. No implementado, no decidido — este documento existe para que la decisión de seguir o no se tome con el alcance real sobre la mesa.

## Planteamiento original

El cliente preguntó por la posibilidad de cargar productos masivamente desde un archivo Excel. La propuesta inicial fue:

1. Cargar un Excel con todos los datos requeridos para crear un producto, **excepto imagen y ficha técnica** — esos dos se subirían después manualmente en el CMS, producto por producto.
2. Evaluar si el stack actual lo permite.

## Hallazgos sobre el pipeline actual

### El schema de Producto usa IDs, no nombres

`backend/schemas.py:55-67` (`ProductBase`/`ProductCreate`): `name` (requerido), `category_id`, `subcategory_id`, `image_url`, `brand_ids: List[int]`, `presentation_ids: List[int]`, `description`, `technical_sheet_url`. `search_tags` se autogenera en backend.

Categoría, subcategoría, marcas y presentaciones son relaciones (FK / many-to-many) identificadas por **ID de base de datos**, no por texto. Esto es la raíz del problema real:

### El verdadero cuello de botella es la resolución nombre → ID

Un Excel de cliente contendrá texto libre ("Lubricantes", "ARO", "Galón"), no IDs. Se necesita una capa de resolución que decida:

- ¿Qué constituye un "match"? (exacto / insensible a mayúsculas / sin acentos / difuso)
- ¿Qué pasa si una fila no encuentra coincidencia? (¿rechazar la fila? ¿crear la entidad automáticamente? ¿marcarla para revisión manual?)

Esta lógica **no existe en ningún punto del código actual** — en el admin, el usuario siempre selecciona de pickers que ya entregan IDs resueltos (`loadBrandsPicker`, `loadPresentationsPicker`, `loadCategories`).

### `Product.name` no tiene constraint de unicidad

A diferencia de `Category`, `Brand` y `Presentation` (`unique=True` en `models.py`), `Product.name` no lo tiene. Cargar el mismo Excel dos veces, o tener filas repetidas, crearía duplicados silenciosamente — nada en el modelo lo impide.

### No existe ningún patrón de "previsualizar antes de confirmar"

Todo el CRUD en `admin.js` es de una entidad a la vez, con commit inmediato (crear/editar producto, marca, presentación, categoría, etc.). No hay ningún wizard de varios pasos ni reporte de resultados fila por fila en ningún punto del admin — habría que diseñarlo desde cero.

### No existe eliminación masiva

Solo hay eliminación individual con confirmación (`btn-action btn-delete` por fila).

## Hallazgos sobre el stack

- No hay librerías de manejo de Excel instaladas — `openpyxl`, `pandas`, `xlrd` no están ni en `backend/requirements.txt` ni en el `venv`.
- FastAPI maneja `UploadFile` de forma nativa — no hay impedimento técnico para recibir el archivo.
- `openpyxl` sería la opción adecuada: pura Python, sin dependencias compiladas (no es del estilo de los problemas que ya tuvieron con el pin de `bcrypt==4.0.1`). `pandas` sería sobrepeso innecesario para este caso.

**Conclusión sobre el stack:** sí lo soporta sin fricción técnica significativa — pero esa es la parte fácil del problema. La complejidad real está en las decisiones de negocio y en la UI nueva, no en leer el archivo.

## Propuestas adicionales planteadas (segunda ronda) y evaluación

### 1. "Catálogo de cada cosa" — vista en el CMS con categorías/subcategorías/marcas/presentaciones siempre sincronizada

**Esto ya existe.** El admin ya tiene pestañas dedicadas y siempre frescas: `categories` (`loadCategoriesView`, `admin.js:1523`), `brands-mgmt` (`loadBrandsView`, `admin.js:1342`), `presentations-mgmt` (`loadPresentationsView`, `admin.js:1809`). No hay nada nuevo que construir aquí.

Sirve como referencia para que el cliente copie los nombres exactos al Excel (mitigación del lado humano), pero **no sustituye** la lógica de resolución del lado del backend — solo reduce la frecuencia con la que se dispara el caso "sin match".

### 2. Aplicar unicidad a `Product.name`

Cuestionable sin antes validar con el negocio: ¿es legítimo en este catálogo tener dos productos con el mismo nombre, distinguidos por marca/descripción/ficha técnica? Es plausible en este dominio (p. ej. "Grasa EP2" ofrecida bajo distintas marcas como entradas de catálogo separadas).

Si se decide aplicar de todas formas:

- Requiere una migración manual e idempotente (`ALTER TABLE` + índice único en `apply_migrations()`, siguiendo el patrón del `DROP COLUMN` ya documentado en `CLAUDE.md`).
- Requiere antes auditar y reconciliar duplicados existentes en **producción** — la BD local solo tiene 2 productos, no es muestra representativa.
- No resuelve la decisión de negocio por sí sola: el constraint solo se convierte en la última línea de defensa (un `IntegrityError` que hay que capturar con elegancia dentro de una transacción). Igual hay que decidir la política de importación ante colisiones — ¿actualizar el existente, saltar la fila, o fallar?

### 3. Previsualización con reporte de errores + eliminación masiva

Técnicamente viable, pero son **dos subsistemas nuevos sin ningún análogo existente** en el código actual:

- **Previsualización/reporte de errores**: un wizard de varios pasos (subir → parsear → validar → mostrar resultados fila por fila con errores accionables → confirmar → reporte final). Tanto trabajo de UI como el backend de resolución de entidades junto.
- **Eliminación masiva**: función genuinamente peligrosa sin "deshacer" en un catálogo de e-commerce. Decisión de diseño que cambia el alcance: ¿multi-select genérico (potente pero arriesgado, justo al lado de una función pensada para "corregir errores de importación") vs. "deshacer este lote de importación específico" (más seguro y más útil para este caso, pero exige modelar el concepto de "lote de importación" — tabla y migración adicionales para rastrear qué producto vino de qué carga)?

## Estimación de alcance real

Lo que empezó como "cargar un Excel" termina implicando, en la práctica:

- Posible nueva tabla/migración ("lote de importación" y/o constraint de unicidad)
- Lógica de resolución de entidades (nombre → ID, con políticas de match y de fallback)
- Wizard de previsualización y reporte de errores por fila (UI nueva, sin análogo en el código)
- Sistema de eliminación masiva con scope bien definido

Esto es, a ojo, **3-4x** el esfuerzo que parecía al plantear la idea inicialmente.

## Lo que ninguna de estas propuestas resuelve

Imagen y ficha técnica seguirán siendo 100% manuales, producto por producto, después de cualquier carga masiva — exactamente como hoy. Si el cuello de botella real del cliente está ahí (es plausible: es la parte más tediosa del flujo de creación actual, según `uploadImageToCloudinary`/`uploadPdfToCloudinary` en `admin.js`), la carga masiva solo le ahorraría la parte *más rápida* del proceso y le dejaría intacta la más lenta.

## Preguntas para resolver con el cliente antes de comprometerse

1. ¿Cuántos productos planea cargar de una sola vez? Si son del orden de 20-30, probablemente sale más barato crearlos manualmente que construir todo este sistema.
2. ¿Dónde está realmente su cuello de botella — en llenar los datos del producto, o en conseguir/subir imágenes y fichas técnicas?
3. ¿Es legítimo en su catálogo tener dos productos con el mismo nombre (distinguidos por marca, presentación o ficha técnica)?

## Recomendación

Viable técnicamente, pero es un **proyecto propio**, no una mejora menor al CMS existente. Antes de comprometerse con el cliente, vale la pena confirmar el volumen real y dónde está su dolor — la solución correcta podría ser mucho más simple que construir un importador masivo (por ejemplo, una función de "duplicar producto existente" como plantilla de partida).
