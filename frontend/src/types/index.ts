export interface User {
  id: number;
  username: string;
  role: 'admin' | 'employee';
  permissions: string[];
}

export interface Propietaria {
  id: number;
  name: string;
  code: string;
}

export interface Category {
  id: number;
  name: string;
  status: number;
}

export interface Brand {
  id: number;
  name: string;
  status: number;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  sku: string | null;
  barcode: string | null;
  size: string | null;
  color: string | null;
  buy_price: number;
  sell_price: number;
  stock: number;
  status: number;
  image_url: string | null;
  created_at: string;
  // Joined fields
  product_name?: string;
  owner_name?: string;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  category_id: number | null;
  brand_id: number | null;
  owner_id: number | null;
  status: number;
  created_at: string;
  category_name?: string;
  brand_name?: string;
  owner_name?: string;
  variants: ProductVariant[];
}

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  variant_id: number;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  product_name?: string;
  size?: string;
  color?: string;
  sku?: string;
  barcode?: string;
}

export interface Sale {
  id: number;
  client_id: number | null;
  user_id: number | null;
  total: number;
  subtotal: number;
  discount: number;
  tax: number;
  payment_method: 'cash' | 'card' | 'transfer' | 'mixed';
  cash_received: number;
  card_received: number;
  transfer_received: number;
  status: 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  client_name?: string;
  client_phone?: string;
  client_email?: string;
  user_username?: string;
  items?: SaleItem[];
}

export interface InventoryMovement {
  id: number;
  variant_id: number;
  type: 'input' | 'output' | 'adjustment' | 'sale' | 'return';
  quantity: number;
  reference_id: number | null;
  notes: string | null;
  user_id: number | null;
  created_at: string;
  product_name?: string;
  size?: string;
  color?: string;
  sku?: string;
  user_username?: string;
}
