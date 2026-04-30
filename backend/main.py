# main.py

from typing import List
import os
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta
from fastapi.security import OAuth2PasswordRequestForm
import models, schemas, database, auth

# Create tables
models.Base.metadata.create_all(bind=database.engine)

def apply_migrations():
    import sqlite3
    try:
        # Get path from SQLAlchemy engine
        path = str(database.engine.url).replace("sqlite:///", "")
        if not path or path == "sqlite://": path = "oiltech.db"
        
        conn = sqlite3.connect(path)
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(quotations)")
        columns = [col[1] for col in cursor.fetchall()]
        if "reference" not in columns:
            print("Migrating: Adding 'reference' column to quotations")
            cursor.execute("ALTER TABLE quotations ADD COLUMN reference TEXT")
            conn.commit()

        cursor.execute("PRAGMA table_info(products)")
        product_columns = [col[1] for col in cursor.fetchall()]
        if "subcategory" not in product_columns:
            print("Migrating: Adding 'subcategory' column to products")
            cursor.execute("ALTER TABLE products ADD COLUMN subcategory TEXT")
            conn.commit()
        if "price" in product_columns:
            print("Migrating: Dropping 'price' column from products")
            cursor.execute("ALTER TABLE products DROP COLUMN price")
            conn.commit()
        if "code" in product_columns:
            print("Migrating: Dropping 'code' column from products")
            cursor.execute("ALTER TABLE products DROP COLUMN code")
            conn.commit()
        if "options" in product_columns:
            print("Migrating: Dropping 'options' column from products")
            cursor.execute("ALTER TABLE products DROP COLUMN options")
            conn.commit()
        if "category" in product_columns:
            print("Migrating: Dropping 'category' column from products")
            cursor.execute("ALTER TABLE products DROP COLUMN category")
            conn.commit()
        if "category_id" not in product_columns:
            print("Migrating: Adding 'category_id' column to products")
            cursor.execute("ALTER TABLE products ADD COLUMN category_id INTEGER REFERENCES categories(id)")
            conn.commit()
        if "price_text" not in product_columns:
            print("Migrating: Adding 'price_text' column to products")
            cursor.execute("ALTER TABLE products ADD COLUMN price_text TEXT")
            conn.commit()
        if "subcategory" in product_columns:
            print("Migrating: Dropping 'subcategory' TEXT column from products")
            cursor.execute("ALTER TABLE products DROP COLUMN subcategory")
            conn.commit()
        if "subcategory_id" not in product_columns:
            print("Migrating: Adding 'subcategory_id' column to products")
            cursor.execute("ALTER TABLE products ADD COLUMN subcategory_id INTEGER REFERENCES subcategories(id)")
            conn.commit()

        cursor.execute("PRAGMA table_info(quotations)")
        quotation_columns = [col[1] for col in cursor.fetchall()]
        if "total_estimated" in quotation_columns:
            print("Migrating: Dropping 'total_estimated' column from quotations")
            cursor.execute("ALTER TABLE quotations DROP COLUMN total_estimated")
            conn.commit()

        conn.close()
    except Exception as e:
        print(f"Migration error: {e}")

apply_migrations()

# Auto-seed admin user if it doesn't exist
def seed_admin():
    db = database.SessionLocal()
    try:
        admin = db.query(models.User).filter(models.User.username == "admin").first()
        if not admin:
            hashed_pw = auth.get_password_hash("admin123")
            admin_user = models.User(username="admin", hashed_password=hashed_pw)
            db.add(admin_user)
            db.commit()
            print("Auto-seeded admin user")
    finally:
        db.close()

seed_admin()

# Auto-seed initial categories
def seed_categories():
    db = database.SessionLocal()
    try:
        count = db.query(models.Category).count()
        if count == 0:
            initial = [
                {"name": "Lubricantes Industriales", "tags": "lubricantes aceites hidraulico ISO32 ISO46 ISO68 ISO100 compresores engranajes sintetico termico dielectrico reductores corte neumatico"},
                {"name": "Grasas Industriales", "tags": "grasas rodamientos altapresion maquinariapesada lubricacioncentralizada"},
                {"name": "Seguridad Industrial (EPP)", "tags": "EPP seguridad guantes botas arnes eslingas proteccionauditiva gafas overol chalecoreflectivo careta"},
                {"name": "Productos de Limpieza y Mantenimiento", "tags": "limpieza mantenimiento alcoholindustrial amoniocu jabones limpiavidrios"},
                {"name": "Herramientas y Suministros Técnicos", "tags": "herramientas suministros bombas acoples bandas filtros componenteselectricos"}
            ]
            for cat in initial:
                db_cat = models.Category(**cat)
                db.add(db_cat)
            db.commit()
            print("Auto-seeded categories")
    finally:
        db.close()

