"""
Script para sincronizar fichas técnicas con productos en la base de datos.
Mapea archivos PDF de fichasTecnicas con nombres de productos.
"""

import os
import sqlite3
from pathlib import Path
from difflib import SequenceMatcher

# Ruta a la carpeta de fichas técnicas
FICHAS_DIR = Path(__file__).parent.parent / "fichasTecnicas"
DB_PATH = Path(__file__).parent.parent / "oiltech.db"

# Mapping manual de fichas técnicas a nombres de productos
MANUAL_MAPPING = {
    "BOMBAS DE DIAFRAGMA ARO AIR.pdf": "Bombas de Diafragma ARO AIR",
    "BOMBAS DE DIAFRAGMA ARO.pdf": "Bombas de Diafragma ARO",
    "BOMBAS DE PISTON ARO.pdf": "Bombas de Pistón ARO",
    "FICHA TECNICA 530SG GUANTE PROTECTOR REGELTEX.pdf": "Guante Protector 530SG Regeltex",
    "FICHA TECNICA ACEITE NEUMATIC ISO 100.pdf": "Aceite Neumatic ISO 100",
    "FICHA TECNICA ACEITE OIL 20W-50.pdf": "Aceite OIL 20W-50",
    "FICHA TECNICA ACEITE SOLUBLE-986.pdf": "Aceite Soluble 986",
    "FICHA TECNICA AJUSTADOR DE CORREAS.pdf": "Ajustador de Correas",
    "FICHA TECNICA BALACLAVA PROTECCIÓN.pdf": "Balaclava de Protección",
    "FICHA TECNICA CARETA PROTECCIÓN.pdf": "Careta de Protección",
    "FICHA TECNICA CHALECO REFLECTIVO POLIESTER.pdf": "Chaleco Reflectivo Poliéster",
    "FICHA TECNICA DESENGRASANTE INDUSTRIAL BIODEGRADABLE.docx.pdf": "Desengrasante Industrial Biodegradable",
    "FICHA TECNICA DESENGRASANTE INDUSTRIAL BIODEGRADABLE.pdf": "Desengrasante Industrial Biodegradable",
    "FICHA TECNICA DESENGRASANTE INDUSTRIAL GRADO ALIMENTICIO.pdf": "Desengrasante Industrial Grado Alimenticio",
    "FICHA TECNICA DESENGRASANTE INDUSTRIAL.pdf": "Desengrasante Industrial",
    "FICHA TECNICA GRASA GRADO ALIMENTICIO.pdf": "Grasa Grado Alimenticio",
    "FICHA TECNICA GRASA MULTIPROPÓSITO OIL103.pdf": "Grasa Multipropósito OIL103",
    "FICHA TECNICA GUANTE DIELECTRICO GL4.pdf": "Guante Dieléctrico GL4",
    "FICHA TECNICA GUANTE DIELECTRICO GTI32016.pdf": "Guante Dieléctrico GTI32016",
    "FICHA TECNICA GUANTE DIELECTRICO.pdf": "Guante Dieléctrico",
    "FICHA TECNICA OIL ACEITE TERMICO.pdf": "OIL Aceite Térmico",
    "FICHA TECNICA OIL DIELECTRIC II.pdf": "OIL Dielectric II",
    "FICHA TECNICA OIL GRASA BENTONITA NLG.pdf": "OIL Grasa Bentonita NLG",
    "FICHA TECNICA OIL GRASA CHASIS.pdf": "OIL Grasa Chasis",
    "FICHA TECNICA OIL GUÍAS.pdf": "OIL Guías",
    "FICHA TECNICA OIL LIMPIADOR ELECTRONICO.pdf": "OIL Limpiador Electrónico",
    "FICHA TECNICA OIL MINERAL BLANCO GRADO USP.pdf": "OIL Mineral Blanco Grado USP",
    "FICHA TECNICA OIL PARA CADENAS GRADO ALIMENTICIO.pdf": "OIL Para Cadenas Grado Alimenticio",
    "FICHA TECNICA OIL PARA CADENAS.pdf": "OIL Para Cadenas",
    "FICHA TECNICA OIL PENETRANTE AFLOJADOR GRADO ALIMENTICIO.pdf": "OIL Penetrante Aflojador Grado Alimenticio",
    "FICHA TECNICA OIL PENETRANTE AFLOJADOR.pdf": "OIL Penetrante Aflojador",
    "FICHA TECNICA OIL ROSCADO.pdf": "OIL Roscado",
    "FICHA TECNICA OILTECH 68.pdf": "OILTECH 68",
    "FICHA TECNICA PERTIGAS DE SALVAMENTO.pdf": "Pertigas de Salvamento",
    "FICHA TECNICA PUNTERA DE SEGURIDAD.pdf": "Puntera de Seguridad",
    "FICHA TECNICA REFRIGERANTE PARA RADIADORES.pdf": "Refrigerante para Radiadores",
    "FICHA TECNICA TAPETE DIELÉCTRICO.pdf": "Tapete Dieléctrico",
    "FICHA TECNICA TRATAMIENTO PARA DESINCRUSTAR.pdf": "Tratamiento para Desincrustar",
}

