export interface User {
  id?: number;
  username: string;
  password_hash: string;
  role: 'admin' | 'employee';
  permissions: string[]; // JSON parsed array in memory
  created_at?: string;
}

export interface Propietaria {
  id?: number;
  name: string;
  code: string;
}

export interface Category {
  id?: number;
  name: string;
  status: number; // 1: active, 0: inactive
}

export interface Brand {
  id?: number;
  name: string;
  status: number; // 1: active, 0: inactive
}

export interface Product {
  id?: number;
  name: string;
  description?: string;
  category_id?: number | null;
  brand_id?: number | null;
  owner_id?: number | null;
  status: number; // 1: active, 0: inactive
  created_at?: string;
  // Associated entities (joined)
  category_name?: string;
  brand_name?: string;
  owner_name?: string;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id?: number;
  product_id?: number;
  sku?: string | null;
  barcode?: string | null;
  size?: string | null;
  color?: string | null;
  buy_price: number;
  sell_price: number;
  stock: number;
  status: number; // 1: active, 0: inactive
  image_url?: string | null;
  created_at?: string;
  // Joined fields for ease of use in POS/Cart
  product_name?: string;
  owner_name?: string;
}

export interface Customer {
  id?: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface Sale {
  id?: number;
  client_id?: number | null;
  user_id?: number | null;
  total: number;
  subtotal: number;
  discount: number;
  tax: number;
  payment_method: 'cash' | 'card' | 'transfer' | 'mixed';
  cash_received: number;
  card_received: number;
  transfer_received: number;
  status: 'completed' | 'cancelled';
  notes?: string | null;
  created_at?: string;
  // Joined fields
  client_name?: string;
  user_username?: string;
  items?: SaleItem[];
}

export interface SaleItem {
  id?: number;
  sale_id?: number;
  variant_id: number;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  // Joined fields
  product_name?: string;
  size?: string;
  color?: string;
  sku?: string;
  barcode?: string;
}

export interface InventoryMovement {
  id?: number;
  variant_id: number;
  type: 'input' | 'output' | 'adjustment' | 'sale' | 'return';
  quantity: number;
  reference_id?: number | null; // e.g. sale_id
  notes?: string | null;
  user_id?: number | null;
  created_at?: string;
  // Joined fields
  product_name?: string;
  size?: string;
  color?: string;
  sku?: string;
  user_username?: string;
}

export interface Setting {
  key: string;
  value: string;
}

export interface AuditLog {
  id?: number;
  user_id?: number | null;
  action: string;
  details?: string | null;
  created_at?: string;
  // Joined fields
  username?: string;
}
