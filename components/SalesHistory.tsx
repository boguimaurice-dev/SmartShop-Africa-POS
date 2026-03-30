
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Calendar, Filter, ArrowUpDown, ChevronRight, X, CreditCard, Banknote, ShoppingBag, Receipt, ArrowLeft, Download, Printer } from 'lucide-react';
import { db } from '../services/db';
import { Sale, PaymentMethod } from '../types';

type DateFilter = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH';
type SortBy = 'DATE_DESC' | 'DATE_ASC' | 'TOTAL_DESC' | 'TOTAL_ASC';

export const SalesHistory: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortBy>('DATE_DESC');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setSales(db.getSales());
  }, []);

  const filteredAndSortedSales = useMemo(() => {
    let result = [...sales];

    // 1. Search (ID or Item Name)
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s => 
        s.id.toLowerCase().includes(q) || 
        s.items.some(item => item.name.toLowerCase().includes(q))
      );
    }

    // 2. Date Filtering
    const now = new Date();
    const todayStr = now.toDateString();
    
    if (dateFilter === 'TODAY') {
      result = result.filter(s => new Date(s.timestamp).toDateString() === todayStr);
    } else if (dateFilter === 'WEEK') {
      const oneWeekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
      result = result.filter(s => s.timestamp >= oneWeekAgo);
    } else if (dateFilter === 'MONTH') {
      const oneMonthAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
      result = result.filter(s => s.timestamp >= oneMonthAgo);
    }

    // 3. Sorting
    result.sort((a, b) => {
      if (sortBy === 'DATE_DESC') return b.timestamp - a.timestamp;
      if (sortBy === 'DATE_ASC') return a.timestamp - b.timestamp;
      if (sortBy === 'TOTAL_DESC') return b.totalAmount - a.totalAmount;
      if (sortBy === 'TOTAL_ASC') return a.totalAmount - b.totalAmount;
      return 0;
    });

    return result;
  }, [sales, search, dateFilter, sortBy]);

  const stats = useMemo(() => {
    const total = filteredAndSortedSales.reduce((acc, s) => acc + s.totalAmount, 0);
    return {
      count: filteredAndSortedSales.length,
      totalRevenue: total
    };
  }, [filteredAndSortedSales]);

  const getPaymentIcon = (method: PaymentMethod) => {
    switch (method) {
      case PaymentMethod.CASH: return <Banknote size={16} className="text-emerald-600" />;
      case PaymentMethod.WAVE: return <CreditCard size={16} className="text-sky-600" />;
      case PaymentMethod.ORANGE_MONEY: return <CreditCard size={16} className="text-orange-600" />;
      default: return <CreditCard size={16} />;
    }
  };

  const formatDate = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const printSelectedReceipt = () => {
    window.print();
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 no-print">
      <header className="bg-white border-b px-4 py-6 sticky top-0 z-10 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Ventes</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Historique des transactions</p>
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3 rounded-2xl transition-all ${showFilters ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            <Filter size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Rechercher ID ou article..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        {/* Filters and Sorting Panel */}
        {showFilters && (
          <div className="space-y-4 pt-2 animate-in slide-in-from-top duration-300">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Période</p>
              <div className="flex gap-2">
                {(['ALL', 'TODAY', 'WEEK', 'MONTH'] as DateFilter[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setDateFilter(f)}
                    className={`flex-1 py-2 px-1 rounded-xl text-[10px] font-bold border transition-all ${dateFilter === f ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'}`}
                  >
                    {f === 'ALL' ? 'Toutes' : f === 'TODAY' ? 'Aujourd\'hui' : f === 'WEEK' ? '7 Jours' : '30 Jours'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Trier par</p>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {(['DATE_DESC', 'DATE_ASC', 'TOTAL_DESC', 'TOTAL_ASC'] as SortBy[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setSortBy(s)}
                    className={`whitespace-nowrap py-2 px-4 rounded-xl text-[10px] font-bold border transition-all ${sortBy === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'}`}
                  >
                    {s === 'DATE_DESC' ? 'Plus récentes' : s === 'DATE_ASC' ? 'Plus anciennes' : s === 'TOTAL_DESC' ? 'Prix fort' : 'Prix faible'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Summary Stats Strip */}
        <div className="mt-4 flex gap-4">
          <div className="flex-1 bg-indigo-50/50 rounded-xl p-3 border border-indigo-100/50">
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Transactions</p>
            <p className="text-sm font-black text-indigo-700">{stats.count}</p>
          </div>
          <div className="flex-1 bg-emerald-50/50 rounded-xl p-3 border border-emerald-100/50">
            <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Total</p>
            <p className="text-sm font-black text-emerald-700">{stats.totalRevenue.toLocaleString()} FCFA</p>
          </div>
        </div>
      </header>

      {/* Sales List */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3 pb-24">
        {filteredAndSortedSales.length === 0 ? (
          <div className="text-center py-20 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-4">
              <ShoppingBag size={32} />
            </div>
            <p className="text-slate-400 font-medium italic">Aucune vente trouvée</p>
          </div>
        ) : (
          filteredAndSortedSales.map(sale => (
            <div 
              key={sale.id}
              onClick={() => setSelectedSale(sale)}
              className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between active:scale-[0.98] transition-all hover:border-indigo-200"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  sale.paymentMethod === PaymentMethod.CASH ? 'bg-emerald-50 text-emerald-600' : 
                  sale.paymentMethod === PaymentMethod.WAVE ? 'bg-sky-50 text-sky-600' : 'bg-orange-50 text-orange-600'
                }`}>
                  <Receipt size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900">#{sale.id}</h3>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-black text-slate-500 uppercase">
                      {getPaymentIcon(sale.paymentMethod)}
                      {sale.paymentMethod}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    {formatDate(sale.timestamp)} • {formatTime(sale.timestamp)}
                  </p>
                </div>
              </div>
              <div className="text-right flex items-center gap-3">
                <div>
                  <p className="font-black text-indigo-600 text-sm">{sale.totalAmount.toLocaleString()} FCFA</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">{sale.items.length} article(s)</p>
                </div>
                <ChevronRight size={18} className="text-slate-300" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sale Detail View Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden animate-in slide-in-from-bottom duration-300 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex justify-between items-center bg-white sticky top-0 z-10">
              <button onClick={() => setSelectedSale(null)} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400">
                <ArrowLeft size={24} />
              </button>
              <div className="text-center">
                <h2 className="text-lg font-black text-slate-900">Vente #{selectedSale.id}</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{formatDate(selectedSale.timestamp)} - {formatTime(selectedSale.timestamp)}</p>
              </div>
              <button onClick={() => setSelectedSale(null)} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Résumé Paiement</span>
                  <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-black text-indigo-600 uppercase flex items-center gap-1">
                    {getPaymentIcon(selectedSale.paymentMethod)} {selectedSale.paymentMethod}
                  </span>
                </div>
                <div className="text-center py-4">
                  <p className="text-3xl font-black text-slate-900 tracking-tight">{selectedSale.totalAmount.toLocaleString()} <span className="text-lg">FCFA</span></p>
                  <p className="text-xs text-emerald-500 font-bold mt-1 uppercase tracking-widest">Transaction Complétée</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Articles ({selectedSale.items.length})</h3>
                <div className="space-y-2">
                  {selectedSale.items.map((item, idx) => (
                    <div key={idx} className="bg-white border border-slate-100 p-4 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                          <ShoppingBag size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{item.unitPrice.toLocaleString()} FCFA /unité</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-900 text-sm">{(item.unitPrice * item.quantity).toLocaleString()} FCFA</p>
                        <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">Qté: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-slate-50 flex gap-3">
              <button 
                onClick={printSelectedReceipt}
                className="flex-1 bg-slate-900 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-slate-200"
              >
                <Printer size={18} /> Imprimer
              </button>
              <button 
                onClick={() => setSelectedSale(null)}
                className="flex-1 bg-white text-slate-900 border border-slate-200 font-black py-4 rounded-2xl active:scale-95 transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Receipt Template - Only visible for window.print() */}
      {selectedSale && (
        <div className="print-only receipt-print bg-white p-8 max-w-[80mm] mx-auto text-slate-900 font-mono text-xs leading-relaxed">
          <div className="text-center mb-6">
            <h1 className="text-xl font-black mb-1">SMARTSHOP AFRICA</h1>
            <p className="font-bold uppercase text-[10px] opacity-70">Historique - Reçu de Vente</p>
            <div className="mt-4 border-y border-dashed border-slate-300 py-2">
              <p>REÇU DE VENTE</p>
              <p className="font-bold">#{selectedSale.id}</p>
            </div>
          </div>

          <div className="mb-4">
            <p className="flex justify-between">
              <span>Date:</span>
              <span>{formatDate(selectedSale.timestamp)}</span>
            </p>
            <p className="flex justify-between">
              <span>Heure:</span>
              <span>{formatTime(selectedSale.timestamp)}</span>
            </p>
          </div>

          <div className="border-b border-slate-300 pb-2 mb-2">
            <div className="flex justify-between font-bold mb-1 text-[10px]">
              <span className="w-1/2">ARTICLE</span>
              <span className="w-1/6 text-center">QTÉ</span>
              <span className="w-1/3 text-right">TOTAL</span>
            </div>
            {selectedSale.items.map((item, idx) => (
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
              <span>{selectedSale.totalAmount.toLocaleString()} FCFA</span>
            </div>
            <div className="flex justify-between opacity-70">
              <span>MÉTHODE:</span>
              <span className="font-bold">{selectedSale.paymentMethod}</span>
            </div>
          </div>

          <div className="text-center pt-6 border-t border-dashed border-slate-300">
            <p className="font-bold italic">MERCI DE VOTRE CONFIANCE !</p>
            <p className="text-[8px] opacity-50 mt-2">Réimprimé depuis l'historique SmartShop</p>
          </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
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
