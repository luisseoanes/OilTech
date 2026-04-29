"""
Script para cargar productos iniciales desde fichas técnicas.
Crea productos basados en los nombres de las fichas técnicas.
"""

import os
import sqlite3
from pathlib import Path
from datetime import datetime

# Ruta a la BD
DB_PATH = Path(__file__).parent / "oiltech.db"
# ─────────────────────────────────────────────────────────────
# URLs de imágenes profesionales (Unsplash - Alta Resolución)
# ─────────────────────────────────────────────────────────────

IMG = {
    "bomba_diafragma": "https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=800&auto=format&fit=crop",
    "bomba_piston": "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=800&auto=format&fit=crop",
    "aceite_20w50": "https://images.unsplash.com/photo-1635816351139-38914619d08e?q=80&w=800&auto=format&fit=crop",
    "aceite_industrial": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop",
    "grasa": "https://images.unsplash.com/photo-1608613304899-ea8098577e38?q=80&w=800&auto=format&fit=crop",
    "seguridad": "https://images.unsplash.com/photo-1597466599360-3b9775841aec?q=80&w=800&auto=format&fit=crop",
    "limpieza": "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800&auto=format&fit=crop",
    "herramientas": "https://images.unsplash.com/photo-1530124560676-44b2383b484d?q=80&w=800&auto=format&fit=crop"
}

