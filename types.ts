
export enum PaymentMethod {
  CASH = 'CASH',
  WAVE = 'WAVE',
  ORANGE_MONEY = 'ORANGE_MONEY'
}

export enum SaleStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  purchasePrice: number;
  sellingPrice: number;
  stockQty: number;
  alertThreshold: number;
  category: string;
  imageUrl?: string;
}

export interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface Sale {
  id: string;
  timestamp: number;
  items: SaleItem[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
}

export interface Shop {
  id: string;
  name: string;
  address: string;
  ownerId: string;
}
