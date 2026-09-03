import React, { useState, useMemo } from 'react';
import { useBar } from '../../context/BarContext';
import { Expense, PaymentMethod } from '../../types';
import { 
  Receipt, 
  Plus, 
  Trash2, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  PieChart as PieChartIcon, 
  BarChart3, 
  Filter, 
  Search, 
  RotateCcw,
  Calendar,
  Wallet,
  DollarSign,
  User
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

const CATEGORY_COLORS: Record<string, string> = {
  'Approvisionnement': '#f59e0b', // amber-500
  'Glaçons': '#0284c7',          // sky-600
  'Électricité & Eau': '#8b5cf6', // violet-500
  'Salaires': '#10b981',         // emerald-500
  'Transport': '#ec4899',        // pink-500
  'Loyer': '#6366f1',            // indigo-500
  'Taxes & DGI': '#ef4444',      // red-500
  'Entretien': '#f97316',        // orange-500
  'Autre': '#64748b',            // slate-500
};

export const ExpenseTracker: React.FC = () => {
  const { expenses, addExpense, deleteExpense, settings } = useBar();

  // Form State - Title, Description, Amount, Category & Payment Method
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Expense['category'] | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<Expense['paymentMethod']>('Espèces');
  const [supplier, setSupplier] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Section Visibility State (Collapsible) - Hidden by default as requested
  const [showHistory, setShowHistory] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');

  // Filter States
  const [filterSearch, setFilterSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('All');
  const [filterRecordedBy, setFilterRecordedBy] = useState<string>('All');
  const [filterDatePreset, setFilterDatePreset] = useState<'all' | 'today' | '7days' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Available authors / cashiers who recorded expenses
  const availableRecorders = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach(e => {
      if (e.recordedBy && e.recordedBy.trim()) {
        set.add(e.recordedBy.trim());
      }
    });
    return Array.from(set).sort();
  }, [expenses]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterCategory !== 'All') count++;
    if (filterPaymentMethod !== 'All') count++;
    if (filterRecordedBy !== 'All') count++;
    if (filterDatePreset === 'custom' && (startDate || endDate)) count++;
    return count;
  }, [filterCategory, filterPaymentMethod, filterRecordedBy, filterDatePreset, startDate, endDate]);

  const expenseCategories: Expense['category'][] = [
    'Approvisionnement',
    'Glaçons',
    'Électricité & Eau',
    'Salaires',
    'Transport',
    'Loyer',
    'Taxes & DGI',
    'Entretien',
    'Autre',
  ];

  const paymentMethods: PaymentMethod[] = ['Espèces', 'MonCash', 'Carte', 'Crédit Client'];

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthPrefix = todayStr.slice(0, 7);

  // Quick summary calculations (statistically verified)
  const todayExpenses = useMemo(() => {
    return expenses.filter(e => e.date === todayStr);
  }, [expenses, todayStr]);

  const totalExpensesToday = useMemo(() => {
    return todayExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [todayExpenses]);

  const monthExpenses = useMemo(() => {
    return expenses.filter(e => e.date.startsWith(currentMonthPrefix));
  }, [expenses, currentMonthPrefix]);

  const totalExpensesThisMonth = useMemo(() => {
    return monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [monthExpenses]);

  const totalExpensesAllTime = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const averageExpense = useMemo(() => {
    return expenses.length > 0 ? totalExpensesAllTime / expenses.length : 0;
  }, [expenses, totalExpensesAllTime]);

  // Filtered expenses list
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      // Category Filter
      if (filterCategory !== 'All' && expense.category !== filterCategory) {
        return false;
      }

      // Payment Method Filter
      if (filterPaymentMethod !== 'All' && expense.paymentMethod !== filterPaymentMethod) {
        return false;
      }

      // Recorded By (Cashier/Member) Filter
      if (filterRecordedBy !== 'All' && expense.recordedBy !== filterRecordedBy) {
        return false;
      }

      // Search Filter (Description or Supplier)
      if (filterSearch.trim()) {
        const q = filterSearch.toLowerCase();
        const matchDesc = expense.description.toLowerCase().includes(q);
        const matchSupp = expense.supplier?.toLowerCase().includes(q) || false;
        if (!matchDesc && !matchSupp) return false;
      }

      // Date Filter
      if (filterDatePreset === 'today') {
        if (expense.date !== todayStr) return false;
      } else if (filterDatePreset === '7days') {
        const d = new Date(expense.date);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        if (d < sevenDaysAgo) return false;
      } else if (filterDatePreset === 'month') {
        const currentMonth = todayStr.substring(0, 7);
        if (!expense.date.startsWith(currentMonth)) return false;
      } else if (filterDatePreset === 'custom') {
        if (startDate && expense.date < startDate) return false;
        if (endDate && expense.date > endDate) return false;
      }

      return true;
    });
  }, [expenses, filterCategory, filterPaymentMethod, filterRecordedBy, filterSearch, filterDatePreset, startDate, endDate, todayStr]);

  const totalFilteredAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  // Chart Data calculations
  const chartData = useMemo(() => {
    const categoryMap: Record<string, number> = {};
    filteredExpenses.forEach(exp => {
      const cat = exp.category || 'Autre';
      categoryMap[cat] = (categoryMap[cat] || 0) + exp.amount;
    });

    return Object.entries(categoryMap).map(([name, value]) => ({
      name,
      value,
      color: CATEGORY_COLORS[name] || '#64748b',
    }));
  }, [filteredExpenses]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount) || 0;
    if (numAmount <= 0) {
      alert("Le montant doit être supérieur à zéro.");
      return;
    }

    if (!description.trim()) {
      alert("Veuillez entrer une description de la dépense.");
      return;
    }

    addExpense({
      title: title.trim() || undefined,
      category: category || 'Autre', // Fallback to 'Autre' if optional category omitted
      description: description.trim(),
      amount: numAmount,
      date: date || todayStr,
      paymentMethod: paymentMethod || 'Espèces', // Fallback to 'Espèces' if optional payment method omitted
      supplier: supplier.trim() || undefined,
      recordedBy: settings.cashierName,
    });

    setTitle('');
    setDescription('');
    setAmount('');
    setSupplier('');
    setCategory('');
    setPaymentMethod('Espèces');
  };

  const resetFilters = () => {
    setFilterSearch('');
    setFilterCategory('All');
    setFilterPaymentMethod('All');
    setFilterRecordedBy('All');
    setFilterDatePreset('all');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-slate-900 animate-fadeIn pb-24 md:pb-8">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs w-full overflow-hidden">
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 shrink-0" />
            <h1 className="text-base sm:text-xl font-black text-slate-900 truncate">Suivi & Gestion des Dépenses</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 sm:mt-1">
            Enregistrez rapidement vos achats, factures et charges opérationnelles du bar.
          </p>
        </div>
      </div>

      {/* Overview Stat Cards - Styled identical to Finance Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Card 1: Today's Expenses */}
        <div className="bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-white p-4 sm:p-5 rounded-3xl border border-rose-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-rose-950">Dépenses du Jour</span>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">
              {totalExpensesToday.toLocaleString()} <span className="text-xs font-normal text-slate-500">{settings.currency}</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-rose-800 mt-1 pt-2 border-t border-rose-100/80">
            <span>{todayExpenses.length} justificatifs saisis</span>
            <span className="font-black bg-rose-100 text-rose-900 px-2 py-0.5 rounded-full text-[10px]">
              Aujourd'hui
            </span>
          </div>
        </div>

        {/* Card 2: This Month's Expenses */}
        <div className="bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-white p-4 sm:p-5 rounded-3xl border border-amber-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">Dépenses du Mois</span>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {totalExpensesThisMonth.toLocaleString()} <span className="text-xs font-normal text-slate-500">{settings.currency}</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-600 mt-1 pt-2 border-t border-slate-100/80">
            <span>{monthExpenses.length} sorties ce mois</span>
            <span className="font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full text-[10px]">
              Mois en cours
            </span>
          </div>
        </div>

        {/* Card 3: Total All-time Expenses */}
        <div className="bg-gradient-to-br from-slate-100 via-slate-50 to-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">Total Historique</span>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {totalExpensesAllTime.toLocaleString()} <span className="text-xs font-normal text-slate-500">{settings.currency}</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-600 mt-1 pt-2 border-t border-slate-100/80">
            <span>{expenses.length} dépenses au total</span>
            <span className="font-black bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full text-[10px]">
              Registre
            </span>
          </div>
        </div>

        {/* Card 4: Average Expense per entry */}
        <div className="bg-gradient-to-br from-blue-500/15 via-blue-500/5 to-white p-4 sm:p-5 rounded-3xl border border-blue-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-blue-950">Dépense Moyenne</span>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black text-blue-700 tracking-tight">
              {Math.round(averageExpense).toLocaleString()} <span className="text-xs font-normal text-slate-500">{settings.currency}</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-blue-800 mt-1 pt-2 border-t border-blue-100/80">
            <span>Moyenne par opération</span>
            <span className="font-black bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full text-[10px]">
              Ratio
            </span>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form: Enregistrer une nouvelle dépense */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-xs h-fit">
          <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
            <Plus className="w-5 h-5 text-amber-600" />
            <h2 className="font-extrabold text-slate-900 text-sm">Nouvelle Dépense</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            
            {/* Titre / Nom de la Dépense */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nom / Intitulé de la dépense <span className="text-slate-400 font-normal">(Optionnel)</span>
              </label>
              <input
                type="text"
                placeholder="ex: Glace pour comptoir, Transport marchandise, Facture loyer..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 p-2.5 rounded-xl focus:outline-none focus:border-amber-500 font-medium"
              />
            </div>

            {/* Description (Required) */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Description / Détails <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="ex: Achat 4 sacs de glaçons, Facture électricité du mois..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 p-2.5 rounded-xl focus:outline-none focus:border-amber-500 font-medium"
              />
            </div>

            {/* Montant & Date */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Montant ({settings.currency}) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="ex: 1200"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-red-600 font-bold p-2.5 rounded-xl focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 p-2.5 rounded-xl focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Catégorie (Optional) & Mode de Paiement (Optional) */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Catégorie <span className="text-slate-400 font-normal">(Optionnel)</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Expense['category'])}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 p-2.5 rounded-xl focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Non spécifié --</option>
                  {expenseCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Paiement <span className="text-slate-400 font-normal">(Optionnel)</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as Expense['paymentMethod'])}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 p-2.5 rounded-xl focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Non spécifié --</option>
                  {paymentMethods.map(method => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fournisseur (Optional) */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Fournisseur / Bénéficiaire <span className="text-slate-400 font-normal">(Optionnel)</span>
              </label>
              <input
                type="text"
                placeholder="ex: Glacière Express, EDH, Brasserie..."
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 p-2.5 rounded-xl focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-xl shadow-md flex items-center justify-center space-x-1.5 transition active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Enregistrer la Dépense</span>
            </button>

          </form>
        </div>

        {/* Right Section: Collapsible Chart & Collapsible History */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Toggle Button for Expense Analytics Chart */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full overflow-hidden">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="p-2 bg-amber-50 rounded-xl border border-amber-200 text-amber-700 shrink-0">
                <PieChartIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-sm text-slate-900 truncate">Analyse Visuelle & Graphique</h3>
                <p className="text-[11px] text-slate-500 truncate">Visualisez la répartition des charges par catégorie.</p>
              </div>
            </div>

            <button
              onClick={() => setShowChart(!showChart)}
              className={`w-full sm:w-auto shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${
                showChart 
                  ? 'bg-amber-500 text-slate-950 shadow-2xs' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
              }`}
            >
              {showChart ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
              <span className="truncate">{showChart ? "Masquer le Graphique" : "📊 Voir le Graphique"}</span>
            </button>
          </div>

          {/* Collapsible Chart Block */}
          {showChart && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-sm text-slate-900">Répartition des Dépenses</span>
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                    Total: {totalFilteredAmount.toLocaleString()} {settings.currency}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                  <button
                    onClick={() => setChartType('pie')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center space-x-1 cursor-pointer ${
                      chartType === 'pie' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <PieChartIcon className="w-3.5 h-3.5" />
                    <span>Secteurs</span>
                  </button>
                  <button
                    onClick={() => setChartType('bar')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center space-x-1 cursor-pointer ${
                      chartType === 'bar' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Barres</span>
                  </button>
                </div>
              </div>

              {chartData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-400 text-xs italic">
                  Aucune donnée disponible pour les filtres sélectionnés.
                </div>
              ) : (
                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'pie' ? (
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(val: number) => [`${val.toLocaleString()} ${settings.currency}`, 'Montant']} 
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      </PieChart>
                    ) : (
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip 
                          formatter={(val: number) => [`${val.toLocaleString()} ${settings.currency}`, 'Montant']} 
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-bar-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Toggle Button for Expense History */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full overflow-hidden">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="p-2 bg-amber-50 rounded-xl border border-amber-200 text-amber-700 shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-sm text-slate-900 truncate">Historique & Registre des Dépenses</h3>
                <p className="text-[11px] text-slate-500 truncate">
                  {filteredExpenses.length} enregistrement(s) ({totalFilteredAmount.toLocaleString()} {settings.currency})
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`w-full sm:w-auto shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${
                showHistory 
                  ? 'bg-amber-500 text-slate-950 shadow-2xs' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
              }`}
            >
              {showHistory ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
              <span className="truncate">{showHistory ? "Masquer l'Historique" : "📋 Consulter l'Historique"}</span>
            </button>
          </div>

          {/* Collapsible Expenses History & Filters Block */}
          {showHistory && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-2xs">
              
              {/* Ergonomic & Compact Collapsible Filter Toolbar */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs space-y-2">
                {/* Compact Top Bar: Search Input + Collapsible Filter Toggle + Reset Button */}
                <div className="flex items-center gap-2">
                  
                  {/* Compact Search Input */}
                  <div className="relative flex-1 min-w-0">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Rechercher..."
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-amber-500 font-medium text-xs truncate"
                    />
                  </div>

                  {/* Filter Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className={`px-3 py-1.5 rounded-lg font-bold border transition flex items-center space-x-1.5 shrink-0 cursor-pointer ${
                      showAdvancedFilters || activeFilterCount > 0
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Filter className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="hidden sm:inline">Filtres</span>
                    {activeFilterCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center shrink-0">
                        {activeFilterCount}
                      </span>
                    )}
                    {showAdvancedFilters ? (
                      <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                    )}
                  </button>

                  {/* Reset Button */}
                  {(filterSearch || activeFilterCount > 0 || filterDatePreset !== 'all') && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg border border-slate-200 transition shrink-0 cursor-pointer"
                      title="Réinitialiser les filtres"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Expanded/Depliable Filter Panel */}
                {showAdvancedFilters && (
                  <div className="pt-2.5 border-t border-slate-200/80 space-y-3 animate-fadeIn">
                    
                    {/* Date Preset Pills */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Période
                      </label>
                      <div className="flex flex-wrap items-center gap-1">
                        {[
                          { id: 'all', label: 'Tout' },
                          { id: 'today', label: "Aujourd'hui" },
                          { id: '7days', label: '7 jours' },
                          { id: 'month', label: 'Mois' },
                        ].map(preset => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setFilterDatePreset(preset.id as any)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                              filterDatePreset === preset.id
                                ? 'bg-amber-500 text-slate-950 shadow-2xs'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Category, Payment Method & Member Selectors */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      {/* Category Filter */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Catégorie</label>
                        <select
                          value={filterCategory}
                          onChange={(e) => setFilterCategory(e.target.value)}
                          className="w-full py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-amber-500 font-medium text-xs"
                        >
                          <option value="All">Toutes les catégories</option>
                          {expenseCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      {/* Payment Method Filter */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Paiement</label>
                        <select
                          value={filterPaymentMethod}
                          onChange={(e) => setFilterPaymentMethod(e.target.value)}
                          className="w-full py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-amber-500 font-medium text-xs"
                        >
                          <option value="All">Tous les modes</option>
                          {paymentMethods.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>

                      {/* RecordedBy / Cashier Filter */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Par (Caissier / Membre)</label>
                        <select
                          value={filterRecordedBy}
                          onChange={(e) => setFilterRecordedBy(e.target.value)}
                          className="w-full py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-amber-500 font-medium text-xs"
                        >
                          <option value="All">Tous les membres ({availableRecorders.length})</option>
                          {availableRecorders.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>

                      {/* Custom Period Option */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Période sur-mesure</label>
                        <button
                          type="button"
                          onClick={() => setFilterDatePreset(filterDatePreset === 'custom' ? 'all' : 'custom')}
                          className={`w-full py-1.5 px-2.5 rounded-lg font-bold border text-left transition text-xs ${
                            filterDatePreset === 'custom'
                              ? 'bg-amber-50 border-amber-300 text-amber-800'
                              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {filterDatePreset === 'custom' ? 'Période active' : 'Dates (Du / Au)'}
                        </button>
                      </div>
                    </div>

                    {/* Custom Date Pickers */}
                    {filterDatePreset === 'custom' && (
                      <div className="sm:col-span-3 grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Du</span>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full bg-white border border-slate-300 p-1.5 rounded-lg text-slate-900"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Au</span>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full bg-white border border-slate-300 p-1.5 rounded-lg text-slate-900"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* History List */}
              <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
                {filteredExpenses.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-10">
                    Aucune dépense ne correspond aux filtres appliqués.
                  </p>
                ) : (
                  filteredExpenses.map(expense => (
                    <div
                      key={expense.id}
                      className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between hover:border-slate-300 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            {expense.category || 'Autre'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">{expense.date}</span>
                        </div>
                        {expense.title && (
                          <h4 className="font-extrabold text-slate-900 text-sm leading-tight">{expense.title}</h4>
                        )}
                        <p className={`text-xs ${expense.title ? 'text-slate-600' : 'font-bold text-slate-900'}`}>
                          {expense.description}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Par: {expense.recordedBy} • Mode: {expense.paymentMethod || 'Non spécifié'} 
                          {expense.supplier ? ` • Fournisseur: ${expense.supplier}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="font-black text-red-600 text-base">
                          -{expense.amount.toLocaleString()} {settings.currency}
                        </span>
                        <button
                          onClick={() => {
                            if (window.confirm("Supprimer cette dépense ?")) {
                              deleteExpense(expense.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title="Supprimer la dépense"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
