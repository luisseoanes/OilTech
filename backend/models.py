# models.py

from sqlalchemy import Boolean, Column, Integer, String, Float, Text, ForeignKey, DateTime, JSON, Table
from sqlalchemy.orm import relationship
import datetime
from database import Base

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
    tags = Column(String)

class Subcategory(Base):
    __tablename__ = "subcategories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False, index=True)
    category = relationship("Category")

    @property
    def category_name(self):
        return self.category.name if self.category else None

class Brand(Base):
    __tablename__ = "brands"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    image_url = Column(String)

product_brands = Table(
    "product_brands", Base.metadata,
    Column("product_id", Integer, ForeignKey("products.id"), primary_key=True),
    Column("brand_id", Integer, ForeignKey("brands.id"), primary_key=True),
)

class Presentation(Base):
    __tablename__ = "presentations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

product_presentations = Table(
    "product_presentations", Base.metadata,
    Column("product_id", Integer, ForeignKey("products.id"), primary_key=True),
    Column("presentation_id", Integer, ForeignKey("presentations.id"), primary_key=True),
)

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True, index=True)
    category = relationship("Category")
    subcategory_id = Column(Integer, ForeignKey("subcategories.id"), nullable=True, index=True)
    subcategory = relationship("Subcategory")
    image_url = Column(String)
    brands = relationship("Brand", secondary=product_brands)
    presentations = relationship("Presentation", secondary=product_presentations)
    search_tags = Column(String)
    description = Column(Text, nullable=True)
    technical_sheet_url = Column(String, nullable=True)

    @property
    def category_name(self):
        return self.category.name if self.category else None

    @property
    def subcategory_name(self):
        return self.subcategory.name if self.subcategory else None

class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String)
    customer_contact = Column(String)
    reference = Column(String, index=True, nullable=True)
    items = Column(JSON)
    status = Column(String, default="Pending")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id"), unique=True, nullable=False, index=True)
    quotation = relationship("Quotation")
    price = Column(Float, nullable=False)
    items = Column(JSON)
    customer_name = Column(String, nullable=False)
    customer_contact = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