def similarity_ratio(a, b):
    """Calcula el ratio de similitud entre dos strings."""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def normalize_name(name):
    """Normaliza un nombre para comparación."""
    return name.strip().lower().replace("ficha tecnica", "").strip()

def find_best_match(ficha_name, product_names):
    """Encuentra el mejor match entre una ficha técnica y una lista de nombres."""
    normalized_ficha = normalize_name(ficha_name)
    
    best_match = None
    best_ratio = 0.0
    
    for prod_name in product_names:
        normalized_prod = normalize_name(prod_name)
        ratio = similarity_ratio(normalized_ficha, normalized_prod)
        
        if ratio > best_ratio:
            best_ratio = ratio
            best_match = prod_name
    
    # Solo retornar si la similitud es >= 60%
    return best_match if best_ratio >= 0.6 else None

def sync_technical_sheets():
    """Sincroniza las fichas técnicas con los productos en la base de datos."""
    
    if not FICHAS_DIR.exists():
        print(f"❌ Directorio de fichas técnicas no encontrado: {FICHAS_DIR}")
        return
    
    if not DB_PATH.exists():
        print(f"❌ Base de datos no encontrada: {DB_PATH}")
        return
    
    # Obtener lista de archivos PDF
    pdf_files = [f.name for f in FICHAS_DIR.glob("*.pdf")]
    print(f"📄 Fichas técnicas encontradas: {len(pdf_files)}")
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Verificar qué tablas existen
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        print(f"💾 Tablas encontradas: {tables}")
        
        # Obtener todos los nombres de productos
        cursor.execute("SELECT id, name FROM products")
        products = cursor.fetchall()
        product_names = [p[1] for p in products]
        product_dict = {p[1]: p[0] for p in products}
        
        print(f"📦 Productos en base de datos: {len(products)}")
        
        # Mapear fichas técnicas a productos
        mappings = []
        unmatched = []
        
        for pdf_file in pdf_files:
            # Usar mapping manual si existe
            product_name = MANUAL_MAPPING.get(pdf_file)
            
            if not product_name:
                # Intentar encontrar match automático
                product_name = find_best_match(pdf_file, product_names)
            
            if product_name and product_name in product_dict:
                pdf_url = f"fichasTecnicas/{pdf_file}"
                product_id = product_dict[product_name]
                mappings.append((product_id, product_name, pdf_url, pdf_file))
            else:
                unmatched.append(pdf_file)
        
        # Actualizar base de datos
        updated = 0
        for product_id, product_name, pdf_url, pdf_file in mappings:
            cursor.execute(
                "UPDATE products SET technical_sheet_url = ? WHERE id = ?",
                (pdf_url, product_id)
            )
            if cursor.rowcount > 0:
                updated += 1
                print(f"✅ {product_name} <- {pdf_file}")
        
        conn.commit()
        conn.close()
        
        print(f"\n✨ Resultados:")
        print(f"   ✅ Actualizados: {updated}")
        print(f"   ⚠️  Sin emparejar: {len(unmatched)}")
        
        if unmatched:
            print(f"\n📋 Fichas sin emparejar:")
            for pdf in unmatched:
                print(f"   - {pdf}")
        
        return updated, unmatched
    
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return 0, []

if __name__ == "__main__":
    print("🔄 Sincronizando fichas técnicas...")
    sync_technical_sheets()
