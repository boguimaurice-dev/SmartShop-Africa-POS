
import React, { useState, useEffect } from 'react';
import { ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, Scan, CheckCircle2, X, Image as ImageIcon, AlertCircle, PackagePlus, Printer, Share2 } from 'lucide-react';
import { db } from '../services/db';
import { Product, SaleItem, PaymentMethod, SaleStatus, Sale } from '../types';
import { Scanner } from './Scanner';

interface SaleItemWithImage extends SaleItem {
  imageUrl?: string;
}

export const POS: React.FC = () => {
  const [cart, setCart] = useState<SaleItemWithImage[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'SELECT' | 'PROCESSING' | 'SUCCESS'>('SELECT');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);
  const [lastSale, setLastSale] = useState<Sale | null>(null);

  const total = cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  const handleScan = (barcode: string) => {
    const product = db.getProductByBarcode(barcode);
    if (product) {
      addToCart(product);
      setShowScanner(false);
    } else {
      setShowScanner(false);
      setUnknownBarcode(barcode);
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { 
        productId: product.id, 
        name: product.name, 
        quantity: 1, 
        unitPrice: product.sellingPrice,
        imageUrl: product.imageUrl
      }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setCart(prev => prev.filter(item => item.productId !== id));
  };

  const handleCheckout = async (method: PaymentMethod) => {
    setSelectedMethod(method);
    setPaymentStep('PROCESSING');
    
    await new Promise(r => setTimeout(r, 1500));
    
    const sale: Sale = {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      timestamp: Date.now(),
      items: cart.map(({imageUrl, ...rest}) => rest),
      totalAmount: total,
      paymentMethod: method,
      status: SaleStatus.COMPLETED
    };

    db.saveSale(sale);
    setLastSale(sale);
    setPaymentStep('SUCCESS');
  };

  const closePaymentModal = () => {
    setCart([]);
    setShowPayment(false);
    setPaymentStep('SELECT');
    setLastSale(null);
  };

  const printReceipt = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 no-print">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-slate-900">Nouvelle Vente</h1>
          <button 
            onClick={() => setShowScanner(true)}
            className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-200 active:scale-95 transition-transform flex items-center gap-2"
          >
            <Scan size={20} />
            <span className="font-semibold text-sm">Scanner</span>
          </button>
        </div>
      </div>

      {/* Cart List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-32">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 pt-12">
            <div className="bg-white p-6 rounded-full">
              <ShoppingCart size={48} />
            </div>
            <p className="text-lg font-medium">Votre panier est vide</p>
            <button onClick={() => setShowScanner(true)} className="text-indigo-600 font-bold underline">Scanner un article</button>
          </div>
        ) : (
          cart.map(item => (
            <div key={item.productId} className="bg-white p-3 rounded-2xl shadow-sm flex items-center gap-4 border border-slate-100">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-50 flex-shrink-0 border border-slate-100">
                {item.imageUrl ? (
                  <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <ImageIcon size={20} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-800 truncate text-sm">{item.name}</h3>
                <p className="text-indigo-600 text-xs font-black">{item.unitPrice.toLocaleString()} FCFA</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center bg-slate-50 rounded-xl p-0.5 border border-slate-100">
                  <button onClick={() => updateQuantity(item.productId, -1)} className="p-1 hover:bg-white rounded-lg transition-colors text-slate-500"><Minus size={14}/></button>
                  <span className="w-6 text-center font-bold text-xs">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.productId, 1)} className="p-1 hover:bg-white rounded-lg transition-colors text-indigo-600"><Plus size={14}/></button>
                </div>
                <button onClick={() => removeItem(item.productId)} className="text-rose-400 p-1 active:scale-90 transition-transform"><Trash2 size={16}/></button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 bg-white/80 backdrop-blur-md border-t p-4 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] z-20 mx-auto max-w-md">
          <div className="flex justify-between items-center mb-4">
            <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Total à payer</span>
            <span className="text-2xl font-black text-indigo-600">{total.toLocaleString()} FCFA</span>
          </div>
          <button 
            onClick={() => setShowPayment(true)}
            className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-xl shadow-emerald-100"
          >
            Encaisser la vente
          </button>
        </div>
      )}

      {showScanner && (
        <Scanner 
          onScan={(barcode) => handleScan(barcode)} 
          onClose={() => setShowScanner(false)} 
        />
      )}

      {/* Product Not Found Modal */}
      {unknownBarcode && (
        <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden p-8 text-center animate-in zoom-in-95 duration-200 shadow-2xl">
            <div className="bg-rose-100 text-rose-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Code Inconnu</h2>
            <p className="text-slate-500 mb-6 text-sm leading-relaxed">
              Le code-barres <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded font-mono">{unknownBarcode}</span> n'existe pas dans votre stock.
            </p>
            <div className="space-y-3">
              <button 
                onClick={() => setUnknownBarcode(null)}
                className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl active:scale-95 transition-all shadow-lg shadow-slate-200"
              >
                Fermer
              </button>
              <button 
                onClick={() => setUnknownBarcode(null)}
                className="w-full bg-indigo-50 text-indigo-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all text-sm"
              >
                <PackagePlus size={18} /> Ajouter au stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden animate-in slide-in-from-bottom duration-300 shadow-2xl">
            <div className="p-6">
              {paymentStep === 'SELECT' && (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-xl font-black text-slate-900">Paiement</h2>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Choisir une méthode</p>
                    </div>
                    <button onClick={() => setShowPayment(false)} className="text-slate-400 bg-slate-50 p-2 rounded-full"><X size={20} /></button>
                  </div>
                  <div className="space-y-3">
                    <button 
                      onClick={() => handleCheckout(PaymentMethod.CASH)}
                      className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 active:scale-95 transition-all text-left group"
                    >
                      <div className="bg-emerald-100 text-emerald-600 p-3 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <Banknote size={24} />
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-slate-800">Espèces</p>
                        <p className="text-slate-500 text-xs">Paiement physique direct</p>
                      </div>
                      <span className="text-emerald-600 font-black">{total.toLocaleString()}</span>
                    </button>

                    <button 
                      onClick={() => handleCheckout(PaymentMethod.WAVE)}
                      className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-100 hover:border-sky-500 hover:bg-sky-50 active:scale-95 transition-all text-left group"
                    >
                      <div className="bg-sky-100 text-sky-600 p-3 rounded-xl group-hover:bg-sky-600 group-hover:text-white transition-colors">
                        <CreditCard size={24} />
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-slate-800">Wave</p>
                        <p className="text-slate-500 text-xs">QR Code / Push Mobile</p>
                      </div>
                      <span className="text-sky-600 font-black">{total.toLocaleString()}</span>
                    </button>

                    <button 
                      onClick={() => handleCheckout(PaymentMethod.ORANGE_MONEY)}
                      className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-100 hover:border-orange-500 hover:bg-orange-50 active:scale-95 transition-all text-left group"
                    >
                      <div className="bg-orange-100 text-orange-600 p-3 rounded-xl group-hover:bg-orange-600 group-hover:text-white transition-colors">
                        <CreditCard size={24} />
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-slate-800">Orange Money</p>
                        <p className="text-slate-500 text-xs">Validation par code USSD</p>
                      </div>
                      <span className="text-orange-600 font-black">{total.toLocaleString()}</span>
                    </button>
                  </div>
                </>
              )}

              {paymentStep === 'PROCESSING' && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-indigo-100 rounded-full"></div>
                    <div className="w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin absolute top-0"></div>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Traitement...</h3>
                    <p className="text-slate-500 mt-2 text-sm">Validation sécurisée de la transaction</p>
                  </div>
                </div>
              )}

              {paymentStep === 'SUCCESS' && lastSale && (
                <div className="animate-in fade-in duration-500">
                  <div className="flex flex-col items-center justify-center text-center mb-8">
                    <div className="bg-emerald-100 text-emerald-600 p-5 rounded-full mb-4 shadow-inner">
                      <CheckCircle2 size={40} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900">Vente Terminée !</h3>
                    <p className="text-slate-500 text-sm font-medium">Le reçu a été généré avec succès.</p>
                  </div>
                  
                  {/* Mini Receipt Preview */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6 font-mono text-xs">
                    <div className="flex justify-between border-b border-slate-200 pb-2 mb-2">
                      <span className="font-bold">TOTAL</span>
                      <span className="font-black">{lastSale.totalAmount.toLocaleString()} FCFA</span>
                    </div>
                    <div className="space-y-1 opacity-70">
                      <div className="flex justify-between">
                        <span>Paiement:</span>
                        <span className="font-bold uppercase">{lastSale.paymentMethod}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ID:</span>
                        <span>#{lastSale.id}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={printReceipt}
                      className="bg-slate-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"
                    >
                      <Printer size={18} /> Reçu
                    </button>
                    <button 
                      onClick={closePaymentModal}
                      className="bg-indigo-600 text-white font-bold py-4 rounded-2xl active:scale-95 transition-all shadow-lg"
                    >
                      Nouvelle Vente
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HIDDEN PRINTABLE RECEIPT */}
      {lastSale && (
        <div className="print-only receipt-print bg-white p-8 max-w-[80mm] mx-auto text-slate-900 font-mono text-xs leading-relaxed">
          <div className="text-center mb-6">
            <h1 className="text-xl font-black mb-1">SMARTSHOP AFRICA</h1>
            <p className="font-bold uppercase text-[10px] opacity-70">Votre Boutique de Confiance</p>
            <div className="mt-4 border-y border-dashed border-slate-300 py-2">
              <p>REÇU DE VENTE</p>
              <p className="font-bold">#{lastSale.id}</p>
            </div>
          </div>

          <div className="mb-4">
            <p className="flex justify-between">
              <span>Date:</span>
              <span>{new Date(lastSale.timestamp).toLocaleDateString()}</span>
            </p>
            <p className="flex justify-between">
              <span>Heure:</span>
              <span>{new Date(lastSale.timestamp).toLocaleTimeString()}</span>
            </p>
          </div>

          <div className="border-b border-slate-300 pb-2 mb-2">
            <div className="flex justify-between font-bold mb-1">
              <span className="w-1/2">ARTICLE</span>
              <span className="w-1/6 text-center">QTÉ</span>
              <span className="w-1/3 text-right">TOTAL</span>
            </div>
            {lastSale.items.map((item, idx) => (
              <div key={idx} className="flex justify-between mb-1">
                <span className="w-1/2 truncate">{item.name}</span>
                <span className="w-1/6 text-center">x{item.quantity}</span>
                <span className="w-1/3 text-right">{(item.quantity * item.unitPrice).toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1 mb-6">
            <div className="flex justify-between font-black text-sm pt-2 border-t border-slate-300">
              <span>TOTAL</span>
              <span>{lastSale.totalAmount.toLocaleString()} FCFA</span>
            </div>
            <div className="flex justify-between opacity-70">
              <span>MÉTHODE:</span>
              <span className="font-bold">{lastSale.paymentMethod}</span>
            </div>
          </div>

          <div className="text-center pt-6 border-t border-dashed border-slate-300">
            <p className="font-bold italic">MERCI DE VOTRE VISITE !</p>
            <p className="text-[8px] opacity-50 mt-2">Généré par SmartShop Africa POS</p>
            <p className="text-[8px] opacity-50">www.smartshop-africa.com</p>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .receipt-print, .receipt-print * { visibility: visible; }
          .receipt-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 10mm;
          }
          @page { margin: 0; }
        }
      `}</style>
    </div>
  );
};
