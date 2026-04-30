# models.py

from sqlalchemy import Boolean, Column, Integer, String, Float, Text, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    tags = Column(String) # Default tags for this category

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    category = Column(String, index=True) # aire, refrigeracion, lavado, electricidad, consumibles
    image_url = Column(String)
    brands = Column(String) # Space separated brands for filtering
    search_tags = Column(String) # Space separated search terms
    options = Column(String) # Pipe separated options like "3/8|1/2"
    description = Column(Text, nullable=True)
    technical_sheet_url = Column(String, nullable=True) # URL to technical sheet PDF
    subcategory = Column(String, nullable=True, index=True)

class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String)
    customer_contact = Column(String) # Phone or Email
    reference = Column(String, index=True, nullable=True) # Unique reference for 1-click flow
    items = Column(JSON) # Store list of items as JSON: [{"product_id": 1, "quantity": 2, "option": "3/8"}, ...]
    status = Column(String, default="Pending") # Pending, Purchased, Cancelled
    created_at = Column(DateTime, default=datetime.datetime.utcnow)