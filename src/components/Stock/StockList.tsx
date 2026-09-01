import React, { useState, useMemo, useEffect } from 'react';
import { useBar } from '../../context/BarContext';
import { Product, EnterpriseReportType } from '../../types';
import { AddProductModal } from './AddProductModal';
import { EditProductModal } from './EditProductModal';
import { StockAdjustModal } from './StockAdjustModal';
import { InventoryModal } from './InventoryModal';
import { CategoryManagerModal } from './CategoryManagerModal';
import { UnitManagerModal } from './UnitManagerModal';
import { SmartInventoryAlertsModal } from './SmartInventoryAlertsModal';
import { StockHistoryModal } from './StockHistoryModal';
import { EnterpriseReportModal } from '../Reports/EnterpriseReportModal';
import { ProductStockDetailModal } from './ProductStockDetailModal';
import { BarcodeLabelModal } from './BarcodeLabelModal';
import { safeGetItem, safeSetItem } from '../../utils/storage';
import { 
  Package, 
  AlertTriangle, 
  Plus, 
  Search, 
  ArrowUpDown, 
  Edit3, 
  Trash2, 
  History, 
  DollarSign, 
  Boxes,
  TrendingUp,
  X,
  Image as ImageIcon,
  ClipboardCheck,
  Zap,
  Printer,
  FileText,
  Layers,
  Scale,
  LayoutGrid,
  Grid3X3,
  ListFilter,
  Eye,
  Filter,
  ChevronDown,
  RotateCcw,
  CheckCircle2,
  FolderTree,
  ChevronRight,
  Briefcase,
  ScanBarcode
} from 'lucide-react';

export type StockViewMode = 'visual_grid' | 'compact_grid' | 'table_list' | 'category_grouped';
export type StockStatusFilter = 'all' | 'in_stock' | 'low' | 'out';
export type StockSortOption = 'name_asc' | 'name_desc' | 'stock_asc' | 'stock_desc' | 'price_asc' | 'price_desc' | 'margin_desc' | 'value_desc';

