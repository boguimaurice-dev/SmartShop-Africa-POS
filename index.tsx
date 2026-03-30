
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { POS } from './components/POS';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { SalesHistory } from './components/SalesHistory';
import { LayoutGrid, ShoppingBag, Package, History } from 'lucide-react';

const App = () => {
  const [activeTab, setActiveTab] = useState<'pos' | 'dashboard' | 'inventory' | 'sales'>('pos');

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white shadow-2xl relative overflow-hidden">
      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'pos' && <POS />}
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'inventory' && <Inventory />}
        {activeTab === 'sales' && <SalesHistory />}
      </main>

      {/* Navigation Bar */}
      <nav className="h-20 bg-white border-t flex items-center justify-around px-4 safe-bottom z-30">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <LayoutGrid size={22} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Dashboard</span>
        </button>

        <button 
          onClick={() => setActiveTab('sales')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'sales' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <History size={22} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Historique</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('pos')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'pos' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <div className={`p-3 rounded-2xl -mt-10 border-4 border-slate-50 transition-all ${activeTab === 'pos' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : 'bg-slate-200 text-slate-500'}`}>
            <ShoppingBag size={26} />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider mt-1">Vendre</span>
        </button>

        <button 
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'inventory' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <Package size={22} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Stocks</span>
        </button>
      </nav>
    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