seed_categories()

def seed_subcategories():
    db = database.SessionLocal()
    try:
        if db.query(models.Subcategory).count() > 0:
            return
        subcategories = {
            "Lubricantes Industriales": [
                "Aceite hidráulico ISO 32", "Aceite hidráulico ISO 46",
                "Aceite hidráulico ISO 68", "Aceite hidráulico ISO 100",
                "Aceites para compresores", "Aceites para engranajes industriales",
                "Aceites sintéticos", "Aceites térmicos", "Aceites dieléctricos",
                "Aceites para reductores", "Aceites de corte", "Aceites solubles",
                "Aceites para mantenimiento neumático"
            ],
            "Grasas Industriales": [
                "Rodamientos", "Equipos industriales",
                "Maquinaria pesada", "Sistemas de lubricación centralizada"
            ],
            "Seguridad Industrial (EPP)": [
                "Guantes industriales", "Botas de seguridad", "Arnés de seguridad",
                "Eslingas y líneas de vida", "Protectores auditivos", "Gafas de seguridad",
                "Overoles industriales", "Chalecos reflectivos", "Caretas de protección"
            ],
            "Productos de Limpieza y Mantenimiento": [
                "Alcohol industrial", "Amonio cuaternario",
                "Jabones industriales", "Limpiavidrios"
            ],
            "Herramientas y Suministros Técnicos": [
                "Bombas industriales", "Acoples y conexiones", "Boquillas",
                "Bandas industriales", "Filtros", "Abrazaderas", "Arandelas",
                "Herramientas manuales", "Componentes eléctricos", "Equipos para mantenimiento"
            ]
        }
        for cat_name, subcat_names in subcategories.items():
            cat = db.query(models.Category).filter(models.Category.name == cat_name).first()
            if not cat:
                continue
            for name in subcat_names:
                db.add(models.Subcategory(name=name, category_id=cat.id))
        db.commit()
        print("Auto-seeded subcategories")
    finally:
        db.close()

seed_subcategories()

app = FastAPI()

# CORS - Allow all for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_pna_header(request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Auth Endpoints
@app.post("/token", response_model=schemas.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=schemas.UserCreate) # Only returning username for now
async def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return {"username": current_user.username, "password": ""} # Don't return password hash

# Category Endpoints
@app.get("/categories/", response_model=List[schemas.Category])
def read_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).all()

