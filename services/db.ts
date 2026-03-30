
import { Product, Sale, PaymentMethod, SaleStatus } from '../types';

const INITIAL_PRODUCTS: Product[] = [
  { 
    id: '1', 
    name: 'Riz 5kg', 
    barcode: '123456', 
    purchasePrice: 2500, 
    sellingPrice: 3000, 
    stockQty: 50, 
    alertThreshold: 10, 
    category: 'Alimentation',
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&h=200&fit=crop'
  },
  { 
    id: '2', 
    name: 'Huile Dinor 1L', 
    barcode: '234567', 
    purchasePrice: 1000, 
    sellingPrice: 1200, 
    stockQty: 24, 
    alertThreshold: 5, 
    category: 'Alimentation',
    imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacabc88c5?w=200&h=200&fit=crop'
  },
  { 
    id: '3', 
    name: 'Savon Fanico', 
    barcode: '345678', 
    purchasePrice: 200, 
    sellingPrice: 250, 
    stockQty: 100, 
    alertThreshold: 20, 
    category: 'Hygiène',
    imageUrl: 'https://images.unsplash.com/photo-1600857062241-98e5dba7f214?w=200&h=200&fit=crop'
  },
  { 
    id: '4', 
    name: 'Sucre SOSUCO', 
    barcode: '456789', 
    purchasePrice: 600, 
    sellingPrice: 750, 
    stockQty: 8, 
    alertThreshold: 10, 
    category: 'Alimentation',
    imageUrl: 'https://images.unsplash.com/photo-1622484211148-71328909871e?w=200&h=200&fit=crop'
  },
];

export const db = {
  getProducts: (): Product[] => {
    const data = localStorage.getItem('products');
    if (!data) {
      localStorage.setItem('products', JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
    return JSON.parse(data);
  },

  saveProduct: (product: Product) => {
    const products = db.getProducts();
    const index = products.findIndex(p => p.id === product.id);
    if (index > -1) {
      products[index] = product;
    } else {
      products.push(product);
    }
    localStorage.setItem('products', JSON.stringify(products));
  },

  deleteProduct: (id: string) => {
    const products = db.getProducts().filter(p => p.id !== id);
    localStorage.setItem('products', JSON.stringify(products));
  },

  getSales: (): Sale[] => {
    const data = localStorage.getItem('sales');
    return data ? JSON.parse(data) : [];
  },

  saveSale: (sale: Sale) => {
    const sales = db.getSales();
    sales.push(sale);
    localStorage.setItem('sales', JSON.stringify(sales));

    // Update stock
    const products = db.getProducts();
    sale.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        product.stockQty -= item.quantity;
      }
    });
    localStorage.setItem('products', JSON.stringify(products));
  },

  getProductByBarcode: (barcode: string): Product | undefined => {
    return db.getProducts().find(p => p.barcode === barcode);
  }
};