# Productos a crear basados en fichas técnicas
PRODUCTS = [
    # ── Bombas ────────────────────────────────────────────────────────────────
    {
        "name": "Bombas de Diafragma ARO AIR",
        "category": "herramientas",
        "price": 0,
        "price_text": "Consultar precio",
        "options": "Varios modelos",
        "image_url": IMG["bomba_diafragma"],
    },
    {
        "name": "Bombas de Diafragma ARO",
        "category": "herramientas",
        "price": 0,
        "price_text": "Consultar precio",
        "options": "Varios modelos",
        "image_url": IMG["bomba_diafragma"],
    },
    {
        "name": "Bombas de Pistón ARO",
        "category": "herramientas",
        "price": 0,
        "price_text": "Consultar precio",
        "options": "Varios modelos",
        "image_url": IMG["bomba_piston"],
    },

    # ── Lubricantes automotriz ────────────────────────────────────────────────
    {
        "name": "Aceite OIL 20W-50",
        "category": "automotriz",
        "price": 0,
        "price_text": "Desde $15.000 COP",
        "options": "Cuarto|Galón|Caneca|Tambor",
        "image_url": IMG["aceite_20w50"],
    },
    {
        "name": "Aceite Soluble 986",
        "category": "automotriz",
        "price": 0,
        "price_text": "Desde $12.000 COP",
        "options": "Cuarto|Galón|Caneca",
        "image_url": IMG["aceite_20w50"],
    },
    {
        "name": "Refrigerante para Radiadores",
        "category": "automotriz",
        "price": 0,
        "price_text": "Desde $18.000 COP",
        "options": "Cuarto|Galón|Caneca",
        "image_url": IMG["aceite_20w50"],
    },

    # ── Lubricantes industriales ──────────────────────────────────────────────
    {
        "name": "Aceite Neumatic ISO 100",
        "category": "industrial",
        "price": 0,
        "price_text": "Desde $20.000 COP",
        "options": "Galón|Caneca|Tambor",
        "image_url": IMG["aceite_industrial"],
    },
    {
        "name": "OIL Aceite Térmico",
        "category": "industrial",
        "price": 0,
        "price_text": "Desde $25.000 COP",
        "options": "Galón|Caneca|Tambor",
        "image_url": IMG["aceite_industrial"],
    },
    {
        "name": "OIL Dielectric II",
        "category": "industrial",
        "price": 0,
        "price_text": "Desde $22.000 COP",
        "options": "Galón|Caneca|Tambor",
        "image_url": IMG["aceite_industrial"],
    },
    {
        "name": "OILTECH 68",
        "category": "industrial",
        "price": 0,
        "price_text": "Desde $18.000 COP",
        "options": "Galón|Caneca|Tambor",
        "image_url": IMG["aceite_industrial"],
    },
    {
        "name": "OIL Roscado",
        "category": "industrial",
        "price": 0,
        "price_text": "Desde $16.000 COP",
        "options": "Galón|Caneca|Tambor",
        "image_url": IMG["aceite_industrial"],
    },
    {
        "name": "OIL Mineral Blanco Grado USP",
        "category": "industrial",
        "price": 0,
        "price_text": "Desde $24.000 COP",
        "options": "Galón|Caneca|Tambor",
        "image_url": IMG["aceite_industrial"],
    },

    # ── Grasas ────────────────────────────────────────────────────────────────
    {
        "name": "Grasa Multipropósito OIL103",
        "category": "grasas",
        "price": 0,
        "price_text": "Desde $12.000 COP",
        "options": "Cartuchos|Caneca",
        "image_url": IMG["grasa"],
    },
    {
        "name": "Grasa Grado Alimenticio",
        "category": "grasas",
        "price": 0,
        "price_text": "Desde $14.000 COP",
        "options": "Cartuchos|Caneca",
        "image_url": IMG["grasa"],
    },
    {
        "name": "OIL Grasa Bentonita NLG",
        "category": "grasas",
        "price": 0,
        "price_text": "Desde $11.000 COP",
        "options": "Cartuchos|Caneca",
        "image_url": IMG["grasa"],
    },
    {
        "name": "OIL Grasa Chasis",
        "category": "grasas",
        "price": 0,
        "price_text": "Desde $13.000 COP",
        "options": "Cartuchos|Caneca",
        "image_url": IMG["grasa"],
    },

    # ── Cadenas y guías ───────────────────────────────────────────────────────
    {
        "name": "OIL Para Cadenas",
        "category": "industrial",
        "price": 0,
        "price_text": "Desde $14.000 COP",
        "options": "Botella|Galón|Caneca",
        "image_url": IMG["aceite_industrial"],
    },
    {
        "name": "OIL Para Cadenas Grado Alimenticio",
        "category": "industrial",
        "price": 0,
        "price_text": "Desde $16.000 COP",
        "options": "Botella|Galón|Caneca",
        "image_url": IMG["aceite_industrial"],
    },
    {
        "name": "OIL Guías",
        "category": "industrial",
        "price": 0,
        "price_text": "Desde $13.000 COP",
        "options": "Botella|Galón|Caneca",
        "image_url": IMG["aceite_industrial"],
    },

    # ── Penetrantes y aflojadores ─────────────────────────────────────────────
    {
        "name": "OIL Penetrante Aflojador",
        "category": "industrial",
        "price": 0,
        "price_text": "Desde $9.000 COP",
        "options": "Spray|Botella",
        "image_url": IMG["aceite_industrial"],
    },
    {
        "name": "OIL Penetrante Aflojador Grado Alimenticio",
        "category": "industrial",
        "price": 0,
        "price_text": "Desde $11.000 COP",
        "options": "Spray|Botella",
        "image_url": IMG["aceite_industrial"],
    },

    # ── Limpieza ──────────────────────────────────────────────────────────────
    {
        "name": "Desengrasante Industrial",
        "category": "limpieza",
        "price": 0,
        "price_text": "Desde $8.000 COP",
        "options": "Botella|Galón|Caneca",
        "image_url": IMG["limpieza"],
    },
    {
        "name": "Desengrasante Industrial Biodegradable",
        "category": "limpieza",
        "price": 0,
        "price_text": "Desde $10.000 COP",
        "options": "Botella|Galón|Caneca",
        "image_url": IMG["limpieza"],
    },
    {
        "name": "Desengrasante Industrial Grado Alimenticio",
        "category": "limpieza",
        "price": 0,
        "price_text": "Desde $12.000 COP",
        "options": "Botella|Galón|Caneca",
        "image_url": IMG["limpieza"],
    },
    {
        "name": "OIL Limpiador Electrónico",
        "category": "limpieza",
        "price": 0,
        "price_text": "Desde $7.000 COP",
        "options": "Spray|Botella",
        "image_url": IMG["limpieza"],
    },
    {
        "name": "Tratamiento para Desincrustar",
        "category": "limpieza",
        "price": 0,
        "price_text": "Desde $9.000 COP",
        "options": "Botella|Galón",
        "image_url": IMG["limpieza"],
    },

    # ── Seguridad ─────────────────────────────────────────────────────────────
    {
        "name": "Guante Dieléctrico",
        "category": "seguridad",
        "price": 0,
        "price_text": "Desde $45.000 COP",
        "options": "Talla S|Talla M|Talla L|Talla XL",
        "image_url": IMG["seguridad"],
    },
    {
        "name": "Guante Dieléctrico GL4",
        "category": "seguridad",
        "price": 0,
        "price_text": "Desde $50.000 COP",
        "options": "Talla S|Talla M|Talla L|Talla XL",
        "image_url": IMG["seguridad"],
    },
    {
        "name": "Guante Dieléctrico GTI32016",
        "category": "seguridad",
        "price": 0,
        "price_text": "Desde $55.000 COP",
        "options": "Talla S|Talla M|Talla L|Talla XL",
        "image_url": IMG["seguridad"],
    },
    {
        "name": "Guante Protector 530SG Regeltex",
        "category": "seguridad",
        "price": 0,
        "price_text": "Desde $25.000 COP",
        "options": "Talla S|Talla M|Talla L|Talla XL",
        "image_url": IMG["seguridad"],
    },
    {
        "name": "Balaclava de Protección",
        "category": "seguridad",
        "price": 0,
        "price_text": "Desde $8.000 COP",
        "options": "Única",
        "image_url": IMG["seguridad"],
    },
    {
        "name": "Careta de Protección",
        "category": "seguridad",
        "price": 0,
        "price_text": "Desde $15.000 COP",
        "options": "Estándar|Premium",
        "image_url": IMG["seguridad"],
    },
    {
        "name": "Chaleco Reflectivo Poliéster",
        "category": "seguridad",
        "price": 0,
        "price_text": "Desde $20.000 COP",
        "options": "Talla S|Talla M|Talla L|Talla XL",
        "image_url": IMG["seguridad"],
    },
    {
        "name": "Puntera de Seguridad",
        "category": "seguridad",
        "price": 0,
        "price_text": "Desde $35.000 COP",
        "options": "Talla 38|Talla 40|Talla 42|Talla 44",
        "image_url": IMG["seguridad"],
    },

    # ── Herramientas ──────────────────────────────────────────────────────────
    {
        "name": "Ajustador de Correas",
        "category": "herramientas",
        "price": 0,
        "price_text": "Consultar precio",
        "options": "Estándar",
        "image_url": IMG["herramientas"],
    },
    {
        "name": "Pertigas de Salvamento",
        "category": "herramientas",
        "price": 0,
        "price_text": "Consultar precio",
        "options": "2m|3m|4m",
        "image_url": IMG["herramientas"],
    },
    {
        "name": "Tapete Dieléctrico",
        "category": "herramientas",
        "price": 0,
        "price_text": "Desde $120.000 COP",
        "options": "1m x 1m|2m x 1m|2m x 2m",
        "image_url": IMG["herramientas"],
    },
]


