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

# Productos a crear basados en fichas técnicas
PRODUCTS = [
    # Bombas
    {"name": "Bombas de Diafragma ARO AIR", "category": "herramientas", "price": 0, "price_text": "Consultar precio", "options": "Varios modelos"},
    {"name": "Bombas de Diafragma ARO", "category": "herramientas", "price": 0, "price_text": "Consultar precio", "options": "Varios modelos"},
    {"name": "Bombas de Pistón ARO", "category": "herramientas", "price": 0, "price_text": "Consultar precio", "options": "Varios modelos"},
    
    # Lubricantes Automotriz
    {"name": "Aceite OIL 20W-50", "category": "automotriz", "price": 0, "price_text": "Desde $15.000 COP", "options": "Cuarto|Galón|Caneca|Tambor"},
    {"name": "Aceite Soluble 986", "category": "automotriz", "price": 0, "price_text": "Desde $12.000 COP", "options": "Cuarto|Galón|Caneca"},
    {"name": "Refrigerante para Radiadores", "category": "automotriz", "price": 0, "price_text": "Desde $18.000 COP", "options": "Cuarto|Galón|Caneca"},
    
    # Lubricantes Industriales
    {"name": "Aceite Neumatic ISO 100", "category": "industrial", "price": 0, "price_text": "Desde $20.000 COP", "options": "Galón|Caneca|Tambor"},
    {"name": "OIL Aceite Térmico", "category": "industrial", "price": 0, "price_text": "Desde $25.000 COP", "options": "Galón|Caneca|Tambor"},
    {"name": "OIL Dielectric II", "category": "industrial", "price": 0, "price_text": "Desde $22.000 COP", "options": "Galón|Caneca|Tambor"},
    {"name": "OILTECH 68", "category": "industrial", "price": 0, "price_text": "Desde $18.000 COP", "options": "Galón|Caneca|Tambor"},
    {"name": "OIL Roscado", "category": "industrial", "price": 0, "price_text": "Desde $16.000 COP", "options": "Galón|Caneca|Tambor"},
    {"name": "OIL Mineral Blanco Grado USP", "category": "industrial", "price": 0, "price_text": "Desde $24.000 COP", "options": "Galón|Caneca|Tambor"},
    
    # Grasas
    {"name": "Grasa Multipropósito OIL103", "category": "grasas", "price": 0, "price_text": "Desde $12.000 COP", "options": "Cartuchos|Caneca"},
    {"name": "Grasa Grado Alimenticio", "category": "grasas", "price": 0, "price_text": "Desde $14.000 COP", "options": "Cartuchos|Caneca"},
    {"name": "OIL Grasa Bentonita NLG", "category": "grasas", "price": 0, "price_text": "Desde $11.000 COP", "options": "Cartuchos|Caneca"},
    {"name": "OIL Grasa Chasis", "category": "grasas", "price": 0, "price_text": "Desde $13.000 COP", "options": "Cartuchos|Caneca"},
    
    # Cadenas y Guías
    {"name": "OIL Para Cadenas", "category": "industrial", "price": 0, "price_text": "Desde $14.000 COP", "options": "Botella|Galón|Caneca"},
    {"name": "OIL Para Cadenas Grado Alimenticio", "category": "industrial", "price": 0, "price_text": "Desde $16.000 COP", "options": "Botella|Galón|Caneca"},
    {"name": "OIL Guías", "category": "industrial", "price": 0, "price_text": "Desde $13.000 COP", "options": "Botella|Galón|Caneca"},
    
    # Penetrantes y Aflojadores
    {"name": "OIL Penetrante Aflojador", "category": "industrial", "price": 0, "price_text": "Desde $9.000 COP", "options": "Spray|Botella"},
    {"name": "OIL Penetrante Aflojador Grado Alimenticio", "category": "industrial", "price": 0, "price_text": "Desde $11.000 COP", "options": "Spray|Botella"},
    
    # Limpieza
    {"name": "Desengrasante Industrial", "category": "limpieza", "price": 0, "price_text": "Desde $8.000 COP", "options": "Botella|Galón|Caneca"},
    {"name": "Desengrasante Industrial Biodegradable", "category": "limpieza", "price": 0, "price_text": "Desde $10.000 COP", "options": "Botella|Galón|Caneca"},
    {"name": "Desengrasante Industrial Grado Alimenticio", "category": "limpieza", "price": 0, "price_text": "Desde $12.000 COP", "options": "Botella|Galón|Caneca"},
    {"name": "OIL Limpiador Electrónico", "category": "limpieza", "price": 0, "price_text": "Desde $7.000 COP", "options": "Spray|Botella"},
    {"name": "Tratamiento para Desincrustar", "category": "limpieza", "price": 0, "price_text": "Desde $9.000 COP", "options": "Botella|Galón"},
    
    # Seguridad
    {"name": "Guante Dieléctrico", "category": "seguridad", "price": 0, "price_text": "Desde $45.000 COP", "options": "Talla S|Talla M|Talla L|Talla XL"},
    {"name": "Guante Dieléctrico GL4", "category": "seguridad", "price": 0, "price_text": "Desde $50.000 COP", "options": "Talla S|Talla M|Talla L|Talla XL"},
    {"name": "Guante Dieléctrico GTI32016", "category": "seguridad", "price": 0, "price_text": "Desde $55.000 COP", "options": "Talla S|Talla M|Talla L|Talla XL"},
    {"name": "Guante Protector 530SG Regeltex", "category": "seguridad", "price": 0, "price_text": "Desde $25.000 COP", "options": "Talla S|Talla M|Talla L|Talla XL"},
    {"name": "Balaclava de Protección", "category": "seguridad", "price": 0, "price_text": "Desde $8.000 COP", "options": "Única"},
    {"name": "Careta de Protección", "category": "seguridad", "price": 0, "price_text": "Desde $15.000 COP", "options": "Estándar|Premium"},
    {"name": "Chaleco Reflectivo Poliéster", "category": "seguridad", "price": 0, "price_text": "Desde $20.000 COP", "options": "Talla S|Talla M|Talla L|Talla XL"},
    {"name": "Puntera de Seguridad", "category": "seguridad", "price": 0, "price_text": "Desde $35.000 COP", "options": "Talla 38|Talla 40|Talla 42|Talla 44"},
    
    # Herramientas
    {"name": "Ajustador de Correas", "category": "herramientas", "price": 0, "price_text": "Consultar precio", "options": "Estándar"},
    {"name": "Pertigas de Salvamento", "category": "herramientas", "price": 0, "price_text": "Consultar precio", "options": "2m|3m|4m"},
    {"name": "Tapete Dieléctrico", "category": "herramientas", "price": 0, "price_text": "Desde $120.000 COP", "options": "1m x 1m|2m x 1m|2m x 2m"},
]

