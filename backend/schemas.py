# schemas.py

from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime

class CategoryBase(BaseModel):
    name: str
    tags: str

class CategoryCreate(CategoryBase):
    pass

class Category(CategoryBase):
    id: int
    class Config:
        from_attributes = True

class ProductBase(BaseModel):
    name: str
    code: Optional[str] = None
    category: str
    price: float
    price_text: str
    image_url: Optional[str] = None
    brands: Optional[str] = None
    search_tags: Optional[str] = None
    options: Optional[str] = None
    description: Optional[str] = None
    technical_sheet_url: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: int

    class Config:
        from_attributes = True

class QuotationItem(BaseModel):
    product_id: int
    product_name: str
    quantity: int
    option: str
    price: float

class QuotationCreate(BaseModel):
    customer_name: str
    customer_contact: str
    items: List[QuotationItem]
    total_estimated: float
    reference: Optional[str] = None

class Quotation(QuotationCreate):
    id: int
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class TopProduct(BaseModel):
    name: str
    count: int

class SalesData(BaseModel):
    date: str
    amount: float

class AnalyticsStats(BaseModel):
    total_quoted: float
    total_purchased: float
    top_products: List[TopProduct]
    sales_history: List[SalesData]