def init_database():
    """Inicializa la base de datos y carga los productos."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()


        # ── Crear tablas ──────────────────────────────────────────────────────
        print("Verificando tablas...")

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            username TEXT UNIQUE,
            hashed_password TEXT,
            is_active BOOLEAN DEFAULT 1
        )
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY,
            name TEXT UNIQUE,
            tags TEXT
        )
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY,
            code TEXT,
            name TEXT,
            category TEXT,
            price_text TEXT,
            image_url TEXT,
            brands TEXT,
            search_tags TEXT,
            options TEXT,
            description TEXT,
            technical_sheet_url TEXT,
            subcategory TEXT
        )
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS quotations (
            id INTEGER PRIMARY KEY,
            customer_name TEXT,
            customer_contact TEXT,
            reference TEXT,
            items JSON,
            total_estimated REAL,
            status TEXT DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        # ── Limpiar Datos Viejos ──────────────────────────────────────────────
        print("Limpiando base de datos vieja...")
        cursor.execute("DELETE FROM products")
        cursor.execute("DELETE FROM categories")

        # ── Categorías ────────────────────────────────────────────────────────
        print("Creando categorias...")
        categories = [
            ("automotriz",   "pesados livianos motos complementarios"),
            ("industrial",   "hidraulicos mecanizado engranajes maquinaria"),
            ("grasas",       "multiples propositos extrema presion alimenticio"),
            ("seguridad",    "cabeza visual manos alturas calzado"),
            ("limpieza",     "desengrasantes jabones desinfectantes solventes"),
            ("herramientas", "manuales bombas mangueras acoples"),
        ]
        for name, tags in categories:
            cursor.execute(
                "INSERT OR IGNORE INTO categories (name, tags) VALUES (?, ?)",
                (name, tags),
            )

        # ── Productos ─────────────────────────────────────────────────────────
        print("Cargando productos...")
        for product in PRODUCTS:
            cursor.execute(
                """
                INSERT INTO products
                    (name, category, price_text, image_url, options)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    product["name"],
                    product["category"],
                    product["price_text"],
                    product.get("image_url", ""),
                    product.get("options", ""),
                ),
            )

        conn.commit()
        conn.close()

        print(f"Base de datos inicializada con {len(PRODUCTS)} productos")
        return True

    except Exception as e:
        print(f"Error: {str(e)}")
        return False


if __name__ == "__main__":
    print("Inicializando base de datos...")
    init_database()