def init_database():
    """Inicializa la base de datos y carga los productos."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Crear tablas
        print("📋 Creando tablas...")
        
        # Tabla users
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            username TEXT UNIQUE,
            hashed_password TEXT,
            is_active BOOLEAN DEFAULT 1
        )
        """)
        
        # Tabla categories
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY,
            name TEXT UNIQUE,
            tags TEXT
        )
        """)
        
        # Tabla products
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY,
            code TEXT,
            name TEXT,
            category TEXT,
            price REAL,
            price_text TEXT,
            image_url TEXT,
            brands TEXT,
            search_tags TEXT,
            options TEXT,
            description TEXT,
            technical_sheet_url TEXT
        )
        """)
        
        # Tabla quotations
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
        
        # Crear categorías
        print("📂 Creando categorías...")
        categories = [
            ("automotriz", "pesados livianos motos complementarios"),
            ("industrial", "hidraulicos mecanizado engranajes maquinaria"),
            ("grasas", "multiples propositos extrema presion alimenticio"),
            ("seguridad", "cabeza visual manos alturas calzado"),
            ("limpieza", "desengrasantes jabones desinfectantes solventes"),
            ("herramientas", "manuales bombas mangueras acoples"),
        ]
        
        for name, tags in categories:
            cursor.execute(
                "INSERT OR IGNORE INTO categories (name, tags) VALUES (?, ?)",
                (name, tags)
            )
        
        # Cargar productos
        print("📦 Cargando productos...")
        for product in PRODUCTS:
            cursor.execute("""
            INSERT INTO products 
            (name, category, price, price_text, options)
            VALUES (?, ?, ?, ?, ?)
            """, (
                product["name"],
                product["category"],
                product["price"],
                product["price_text"],
                product.get("options", "")
            ))
        
        conn.commit()
        conn.close()
        
        print(f"✅ Base de datos inicializada con {len(PRODUCTS)} productos")
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == "__main__":
    print("🔄 Inicializando base de datos...")
    init_database()
