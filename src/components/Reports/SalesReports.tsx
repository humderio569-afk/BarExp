import React, { useState, useMemo, useEffect } from 'react';
import { useBar } from '../../context/BarContext';
import { Sale, EnterpriseReportType, PaymentMethod } from '../../types';
import { EnterpriseReportModal } from './EnterpriseReportModal';
import { WeeklySalesTrendsChart } from './WeeklySalesTrendsChart';
import { safeGetItem, safeSetItem } from '../../utils/storage';
import {
  TrendingUp,
  DollarSign,
  Receipt,
  Calendar,
  Printer,
  Award,
  CreditCard,
  Smartphone,
  Banknote,
  Percent,
  LineChart as LineChartIcon,
  Sparkles,
  Download,
  Search,
  ChevronRight,
  ShoppingBag,
  SlidersHorizontal,
  Layers,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  X,
  FileText,
  Wallet,
  ShieldCheck,
  Package,
  CircleDot,
  LayoutGrid,
  Grid3X3,
  ListFilter,
  FolderTree,
  ChevronDown,
  Image as ImageIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Eye,
  Scale,
  Boxes
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

type PeriodPreset = 'today' | 'yesterday' | 'week' | 'month' | 'last_month' | 'quarter' | 'year' | 'last_year' | 'all_time' | 'custom';
type ActiveSection = 'profitability' | 'chart' | 'cash_drawer' | 'transactions';
export type ProfitSortField = 
  | 'marginTotal' 
  | 'unitMarginPercent' 
  | 'unitsSold' 
  | 'multiplier' 
  | 'revenue' 
  | 'unitMargin' 
  | 'sellingPrice' 
  | 'costPrice' 
  | 'name' 
  | 'category';

export type SortDirection = 'asc' | 'desc';
export type FinanceViewMode = 'table_list' | 'visual_grid' | 'compact_grid' | 'category_grouped';

interface EvolutionDataPoint {
  label: string;
  sales: number;
  cogs: number;
  expenses: number;
  netProfit: number;
  tickets: number;
}

export const SalesReports: React.FC = () => {
  const { sales, expenses, settings, products, categories } = useBar();

  // Primary navigation: Focus on Profitability by default as requested
  const [activeSection, setActiveSection] = useState<ActiveSection>('profitability');

  // Date Filtering State
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('today');
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [customStartDate, setCustomStartDate] = useState<string>(todayStr);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Available historical years derived from real recorded data
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(new Date().getFullYear());
    sales.forEach(s => {
      const y = new Date(s.timestamp).getFullYear();
      if (!isNaN(y)) yearsSet.add(y);
    });
    expenses.forEach(e => {
      const y = new Date(e.date).getFullYear();
      if (!isNaN(y)) yearsSet.add(y);
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [sales, expenses]);

  // Profitability View Mode State (Persisted in localStorage) - Default: table_list (Tableur Détaillé)
  const [profitViewMode, setProfitViewMode] = useState<FinanceViewMode>(() => {
    return (safeGetItem('barexpress_finance_view_mode') as FinanceViewMode) || 'table_list';
  });

  const handleSetProfitViewMode = (mode: FinanceViewMode) => {
    setProfitViewMode(mode);
    safeSetItem('barexpress_finance_view_mode', mode);
  };

  const [collapsedProfitCategories, setCollapsedProfitCategories] = useState<Record<string, boolean>>({});
  const toggleProfitCategoryCollapse = (catName: string) => {
    setCollapsedProfitCategories((prev) => ({
      ...prev,
      [catName]: !prev[catName],
    }));
  };

  // Profitability Filters & Sorting
  const [profitSearch, setProfitSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [profitSort, setProfitSort] = useState<ProfitSortField>('marginTotal');
  const [profitSortDirection, setProfitSortDirection] = useState<SortDirection>('desc');
  const [showPedagogyGuide, setShowPedagogyGuide] = useState(false);
  const [profitItemsPerPage, setProfitItemsPerPage] = useState<number>(48);
  const [profitCurrentPage, setProfitCurrentPage] = useState<number>(1);

  const handleProfitSort = (field: ProfitSortField) => {
    if (profitSort === field) {
      // Toggle direction when clicking the active sort field
      setProfitSortDirection(prev => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setProfitSort(field);
      // Sensible default direction: names/categories default to 'asc', numerical financial metrics default to 'desc'
      setProfitSortDirection(field === 'name' || field === 'category' ? 'asc' : 'desc');
    }
  };

  // Transactions Filter
  const [txSearch, setTxSearch] = useState('');
  const [txPaymentFilter, setTxPaymentFilter] = useState<string>('all');
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<Sale | null>(null);

  // Modals
  const [showShiftCloseModal, setShowShiftCloseModal] = useState(false);
  const [enterpriseReportType, setEnterpriseReportType] = useState<EnterpriseReportType | null>(null);

  // Compute Active Date Range
  const { startDate, endDate, periodLabel } = useMemo(() => {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);
    let label = "Aujourd'hui";

    if (periodPreset === 'today') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      label = "Aujourd'hui";
    } else if (periodPreset === 'yesterday') {
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      label = 'Hier';
    } else if (periodPreset === 'week') {
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      label = '7 Derniers Jours';
    } else if (periodPreset === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      label = 'Ce Mois-ci (' + now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) + ')';
    } else if (periodPreset === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      label = 'Mois Précédent (' + start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) + ')';
    } else if (periodPreset === 'quarter') {
      const currentQ = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), currentQ * 3, 1, 0, 0, 0);
      end = new Date(now.getFullYear(), currentQ * 3 + 3, 0, 23, 59, 59, 999);
      label = `Trimestre T${currentQ + 1} ${now.getFullYear()}`;
    } else if (periodPreset === 'year') {
      start = new Date(selectedYear, 0, 1, 0, 0, 0);
      end = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
      label = `Année ${selectedYear}`;
    } else if (periodPreset === 'last_year') {
      const prevYear = now.getFullYear() - 1;
      start = new Date(prevYear, 0, 1, 0, 0, 0);
      end = new Date(prevYear, 11, 31, 23, 59, 59, 999);
      label = `Année ${prevYear}`;
    } else if (periodPreset === 'all_time') {
      start = new Date(2020, 0, 1, 0, 0, 0);
      end = new Date(now.getFullYear() + 1, 11, 31, 23, 59, 59, 999);
      label = 'Historique Complet (Tous les temps)';
    } else {
      const parsedStart = new Date(customStartDate + 'T00:00:00');
      const parsedEnd = new Date(customEndDate + 'T23:59:59');
      start = isNaN(parsedStart.getTime()) ? new Date(0) : parsedStart;
      end = isNaN(parsedEnd.getTime()) ? new Date() : parsedEnd;
      label = `Du ${start.toLocaleDateString('fr-FR')} au ${end.toLocaleDateString('fr-FR')}`;
    }

    return { startDate: start, endDate: end, periodLabel: label };
  }, [periodPreset, customStartDate, customEndDate, selectedYear]);

  // Filter Sales & Expenses within active timeframe
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      if (s.status === 'cancelled') return false;
      const t = new Date(s.timestamp).getTime();
      return t >= startDate.getTime() && t <= endDate.getTime();
    });
  }, [sales, startDate, endDate]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const expDate = new Date(e.date + 'T12:00:00').getTime();
      const startDay = new Date(startDate);
      startDay.setHours(0, 0, 0, 0);
      const endDay = new Date(endDate);
      endDay.setHours(23, 59, 59, 999);
      return expDate >= startDay.getTime() && expDate <= endDay.getTime();
    });
  }, [expenses, startDate, endDate]);

  // Global KPIs Aggregations
  const totalSalesRevenue = useMemo(() => filteredSales.reduce((sum, s) => sum + s.total, 0), [filteredSales]);
  
  const totalCOGS = useMemo(() => {
    return filteredSales.reduce((sum, s) => {
      const saleCost = s.items.reduce((itemSum, item) => {
        const prod = products.find(p => p.id === item.product.id);
        const cost = prod?.costPrice ?? item.product.costPrice ?? 0;
        return itemSum + (cost * item.quantity);
      }, 0);
      return sum + saleCost;
    }, 0);
  }, [filteredSales, products]);

  const totalExpenses = useMemo(() => filteredExpenses.reduce((sum, e) => sum + e.amount, 0), [filteredExpenses]);
  const grossProfit = totalSalesRevenue - totalCOGS;
  const netProfit = grossProfit - totalExpenses;
  const grossMarginPercent = totalSalesRevenue > 0 ? (grossProfit / totalSalesRevenue) * 100 : 0;
  const cogsPercent = totalSalesRevenue > 0 ? (totalCOGS / totalSalesRevenue) * 100 : 0;
  const netMarginPercent = totalSalesRevenue > 0 ? (netProfit / totalSalesRevenue) * 100 : 0;
  const averageTicket = filteredSales.length > 0 ? totalSalesRevenue / filteredSales.length : 0;

  // Breakdown by Payment Method
  const paymentAnalytics = useMemo(() => {
    const methods: PaymentMethod[] = ['Espèces', 'MonCash', 'Carte', 'Crédit Client'];
    return methods.map(method => {
      const salesForMethod = filteredSales.filter(s => s.paymentMethod === method);
      const totalAmount = salesForMethod.reduce((sum, s) => sum + s.total, 0);
      const count = salesForMethod.length;
      const share = totalSalesRevenue > 0 ? (totalAmount / totalSalesRevenue) * 100 : 0;
      const expensesForMethod = filteredExpenses.filter(e => e.paymentMethod === method).reduce((sum, e) => sum + e.amount, 0);
      const netCashBalance = method === 'Espèces' ? totalAmount - expensesForMethod : totalAmount;

      let color = '#f59e0b';
      let icon = Banknote;
      if (method === 'MonCash') { color = '#dc2626'; icon = Smartphone; }
      if (method === 'Carte') { color = '#2563eb'; icon = CreditCard; }
      if (method === 'Crédit Client') { color = '#9333ea'; icon = Calendar; }

      return {
        method,
        totalAmount,
        count,
        share,
        expensesForMethod,
        netCashBalance,
        color,
        icon
      };
    });
  }, [filteredSales, filteredExpenses, totalSalesRevenue]);

  const cashExpectedInDrawer = useMemo(() => {
    const cashItem = paymentAnalytics.find(p => p.method === 'Espèces');
    return cashItem ? cashItem.netCashBalance : 0;
  }, [paymentAnalytics]);

  // Product Profitability Analysis Engine
  const productProfitabilityList = useMemo(() => {
    const map = new Map<string, {
      id: string;
      name: string;
      category: string;
      image?: string;
      unit?: string;
      sellingPrice: number;
      costPrice: number;
      unitMargin: number;
      unitMarginPercent: number;
      multiplier: number;
      unitsSold: number;
      revenue: number;
      cogs: number;
      marginTotal: number;
    }>();

    // Map all active products
    products.forEach(p => {
      const cost = p.costPrice || 0;
      const unitMargin = p.price - cost;
      const unitMarginPercent = p.price > 0 ? (unitMargin / p.price) * 100 : 0;
      const multiplier = cost > 0 ? p.price / cost : (p.price > 0 ? 99 : 0);

      map.set(p.id, {
        id: p.id,
        name: p.name,
        category: p.category || 'Boisson',
        image: p.image,
        unit: p.unit,
        sellingPrice: p.price,
        costPrice: cost,
        unitMargin,
        unitMarginPercent,
        multiplier,
        unitsSold: 0,
        revenue: 0,
        cogs: 0,
        marginTotal: 0
      });
    });

    // Aggregate sold products in timeframe
    filteredSales.forEach(s => {
      s.items.forEach(item => {
        const prodId = item.product.id;
        const qty = item.quantity;
        const unitPrice = item.product.price - item.discount;
        const unitCost = item.product.costPrice || 0;
        const itemRev = unitPrice * qty;
        const itemCost = unitCost * qty;
        const itemMargin = itemRev - itemCost;

        const existing = map.get(prodId);
        if (existing) {
          existing.unitsSold += qty;
          existing.revenue += itemRev;
          existing.cogs += itemCost;
          existing.marginTotal += itemMargin;
        } else {
          // Fallback if deleted product
          map.set(prodId, {
            id: prodId,
            name: item.product.name,
            category: item.product.category || 'Boisson',
            image: item.product.image,
            unit: item.product.unit,
            sellingPrice: item.product.price,
            costPrice: unitCost,
            unitMargin: item.product.price - unitCost,
            unitMarginPercent: item.product.price > 0 ? ((item.product.price - unitCost) / item.product.price) * 100 : 0,
            multiplier: unitCost > 0 ? item.product.price / unitCost : 0,
            unitsSold: qty,
            revenue: itemRev,
            cogs: itemCost,
            marginTotal: itemMargin
          });
        }
      });
    });

    return Array.from(map.values());
  }, [products, filteredSales]);

  // Filtered & Sorted Product Profitability
  const filteredProfitabilityList = useMemo(() => {
    let list = [...productProfitabilityList];

    if (selectedCategory !== 'all') {
      list = list.filter(p => p.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    if (profitSearch.trim()) {
      const q = profitSearch.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    }

    return list.sort((a, b) => {
      let comparison = 0;
      switch (profitSort) {
        case 'marginTotal':
          comparison = (b.marginTotal || 0) - (a.marginTotal || 0);
          break;
        case 'unitMarginPercent':
          comparison = (b.unitMarginPercent || 0) - (a.unitMarginPercent || 0);
          break;
        case 'unitsSold':
          comparison = (b.unitsSold || 0) - (a.unitsSold || 0);
          break;
        case 'multiplier':
          comparison = (b.multiplier || 0) - (a.multiplier || 0);
          break;
        case 'revenue':
          comparison = (b.revenue || 0) - (a.revenue || 0);
          break;
        case 'unitMargin':
          comparison = (b.unitMargin || 0) - (a.unitMargin || 0);
          break;
        case 'sellingPrice':
          comparison = (b.sellingPrice || 0) - (a.sellingPrice || 0);
          break;
        case 'costPrice':
          comparison = (b.costPrice || 0) - (a.costPrice || 0);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category, 'fr', { sensitivity: 'base' });
          break;
        default:
          comparison = (b.marginTotal || 0) - (a.marginTotal || 0);
      }

      // If comparing text (name / category), default is A-Z (asc)
      if (profitSort === 'name' || profitSort === 'category') {
        return profitSortDirection === 'asc' ? comparison : -comparison;
      }

      // For numbers, default comparison is b - a (descending)
      return profitSortDirection === 'desc' ? comparison : -comparison;
    });
  }, [productProfitabilityList, selectedCategory, profitSearch, profitSort, profitSortDirection]);

  // Grouping by category for category_grouped view mode
  const profitabilityByCategory = useMemo(() => {
    const groups: Record<string, typeof filteredProfitabilityList> = {};
    filteredProfitabilityList.forEach((p) => {
      const cat = p.category || 'Autres';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  }, [filteredProfitabilityList]);

  // Aggregated totals across all filtered products for the table footer summary
  const profitSummaryTotals = useMemo(() => {
    const totalUnitsSold = filteredProfitabilityList.reduce((sum, p) => sum + p.unitsSold, 0);
    const totalRevenue = filteredProfitabilityList.reduce((sum, p) => sum + p.revenue, 0);
    const totalCOGS = filteredProfitabilityList.reduce((sum, p) => sum + p.cogs, 0);
    const totalGrossProfit = filteredProfitabilityList.reduce((sum, p) => sum + p.marginTotal, 0);
    const avgMarginPercent = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;
    return { totalUnitsSold, totalRevenue, totalCOGS, totalGrossProfit, avgMarginPercent };
  }, [filteredProfitabilityList]);

  // Reset page when filters change
  useEffect(() => {
    setProfitCurrentPage(1);
  }, [profitSearch, selectedCategory, profitSort, profitSortDirection, profitItemsPerPage]);

  const paginatedProfitabilityList = useMemo(() => {
    if (profitItemsPerPage === 0 || profitViewMode === 'category_grouped') return filteredProfitabilityList;
    const startIndex = (profitCurrentPage - 1) * profitItemsPerPage;
    return filteredProfitabilityList.slice(startIndex, startIndex + profitItemsPerPage);
  }, [filteredProfitabilityList, profitCurrentPage, profitItemsPerPage, profitViewMode]);

  const totalProfitPages = profitItemsPerPage > 0 ? Math.ceil(filteredProfitabilityList.length / profitItemsPerPage) : 1;

  // Single, Clear, High-Impact Evolution Curve Data (Eliminates Redundant Charts)
  const evolutionChartData: EvolutionDataPoint[] = useMemo(() => {
    const diffDays = (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24);

    if (diffDays <= 1.5) {
      // 24-hour breakdown for today / yesterday
      const hoursMap: Record<number, EvolutionDataPoint> = {};
      for (let h = 0; h < 24; h++) {
        hoursMap[h] = { label: `${h}h`, sales: 0, cogs: 0, expenses: 0, netProfit: 0, tickets: 0 };
      }
      filteredSales.forEach(s => {
        const h = new Date(s.timestamp).getHours();
        if (hoursMap[h]) {
          hoursMap[h].sales += s.total;
          hoursMap[h].tickets += 1;
          const cost = s.items.reduce((sum, i) => sum + ((i.product.costPrice || 0) * i.quantity), 0);
          hoursMap[h].cogs += cost;
        }
      });
      return Object.values(hoursMap).map(d => ({ ...d, netProfit: d.sales - d.cogs - d.expenses }));
    } else if (diffDays <= 32) {
      // Day by day
      const dayMap: Record<string, EvolutionDataPoint> = {};
      const curr = new Date(startDate);
      curr.setHours(0, 0, 0, 0);
      const endLimit = new Date(endDate);
      endLimit.setHours(23, 59, 59, 999);

      while (curr <= endLimit) {
        const dStr = curr.toISOString().split('T')[0];
        const dayLabel = curr.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        dayMap[dStr] = { label: dayLabel, sales: 0, cogs: 0, expenses: 0, netProfit: 0, tickets: 0 };
        curr.setDate(curr.getDate() + 1);
      }

      filteredSales.forEach(s => {
        const d = s.timestamp.split('T')[0];
        if (dayMap[d]) {
          dayMap[d].sales += s.total;
          dayMap[d].tickets += 1;
          const cost = s.items.reduce((sum, i) => sum + ((i.product.costPrice || 0) * i.quantity), 0);
          dayMap[d].cogs += cost;
        }
      });

      filteredExpenses.forEach(e => {
        if (dayMap[e.date]) {
          dayMap[e.date].expenses += e.amount;
        }
      });

      return Object.values(dayMap).map(d => ({ ...d, netProfit: d.sales - d.cogs - d.expenses }));
    } else {
      // Month by month (chronologically sorted)
      const monthMap: Record<string, EvolutionDataPoint> = {};
      filteredSales.forEach(s => {
        const m = s.timestamp.substring(0, 7);
        const [year, month] = m.split('-');
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
        const label = dateObj.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
        if (!monthMap[m]) {
          monthMap[m] = { label, sales: 0, cogs: 0, expenses: 0, netProfit: 0, tickets: 0 };
        }
        monthMap[m].sales += s.total;
        monthMap[m].tickets += 1;
        const cost = s.items.reduce((sum, i) => sum + ((i.product.costPrice || 0) * i.quantity), 0);
        monthMap[m].cogs += cost;
      });

      filteredExpenses.forEach(e => {
        const m = e.date.substring(0, 7);
        if (monthMap[m]) monthMap[m].expenses += e.amount;
      });

      return Object.keys(monthMap)
        .sort()
        .map(m => ({ ...monthMap[m], netProfit: monthMap[m].sales - monthMap[m].cogs - monthMap[m].expenses }));
    }
  }, [filteredSales, filteredExpenses, startDate, endDate]);

  // CSV Export
  const exportFinancesCSV = () => {
    const headers = ['Type', 'Date', 'Reference_ou_Nom', 'Quantite', 'Montant_Total', 'Cout_Matiere', 'Marge_Dégagée', 'Mode_Paiement'];
    const rows: any[] = [];

    filteredSales.forEach(s => {
      s.items.forEach(i => {
        const cost = (i.product.costPrice || 0) * i.quantity;
        const rev = (i.product.price - i.discount) * i.quantity;
        rows.push(['VENTE', s.timestamp, i.product.name, i.quantity, rev, cost, rev - cost, s.paymentMethod]);
      });
    });

    filteredExpenses.forEach(e => {
      rows.push(['DEPENSE', e.date, e.description, 1, -e.amount, 0, -e.amount, e.paymentMethod]);
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.map((c: any) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Finance_${settings.barName}_${startDate.toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-3 sm:p-5 lg:p-7 max-w-7xl mx-auto space-y-5 text-slate-900 animate-fadeIn pb-28 md:pb-12 overflow-x-hidden">
      
      {/* Top Header Card with Warm Visual Tone & Soft Shadows */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 text-white p-4 sm:p-6 rounded-3xl shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 z-10">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-black tracking-tight text-white">
                  Marges, Rentabilité & Finances
                </h1>
                <span className="bg-amber-400/20 text-amber-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-amber-400/30">
                  {periodLabel}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Suivi précis des gains réels, bénéfice par bouteille/cocktail et analyse rétrospective sur de longues périodes.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 z-10">
          <button
            onClick={() => setEnterpriseReportType('consolidated_financial')}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-amber-300 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition cursor-pointer border border-white/10 active:scale-95"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Rapport PDF</span>
          </button>

          <button
            onClick={exportFinancesCSV}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition cursor-pointer border border-white/10"
            title="Exporter en CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-300" />
            <span>CSV</span>
          </button>

          <button
            onClick={() => setShowShiftCloseModal(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center space-x-1.5 transition cursor-pointer active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Z-Report</span>
          </button>
        </div>
      </div>

      {/* Interactive Period Filter (Supports multi-year retrospective analysis) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
            {[
              { id: 'today', label: "Aujourd'hui" },
              { id: 'yesterday', label: 'Hier' },
              { id: 'week', label: '7 Jours' },
              { id: 'month', label: 'Ce Mois' },
              { id: 'last_month', label: 'Mois Précédent' },
              { id: 'quarter', label: 'Ce Trimestre' },
              { id: 'year', label: 'Année' },
              { id: 'last_year', label: 'Année Précédente' },
              { id: 'all_time', label: 'Historique Complet' },
              { id: 'custom', label: 'Période Libre' },
            ].map(preset => {
              const isActive = periodPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => setPeriodPreset(preset.id as PeriodPreset)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
            {periodPreset === 'year' && (
              <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-xl text-xs">
                <span className="font-bold text-slate-500">Année :</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-transparent font-black text-slate-900 focus:outline-none cursor-pointer"
                >
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center space-x-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="font-semibold text-slate-700">
                {periodPreset === 'all_time' ? 'Depuis le 1er enregistrement' : `${startDate.toLocaleDateString('fr-FR')} - ${endDate.toLocaleDateString('fr-FR')}`}
              </span>
            </div>
          </div>
        </div>

        {periodPreset === 'custom' && (
          <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-3 animate-fadeIn">
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-slate-600">Date Début :</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-slate-600">Date Fin :</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* ================= RE-DESIGNED 4 RICH KPI CARDS (Warm, Borderless, Expressive Icons) ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* 1. Chiffre d'Affaires - Warm Amber */}
        <div className="bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-white p-4 sm:p-5 rounded-3xl shadow-xs space-y-2 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-950 uppercase tracking-wider">Chiffre d'Affaires</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
              <DollarSign className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {totalSalesRevenue.toLocaleString()} <span className="text-xs font-bold text-amber-800">{settings.currency}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-600 mt-1">
              <span>{filteredSales.length} ticket(s)</span>
              <span className="font-bold text-slate-800">Panier: {averageTicket.toFixed(0)} {settings.currency}</span>
            </div>
          </div>
        </div>

        {/* 2. Coût Matière (COGS) - Modern Slate */}
        <div className="bg-gradient-to-br from-slate-100 via-slate-50 to-white p-4 sm:p-5 rounded-3xl shadow-xs space-y-2 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Coût d'Achat (COGS)</span>
            <div className="w-9 h-9 rounded-2xl bg-slate-800 text-white flex items-center justify-center shadow-xs">
              <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {totalCOGS.toLocaleString()} <span className="text-xs font-bold text-slate-500">{settings.currency}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-600 mt-1">
              <span>Ratio Matière</span>
              <span className="font-bold text-slate-900">{cogsPercent.toFixed(1)}% du CA</span>
            </div>
          </div>
        </div>

        {/* 3. Marge Brute Globale - Emerald Glow */}
        <div className="bg-gradient-to-br from-emerald-500/20 via-emerald-500/5 to-white p-4 sm:p-5 rounded-3xl shadow-xs space-y-2 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-950 uppercase tracking-wider">Marge Brute Dégagée</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Percent className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-800 tracking-tight">
              +{grossProfit.toLocaleString()} <span className="text-xs font-bold text-emerald-600">{settings.currency}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-emerald-900 mt-1 font-semibold">
              <span>Taux de marge brute</span>
              <span className="font-black bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full text-[10px]">
                {grossMarginPercent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* 4. Bénéfice Net Réel - Deep Emerald Forest */}
        <div className={`p-4 sm:p-5 rounded-3xl shadow-sm text-white space-y-2 relative overflow-hidden flex flex-col justify-between ${
          netProfit >= 0 ? 'bg-gradient-to-br from-emerald-700 to-teal-800' : 'bg-gradient-to-br from-red-600 to-rose-700'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-100">Bénéfice Net Réel</span>
            <div className="w-9 h-9 rounded-2xl bg-white/20 text-white flex items-center justify-center backdrop-blur-xs">
              <TrendingUp className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white tracking-tight">
              {netProfit >= 0 ? `+${netProfit.toLocaleString()}` : netProfit.toLocaleString()} <span className="text-xs font-bold text-emerald-200">{settings.currency}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-emerald-100 mt-1">
              <span>Charges déduites : {totalExpenses.toLocaleString()} {settings.currency}</span>
              <span className="font-black bg-white/20 px-2 py-0.5 rounded-full text-[10px]">{netMarginPercent.toFixed(1)}% net</span>
            </div>
          </div>
        </div>

      </div>

      {/* ================= INTUITIVE VIEW CHOOSER (Visible at first glance on mobile & desktop) ================= */}
      <div className="bg-white p-2.5 rounded-2xl shadow-xs space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-1">
            {[
              {
                id: 'profitability',
                label: '💎 Rentabilité & Marges',
                badge: `${filteredProfitabilityList.length}`,
                highlight: true
              },
              {
                id: 'chart',
                label: '📈 Tendances & Courbes Hebdo',
                badge: 'Recharts',
                highlight: false
              },
              {
                id: 'cash_drawer',
                label: '💳 Caisse & Coffre',
                badge: `${cashExpectedInDrawer.toLocaleString()}`,
                highlight: false
              },
              {
                id: 'transactions',
                label: '🧾 Journal Ventes',
                badge: `${filteredSales.length}`,
                highlight: false
              },
            ].map(tab => {
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id as ActiveSection)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-between gap-1.5 text-left ${
                    isActive
                      ? tab.highlight 
                        ? 'bg-amber-500 text-slate-950 shadow-xs' 
                        : 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="truncate">{tab.label}</span>
                  {tab.badge && (
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full shrink-0 ${
                      isActive ? 'bg-black/15 text-slate-950' : 'bg-slate-200/80 text-slate-700'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Pedagogy button for Profitability */}
          {activeSection === 'profitability' && (
            <button
              onClick={() => setShowPedagogyGuide(!showPedagogyGuide)}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 cursor-pointer transition shrink-0 self-start sm:self-auto border border-amber-200/50"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Comprendre les calculs</span>
            </button>
          )}
        </div>
      </div>

      {/* ================= SECTION 1: RENTABILITÉ & MARGES (CORE POWERHOUSE) ================= */}
      {activeSection === 'profitability' && (
        <div className="space-y-4">

          {/* Educational Explainer Banner (Toggleable) */}
          {showPedagogyGuide && (
            <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-4 sm:p-5 rounded-3xl border border-amber-200/60 shadow-xs space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs">
                    %
                  </div>
                  <h3 className="text-xs sm:text-sm font-black text-amber-950">
                    Guide Visuel : Comment lire et maximiser vos marges
                  </h3>
                </div>
                <button
                  onClick={() => setShowPedagogyGuide(false)}
                  className="p-1 text-amber-700 hover:text-amber-900 rounded-full cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-amber-950">
                <div className="p-3 bg-white/80 rounded-2xl shadow-2xs space-y-1">
                  <span className="font-extrabold text-amber-900 block">💰 1. Marge Unitaire (Bénéfice Net/Unité)</span>
                  <p className="text-[11px] text-slate-600">
                    <strong>Prix de Vente - Coût d'Achat</strong>.<br />
                    Exemple : Cocktail vendu 500 G avec un coût de revient de 150 G = <strong className="text-emerald-700">+350 G de gain net</strong> par verre servi.
                  </p>
                </div>

                <div className="p-3 bg-white/80 rounded-2xl shadow-2xs space-y-1">
                  <span className="font-extrabold text-emerald-900 block">🎯 2. Taux de Marge (%)</span>
                  <p className="text-[11px] text-slate-600">
                    Part du prix qui reste dans vos poches. Plus le % est élevé, plus le produit est rentable.<br />
                    <span className="text-emerald-700 font-bold">&gt;65% = Excellent</span> • <span className="text-amber-700 font-bold">45-65% = Bon</span> • <span className="text-red-600 font-bold">&lt;45% = Faible</span>.
                  </p>
                </div>

                <div className="p-3 bg-white/80 rounded-2xl shadow-2xs space-y-1">
                  <span className="font-extrabold text-indigo-900 block">🚀 3. Coefficient Multiplicateur (x...)</span>
                  <p className="text-[11px] text-slate-600">
                    Par combien vous multipliez votre coût d'achat. Un produit acheté 100 G et vendu 350 G a un coefficient de <strong>x3.5</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Filtering, Search, Sorting & VIEW MODE Controls */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-xs space-y-3">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={profitSearch}
                  onChange={(e) => setProfitSearch(e.target.value)}
                  placeholder="Rechercher un produit, cocktail, bière..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              {/* DISPLAY MODES SELECTOR (4 Distinct Views) - Same as Stock Screen */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto overflow-x-auto shrink-0 max-w-full">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 hidden sm:inline">
                  Affichage :
                </span>

                {/* Mode 1: Table / List View (Full Detailed Spreadsheet) - DEFAULT */}
                <button
                  type="button"
                  onClick={() => handleSetProfitViewMode('table_list')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                    profitViewMode === 'table_list'
                      ? 'bg-white text-slate-950 shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Vue Tableur Détaillée avec coûts, prix de vente, marges unitaires et gains totaux"
                >
                  <ListFilter className="w-3.5 h-3.5 text-amber-600" />
                  <span>Tableur Détaillé</span>
                </button>

                {/* Mode 2: Visual Grid (Standard cards with image & visual bars) */}
                <button
                  type="button"
                  onClick={() => handleSetProfitViewMode('visual_grid')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                    profitViewMode === 'visual_grid'
                      ? 'bg-white text-slate-950 shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Grille Visuelle avec photos et jauges de rentabilité"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-amber-600" />
                  <span>Grille Visuelle</span>
                </button>

                {/* Mode 3: Compact Grid (Dense tiles for fast analysis) */}
                <button
                  type="button"
                  onClick={() => handleSetProfitViewMode('compact_grid')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                    profitViewMode === 'compact_grid'
                      ? 'bg-white text-slate-950 shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Grille Compacte haute densité"
                >
                  <Grid3X3 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Grille Compacte</span>
                </button>

                {/* Mode 4: Category Grouped View */}
                <button
                  type="button"
                  onClick={() => handleSetProfitViewMode('category_grouped')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                    profitViewMode === 'category_grouped'
                      ? 'bg-white text-slate-950 shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Regroupement par catégorie avec sous-totaux de rentabilité"
                >
                  <FolderTree className="w-3.5 h-3.5 text-amber-600" />
                  <span>Par Catégorie</span>
                </button>
              </div>

              {/* Sorting Switcher - Fully visible buttons with active direction arrow and click-to-reverse */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider shrink-0 mr-1">Trier :</span>
                {[
                  { id: 'marginTotal', label: 'Plus gros gain total' },
                  { id: 'unitMarginPercent', label: 'Meilleur taux %' },
                  { id: 'unitsSold', label: 'Plus vendus' },
                  { id: 'multiplier', label: 'Coefficient' },
                  { id: 'revenue', label: 'Chiffre d\'affaires' },
                  { id: 'unitMargin', label: 'Marge unitaire' },
                ].map(sortOption => {
                  const isActive = profitSort === sortOption.id;
                  return (
                    <button
                      key={sortOption.id}
                      onClick={() => handleProfitSort(sortOption.id as ProfitSortField)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                        isActive
                          ? 'bg-slate-900 text-amber-400 font-black shadow-xs ring-1 ring-amber-400/30'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      title={`Trier par ${sortOption.label} (${
                        isActive 
                          ? (profitSortDirection === 'desc' ? 'Ordre décroissant - Cliquer pour inverser' : 'Ordre croissant - Cliquer pour inverser')
                          : 'Cliquer pour trier'
                      })`}
                    >
                      <span>{sortOption.label}</span>
                      {isActive ? (
                        profitSortDirection === 'desc' ? (
                          <ArrowDown className="w-3 h-3 text-amber-400 shrink-0" />
                        ) : (
                          <ArrowUp className="w-3 h-3 text-amber-400 shrink-0" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category Filter Chips - Wrapped and visible at first glance */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider mr-1">Catégorie :</span>
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  selectedCategory === 'all'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Toutes ({products.length})
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat.name
                      ? 'bg-amber-500 text-slate-950 font-black shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Pagination & Count Meta bar when not grouped */}
            {profitViewMode !== 'category_grouped' && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                <div>
                  Affichage de <span className="font-bold text-slate-900">{filteredProfitabilityList.length}</span> produit(s) analysé(s)
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-400">Articles / page :</span>
                  <select
                    value={profitItemsPerPage}
                    onChange={(e) => setProfitItemsPerPage(Number(e.target.value))}
                    aria-label="Nombre d'articles par page"
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value={24}>24</option>
                    <option value={48}>48</option>
                    <option value={96}>96</option>
                    <option value={0}>Tous</option>
                  </select>

                  {profitItemsPerPage > 0 && totalProfitPages > 1 && (
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        type="button"
                        disabled={profitCurrentPage === 1}
                        onClick={() => setProfitCurrentPage((p) => Math.max(1, p - 1))}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-md font-bold text-slate-700 cursor-pointer"
                      >
                        Préc.
                      </button>
                      <span className="font-black text-slate-800 px-1">
                        {profitCurrentPage} / {totalProfitPages}
                      </span>
                      <button
                        type="button"
                        disabled={profitCurrentPage === totalProfitPages}
                        onClick={() => setProfitCurrentPage((p) => Math.min(totalProfitPages, p + 1))}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-md font-bold text-slate-700 cursor-pointer"
                      >
                        Suiv.
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ================= MODE 1: TABLEUR DÉTAILLÉ (DEFAULT VIEW) ================= */}
          {profitViewMode === 'table_list' && (
            <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider select-none">
                    <tr>
                      {/* Article & Référence */}
                      <th 
                        onClick={() => handleProfitSort('name')}
                        className={`py-3 px-3 cursor-pointer hover:bg-slate-100/80 transition ${
                          profitSort === 'name' ? 'bg-amber-50/70 text-amber-950 font-black' : ''
                        }`}
                        title="Trier par Nom d'article"
                      >
                        <div className="flex items-center space-x-1">
                          <span>Article & Référence</span>
                          {profitSort === 'name' ? (
                            profitSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-600 shrink-0" /> : <ArrowDown className="w-3 h-3 text-amber-600 shrink-0" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-40 shrink-0" />
                          )}
                        </div>
                      </th>

                      {/* Catégorie */}
                      <th 
                        onClick={() => handleProfitSort('category')}
                        className={`py-3 px-3 cursor-pointer hover:bg-slate-100/80 transition ${
                          profitSort === 'category' ? 'bg-amber-50/70 text-amber-950 font-black' : ''
                        }`}
                        title="Trier par Catégorie"
                      >
                        <div className="flex items-center space-x-1">
                          <span>Catégorie</span>
                          {profitSort === 'category' ? (
                            profitSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-600 shrink-0" /> : <ArrowDown className="w-3 h-3 text-amber-600 shrink-0" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-40 shrink-0" />
                          )}
                        </div>
                      </th>

                      <th className="py-3 px-3 text-center">Unité</th>

                      {/* Coût Achat */}
                      <th 
                        onClick={() => handleProfitSort('costPrice')}
                        className={`py-3 px-3 text-right cursor-pointer hover:bg-slate-100/80 transition ${
                          profitSort === 'costPrice' ? 'bg-amber-50/70 text-amber-950 font-black' : ''
                        }`}
                        title="Trier par Coût d'achat"
                      >
                        <div className="flex items-center justify-end space-x-1">
                          <span>Coût Achat (COGS)</span>
                          {profitSort === 'costPrice' ? (
                            profitSortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-amber-600 shrink-0" /> : <ArrowUp className="w-3 h-3 text-amber-600 shrink-0" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-40 shrink-0" />
                          )}
                        </div>
                      </th>

                      {/* Prix Vente */}
                      <th 
                        onClick={() => handleProfitSort('sellingPrice')}
                        className={`py-3 px-3 text-right cursor-pointer hover:bg-slate-100/80 transition ${
                          profitSort === 'sellingPrice' ? 'bg-amber-50/70 text-amber-950 font-black' : ''
                        }`}
                        title="Trier par Prix de vente"
                      >
                        <div className="flex items-center justify-end space-x-1">
                          <span>Prix Vente (TTC)</span>
                          {profitSort === 'sellingPrice' ? (
                            profitSortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-amber-600 shrink-0" /> : <ArrowUp className="w-3 h-3 text-amber-600 shrink-0" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-40 shrink-0" />
                          )}
                        </div>
                      </th>

                      {/* Marge Unitaire */}
                      <th 
                        onClick={() => handleProfitSort('unitMargin')}
                        className={`py-3 px-3 text-right cursor-pointer hover:bg-slate-100/80 transition ${
                          profitSort === 'unitMargin' ? 'bg-amber-50/70 text-amber-950 font-black' : ''
                        }`}
                        title="Trier par Marge unitaire"
                      >
                        <div className="flex items-center justify-end space-x-1">
                          <span>Marge Unitaire</span>
                          {profitSort === 'unitMargin' ? (
                            profitSortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-amber-600 shrink-0" /> : <ArrowUp className="w-3 h-3 text-amber-600 shrink-0" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-40 shrink-0" />
                          )}
                        </div>
                      </th>

                      {/* Taux Marge % */}
                      <th 
                        onClick={() => handleProfitSort('unitMarginPercent')}
                        className={`py-3 px-3 text-center cursor-pointer hover:bg-slate-100/80 transition ${
                          profitSort === 'unitMarginPercent' ? 'bg-amber-50/70 text-amber-950 font-black' : ''
                        }`}
                        title="Trier par Meilleur taux de marge %"
                      >
                        <div className="flex items-center justify-center space-x-1">
                          <span>Taux Marge %</span>
                          {profitSort === 'unitMarginPercent' ? (
                            profitSortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-amber-600 shrink-0" /> : <ArrowUp className="w-3 h-3 text-amber-600 shrink-0" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-40 shrink-0" />
                          )}
                        </div>
                      </th>

                      {/* Coefficient */}
                      <th 
                        onClick={() => handleProfitSort('multiplier')}
                        className={`py-3 px-3 text-center cursor-pointer hover:bg-slate-100/80 transition ${
                          profitSort === 'multiplier' ? 'bg-amber-50/70 text-amber-950 font-black' : ''
                        }`}
                        title="Trier par Coefficient multiplicateur"
                      >
                        <div className="flex items-center justify-center space-x-1">
                          <span>Coefficient</span>
                          {profitSort === 'multiplier' ? (
                            profitSortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-amber-600 shrink-0" /> : <ArrowUp className="w-3 h-3 text-amber-600 shrink-0" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-40 shrink-0" />
                          )}
                        </div>
                      </th>

                      {/* Vendus */}
                      <th 
                        onClick={() => handleProfitSort('unitsSold')}
                        className={`py-3 px-3 text-center cursor-pointer hover:bg-slate-100/80 transition ${
                          profitSort === 'unitsSold' ? 'bg-amber-50/70 text-amber-950 font-black' : ''
                        }`}
                        title="Trier par Quantité vendue"
                      >
                        <div className="flex items-center justify-center space-x-1">
                          <span>Vendus ({periodLabel})</span>
                          {profitSort === 'unitsSold' ? (
                            profitSortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-amber-600 shrink-0" /> : <ArrowUp className="w-3 h-3 text-amber-600 shrink-0" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-40 shrink-0" />
                          )}
                        </div>
                      </th>

                      {/* Chiffre d'Affaires */}
                      <th 
                        onClick={() => handleProfitSort('revenue')}
                        className={`py-3 px-3 text-right cursor-pointer hover:bg-slate-100/80 transition ${
                          profitSort === 'revenue' ? 'bg-amber-50/70 text-amber-950 font-black' : ''
                        }`}
                        title="Trier par Chiffre d'affaires"
                      >
                        <div className="flex items-center justify-end space-x-1">
                          <span>Chiffre d'Affaires</span>
                          {profitSort === 'revenue' ? (
                            profitSortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-amber-600 shrink-0" /> : <ArrowUp className="w-3 h-3 text-amber-600 shrink-0" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-40 shrink-0" />
                          )}
                        </div>
                      </th>

                      {/* Gain Total Réalisé */}
                      <th 
                        onClick={() => handleProfitSort('marginTotal')}
                        className={`py-3 px-3 text-right cursor-pointer hover:bg-slate-100/80 transition ${
                          profitSort === 'marginTotal' ? 'bg-amber-50/70 text-amber-950 font-black' : ''
                        }`}
                        title="Trier par Gain total réalisé"
                      >
                        <div className="flex items-center justify-end space-x-1">
                          <span>Gain Total Réalisé</span>
                          {profitSort === 'marginTotal' ? (
                            profitSortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-amber-600 shrink-0" /> : <ArrowUp className="w-3 h-3 text-amber-600 shrink-0" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-40 shrink-0" />
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {paginatedProfitabilityList.map((item) => {
                      const isHighMargin = item.unitMarginPercent >= 65;
                      const isModerateMargin = item.unitMarginPercent >= 45 && item.unitMarginPercent < 65;
                      const hasSold = item.unitsSold > 0;

                      return (
                        <tr key={item.id} className="hover:bg-amber-50/40 transition">
                          {/* Article Name & Thumbnail */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 overflow-hidden font-black text-xs">
                                {item.image ? (
                                  <img
                                    src={item.image}
                                    alt={item.name}
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
                                  {item.name}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                              {item.category}
                            </span>
                          </td>

                          {/* Unit */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className="font-semibold text-slate-600 text-xs">
                              {item.unit || 'u.'}
                            </span>
                          </td>

                          {/* Cost Price */}
                          <td className="py-2.5 px-3 text-right font-medium text-slate-600 whitespace-nowrap">
                            {item.costPrice.toLocaleString()} {settings.currency}
                          </td>

                          {/* Selling Price */}
                          <td className="py-2.5 px-3 text-right font-black text-amber-600 whitespace-nowrap">
                            {item.sellingPrice.toLocaleString()} {settings.currency}
                          </td>

                          {/* Unit Margin */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <span className="font-black text-emerald-700">
                              +{item.unitMargin.toLocaleString()} {settings.currency}
                            </span>
                          </td>

                          {/* Unit Margin % with Badge & Mini Progress Bar */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <div className="inline-flex flex-col items-center">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                isHighMargin
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                  : isModerateMargin
                                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                  : 'bg-red-100 text-red-900 border border-red-200'
                              }`}>
                                {item.unitMarginPercent.toFixed(0)}%
                              </span>
                              <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
                                <div
                                  className={`h-full ${
                                    isHighMargin ? 'bg-emerald-500' : isModerateMargin ? 'bg-amber-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(5, item.unitMarginPercent))}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Multiplier */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                              {item.multiplier > 0 ? `x${item.multiplier.toFixed(1)}` : '-'}
                            </span>
                          </td>

                          {/* Units Sold in Timeframe */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className={`font-black text-xs ${hasSold ? 'text-slate-900' : 'text-slate-400'}`}>
                              {item.unitsSold}
                            </span>
                          </td>

                          {/* Generated Revenue */}
                          <td className="py-2.5 px-3 text-right font-bold text-slate-800 whitespace-nowrap">
                            {item.revenue.toLocaleString()} {settings.currency}
                          </td>

                          {/* Total Margin Realized */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <span className={`font-black text-xs ${hasSold ? 'text-emerald-700' : 'text-slate-400'}`}>
                              {hasSold ? `+${item.marginTotal.toLocaleString()} ${settings.currency}` : '0 ' + settings.currency}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200 text-xs font-black text-slate-900">
                    <tr>
                      <td colSpan={3} className="py-3.5 px-3">
                        Total ({filteredProfitabilityList.length} articles)
                      </td>
                      <td colSpan={3} className="py-3.5 px-3 text-right text-slate-500 text-[11px]">
                        Taux moyen global :
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full text-xs font-black border border-emerald-200">
                          {profitSummaryTotals.avgMarginPercent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center text-slate-400">-</td>
                      <td className="py-3.5 px-3 text-center font-black text-slate-900">
                        {profitSummaryTotals.totalUnitsSold} vendus
                      </td>
                      <td className="py-3.5 px-3 text-right font-black text-slate-900">
                        {profitSummaryTotals.totalRevenue.toLocaleString()} {settings.currency}
                      </td>
                      <td className="py-3.5 px-3 text-right font-black text-emerald-800 text-sm">
                        +{profitSummaryTotals.totalGrossProfit.toLocaleString()} {settings.currency}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ================= MODE 2: GRILLE VISUELLE (STANDARD CARDS) ================= */}
          {profitViewMode === 'visual_grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {paginatedProfitabilityList.map((item) => {
                const isHighMargin = item.unitMarginPercent >= 65;
                const isModerateMargin = item.unitMarginPercent >= 45 && item.unitMarginPercent < 65;
                const hasSold = item.unitsSold > 0;

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-3xl shadow-xs hover:shadow-md transition overflow-hidden flex flex-col justify-between group border border-slate-100"
                  >
                    {/* Product Image Header with Badges */}
                    <div className="relative w-full aspect-[16/9] sm:aspect-[2/1] md:aspect-[16/9] min-h-[135px] bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-300">
                          <Package className="w-10 h-10 opacity-30" />
                        </div>
                      )}

                      {/* Category Tag (Top Left) */}
                      <span className="absolute top-2 left-2 z-10 text-[9px] font-black uppercase tracking-wider text-slate-800 bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                        {item.category}
                      </span>

                      {/* Margin % Badge (Top Right) */}
                      <span className={`absolute top-2 right-2 z-10 text-xs font-black px-2.5 py-1 rounded-xl shadow-xs ${
                        isHighMargin
                          ? 'bg-emerald-500 text-white'
                          : isModerateMargin
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-red-500 text-white'
                      }`}>
                        {item.unitMarginPercent.toFixed(0)}% marge
                      </span>

                      {/* Unit Badge (Bottom Right) */}
                      {item.unit && (
                        <span className="absolute bottom-2 right-2 z-10 text-[9px] font-bold text-slate-700 bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                          {item.unit}
                        </span>
                      )}
                    </div>

                    {/* Details Container */}
                    <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight line-clamp-1 group-hover:text-amber-600 transition-colors">
                          {item.name}
                        </h4>

                        {/* Unit Price & Cost Breakdown */}
                        <div className="mt-2 grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-xl text-xs">
                          <div>
                            <span className="text-[9px] text-slate-400 block font-semibold">Prix de vente</span>
                            <span className="font-black text-slate-900">{item.sellingPrice.toLocaleString()} {settings.currency}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 block font-semibold">Coût d'achat</span>
                            <span className="font-bold text-slate-600">{item.costPrice.toLocaleString()} {settings.currency}</span>
                          </div>
                        </div>

                        {/* Visual Profit Progress Bar */}
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-[10px] sm:text-[11px]">
                            <span className="text-slate-500 font-medium">Bénéfice net / unité :</span>
                            <span className="font-black text-emerald-700">+{item.unitMargin.toLocaleString()} {settings.currency}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                            <div
                              className={`h-full ${
                                isHighMargin ? 'bg-emerald-500' : isModerateMargin ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(5, item.unitMarginPercent))}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Bottom Aggregate Sales & Total Profit in Timeframe */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs mt-2">
                        <div>
                          <span className="text-[9px] text-slate-400 block">Vendus ({periodLabel})</span>
                          <span className="font-extrabold text-slate-900">
                            {item.unitsSold} unité(s)
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[9px] text-slate-400 block">Gain Total Réalisé</span>
                          <span className={`font-black text-xs sm:text-sm ${hasSold ? 'text-emerald-700' : 'text-slate-400'}`}>
                            {hasSold ? `+${item.marginTotal.toLocaleString()} ${settings.currency}` : '0 ' + settings.currency}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ================= MODE 3: GRILLE COMPACTE (HIGH DENSITY TILES) ================= */}
          {profitViewMode === 'compact_grid' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
              {paginatedProfitabilityList.map((item) => {
                const isHighMargin = item.unitMarginPercent >= 65;
                const isModerateMargin = item.unitMarginPercent >= 45 && item.unitMarginPercent < 65;
                const hasSold = item.unitsSold > 0;

                return (
                  <div
                    key={item.id}
                    className="p-2.5 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:shadow-md transition flex flex-col justify-between gap-2 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 overflow-hidden font-black text-xs">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Package className="w-4 h-4 text-slate-400" />
                        )}
                      </div>

                      <span
                        className={`text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${
                          isHighMargin
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            : isModerateMargin
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-red-100 text-red-900 border border-red-200'
                        }`}
                      >
                        {item.unitMarginPercent.toFixed(0)}%
                      </span>
                    </div>

                    <div>
                      <h4 className="font-black text-xs text-slate-900 truncate leading-tight group-hover:text-amber-600">
                        {item.name}
                      </h4>
                      <span className="text-[10px] text-slate-400 block truncate">{item.category}</span>
                    </div>

                    <div className="bg-slate-50 p-1.5 rounded-xl space-y-0.5 text-xs">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">Prix :</span>
                        <span className="font-black text-amber-600">{item.sellingPrice.toLocaleString()} {settings.currency}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">Marge u. :</span>
                        <span className="font-black text-emerald-700">+{item.unitMargin.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                      <span className="text-slate-500 font-semibold">{item.unitsSold} vendus</span>
                      <span className={`font-black ${hasSold ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {hasSold ? `+${item.marginTotal.toLocaleString()} ${settings.currency}` : '0'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ================= MODE 4: PAR CATÉGORIE (CATEGORY ACCORDIONS) ================= */}
          {profitViewMode === 'category_grouped' && (
            <div className="space-y-4">
              {Object.entries(profitabilityByCategory).map(([catName, catItems]) => {
                const isCollapsed = collapsedProfitCategories[catName] === true;
                const catUnitsSold = catItems.reduce((sum, p) => sum + p.unitsSold, 0);
                const catRevenue = catItems.reduce((sum, p) => sum + p.revenue, 0);
                const catMargin = catItems.reduce((sum, p) => sum + p.marginTotal, 0);
                const catMarginPercent = catRevenue > 0 ? (catMargin / catRevenue) * 100 : 0;

                return (
                  <div key={catName} className="bg-white border border-slate-200 rounded-3xl shadow-2xs overflow-hidden">
                    {/* Category Accordion Header */}
                    <div
                      onClick={() => toggleProfitCategoryCollapse(catName)}
                      className="p-3.5 sm:p-4 bg-slate-50 hover:bg-slate-100/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer border-b border-slate-200"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-1 text-slate-400 hover:text-slate-700">
                          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                            <span>{catName}</span>
                            <span className="text-[11px] font-bold px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full">
                              {catItems.length} articles
                            </span>
                          </h3>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs self-end sm:self-auto">
                        <span className="font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                          {catUnitsSold.toLocaleString()} vendus
                        </span>
                        <span className="font-bold text-slate-800">
                          CA: {catRevenue.toLocaleString()} {settings.currency}
                        </span>
                        <span className="font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                          +{catMargin.toLocaleString()} {settings.currency} ({catMarginPercent.toFixed(1)}%)
                        </span>
                      </div>
                    </div>

                    {/* Accordion Content */}
                    {!isCollapsed && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-700">
                          <thead className="bg-slate-50/60 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider select-none">
                            <tr>
                              <th 
                                onClick={() => handleProfitSort('name')}
                                className="py-2.5 px-3 cursor-pointer hover:text-slate-700 transition"
                                title="Trier par Nom d'article"
                              >
                                <div className="flex items-center space-x-1">
                                  <span>Article</span>
                                  {profitSort === 'name' && (
                                    profitSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-600 shrink-0" /> : <ArrowDown className="w-3 h-3 text-amber-600 shrink-0" />
                                  )}
                                </div>
                              </th>
                              <th className="py-2.5 px-3 text-center">Unité</th>
                              <th 
                                onClick={() => handleProfitSort('costPrice')}
                                className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-700 transition"
                                title="Trier par Coût d'achat"
                              >
                                <div className="flex items-center justify-end space-x-1">
                                  <span>Coût Achat</span>
                                  {profitSort === 'costPrice' && (
                                    profitSortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-amber-600 shrink-0" /> : <ArrowUp className="w-3 h-3 text-amber-600 shrink-0" />
                                  )}
                                </div>
                              </th>
                              <th 
                                onClick={() => handleProfitSort('sellingPrice')}
                                className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-700 transition"
                                title="Trier par Prix de vente"
                              >
                                <div className="flex items-center justify-end space-x-1">
                                  <span>Prix Vente</span>
                                  {profitSort === 'sellingPrice' && (
                                    profitSortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-amber-600 shrink-0" /> : <ArrowUp className="w-3 h-3 text-amber-600 shrink-0" />
                                  )}
                                </div>
                              </th>
                              <th 
                                onClick={() => handleProfitSort('unitMargin')}
                                className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-700 transition"
                                title="Trier par Marge unitaire"
                              >
                                <div className="flex items-center justify-end space-x-1">
                                  <span>Marge Unitaire</span>
                                  {profitSort === 'unitMargin' && (
                                    profitSortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-amber-600 shrink-0" /> : <ArrowUp className="w-3 h-3 text-amber-600 shrink-0" />
                                  )}
                                </div>
                              </th>
                              <th 
                                onClick={() => handleProfitSort('unitMarginPercent')}
                                className="py-2.5 px-3 text-center cursor-pointer hover:text-slate-700 transition"
                                title="Trier par Taux de marge %"
                              >
                                <div className="flex items-center justify-center space-x-1">
                                  <span>Taux Marge %</span>
                                  {profitSort === 'unitMarginPercent' && (
                                    profitSortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-amber-600 shrink-0" /> : <ArrowUp className="w-3 h-3 text-amber-600 shrink-0" />
                                  )}
                                </div>
                              </th>
                              <th 
                                onClick={() => handleProfitSort('multiplier')}
                                className="py-2.5 px-3 text-center cursor-pointer hover:text-slate-700 transition"
                                title="Trier par Coefficient multiplicateur"
                              >
                                <div className="flex items-center justify-center space-x-1">
                                  <span>Coefficient</span>
                                  {profitSort === 'multiplier' && (
                                    profitSortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-amber-600 shrink-0" /> : <ArrowUp className="w-3 h-3 text-amber-600 shrink-0" />
                                  )}
                                </div>
                              </th>
                              <th 
                                onClick={() => handleProfitSort('unitsSold')}
                                className="py-2.5 px-3 text-center cursor-pointer hover:text-slate-700 transition"
                                title="Trier par Quantité vendue"
                              >
                                <div className="flex items-center justify-center space-x-1">
                                  <span>Vendus ({periodLabel})</span>
                                  {profitSort === 'unitsSold' && (
                                    profitSortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-amber-600 shrink-0" /> : <ArrowUp className="w-3 h-3 text-amber-600 shrink-0" />
                                  )}
                                </div>
                              </th>
                              <th 
                                onClick={() => handleProfitSort('revenue')}
                                className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-700 transition"
                                title="Trier par Chiffre d'affaires"
                              >
                                <div className="flex items-center justify-end space-x-1">
                                  <span>Chiffre d'Affaires</span>
                                  {profitSort === 'revenue' && (
                                    profitSortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-amber-600 shrink-0" /> : <ArrowUp className="w-3 h-3 text-amber-600 shrink-0" />
                                  )}
                                </div>
                              </th>
                              <th 
                                onClick={() => handleProfitSort('marginTotal')}
                                className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-700 transition"
                                title="Trier par Gain réalisé"
                              >
                                <div className="flex items-center justify-end space-x-1">
                                  <span>Gain Réalisé</span>
                                  {profitSort === 'marginTotal' && (
                                    profitSortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-amber-600 shrink-0" /> : <ArrowUp className="w-3 h-3 text-amber-600 shrink-0" />
                                  )}
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {catItems.map((item) => {
                              const isHighMargin = item.unitMarginPercent >= 65;
                              const isModerateMargin = item.unitMarginPercent >= 45 && item.unitMarginPercent < 65;
                              const hasSold = item.unitsSold > 0;

                              return (
                                <tr key={item.id} className="hover:bg-amber-50/40 transition">
                                  <td className="py-2 px-3">
                                    <div className="flex items-center space-x-2">
                                      <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 overflow-hidden text-xs">
                                        {item.image ? (
                                          <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                              (e.target as HTMLElement).style.display = 'none';
                                            }}
                                          />
                                        ) : (
                                          <Package className="w-3.5 h-3.5 text-slate-400" />
                                        )}
                                      </div>
                                      <span className="font-extrabold text-slate-900 truncate">
                                        {item.name}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2 px-3 text-center text-slate-500">{item.unit || 'u.'}</td>
                                  <td className="py-2 px-3 text-right text-slate-600">{item.costPrice.toLocaleString()} {settings.currency}</td>
                                  <td className="py-2 px-3 text-right font-black text-amber-600">{item.sellingPrice.toLocaleString()} {settings.currency}</td>
                                  <td className="py-2 px-3 text-right font-black text-emerald-700">+{item.unitMargin.toLocaleString()} {settings.currency}</td>
                                  <td className="py-2 px-3 text-center">
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                      isHighMargin
                                        ? 'bg-emerald-100 text-emerald-900'
                                        : isModerateMargin
                                        ? 'bg-amber-100 text-amber-900'
                                        : 'bg-red-100 text-red-900'
                                    }`}>
                                      {item.unitMarginPercent.toFixed(0)}%
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-center font-bold text-slate-700">
                                    x{item.multiplier > 0 ? (item.multiplier >= 99 ? '∞' : item.multiplier.toFixed(2)) : '1.00'}
                                  </td>
                                  <td className="py-2 px-3 text-center font-bold text-slate-900">{item.unitsSold}</td>
                                  <td className="py-2 px-3 text-right font-bold text-slate-800">{item.revenue.toLocaleString()} {settings.currency}</td>
                                  <td className="py-2 px-3 text-right font-black text-emerald-700">
                                    {hasSold ? `+${item.marginTotal.toLocaleString()} ${settings.currency}` : '0 ' + settings.currency}
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

          {filteredProfitabilityList.length === 0 && (
            <div className="bg-white p-8 rounded-3xl text-center text-slate-400 text-xs shadow-xs border border-slate-100">
              Aucun produit ne correspond à votre recherche.
            </div>
          )}

        </div>
      )}

      {/* ================= SECTION 2: WEEKLY SALES TRENDS & DYNAMIC RECHARTS VISUALIZATION ================= */}
      {activeSection === 'chart' && (
        <div className="space-y-6">
          {/* Main Dynamic Weekly Trends Component */}
          <WeeklySalesTrendsChart
            sales={filteredSales}
            expenses={filteredExpenses}
            settings={settings}
            periodLabel={periodLabel}
            startDate={startDate}
            endDate={endDate}
          />

          {/* Secondary Long-Term Financial Evolution Curve */}
          <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-xs space-y-4 border border-slate-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <LineChartIcon className="w-4 h-4 text-amber-600" />
                  <span>Courbe d'Évolution Temporelle Consolidée (Recettes vs Coûts & Bénéfice)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visualisation du Chiffre d'Affaires face aux Coûts Matière (COGS) et au Bénéfice Net sur la plage active ({periodLabel}).
                </p>
              </div>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full self-start sm:self-auto border border-amber-200/50">
                {periodLabel}
              </span>
            </div>

            <div className="h-72 sm:h-80 w-full">
              {evolutionChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Aucune donnée financière pour cette période.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evolutionChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: 'none', color: '#fff', fontSize: '11px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}
                      formatter={(value: any) => [`${Number(value || 0).toLocaleString()} ${settings.currency}`, '']}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Area type="monotone" dataKey="sales" name="Chiffre d'Affaires" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#salesGrad)" />
                    <Area type="monotone" dataKey="netProfit" name="Bénéfice Net" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#profitGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= SECTION 3: CAISSE & MODES DE PAIEMENT ================= */}
      {activeSection === 'cash_drawer' && (
        <div className="space-y-4">
          
          {/* 4 Clean Payment Mode Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {paymentAnalytics.map(p => {
              const Icon = p.icon;
              const isCash = p.method === 'Espèces';

              return (
                <div
                  key={p.method}
                  className="bg-white p-4 rounded-3xl shadow-xs space-y-3 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-2xs" style={{ backgroundColor: p.color }}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-extrabold text-xs text-slate-900">{p.method}</span>
                    </div>
                    <span className="text-[11px] font-black text-slate-400">{p.share.toFixed(0)}%</span>
                  </div>

                  <div>
                    <span className="text-xl font-black text-slate-900 block">
                      {p.totalAmount.toLocaleString()} <span className="text-xs font-semibold text-slate-400">{settings.currency}</span>
                    </span>
                    <span className="text-[10px] text-slate-400">{p.count} transaction(s)</span>
                  </div>

                  {isCash && (
                    <div className="pt-2 border-t border-slate-100 text-[11px] space-y-1">
                      <div className="flex justify-between text-slate-500">
                        <span>Dépenses en liquide :</span>
                        <span className="text-red-600 font-bold">-{p.expensesForMethod.toLocaleString()} {settings.currency}</span>
                      </div>
                      <div className="flex justify-between font-black text-amber-950 bg-amber-50 p-1.5 rounded-xl">
                        <span>Cash Net en Caisse :</span>
                        <span>{p.netCashBalance.toLocaleString()} {settings.currency}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Cash Summary Banner */}
          <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 p-4 sm:p-5 rounded-3xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-black text-amber-950 uppercase tracking-wider block">
                Cash Physique Attendu dans le Tiroir-Caisse
              </span>
              <p className="text-[11px] text-amber-900/80 mt-0.5">
                Calculé automatiquement : Total Espèces Encaissées - Dépenses au comptant payées en liquide.
              </p>
            </div>
            <div className="text-2xl font-black text-amber-950 shrink-0">
              {cashExpectedInDrawer.toLocaleString()} <span className="text-sm font-bold">{settings.currency}</span>
            </div>
          </div>

        </div>
      )}

      {/* ================= SECTION 4: TRANSACTIONS & JOURNAL ================= */}
      {activeSection === 'transactions' && (
        <div className="space-y-4">
          {/* Search & Mode Filter */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                placeholder="N° reçu, serveur, table..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-500">Mode :</span>
              <select
                value={txPaymentFilter}
                onChange={(e) => setTxPaymentFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">Tous les modes</option>
                <option value="Espèces">Espèces</option>
                <option value="MonCash">MonCash</option>
                <option value="Carte">Carte Bancaire</option>
                <option value="Crédit Client">Crédit Client</option>
              </select>
            </div>
          </div>

          {/* Transactions List */}
          <div className="bg-white rounded-3xl shadow-xs overflow-hidden divide-y divide-slate-100">
            {filteredSales
              .filter(s => {
                if (txPaymentFilter !== 'all' && s.paymentMethod !== txPaymentFilter) return false;
                if (txSearch.trim()) {
                  const q = txSearch.toLowerCase();
                  return (
                    s.receiptNumber.toLowerCase().includes(q) ||
                    s.cashierName.toLowerCase().includes(q) ||
                    (s.tableName && s.tableName.toLowerCase().includes(q))
                  );
                }
                return true;
              })
              .map(sale => {
                const saleCost = sale.items.reduce((sum, i) => sum + ((i.product.costPrice || 0) * i.quantity), 0);
                const saleProfit = sale.total - saleCost;

                return (
                  <div
                    key={sale.id}
                    onClick={() => setSelectedSaleDetail(sale)}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 cursor-pointer transition"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center font-black text-xs shrink-0">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 text-xs">Reçu #{sale.receiptNumber}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 bg-slate-100 rounded text-slate-600">
                            {sale.paymentMethod}
                          </span>
                          {sale.tableName && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded">
                              {sale.tableName}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(sale.timestamp).toLocaleString('fr-FR')} • Par {sale.cashierName} • {sale.items.reduce((sum, i) => sum + i.quantity, 0)} article(s)
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-black text-slate-900 text-sm block">
                        {sale.total.toLocaleString()} {settings.currency}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-bold">
                        Gain net : +{saleProfit.toLocaleString()} {settings.currency}
                      </span>
                    </div>
                  </div>
                );
              })}

            {filteredSales.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                Aucune transaction enregistrée pour cette période.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sale Detail Modal */}
      {selectedSaleDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-900 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-sm">Ticket #{selectedSaleDetail.receiptNumber}</h3>
                <p className="text-[11px] text-slate-400">{new Date(selectedSaleDetail.timestamp).toLocaleString('fr-FR')}</p>
              </div>
              <button
                onClick={() => setSelectedSaleDetail(null)}
                className="p-1 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs divide-y divide-slate-100">
              {selectedSaleDetail.items.map((item, idx) => (
                <div key={idx} className="pt-2 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-900">{item.quantity}x {item.product.name}</span>
                    {item.selectedFlavor && <span className="text-[10px] text-amber-700 block">Parfum: {item.selectedFlavor}</span>}
                  </div>
                  <span className="font-black text-slate-800">
                    {((item.product.price - item.discount) * item.quantity).toLocaleString()} {settings.currency}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Sous-total :</span>
                <span>{selectedSaleDetail.subtotal.toLocaleString()} {settings.currency}</span>
              </div>
              {selectedSaleDetail.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Remise :</span>
                  <span>-{selectedSaleDetail.discountTotal.toLocaleString()} {settings.currency}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm text-slate-950 pt-1 border-t border-slate-100">
                <span>TOTAL PAYÉ :</span>
                <span className="text-amber-700">{selectedSaleDetail.total.toLocaleString()} {settings.currency}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                <span>Mode :</span>
                <span className="font-bold">{selectedSaleDetail.paymentMethod}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedSaleDetail(null)}
              className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Clôture de Caisse (Z-Report Modal) */}
      {showShiftCloseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-900 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 no-print">
              <div>
                <h3 className="text-base font-black text-slate-900">Rapport de Fin de Journée (Z-Report)</h3>
                <p className="text-xs text-slate-500">{settings.barName} • Caissier(e): {settings.cashierName}</p>
              </div>
              <button
                onClick={() => setShowShiftCloseModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div id="printable-report-area" className="bg-amber-50 text-slate-900 p-5 rounded-2xl font-mono text-xs space-y-3 shadow-inner border border-amber-200">
              <div className="text-center font-black text-sm border-b border-dashed border-slate-400 pb-2.5">
                <p className="text-base font-extrabold uppercase">{settings.barName}</p>
                <p className="text-[11px] font-bold text-amber-900 mt-0.5">CLÔTURE DE CAISSE DE BAR (Z-REPORT)</p>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-600">Date & Heure:</span>
                  <span className="font-bold">{new Date().toLocaleString('fr-FR')}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span>Ventes Espèces (Avoir Caisse):</span>
                  <span className="font-bold">{(paymentAnalytics.find(p=>p.method==='Espèces')?.totalAmount || 0).toLocaleString()} {settings.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ventes MonCash:</span>
                  <span>{(paymentAnalytics.find(p=>p.method==='MonCash')?.totalAmount || 0).toLocaleString()} {settings.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ventes Carte:</span>
                  <span>{(paymentAnalytics.find(p=>p.method==='Carte')?.totalAmount || 0).toLocaleString()} {settings.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ventes Crédit Client:</span>
                  <span>{(paymentAnalytics.find(p=>p.method==='Crédit Client')?.totalAmount || 0).toLocaleString()} {settings.currency}</span>
                </div>
                <div className="flex justify-between border-t border-slate-400 pt-1.5 font-black text-xs text-slate-950">
                  <span>TOTAL RECETTES GLOBAL:</span>
                  <span>{totalSalesRevenue.toLocaleString()} {settings.currency}</span>
                </div>
                <div className="flex justify-between text-red-700 pt-0.5">
                  <span>Moins Dépenses Caisse:</span>
                  <span>-{totalExpenses.toLocaleString()} {settings.currency}</span>
                </div>
                <div className="flex justify-between font-black text-sm pt-2 border-t-2 border-slate-950 text-slate-950 bg-amber-100/80 p-2 rounded-xl mt-1">
                  <span>CASH PHYSIQUE ATTENDU:</span>
                  <span>{cashExpectedInDrawer.toLocaleString()} {settings.currency}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 no-print">
              <button
                onClick={() => window.print()}
                className="py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4 stroke-[2.5]" />
                <span>Imprimer / PDF</span>
              </button>

              <button
                onClick={() => setShowShiftCloseModal(false)}
                className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enterprise Custom Report Modal */}
      {enterpriseReportType && (
        <EnterpriseReportModal
          defaultReportType={enterpriseReportType}
          onClose={() => setEnterpriseReportType(null)}
        />
      )}

    </div>
  );
};
