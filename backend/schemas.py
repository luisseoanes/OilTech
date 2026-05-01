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

class SubcategoryBase(BaseModel):
    name: str
    category_id: int

class SubcategoryCreate(SubcategoryBase):
    pass

class Subcategory(SubcategoryBase):
    id: int
    category_name: Optional[str] = None
    class Config:
        from_attributes = True

class PresentationBase(BaseModel):
    name: str

class PresentationCreate(PresentationBase):
    pass

class Presentation(PresentationBase):
    id: int
    class Config:
        from_attributes = True

class BrandBase(BaseModel):
    name: str
    image_url: Optional[str] = None

class BrandCreate(BrandBase):
    pass

class Brand(BrandBase):
    id: int
    class Config:
        from_attributes = True

class ProductBase(BaseModel):
    name: str
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    image_url: Optional[str] = None
    brand_ids: Optional[List[int]] = []
    presentation_ids: Optional[List[int]] = []
    search_tags: Optional[str] = None
    description: Optional[str] = None
    technical_sheet_url: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: int
    category_name: Optional[str] = None
    subcategory_name: Optional[str] = None
    brands: List[Brand] = []
    presentations: List[Presentation] = []

    class Config:
        from_attributes = True

class QuotationItem(BaseModel):
    product_id: int
    product_name: str
    quantity: int
    option: str

class QuotationCreate(BaseModel):
    customer_name: str
    customer_contact: str
    items: List[QuotationItem]
    reference: Optional[str] = None

class Quotation(QuotationCreate):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class SaleItem(BaseModel):
    product_id: int
    product_name: str
    quantity: int

class SaleCreate(BaseModel):
    quotation_id: int
    price: float
    items: List[SaleItem]

class Sale(SaleCreate):
    id: int
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