export const StockList: React.FC = () => {
  const { products, deleteProduct, stockLogs, settings, currentUser, isAdmin, categories, setActiveTab } = useBar();

  const perms = currentUser?.permissions;
  const canManageStock = isAdmin || perms?.canManageStock === true;
  const canViewCostPrices = isAdmin || perms?.canViewCostPrices === true || perms?.canAccessReports === true;

  // View Mode State (Persisted in localStorage) - Default: table_list (Tableur Détaillé)
  const [viewMode, setViewMode] = useState<StockViewMode>(() => {
    return (safeGetItem('barexpress_stock_view_mode') as StockViewMode) || 'table_list';
  });

  const handleSetViewMode = (mode: StockViewMode) => {
    setViewMode(mode);
    safeSetItem('barexpress_stock_view_mode', mode);
  };

  // Permanent Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StockStatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<StockSortOption>('name_asc');
  const [itemsPerPage, setItemsPerPage] = useState<number>(48);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isUnitManagerOpen, setIsUnitManagerOpen] = useState(false);
  const [isBarcodeLabelModalOpen, setIsBarcodeLabelModalOpen] = useState(false);
  const [barcodeModalProduct, setBarcodeModalProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isSmartAlertsOpen, setIsSmartAlertsOpen] = useState(false);
  const [reportTypeModal, setReportTypeModal] = useState<EnterpriseReportType | null>(null);

  // Extract all distinct units from products and defaults
  const availableUnits = useMemo(() => {
    const unitSet = new Set<string>();
    products.forEach((p) => {
      if (p.unit) unitSet.add(p.unit);
    });
    return Array.from(unitSet).sort();
  }, [products]);

  // Overall Global Metrics (Statistical computation)
  const totalProducts = products.length;
  const totalUnitsInStock = products.reduce((sum, p) => sum + Math.max(0, p.stock), 0);
  const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= p.minStockAlert);
  const outOfStockProducts = products.filter(p => p.stock <= 0);

  const totalStockCostValue = products.reduce((sum, p) => sum + ((p.costPrice || 0) * Math.max(0, p.stock)), 0);
  const totalStockSellingValue = products.reduce((sum, p) => sum + ((p.price || 0) * Math.max(0, p.stock)), 0);
  const totalPotentialProfit = Math.max(0, totalStockSellingValue - totalStockCostValue);
  const potentialMarginPercent = totalStockSellingValue > 0 ? (totalPotentialProfit / totalStockSellingValue) * 100 : 0;

  // Filter and Sort Pipeline
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // 1. Search Query (Name, Category, Unit, Barcode, Varieties)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = product.name.toLowerCase().includes(q);
        const matchesCategory = product.category.toLowerCase().includes(q);
        const matchesUnit = product.unit?.toLowerCase().includes(q);
        const matchesBarcode = product.barcode?.toLowerCase().includes(q);
        const matchesVarieties = (product.varietyOptions || product.flavors || []).some(v => v.toLowerCase().includes(q));

        if (!matchesName && !matchesCategory && !matchesUnit && !matchesBarcode && !matchesVarieties) {
          return false;
        }
      }

      // 2. Status Filter
      if (statusFilter === 'in_stock' && product.stock <= product.minStockAlert) return false;
      if (statusFilter === 'low' && (product.stock <= 0 || product.stock > product.minStockAlert)) return false;
      if (statusFilter === 'out' && product.stock > 0) return false;

      // 3. Category Filter
      if (categoryFilter !== 'all' && product.category !== categoryFilter) return false;

      // 4. Unit Filter
      if (unitFilter !== 'all' && product.unit !== unitFilter) return false;

      return true;
    }).sort((a, b) => {
      switch (sortOption) {
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'stock_asc':
          return a.stock - b.stock;
        case 'stock_desc':
          return b.stock - a.stock;
        case 'price_asc':
          return a.price - b.price;
        case 'price_desc':
          return b.price - a.price;
        case 'margin_desc': {
          const marginA = (a.price || 0) - (a.costPrice || 0);
          const marginB = (b.price || 0) - (b.costPrice || 0);
          return marginB - marginA;
        }
        case 'value_desc': {
          const valA = (a.price || 0) * Math.max(0, a.stock);
          const valB = (b.price || 0) * Math.max(0, b.stock);
          return valB - valA;
        }
        default:
          return 0;
      }
    });
  }, [products, searchQuery, statusFilter, categoryFilter, unitFilter, sortOption]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, categoryFilter, unitFilter, sortOption, itemsPerPage]);

  // Pagination slice
  const paginatedProducts = useMemo(() => {
    if (itemsPerPage === 0 || viewMode === 'category_grouped') return filteredProducts;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage, viewMode]);

  const totalPages = itemsPerPage > 0 ? Math.ceil(filteredProducts.length / itemsPerPage) : 1;

  // Grouping by category for the category_grouped mode
  const productsByCategory = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    filteredProducts.forEach((p) => {
      const cat = p.category || 'Autres';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  }, [filteredProducts]);

  const isFiltersActive = searchQuery.trim() !== '' || statusFilter !== 'all' || categoryFilter !== 'all' || unitFilter !== 'all';

  const resetAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setUnitFilter('all');
    setSortOption('name_asc');
  };

  const toggleCategoryCollapse = (catName: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catName]: !prev[catName],
    }));
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-5 text-slate-900 animate-fadeIn pb-24 md:pb-8">
      
      {/* Header & Main Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs w-full overflow-hidden">
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <Package className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 shrink-0" />
            <h1 className="text-base sm:text-xl font-black text-slate-900 truncate">Catalogue & Stock Central</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {canManageStock 
              ? "Gestion en temps réel, multi-affichages pour grands volumes et détails de stock par référence."
              : "Consultation des disponibilités en rayon et en réserve."}
          </p>
        </div>

        {canManageStock && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
            
            {/* Sector / Settings Shortcut */}
            <button
              onClick={() => setActiveTab('admin')}
              className="justify-center px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-950 text-xs font-bold rounded-xl border border-amber-300 flex items-center space-x-1.5 transition cursor-pointer shadow-2xs"
              title="Configurer le secteur d'activité de l'entreprise (Imprimerie, Station, Librairie, Bar-Resto, Commerce)"
            >
              <Briefcase className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="truncate max-w-[120px]">{settings.businessSectorName || 'Secteur'}</span>
            </button>

            {/* Print Report Button */}
            <button
              onClick={() => setReportTypeModal('inventory_perpetual')}
              className="justify-center px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 flex items-center space-x-1.5 transition cursor-pointer"
              title="Imprimer un rapport de stock officiel pour l'entreprise"
            >
              <Printer className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="truncate">Rapport</span>
            </button>

            {/* Barcode & Labels Button */}
            <button
              onClick={() => {
                setBarcodeModalProduct(null);
                setIsBarcodeLabelModalOpen(true);
              }}
              className="justify-center px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-black rounded-xl border border-slate-200 flex items-center space-x-1.5 transition cursor-pointer"
              title="Générer des codes-barres universels et imprimer des étiquettes autocollantes"
            >
              <ScanBarcode className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="truncate">Étiquettes & Codes</span>
            </button>

            {/* Categories Manager Button */}
            <button
              onClick={() => setIsCategoryManagerOpen(true)}
              className="justify-center px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-black rounded-xl border border-slate-200 flex items-center space-x-1.5 transition cursor-pointer"
              title="Gérer, ajouter, modifier ou supprimer des catégories de produits"
            >
              <Layers className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="truncate">Catégories</span>
            </button>

            {/* Units Manager Button */}
            <button
              onClick={() => setIsUnitManagerOpen(true)}
              className="justify-center px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-black rounded-xl border border-slate-200 flex items-center space-x-1.5 transition cursor-pointer"
              title="Gérer les unités de mesure et vente (Bouteille, Cannette, Caisse, Kg, Pièce, etc.)"
            >
              <Scale className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="truncate">Unités</span>
            </button>

            <button
              onClick={() => setIsInventoryModalOpen(true)}
              className="justify-center px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-xs flex items-center space-x-1.5 transition cursor-pointer active:scale-95"
            >
              <ClipboardCheck className="w-4 h-4 shrink-0" />
              <span className="truncate">Inventaire</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="justify-center px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl shadow-xs flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3] text-amber-400 shrink-0" />
              <span className="truncate">Nouveau Produit</span>
            </button>
          </div>
        )}
      </div>

      {/* Overview Metric Cards */}
      <div className={`grid gap-3 sm:gap-4 ${canViewCostPrices ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
        
        {/* Card 1: Total References */}
        <div className="bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">Catalogue Global</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {totalProducts} <span className="text-xs font-bold text-slate-500">articles</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1.5 border-t border-slate-100">
            <span>{totalUnitsInStock.toLocaleString()} unités en stock</span>
            <span className="font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full text-[10px]">
              Actifs
            </span>
          </div>
        </div>

        {/* Card 2: Low Stock Alert */}
        <div className="bg-gradient-to-br from-orange-500/15 via-orange-500/5 to-white p-4 rounded-2xl border border-orange-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-orange-950">Stock Faible</span>
            <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-black text-orange-600 tracking-tight">
              {lowStockProducts.length} <span className="text-xs font-bold opacity-70">articles</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-orange-800 pt-1.5 border-t border-orange-100">
            <span>{lowStockProducts.length > 0 ? 'À réapprovisionner' : 'Seuils sous contrôle'}</span>
            <span className="font-black bg-orange-100 text-orange-900 px-2 py-0.5 rounded-full text-[10px]">
              Seuil min
            </span>
          </div>
        </div>

        {/* Card 3: Out of Stock */}
        <div className="bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-white p-4 rounded-2xl border border-rose-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-rose-950">Ruptures en Rayon</span>
            <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-black text-rose-600 tracking-tight">
              {outOfStockProducts.length} <span className="text-xs font-bold opacity-70">épuisés</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-rose-800 pt-1.5 border-t border-rose-100">
            <span>{outOfStockProducts.length > 0 ? 'Indisponibles en caisse' : 'Aucune rupture'}</span>
            <span className="font-black bg-rose-100 text-rose-900 px-2 py-0.5 rounded-full text-[10px]">
              0 Stock
            </span>
          </div>
        </div>

        {/* Card 4: Inventory Selling Value & Potential Margin */}
        {canViewCostPrices && (
          <div className="bg-gradient-to-br from-emerald-500/20 via-emerald-500/5 to-white p-4 rounded-2xl border border-emerald-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-950">Valeur Marchande (Vente)</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="my-1.5">
              <div className="text-2xl font-black text-emerald-700 tracking-tight">
                {totalStockSellingValue.toLocaleString()} <span className="text-xs font-normal text-slate-500">{settings.currency}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-emerald-800 pt-1.5 border-t border-emerald-100">
              <span className="truncate">Coût: {totalStockCostValue.toLocaleString()} {settings.currency}</span>
              <span className="font-black bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full text-[10px] shrink-0 ml-1">
                +{potentialMarginPercent.toFixed(1)}% marge
              </span>
            </div>
          </div>
        )}
      </div>

      {/* PERMANENT MULTI-DISPLAY CONTROLS & FILTER CONSOLE */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        
        {/* Row 1: Search Bar & Display Mode Selector */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* SEARCH BAR (Essential for fast access) */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom, catégorie, unité, code-barres, variante..."
              className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 pl-9 pr-8 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-amber-500 focus:bg-white text-xs font-medium transition shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                title="Effacer la recherche"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* DISPLAY MODES SELECTOR (4 Distinct Views) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto overflow-x-auto shrink-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 hidden sm:inline">
              Affichage :
            </span>

            {/* Mode 1: Visual Grid (Standard cards with large images) */}
            <button
              onClick={() => handleSetViewMode('visual_grid')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                viewMode === 'visual_grid'
                  ? 'bg-white text-slate-950 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grille Standard avec photos & grands aperçus"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-amber-600" />
              <span>Grille Visuelle</span>
            </button>

            {/* Mode 2: Compact Grid (Dense tiles for fast browsing) */}
            <button
              onClick={() => handleSetViewMode('compact_grid')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                viewMode === 'compact_grid'
                  ? 'bg-white text-slate-950 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grille Compacte haute densité (idéale pour centaines de références)"
            >
              <Grid3X3 className="w-3.5 h-3.5 text-amber-600" />
              <span>Grille Compacte</span>
            </button>

            {/* Mode 3: Table / List View (Full Spreadsheet with complete stock & valuation details) */}
            <button
              onClick={() => handleSetViewMode('table_list')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                viewMode === 'table_list'
                  ? 'bg-white text-slate-950 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Vue Tableur / Liste Détaillée avec prix, marges, jauge et détails complets"
            >
              <ListFilter className="w-3.5 h-3.5 text-amber-600" />
              <span>Tableur Détaillé</span>
            </button>

            {/* Mode 4: Category Grouped View */}
            <button
              onClick={() => handleSetViewMode('category_grouped')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                viewMode === 'category_grouped'
                  ? 'bg-white text-slate-950 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Regroupement synthétique par catégorie"
            >
              <FolderTree className="w-3.5 h-3.5 text-amber-600" />
              <span>Par Catégorie</span>
            </button>
          </div>

        </div>

        {/* Row 2: Multi-Criteria Filter Pills & Selectors */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 text-xs">
          
          {/* Status Filter Buttons */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white font-black'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tous ({products.length})
            </button>

            <button
              onClick={() => setStatusFilter('in_stock')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center space-x-1 cursor-pointer ${
                statusFilter === 'in_stock'
                  ? 'bg-emerald-600 text-white font-black'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>En Stock ({products.filter(p => p.stock > p.minStockAlert).length})</span>
            </button>

            <button
              onClick={() => setStatusFilter('low')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center space-x-1 cursor-pointer ${
                statusFilter === 'low'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Alerte Seuil ({lowStockProducts.length})</span>
            </button>

            <button
              onClick={() => setStatusFilter('out')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center space-x-1 cursor-pointer ${
                statusFilter === 'out'
                  ? 'bg-red-600 text-white font-black'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              <Boxes className="w-3 h-3" />
              <span>Rupture ({outOfStockProducts.length})</span>
            </button>
          </div>

          {/* Category, Unit & Sorting Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            
            {/* Category Dropdown */}
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-50 text-slate-800 border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold focus:outline-none focus:border-amber-500 appearance-none pr-7 cursor-pointer"
              >
                <option value="all">Toutes Catégories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Unit Dropdown */}
            {availableUnits.length > 0 && (
              <div className="relative">
                <select
                  value={unitFilter}
                  onChange={(e) => setUnitFilter(e.target.value)}
                  className="bg-slate-50 text-slate-800 border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold focus:outline-none focus:border-amber-500 appearance-none pr-7 cursor-pointer"
                >
                  <option value="all">Toutes Unités</option>
                  {availableUnits.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as StockSortOption)}
                className="bg-slate-50 text-slate-800 border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold focus:outline-none focus:border-amber-500 appearance-none pr-7 cursor-pointer"
              >
                <option value="name_asc">Tri: Nom (A-Z)</option>
                <option value="name_desc">Tri: Nom (Z-A)</option>
                <option value="stock_asc">Tri: Stock (Plus faible)</option>
                <option value="stock_desc">Tri: Stock (Plus élevé)</option>
                <option value="price_desc">Tri: Prix Vente (Haut)</option>
                <option value="price_asc">Tri: Prix Vente (Bas)</option>
                {canViewCostPrices && <option value="margin_desc">Tri: Marge Décroissante</option>}
                {canViewCostPrices && <option value="value_desc">Tri: Valeur Stock (Haut)</option>}
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Clear Filters Button */}
            {isFiltersActive && (
              <button
                onClick={resetAllFilters}
                className="flex items-center space-x-1 px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                title="Réinitialiser tous les filtres"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Réinitialiser</span>
              </button>
            )}

          </div>

        </div>

        {/* Results Counter Banner */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>
            Affichage de <strong>{filteredProducts.length}</strong> sur <strong>{products.length}</strong> références
            {isFiltersActive && ' (filtrées)'}
          </span>

          {viewMode !== 'category_grouped' && filteredProducts.length > 24 && (
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-slate-400">Par page :</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-slate-100 text-slate-800 text-xs font-bold rounded-lg px-2 py-0.5 border border-slate-200 cursor-pointer"
              >
                <option value={24}>24</option>
                <option value={48}>48</option>
                <option value={96}>96</option>
                <option value={0}>Tous ({filteredProducts.length})</option>
              </select>
            </div>
          )}
        </div>

      </div>

      {/* PRODUCTS DISPLAY SECTION */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black text-slate-800">Aucun produit ne correspond aux critères</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Vérifiez l'orthographe dans la barre de recherche ou modifiez vos filtres de stock et catégories.
          </p>
          {isFiltersActive && (
            <button
              onClick={resetAllFilters}
              className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-slate-800 transition cursor-pointer"
            >
              Effacer les filtres
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* MODE 1: VISUAL GRID (Standard Cards) */}
          {/* ========================================================================= */}
          {viewMode === 'visual_grid' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
              {paginatedProducts.map((product) => {
                const isOut = product.stock <= 0;
                const isLow = product.stock > 0 && product.stock <= product.minStockAlert;

                return (
                  <div
                    key={product.id}
                    className={`bg-white border rounded-2xl overflow-hidden shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group ${
                      isOut
                        ? 'border-red-200 bg-red-50/10'
                        : isLow
                        ? 'border-amber-200 bg-amber-50/10'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Photo & Top Badges */}
                    <div 
                      className="relative w-full aspect-[4/5] min-h-[175px] sm:min-h-[210px] bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden cursor-pointer"
                      onClick={() => setDetailProduct(product)}
                      title="Cliquer pour voir la fiche détaillée de stock"
                    >
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-300">
                          <ImageIcon className="w-12 h-12 opacity-30" />
                        </div>
                      )}

                      {/* Stock Status Badge (Top Right) */}
                      <div className="absolute top-1.5 right-1.5 z-10">
                        {isOut ? (
                          <span className="inline-flex items-center space-x-1 bg-red-600 text-white font-black text-[9px] px-1.5 py-0.5 rounded-full shadow-md animate-pulse">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>Rupture</span>
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center space-x-1 bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-full shadow-md animate-pulse">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>Alerte ({product.stock})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 bg-emerald-600 text-white font-bold text-[9px] px-1.5 py-0.5 rounded-full shadow-md">
                            <span>Stock: {product.stock}</span>
                          </span>
                        )}
                      </div>

                      {/* Category Badge (Top Left) */}
                      <span className="absolute top-1.5 left-1.5 z-10 text-[9px] font-bold text-slate-700 bg-white/95 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                        {product.category}
                      </span>

                      {/* Unit Badge (Bottom Right) */}
                      <span className="absolute bottom-1.5 right-1.5 z-10 text-[9px] font-bold text-slate-700 bg-white/95 backdrop-blur-xs px-1.5 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                        {product.unit}
                      </span>

                      {/* Quick Detail Peek Icon on Hover */}
                      <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <span className="px-2.5 py-1 bg-white/95 text-slate-900 rounded-lg text-xs font-black shadow-md flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-amber-600" />
                          <span>Fiche Stock</span>
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div 
                      className="p-2 sm:p-2.5 flex-1 flex flex-col justify-between gap-1 border-t border-slate-100 cursor-pointer"
                      onClick={() => setDetailProduct(product)}
                    >
                      <div>
                        <h3 className="font-extrabold text-xs sm:text-[13px] text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-1 sm:line-clamp-2 leading-tight">
                          {product.name}
                        </h3>
                        {((product.varietyOptions && product.varietyOptions.length > 0) || (product.flavors && product.flavors.length > 0)) && (
                          <div className="mt-1 flex items-center space-x-1">
                            <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 bg-amber-50 text-amber-900 border border-amber-200 rounded text-[9.5px] font-bold">
                              <Layers className="w-2.5 h-2.5 text-amber-600" />
                              <span>
                                {(product.varietyOptions || product.flavors || []).length} {product.varietyLabel || 'variantes'}
                              </span>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Price & Optional Cost Info */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                        <div>
                          <span className="text-[9px] text-slate-400 block font-medium">Prix Vente</span>
                          <span className="font-black text-amber-600 text-xs sm:text-sm">
                            {product.price.toLocaleString()} <span className="text-[9px] font-bold text-slate-500">{settings.currency}</span>
                          </span>
                        </div>

                        {canViewCostPrices && (
                          <div className="text-right">
                            <span className="text-[9px] text-slate-400 block font-medium">Coût Achat</span>
                            <span className="font-bold text-slate-600 text-[11px]">
                              {product.costPrice ? `${product.costPrice.toLocaleString()} ${settings.currency}` : '--'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Action Buttons */}
                    <div className="p-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailProduct(product);
                        }}
                        className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200 text-xs transition cursor-pointer"
                        title="Voir la fiche détaillée et historique de ce produit"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-600" />
                      </button>

                      {canManageStock ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAdjustingProduct(product);
                            }}
                            className="flex-1 py-1.5 px-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs transition flex items-center justify-center space-x-1 shadow-2xs cursor-pointer"
                            title="Réapprovisionner le stock"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Réappro</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingProduct(product);
                            }}
                            className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200 text-xs transition cursor-pointer"
                            title="Éditer le produit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Supprimer ${product.name} des stocks ?`)) {
                                deleteProduct(product.id);
                              }
                            }}
                            className="p-1.5 bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg border border-slate-200 text-xs transition cursor-pointer"
                            title="Supprimer le produit"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <div className="flex-1 text-[10px] font-semibold text-slate-400 text-center">
                          {product.stock > 0 ? `${product.stock} dispo` : 'Rupture'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODE 2: COMPACT GRID (High Density Tiles) */}
          {/* ========================================================================= */}
          {viewMode === 'compact_grid' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
              {paginatedProducts.map((product) => {
                const isOut = product.stock <= 0;
                const isLow = product.stock > 0 && product.stock <= product.minStockAlert;

                return (
                  <div
                    key={product.id}
                    className={`p-2.5 bg-white border rounded-xl shadow-2xs hover:shadow-md transition flex flex-col justify-between gap-2 group cursor-pointer ${
                      isOut
                        ? 'border-red-200 bg-red-50/20'
                        : isLow
                        ? 'border-amber-200 bg-amber-50/20'
                        : 'border-slate-200'
                    }`}
                    onClick={() => setDetailProduct(product)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 overflow-hidden font-black text-xs">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Package className="w-4 h-4 text-slate-400" />
                        )}
                      </div>

                      {/* Stock Level Badge */}
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${
                          isOut
                            ? 'bg-red-600 text-white'
                            : isLow
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        }`}
                      >
                        {product.stock} {product.unit}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-black text-xs text-slate-900 truncate leading-tight group-hover:text-amber-600">
                        {product.name}
                      </h4>
                      <span className="text-[10px] text-slate-400 block truncate">{product.category}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                      <span className="font-black text-amber-600">
                        {product.price.toLocaleString()} <span className="text-[9px] font-bold text-slate-500">{settings.currency}</span>
                      </span>

                      {canManageStock && (
                        <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setAdjustingProduct(product)}
                            className="p-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-md font-bold transition cursor-pointer"
                            title="Réapprovisionner"
                          >
                            <Plus className="w-3 h-3 stroke-[3]" />
                          </button>
                          <button
                            onClick={() => setEditingProduct(product)}
                            className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition cursor-pointer"
                            title="Modifier"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODE 3: TABLE / LIST VIEW (Spreadsheet with Detailed Columns) */}
          {/* ========================================================================= */}
          {viewMode === 'table_list' && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    <tr>
                      <th className="py-3 px-3">Article & Référence</th>
                      <th className="py-3 px-3">Catégorie</th>
                      <th className="py-3 px-3 text-center">Unité</th>
                      {canViewCostPrices && <th className="py-3 px-3 text-right">Coût Achat</th>}
                      <th className="py-3 px-3 text-right">Prix Vente</th>
                      {canViewCostPrices && <th className="py-3 px-3 text-right">Marge</th>}
                      <th className="py-3 px-3 text-center">Niveau de Stock</th>
                      {canViewCostPrices && <th className="py-3 px-3 text-right">Valeur Stock</th>}
                      <th className="py-3 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedProducts.map((product) => {
                      const isOut = product.stock <= 0;
                      const isLow = product.stock > 0 && product.stock <= product.minStockAlert;
                      const cost = product.costPrice || 0;
                      const selling = product.price || 0;
                      const margin = Math.max(0, selling - cost);
                      const marginPct = selling > 0 ? (margin / selling) * 100 : 0;
                      const stockVal = selling * Math.max(0, product.stock);

                      return (
                        <tr
                          key={product.id}
                          onClick={() => setDetailProduct(product)}
                          className={`hover:bg-amber-50/40 transition cursor-pointer ${
                            isOut
                              ? 'bg-red-50/20'
                              : isLow
                              ? 'bg-amber-50/20'
                              : ''
                          }`}
                        >
                          {/* Product Name & Photo */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 overflow-hidden font-black text-xs">
                                {product.image ? (
                                  <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <Package className="w-4 h-4 text-slate-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="font-extrabold text-slate-900 block truncate">
                                  {product.name}
                                </span>
                                {((product.varietyOptions && product.varietyOptions.length > 0) || (product.flavors && product.flavors.length > 0)) && (
                                  <span className="text-[10px] text-amber-800 font-bold bg-amber-50 px-1 py-0.2 rounded">
                                    {(product.varietyOptions || product.flavors || []).length} {product.varietyLabel || 'variantes'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                              {product.category}
                            </span>
                          </td>

                          {/* Unit */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className="font-semibold text-slate-600 text-xs">
                              {product.unit}
                            </span>
                          </td>

                          {/* Cost Price */}
                          {canViewCostPrices && (
                            <td className="py-2.5 px-3 text-right font-medium text-slate-600 whitespace-nowrap">
                              {cost.toLocaleString()} {settings.currency}
                            </td>
                          )}

                          {/* Selling Price */}
                          <td className="py-2.5 px-3 text-right font-black text-amber-600 whitespace-nowrap">
                            {selling.toLocaleString()} {settings.currency}
                          </td>

                          {/* Margin */}
                          {canViewCostPrices && (
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <span className="font-bold text-emerald-700">
                                +{margin.toLocaleString()} {settings.currency}
                              </span>
                              <span className="text-[10px] text-emerald-600 block">
                                {marginPct.toFixed(0)}%
                              </span>
                            </td>
                          )}

                          {/* Stock Level & Status Badge */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black ${
                                isOut
                                  ? 'bg-red-600 text-white'
                                  : isLow
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                              }`}
                            >
                              {isOut && <AlertTriangle className="w-3 h-3" />}
                              {isLow && <AlertTriangle className="w-3 h-3" />}
                              <span>{product.stock}</span>
                            </span>
                          </td>

                          {/* Total Stock Value */}
                          {canViewCostPrices && (
                            <td className="py-2.5 px-3 text-right font-black text-slate-800 whitespace-nowrap">
                              {stockVal.toLocaleString()} {settings.currency}
                            </td>
                          )}

                          {/* Actions */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => setDetailProduct(product)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                                title="Voir la fiche détaillée"
                              >
                                <Eye className="w-3.5 h-3.5 text-amber-600" />
                              </button>

                              {canManageStock && (
                                <>
                                  <button
                                    onClick={() => setAdjustingProduct(product)}
                                    className="p-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold transition cursor-pointer"
                                    title="Réapprovisionner"
                                  >
                                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                  </button>

                                  <button
                                    onClick={() => setEditingProduct(product)}
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                                    title="Modifier la fiche"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => {
                                      if (window.confirm(`Supprimer ${product.name} ?`)) {
                                        deleteProduct(product.id);
                                      }
                                    }}
                                    className="p-1.5 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition cursor-pointer"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODE 4: CATEGORY GROUPED VIEW (Accordion Sections) */}
          {/* ========================================================================= */}
          {viewMode === 'category_grouped' && (
            <div className="space-y-4">
              {Object.entries(productsByCategory).map(([catName, catProducts]) => {
                const isCollapsed = collapsedCategories[catName] === true;
                const catStockUnits = catProducts.reduce((sum, p) => sum + Math.max(0, p.stock), 0);
                const catStockValue = catProducts.reduce((sum, p) => sum + ((p.price || 0) * Math.max(0, p.stock)), 0);
                const catLowStock = catProducts.filter(p => p.stock <= p.minStockAlert).length;

                return (
                  <div key={catName} className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
                    {/* Category Header Bar */}
                    <div
                      onClick={() => toggleCategoryCollapse(catName)}
                      className="p-3.5 sm:p-4 bg-slate-50 hover:bg-slate-100/80 transition flex items-center justify-between cursor-pointer border-b border-slate-200"
                    >
                      <div className="flex items-center space-x-3">
                        <button className="p-1 text-slate-400 hover:text-slate-700">
                          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <div>
                          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                            <span>{catName}</span>
                            <span className="text-[11px] font-bold px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full">
                              {catProducts.length} articles
                            </span>
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 text-xs">
                        {catLowStock > 0 && (
                          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            {catLowStock} alerte(s)
                          </span>
                        )}
                        <span className="font-semibold text-slate-600">
                          {catStockUnits.toLocaleString()} unités
                        </span>
                        {canViewCostPrices && (
                          <span className="font-black text-emerald-700">
                            {catStockValue.toLocaleString()} {settings.currency}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Category Products Table when expanded */}
                    {!isCollapsed && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-700">
                          <tbody className="divide-y divide-slate-100">
                            {catProducts.map((product) => {
                              const isOut = product.stock <= 0;
                              const isLow = product.stock > 0 && product.stock <= product.minStockAlert;

                              return (
                                <tr
                                  key={product.id}
                                  onClick={() => setDetailProduct(product)}
                                  className="hover:bg-amber-50/40 transition cursor-pointer"
                                >
                                  <td className="py-2.5 px-4 font-bold text-slate-900">
                                    {product.name}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-500">
                                    {product.unit}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-black text-amber-600">
                                    {product.price.toLocaleString()} {settings.currency}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                                        isOut
                                          ? 'bg-red-600 text-white'
                                          : isLow
                                          ? 'bg-amber-500 text-slate-950'
                                          : 'bg-emerald-100 text-emerald-900'
                                      }`}
                                    >
                                      {product.stock}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={() => setDetailProduct(product)}
                                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition mr-1 cursor-pointer"
                                    >
                                      Fiche
                                    </button>
                                    {canManageStock && (
                                      <button
                                        onClick={() => setAdjustingProduct(product)}
                                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-black transition cursor-pointer"
                                      >
                                        + Réappro
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {viewMode !== 'category_grouped' && totalPages > 1 && (
            <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs text-xs font-bold">
              <span className="text-slate-500">
                Page {currentPage} sur {totalPages} ({filteredProducts.length} articles)
              </span>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:pointer-events-none rounded-xl text-slate-700 transition cursor-pointer"
                >
                  Précédent
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    pageNum = currentPage - 2 + i;
                    if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-xl font-black transition cursor-pointer ${
                        currentPage === pageNum
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:pointer-events-none rounded-xl text-slate-700 transition cursor-pointer"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Product Stock Detail Modal */}
      {detailProduct && (
        <ProductStockDetailModal
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
          onEdit={(p) => setEditingProduct(p)}
          onAdjust={(p) => setAdjustingProduct(p)}
        />
      )}

      {/* Inventory Modal */}
      {isInventoryModalOpen && (
        <InventoryModal onClose={() => setIsInventoryModalOpen(false)} />
      )}

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <AddProductModal onClose={() => setIsAddModalOpen(false)} />
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
        />
      )}

      {/* Adjust Stock Modal */}
      {adjustingProduct && (
        <StockAdjustModal
          product={adjustingProduct}
          onClose={() => setAdjustingProduct(null)}
        />
      )}

      {/* Rich Historical Stock Movement Modal */}
      {showHistory && (
        <StockHistoryModal
          stockLogs={stockLogs}
          currency={settings.currency}
          barName={settings.barName}
          onClose={() => setShowHistory(false)}
          onOpenReport={(type) => setReportTypeModal(type)}
        />
      )}

      {/* Smart Inventory Alerts Modal */}
      {isSmartAlertsOpen && (
        <SmartInventoryAlertsModal
          onClose={() => setIsSmartAlertsOpen(false)}
          onOpenInventoryModal={() => setIsInventoryModalOpen(true)}
        />
      )}

      {/* Category Manager Modal */}
      {isCategoryManagerOpen && (
        <CategoryManagerModal onClose={() => setIsCategoryManagerOpen(false)} />
      )}

      {/* Unit Manager Modal */}
      {isUnitManagerOpen && (
        <UnitManagerModal onClose={() => setIsUnitManagerOpen(false)} />
      )}

      {/* Enterprise Custom Report Generator Modal */}
      {reportTypeModal && (
        <EnterpriseReportModal
          defaultReportType={reportTypeModal}
          onClose={() => setReportTypeModal(null)}
        />
      )}

      {/* Barcode & Label Sticker Generator / Printing Modal */}
      {isBarcodeLabelModalOpen && (
        <BarcodeLabelModal
          initialProduct={barcodeModalProduct}
          onClose={() => {
            setIsBarcodeLabelModalOpen(false);
            setBarcodeModalProduct(null);
          }}
        />
      )}

    </div>
  );
};
