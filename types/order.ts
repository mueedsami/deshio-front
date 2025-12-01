// types/order.ts

export interface Customer {
  name: string;
  email: string;
  phone: string;
  address?: string;
}

export interface DeliveryAddress {
  division: string;
  district: string;
  city: string;
  zone: string;
  area?: string;
  address: string;
  postalCode: string;
}

export interface Product {
  id: number;
  productId?: number | string;
  productName: string;
  size: string;
  qty: number;
  price: number;
  amount: number;
  discount: number;
  barcodes?: string[];
  barcode?: string;
  isDefective?: boolean;
  defectId?: string;
}

export interface OrderItem {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  discount: number;
}

export interface Amounts {
  subtotal: number;
  totalDiscount: number;
  vat: number;
  vatRate: number;
  transportCost: number;
  total: number;
  paid?: number;
  due?: number;
}

export interface Payments {
  sslCommerz?: number;
  advance?: number;
  transactionId?: string;
  totalPaid?: number;
  total: number;
  paid: number;
  due: number;
}

export interface Store {
  id: string;
  name: string;
  location?: string;
  type?: string;
}

export interface Order {
  id: number;
  orderNumber?: string; 
  order_number?: string;
  orderType?: string; // 'social_commerce' | 'ecommerce' | 'counter'
  orderTypeLabel?: string;
  date: string;
  customer: Customer;
  deliveryAddress?: DeliveryAddress;
  products?: Product[];
  items?: OrderItem[];
  subtotal: number;
  discount?: number;
  shipping?: number;
  amounts?: Amounts;
  payments: Payments;
  salesBy: string;
  status?: string;
  fulfillmentStatus?: string;
  store?: Store | string; // Can be Store object or string
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  isInternational?: boolean;
}