@app.post("/categories/", response_model=schemas.Category)
def create_category(category: schemas.CategoryCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_cat = models.Category(**category.dict())
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat

# Subcategory Endpoints
@app.get("/subcategories/", response_model=List[schemas.Subcategory])
def read_subcategories(category_id: int = None, db: Session = Depends(get_db)):
    query = db.query(models.Subcategory)
    if category_id:
        query = query.filter(models.Subcategory.category_id == category_id)
    return query.all()

@app.post("/subcategories/", response_model=schemas.Subcategory)
def create_subcategory(subcategory: schemas.SubcategoryCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_subcat = models.Subcategory(**subcategory.dict())
    db.add(db_subcat)
    db.commit()
    db.refresh(db_subcat)
    return db_subcat

# Product Endpoints
@app.get("/products/", response_model=List[schemas.Product])
def read_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    products = db.query(models.Product).offset(skip).limit(limit).all()
    return products

@app.post("/products/", response_model=schemas.Product)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    data = product.dict()
    data["search_tags"] = ",".join(data["name"].split())
    db_product = models.Product(**data)
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@app.put("/products/{product_id}", response_model=schemas.Product)
def update_product(product_id: int, product: schemas.ProductCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if db_product is None:
        raise HTTPException(status_code=404, detail="Product not found")

    data = product.dict()
    data["search_tags"] = ",".join(data["name"].split())
    for key, value in data.items():
        setattr(db_product, key, value)
    
    db.commit()
    db.refresh(db_product)
    return db_product

@app.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if db_product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    
    db.delete(db_product)
    db.commit()
    return {"ok": True}

# Quotation Endpoints
@app.post("/quotations/", response_model=schemas.Quotation)
def create_quotation(quotation: schemas.QuotationCreate, db: Session = Depends(get_db)):
    db_quotation = models.Quotation(**quotation.dict())
    db.add(db_quotation)
    db.commit()
    db.refresh(db_quotation)
    db_quotation.reference = f"COT-{db_quotation.id:06d}"
    db.commit()
    db.refresh(db_quotation)
    return db_quotation

@app.get("/stats", response_model=schemas.AnalyticsStats)
def get_stats(db: Session = Depends(get_db)):
    quotations = db.query(models.Quotation).all()
    
    total_quoted = db.query(models.Quotation).count()
    total_purchased = db.query(models.Quotation).filter(models.Quotation.status == "Purchased").count()
    
    # Calculate top products
    product_counts = {}
    for q in quotations:
        if q.items:
            # Items are stored as JSON list of dicts
            for item in q.items:
                name = item.get("product_name", "Unknown")
                qty = item.get("quantity", 1)
                product_counts[name] = product_counts.get(name, 0) + qty
    
    top_products = [
        schemas.TopProduct(name=name, count=count)
        for name, count in sorted(product_counts.items(), key=lambda item: item[1], reverse=True)[:5]
    ]

    # Calculate sales history (purchased only — count per day)
    sales_by_date = {}
    for q in quotations:
        if q.status == "Purchased":
            date_str = q.created_at.strftime("%Y-%m-%d")
            sales_by_date[date_str] = sales_by_date.get(date_str, 0) + 1

    sales_history = [
        schemas.SalesData(date=date, amount=float(count))
        for date, count in sorted(sales_by_date.items())
    ]
    
    return schemas.AnalyticsStats(
        total_quoted=total_quoted,
        total_purchased=total_purchased,
        top_products=top_products,
        sales_history=sales_history
    )

@app.get("/quotations/", response_model=List[schemas.Quotation])
def read_quotations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    quotations = db.query(models.Quotation).order_by(models.Quotation.created_at.desc()).offset(skip).limit(limit).all()
    return quotations

@app.put("/quotations/{quotation_id}/status")
def update_quotation_status(quotation_id: int, status: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_quotation = db.query(models.Quotation).filter(models.Quotation.id == quotation_id).first()
    if db_quotation is None:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    db_quotation.status = status
    db.commit()
    return {"ok": True}



import shutil
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File

# ... existing imports ...

@app.post("/admin/upload-db")
async def upload_db(file: UploadFile = File(...), current_user: models.User = Depends(auth.get_current_user)):
    """
    Endpoint temporal para subir la base de datos sqlite al volumen de Railway.
    Sobreescribe la base de datos actual.
    """
    try:
        # Use the path defined in database.py
        destination_path = database.DB_URL_PATH
        
        with open(destination_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return {"filename": file.filename, "message": "Database uploaded successfully to " + destination_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not upload database: {str(e)}")

@app.get("/admin/download-db")
async def download_db(current_user: models.User = Depends(auth.get_current_user)):
    """
    Endpoint temporal para descargar la base de datos sqlite del volumen de Railway.
    """
    try:
        db_path = database.DB_URL_PATH
        if not db_path or not os.path.exists(db_path):
            raise HTTPException(status_code=404, detail="Database file not found")
        return FileResponse(
            path=db_path,
            media_type="application/octet-stream",
            filename="oiltech.db"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not download database: {str(e)}")

@app.delete("/admin/clear-quotations")
def clear_quotations(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """
    Elimina solamente las cotizaciones/ventas (tabla quotations).
    No toca productos ni usuarios.
    """
    try:
        deleted = db.query(models.Quotation).delete(synchronize_session=False)
        db.commit()
        return {"ok": True, "deleted": deleted}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Could not clear quotations: {str(e)}")

@app.put("/quotations/{quotation_id}/items")
def update_quotation_items(quotation_id: int, items: List[schemas.QuotationItem], db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_quotation = db.query(models.Quotation).filter(models.Quotation.id == quotation_id).first()
    if db_quotation is None:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    # Update items
    # Convert Pydantic models to dicts for JSON storage
    items_json = [item.dict() for item in items]
    db_quotation.items = items_json
    
    db.commit()
    return {"ok": True}


@app.put("/admin/change-password")
async def change_password(password_data: schemas.UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """
    Cambiar la contraseña del usuario actual.
    """
    if not password_data.password:
        raise HTTPException(status_code=400, detail="Contraseña no puede estar vacía")
    
    current_user.hashed_password = auth.get_password_hash(password_data.password)
    db.commit()
    return {"message": "Contraseña actualizada exitosamente"}
