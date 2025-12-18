
export enum ViewState {
  POS,
  ADMIN,
  INVENTORY,
  PURCHASES,
  REPORTS,
  SETTINGS,
  SUPER_ADMIN
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  stock: number;
}

export interface PackItem {
    productId: string;
    productName: string; // Nombre guardado para visualización rápida
    quantity: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  barcode?: string;
  hasVariants?: boolean;
  variants?: ProductVariant[];
  isPack?: boolean;     
  packItems?: PackItem[]; 
  images?: string[]; 
  description?: string;
  cost?: number; 
}

export interface CartItem extends Product {
  quantity: number;
  selectedVariantId?: string;
  selectedVariantName?: string;
  discount?: number;
}

export type PaymentMethod = 'cash' | 'card' | 'yape' | 'plin' | 'transfer';

export interface PaymentDetail {
  method: PaymentMethod;
  amount: number;
}

export interface Transaction {
  id: string;
  date: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  payments?: PaymentDetail[];
  profit: number;
  shiftId?: string;
  storeId?: string; 
}

export interface StoreSettings {
  name: string;
  currency: string;
  taxRate: number;
  pricesIncludeTax: boolean;
  address?: string;
  phone?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  role: 'admin' | 'cashier' | 'super_admin' | 'owner';
  storeId?: string; 
  email?: string;
}

export interface CashShift {
  id: string;
  startTime: string;
  endTime?: string;
  startAmount: number;
  endAmount?: number;
  status: 'OPEN' | 'CLOSED';
  totalSalesCash: number;
  totalSalesDigital: number;
}

export interface CashMovement {
  id: string;
  shiftId: string;
  type: 'OPEN' | 'CLOSE' | 'IN' | 'OUT';
  amount: number;
  description: string;
  timestamp: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact?: string;
}

export interface PurchaseItem {
  productId: string;
  quantity: number;
  cost: number;
}

export interface Purchase {
  id: string;
  date: string;
  supplierId: string;
  total: number;
  items: PurchaseItem[];
}

export interface Lead {
    id: string;
    name: string;
    business_name: string;
    phone: string;
    created_at: string;
    status?: 'NEW' | 'CONTACTED';
}

// Added name property to Store interface to fix TypeScript error in SuperAdminView (s.name)
export interface Store {
    id: string;
    name?: string;
    created_at: string;
    settings: StoreSettings;
    owner_id?: string;
}
