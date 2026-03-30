
import React, { useState, useEffect } from 'react';
import { TrendingUp, Package, AlertCircle, Sparkles, RefreshCcw, ArrowRight } from 'lucide-react';
import { db } from '../services/db';
import { getBusinessInsights } from '../services/gemini';
import { Product, Sale } from '../types';

export const Dashboard: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [insights, setInsights] = useState<string | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    setSales(db.getSales());
    setProducts(db.getProducts());
  }, []);

  const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const salesToday = sales.filter(s => new Date(s.timestamp).toDateString() === new Date().toDateString());
  const revenueToday = salesToday.reduce((sum, s) => sum + s.totalAmount, 0);
  const lowStockProducts = products.filter(p => p.stockQty <= p.alertThreshold);

  const fetchInsights = async () => {
    setLoadingInsights(true);
    const result = await getBusinessInsights(sales, products);
    setInsights(result);
    setLoadingInsights(false);
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 px-4 py-6 pb-24">
      <header className="mb-8">
        <h1 className="text-2xl font-black text-slate-900">Tableau de Bord</h1>
        <p className="text-slate-500">Aperçu de votre activité aujourd'hui</p>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-3">
            <TrendingUp size={20} />
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-tight">Ventes / Jour</p>
          <h2 className="text-xl font-black text-slate-900 mt-1">{revenueToday.toLocaleString()} FCFA</h2>
        </div>
        
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
          <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mb-3">
            <AlertCircle size={20} />
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-tight">Alertes Stock</p>
          <h2 className="text-xl font-black text-slate-900 mt-1">{lowStockProducts.length} articles</h2>
        </div>
      </div>

      {/* AI Advisor Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white mb-8 shadow-xl shadow-indigo-100 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
              <Sparkles size={18} className="text-amber-300" />
            </div>
            <span className="font-bold text-sm">Conseiller IA SmartShop</span>
          </div>

          {insights ? (
            <div className="animate-in fade-in slide-in-from-top-2 duration-500">
              <p className="text-indigo-50 text-sm leading-relaxed whitespace-pre-line mb-4">
                {insights}
              </p>
              <button 
                onClick={fetchInsights}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-colors"
              >
                <RefreshCcw size={12} /> Actualiser
              </button>
            </div>
          ) : (
            <div>
              <p className="text-indigo-100 text-sm mb-6">
                Obtenez une analyse personnalisée de vos ventes et des conseils pour optimiser votre stock.
              </p>
              <button 
                disabled={loadingInsights}
                onClick={fetchInsights}
                className="w-full bg-white text-indigo-600 font-bold py-3 rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                {loadingInsights ? (
                  <>
                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    Analyse en cours...
                  </>
                ) : (
                  <>Générer mon rapport</>
                )}
              </button>
            </div>
          )}
        </div>
        {/* Abstract background shape */}
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* Stock Alerts Section */}
      <section className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-black text-slate-800">Seuils Critiques</h3>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">Voir tout</span>
        </div>
        
        {lowStockProducts.length > 0 ? (
          <div className="space-y-3">
            {lowStockProducts.map(p => (
              <div key={p.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-rose-500">
                    <Package size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{p.name}</h4>
                    <p className="text-xs text-rose-500 font-medium">Reste: {p.stockQty} unités</p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-slate-300" />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-8 rounded-3xl border border-dashed border-slate-200 text-center">
            <p className="text-slate-400 text-sm">Tous vos stocks sont au-dessus des seuils d'alerte. Beau travail !</p>
          </div>
        )}
      </section>
    </div>
  );
};
