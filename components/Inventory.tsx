
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../services/db';
import { beautifyProductImage, searchProductImages } from '../services/gemini';
import { Product } from '../types';
import { Plus, Search, MoreVertical, Layers, X, Save, Trash2, RefreshCw, Printer, Image as ImageIcon, Sparkles, Camera, Minus, PlusCircle, Scan, AlertCircle, CheckSquare, Square, CheckCircle2, ChevronLeft, Trash, Globe, Download, Loader2, FileDown } from 'lucide-react';
import { Scanner } from './Scanner';
// @ts-ignore
import JsBarcode from 'jsbarcode';
import Fuse from 'fuse.js';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';

export const Inventory: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isScanningInModal, setIsScanningInModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  
  // Web Search State
  const [isWebSearching, setIsWebSearching] = useState(false);
  const [webSearchResults, setWebSearchResults] = useState<string[]>([]);
  const [showWebSearchUI, setShowWebSearchUI] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Selection & Print State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [printProducts, setPrintProducts] = useState<Product[]>([]);
  const [printQuantities, setPrintQuantities] = useState<Record<string, number>>({});
  
  const [isBeautifying, setIsBeautifying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  // Configuration de la recherche floue
  const fuse = useMemo(() => new Fuse(products, {
    keys: [
      { name: 'name', weight: 0.7 },
      { name: 'category', weight: 0.3 },
      { name: 'barcode', weight: 0.5 }
    ],
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 1
  }), [products]);

  // Filtrage des produits avec Fuse.js
  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    return fuse.search(search).map(result => result.item);
  }, [search, products, fuse]);

  useEffect(() => {
    if (printProducts.length > 0) {
      printProducts.forEach(product => {
        const selector = `#barcode-${product.id}`;
        const el = document.querySelector(selector);
        if (el) {
          JsBarcode(el, product.barcode, {
            format: "CODE128",
            width: 1.5,
            height: 50,
            displayValue: true,
            fontSize: 12,
            margin: 0
          });
        }
        
        const qty = printQuantities[product.id] || 1;
        for (let i = 0; i < qty; i++) {
          const printSelector = `#barcode-print-${product.id}-${i}`;
          const printEl = document.querySelector(printSelector);
          if (printEl) {
            JsBarcode(printEl, product.barcode, {
              format: "CODE128",
              width: 2,
              height: 80,
              displayValue: true,
              fontSize: 16,
              margin: 10
            });
          }
        }
      });
    }
  }, [printProducts, printQuantities]);

  const loadProducts = () => {
    setProducts(db.getProducts());
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(p => p.id)));
    }
  };

  const updatePrintQuantity = (productId: string, delta: number) => {
    setPrintQuantities(prev => ({
      ...prev,
      [productId]: Math.max(1, (prev[productId] || 1) + delta)
    }));
  };

  const handleOpenAdd = () => {
    setEditingProduct({
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      barcode: '',
      category: '',
      purchasePrice: 0,
      sellingPrice: 0,
      stockQty: 0,
      alertThreshold: 5,
      imageUrl: ''
    });
    setIsModalOpen(true);
    setShowWebSearchUI(false);
  };

  const handleEdit = (product: Product) => {
    if (isSelectionMode) {
      toggleSelection(product.id);
      return;
    }
    setEditingProduct(product);
    setIsModalOpen(true);
    setShowWebSearchUI(false);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      db.deleteProduct(productToDelete.id);
      setProductToDelete(null);
      loadProducts();
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      const existing = products.find(p => p.barcode === editingProduct.barcode && p.id !== editingProduct.id);
      if (existing) {
        alert(`Attention: Ce code-barres est déjà utilisé par "${existing.name}".`);
        return;
      }
      db.saveProduct(editingProduct as Product);
      setIsModalOpen(false);
      setEditingProduct(null);
      loadProducts();
    }
  };

  const generateBarcode = () => {
    const code = Math.floor(Math.random() * 9000000000000 + 1000000000000).toString();
    setEditingProduct(prev => prev ? { ...prev, barcode: code } : null);
  };

  const handleScanBarcode = (barcode: string) => {
    setEditingProduct(prev => prev ? { ...prev, barcode } : null);
    setIsScanningInModal(false);
  };

  const startBulkPrint = () => {
    const toPrint = products.filter(p => selectedIds.has(p.id));
    const initialQtys: Record<string, number> = {};
    toPrint.forEach(p => initialQtys[p.id] = 1);
    setPrintQuantities(initialQtys);
    setPrintProducts(toPrint);
  };

  const triggerPrint = () => {
    window.print();
    setPrintProducts([]);
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const dateStr = new Date().toLocaleDateString('fr-FR');
      const timeStr = new Date().toLocaleTimeString('fr-FR');

      // Add Title and Header
      doc.setFontSize(20);
      doc.setTextColor(79, 70, 229); // Indigo-600
      doc.text('SMARTSHOP AFRICA', 105, 20, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59); // Slate-800
      doc.text('RAPPORT D\'INVENTAIRE DES STOCKS', 105, 30, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.text(`Généré le: ${dateStr} à ${timeStr}`, 105, 38, { align: 'center' });

      // Table data
      const tableColumn = ["#", "Article", "Catégorie", "Code-Barres", "Prix Vente", "Stock"];
      const tableRows = filtered.map((p, index) => [
        index + 1,
        p.name,
        p.category || 'N/A',
        p.barcode,
        `${p.sellingPrice.toLocaleString()} FCFA`,
        p.stockQty
      ]);

      // Generate Table using the directly imported autoTable function
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 45,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: {
          5: { halign: 'center', fontStyle: 'bold' },
          4: { halign: 'right' }
        },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // Slate-400
        doc.text(`Page ${i} sur ${pageCount}`, 105, doc.internal.pageSize.height - 10, { align: 'center' });
      }

      doc.save(`Inventaire_SmartShop_${dateStr.replace(/\//g, '-')}.pdf`);
    } catch (error) {
      console.error("Erreur génération PDF:", error);
      alert("Impossible de générer le PDF pour le moment.");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingProduct(prev => prev ? { ...prev, imageUrl: reader.result as string } : null);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setEditingProduct(prev => prev ? { ...prev, imageUrl: '' } : null);
  };

  const handleBeautify = async () => {
    if (!editingProduct?.imageUrl || !editingProduct?.name) {
      alert("Veuillez d'abord ajouter une photo et un nom de produit.");
      return;
    }
    setIsBeautifying(true);
    try {
      const beautified = await beautifyProductImage(editingProduct.imageUrl, editingProduct.name);
      setEditingProduct(prev => prev ? { ...prev, imageUrl: beautified } : null);
    } catch (error) {
      alert("L'embellissement a échoué. Veuillez réessayer avec une image plus claire.");
    } finally {
      setIsBeautifying(false);
    }
  };

  const handleWebSearch = async () => {
    if (!editingProduct?.name) {
      alert("Entrez d'abord un nom de produit pour effectuer la recherche.");
      return;
    }
    setIsWebSearching(true);
    setShowWebSearchUI(true);
    try {
      const urls = await searchProductImages(editingProduct.name);
      setWebSearchResults(urls);
    } catch (error) {
      alert("Échec de la recherche d'images.");
    } finally {
      setIsWebSearching(false);
    }
  };

  const selectWebImage = async (url: string) => {
    setIsDownloading(true);
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      const base64 = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Délai de téléchargement passé")), 10000);
        img.onload = () => {
          clearTimeout(timeout);
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error("Impossible de traiter l'image."));
          ctx.drawImage(img, 0, 0);
          try {
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          } catch (e) {
            reject(new Error("L'image est protégée contre la copie (CORS)."));
          }
        };
        img.onerror = () => {
          clearTimeout(timeout);
          reject(new Error("L'image est inaccessible ou protégée."));
        };
        img.src = url;
      });

      setEditingProduct(prev => prev ? { ...prev, imageUrl: base64 } : null);
      setShowWebSearchUI(false);
    } catch (error: any) {
      console.warn("Download/CORS issue:", error);
      const useUrl = confirm(`Cette image est protégée contre le téléchargement direct (CORS).\n\nVoulez-vous quand même l'utiliser via son lien ? (Elle pourrait ne pas s'afficher sans connexion internet)`);
      if (useUrl) {
        setEditingProduct(prev => prev ? { ...prev, imageUrl: url } : null);
        setShowWebSearchUI(false);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 no-print">
      <header className="bg-white border-b px-4 py-6 sticky top-0 z-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Stock & Articles</h1>
            {isSelectionMode && (
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mt-1">
                {selectedIds.size} sélectionné(s)
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button 
              onClick={exportToPDF}
              className="p-3 rounded-2xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all"
              title="Exporter PDF"
            >
              <FileDown size={20} />
            </button>
            <button 
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                setSelectedIds(new Set());
              }}
              className={`p-3 rounded-2xl transition-all ${isSelectionMode ? 'bg-indigo-50 text-indigo-600 ring-2 ring-indigo-500/20' : 'text-slate-400 hover:bg-slate-50'}`}
              title="Sélection multiple"
            >
              <CheckSquare size={20} />
            </button>
            <button 
              onClick={handleOpenAdd}
              className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-100 active:scale-95 transition-all"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
        
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher (nom, cat, code)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
          {isSelectionMode && (
            <button 
              onClick={selectAll}
              className="bg-slate-100 text-slate-600 font-bold px-4 py-4 rounded-2xl text-xs whitespace-nowrap active:scale-95 transition-all"
            >
              {selectedIds.size === filtered.length ? 'Déclocher Tout' : 'Tout Sélectionner'}
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 pb-32">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-slate-200 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Layers size={32} />
            </div>
            <p className="text-slate-500 font-medium">Aucun produit trouvé</p>
          </div>
        ) : (
          filtered.map(product => (
            <div 
              key={product.id} 
              onClick={() => isSelectionMode && toggleSelection(product.id)}
              className={`bg-white p-4 rounded-3xl shadow-sm border transition-all flex items-center justify-between group ${
                isSelectionMode && selectedIds.has(product.id) ? 'border-indigo-500 ring-4 ring-indigo-50/50 scale-[0.99]' : 'border-slate-100'
              }`}
            >
              <div className="flex items-center gap-4">
                {isSelectionMode ? (
                  <div className={`transition-all duration-200 ${selectedIds.has(product.id) ? 'text-indigo-600 scale-110' : 'text-slate-300'}`}>
                    {selectedIds.has(product.id) ? <CheckCircle2 size={26} fill="currentColor" className="text-white fill-indigo-600" /> : <Square size={24} />}
                  </div>
                ) : (
                  <div className="relative">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="w-16 h-16 rounded-2xl object-cover border border-slate-100"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                        <ImageIcon size={24} />
                      </div>
                    )}
                    <div className={`absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white shadow-sm ${product.stockQty <= product.alertThreshold ? 'bg-rose-500 text-white' : 'bg-indigo-500 text-white'}`}>
                      {product.stockQty}
                    </div>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 leading-tight truncate">{product.name}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 truncate">
                    {product.category || 'Sans catégorie'}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                      {product.barcode}
                    </span>
                    <span className="text-emerald-600 font-bold text-xs">
                      {product.sellingPrice.toLocaleString()} FCFA
                    </span>
                  </div>
                </div>
              </div>
              {!isSelectionMode && (
                <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); setPrintProducts([product]); setPrintQuantities({[product.id]: 1}); }} className="text-slate-300 p-2 hover:text-emerald-600 transition-colors">
                    <Printer size={20} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleEdit(product); }} className="text-slate-300 p-2 hover:text-indigo-600 transition-colors">
                    <MoreVertical size={20} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setProductToDelete(product); }} className="text-slate-300 p-2 hover:text-rose-600 transition-colors">
                    <Trash2 size={20} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Bulk Action Bar */}
      {isSelectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-24 left-4 right-4 bg-slate-900 text-white p-4 rounded-[2.5rem] shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-10 duration-300 z-40">
          <div className="flex items-center gap-4 ml-2">
            <div className="bg-indigo-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-black">
              {selectedIds.size}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Articles</p>
              <p className="font-bold">Sélectionnés</p>
            </div>
          </div>
          <button 
            onClick={startBulkPrint}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-3xl flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
          >
            <Printer size={18} /> Imprimer {selectedIds.size} Article(s)
          </button>
        </div>
      )}

      {/* Product Modal */}
      {isModalOpen && editingProduct && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold">Détails Produit</h2>
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors"><X size={24} /></button>
              </div>

              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <ImageIcon size={14} /> Média du produit
                    </h3>
                    {editingProduct.imageUrl && (
                      <button type="button" onClick={removeImage} className="text-rose-500 p-1 hover:bg-rose-50 rounded-lg transition-colors">
                        <Trash size={16} />
                      </button>
                    )}
                  </div>

                  <div className="relative group">
                    <div className="w-full h-40 bg-white rounded-2xl flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-200">
                      {editingProduct.imageUrl ? (
                        <img src={editingProduct.imageUrl} className="w-full h-full object-contain" alt="Aperçu" />
                      ) : (
                        <div className="text-center text-slate-300">
                          <ImageIcon size={40} className="mx-auto mb-1 opacity-50" />
                          <p className="text-[10px] font-bold uppercase">Aucun média</p>
                        </div>
                      )}
                      
                      {isBeautifying && (
                        <div className="absolute inset-0 bg-indigo-600/60 backdrop-blur-md flex flex-col items-center justify-center text-white p-4 text-center">
                          <Sparkles size={32} className="animate-pulse mb-2 text-amber-300" />
                          <p className="font-black text-xs uppercase tracking-widest">IA en action...</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-white border border-slate-200 text-slate-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all text-[9px] uppercase tracking-wider"
                    >
                      <Camera size={14} /> Photo
                    </button>
                    <button 
                      type="button"
                      onClick={handleWebSearch}
                      className="bg-white border border-slate-200 text-slate-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all text-[9px] uppercase tracking-wider"
                    >
                      <Globe size={14} /> Web
                    </button>
                    <button 
                      type="button"
                      onClick={handleBeautify}
                      disabled={isBeautifying || !editingProduct.imageUrl}
                      className="bg-indigo-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all text-[9px] uppercase tracking-wider shadow-md shadow-indigo-100 disabled:opacity-30"
                    >
                      <Sparkles size={14} /> Embellir
                    </button>
                  </div>
                </div>

                {/* UI RECHERCHE WEB INTEGREE */}
                {showWebSearchUI && (
                  <div className="bg-white border-2 border-indigo-100 rounded-3xl p-4 animate-in slide-in-from-top duration-300 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2">
                        <Globe size={14} /> Résultats Web
                      </h4>
                      <button type="button" onClick={() => setShowWebSearchUI(false)} className="text-slate-400"><X size={16} /></button>
                    </div>

                    {isWebSearching ? (
                      <div className="py-8 flex flex-col items-center justify-center text-indigo-400">
                        <Loader2 size={32} className="animate-spin mb-2" />
                        <p className="text-[10px] font-bold uppercase">Recherche en cours...</p>
                      </div>
                    ) : webSearchResults.length === 0 ? (
                      <div className="text-center py-4 text-slate-400">
                        <p className="text-xs italic">Aucune image trouvée.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                        {webSearchResults.map((url, idx) => (
                          <button 
                            key={idx} 
                            type="button" 
                            onClick={() => selectWebImage(url)}
                            className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-100 hover:border-indigo-500 transition-all group active:scale-95"
                          >
                            <img src={url} className="w-full h-full object-cover" alt="Résultat" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all">
                              <Download size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {isDownloading && (
                      <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 p-2 rounded-xl justify-center">
                        <Loader2 size={14} className="animate-spin" />
                        <span className="text-[10px] font-bold uppercase">Traitement local...</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Nom de l'article</label>
                    <input required value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full bg-slate-100 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 transition-all font-medium" placeholder="Ex: Riz 5kg" />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Identification (Code-barres)</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input 
                          required 
                          value={editingProduct.barcode} 
                          onChange={e => setEditingProduct({...editingProduct, barcode: e.target.value})} 
                          className="w-full bg-slate-100 border-none rounded-xl py-3.5 px-4 pr-10 focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-sm" 
                          placeholder="Code..." 
                        />
                        <button 
                          type="button" 
                          onClick={generateBarcode} 
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
                        >
                          <RefreshCw size={18} />
                        </button>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setIsScanningInModal(true)} 
                        className="bg-indigo-50 text-indigo-600 border border-indigo-100 px-4 rounded-xl flex items-center gap-2 active:scale-95 transition-all"
                      >
                        <Scan size={20} />
                        <span className="text-[10px] font-black uppercase">Scan</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Catégorie</label>
                      <input value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} className="w-full bg-slate-100 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Alerte Stock</label>
                      <input type="number" value={editingProduct.alertThreshold} onChange={e => setEditingProduct({...editingProduct, alertThreshold: Number(e.target.value)})} className="w-full bg-slate-100 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Prix Achat (FCFA)</label>
                      <input type="number" value={editingProduct.purchasePrice} onChange={e => setEditingProduct({...editingProduct, purchasePrice: Number(e.target.value)})} className="w-full bg-slate-100 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-bold" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Prix Vente (FCFA)</label>
                      <input type="number" value={editingProduct.sellingPrice} onChange={e => setEditingProduct({...editingProduct, sellingPrice: Number(e.target.value)})} className="w-full bg-slate-100 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-bold text-indigo-600" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Stock Actuel</label>
                    <div className="flex items-center gap-4 bg-slate-100 rounded-2xl p-2">
                       <button type="button" onClick={() => setEditingProduct(p => p ? {...p, stockQty: Math.max(0, (p.stockQty || 0) - 1)} : null)} className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-600 active:scale-90 transition-all">
                          <Minus size={20} />
                       </button>
                       <input 
                         type="number" 
                         value={editingProduct.stockQty} 
                         onChange={e => setEditingProduct({...editingProduct, stockQty: Number(e.target.value)})} 
                         className="flex-1 bg-transparent border-none text-center font-black text-lg focus:ring-0" 
                       />
                       <button type="button" onClick={() => setEditingProduct(p => p ? {...p, stockQty: (p.stockQty || 0) + 1} : null)} className="w-10 h-10 bg-indigo-600 rounded-xl shadow-md flex items-center justify-center text-white active:scale-90 transition-all">
                          <PlusCircle size={20} />
                       </button>
                    </div>
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl mt-6 active:scale-[0.98] transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2">
                <Save size={20} /> Enregistrer
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODALE DE PREVISUALISATION ET QUANTITÉS */}
      {printProducts.length > 0 && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-md flex flex-col p-4 sm:p-8 animate-in fade-in duration-300 overflow-hidden">
          <div className="max-w-4xl mx-auto w-full bg-white rounded-[2.5rem] shadow-2xl flex flex-col h-full overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <div className="flex items-center gap-4">
                <button onClick={() => setPrintProducts([])} className="bg-slate-100 p-3 rounded-full text-slate-500 hover:bg-slate-200"><ChevronLeft size={24} /></button>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Impression Étiquettes</h2>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Configurez vos volumes</p>
                </div>
              </div>
              <button onClick={() => setPrintProducts([])} className="text-slate-300 hover:text-slate-600"><X size={28} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
               {printProducts.map(product => (
                 <div key={product.id} className="bg-white rounded-3xl p-4 border-2 border-slate-100 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                       <div className="bg-slate-50 p-2 rounded-2xl border border-slate-100">
                          <svg id={`barcode-${product.id}`} className="max-w-[120px] h-12"></svg>
                       </div>
                       <div>
                          <h4 className="font-black text-slate-900 text-sm">{product.name}</h4>
                          <p className="text-[10px] text-indigo-600 font-bold uppercase">{product.sellingPrice.toLocaleString()} FCFA</p>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-slate-100 p-2 rounded-2xl">
                       <button onClick={() => updatePrintQuantity(product.id, -1)} className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-600 active:scale-90"><Minus size={16} /></button>
                       <span className="w-8 text-center font-black text-slate-900">{printQuantities[product.id] || 1}</span>
                       <button onClick={() => updatePrintQuantity(product.id, 1)} className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white active:scale-90"><PlusCircle size={16} /></button>
                    </div>
                 </div>
               ))}
            </div>

            <div className="p-8 bg-white border-t">
              <button onClick={triggerPrint} className="w-full bg-emerald-600 text-white font-black py-5 rounded-3xl shadow-xl flex items-center justify-center gap-3 text-lg active:scale-95 transition-all">
                <Printer size={24} /> Lancer l'impression
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale de confirmation de suppression */}
      {productToDelete && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-sm rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Supprimer l'article ?</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-8">
                Êtes-vous sûr de vouloir supprimer <span className="font-bold text-slate-900">"{productToDelete.name}"</span> ? Cette action est irréversible.
              </p>
              <div className="space-y-3">
                <button 
                  onClick={confirmDelete}
                  className="w-full bg-rose-500 hover:bg-rose-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-rose-200 active:scale-[0.98] transition-all"
                >
                  Oui, Supprimer
                </button>
                <button 
                  onClick={() => setProductToDelete(null)}
                  className="w-full bg-slate-50 text-slate-600 font-bold py-4 rounded-2xl active:scale-[0.98] transition-all"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isScanningInModal && (
        <Scanner onScan={handleScanBarcode} onClose={() => setIsScanningInModal(false)} />
      )}

      {/* MOTEUR D'IMPRESSION CACHÉ */}
      <div className="print-only">
        {printProducts.map(product => {
          const qty = printQuantities[product.id] || 1;
          const labels = [];
          for (let i = 0; i < qty; i++) {
            labels.push(
              <div key={`${product.id}-${i}`} className="label-container bg-white" style={{ pageBreakInside: 'avoid', padding: '10mm 5mm', textAlign: 'center' }}>
                <div style={{ border: '2px solid black', padding: '4mm', display: 'inline-block', width: '50mm', height: '30mm' }}>
                  <h1 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '0 0 1mm 0', overflow: 'hidden', whiteSpace: 'nowrap' }}>{product.name}</h1>
                  <p style={{ fontSize: '8pt', fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 2mm 0', opacity: 0.7 }}>{product.category}</p>
                  <svg id={`barcode-print-${product.id}-${i}`} style={{ margin: '0 auto' }}></svg>
                  <h2 style={{ fontSize: '14pt', fontWeight: '900', margin: '1mm 0 0 0' }}>{product.sellingPrice.toLocaleString()} FCFA</h2>
                </div>
              </div>
            );
          }
          return labels;
        })}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        @media print {
          body { background: white !important; margin: 0; padding: 0; }
          .print-only { display: block !important; }
          .no-print { display: none !important; }
          @page { size: auto; margin: 0; }
          .label-container { page-break-after: always; display: flex; align-items: center; justify-content: center; height: 30mm; width: 50mm; }
        }
      `}</style>
    </div>
  );
};
