import React, { useState, useMemo } from 'react';
import { Sale, Expense, BarSettings } from '../../types';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Receipt,
  Activity,
  ShoppingBag,
  Percent,
  Award,
  Layers,
  ArrowUpRight,
  Flame,
  BarChart3,
  SlidersHorizontal,
  Clock
} from 'lucide-react';

interface WeeklySalesTrendsChartProps {
  sales: Sale[];
  expenses: Expense[];
  settings: BarSettings;
  periodLabel: string;
  startDate: Date;
  endDate: Date;
}

type TrendViewMode = 'day_of_week' | 'weekly_series' | 'daily_continuous';
type TrendMetric = 'sales' | 'profit' | 'tickets' | 'avgTicket';
type ChartStyle = 'smooth_area' | 'composed_mixed' | 'clean_line';

interface DayOfWeekTrend {
  dayIndex: number;
  dayName: string;
  shortName: string;
  sales: number;
  cogs: number;
  grossProfit: number;
  netProfit: number;
  expenses: number;
  tickets: number;
  avgTicket: number;
  marginPercent: number;
  shareOfTotal: number;
  isWeekend: boolean;
}

interface WeekSeriesTrend {
  weekKey: string;
  weekLabel: string;
  shortLabel: string;
  sales: number;
  cogs: number;
  grossProfit: number;
  netProfit: number;
  expenses: number;
  tickets: number;
  avgTicket: number;
  marginPercent: number;
  growthRate?: number;
}

interface DailyContinuousPoint {
  dateStr: string;
  label: string;
  dayName: string;
  sales: number;
  cogs: number;
  grossProfit: number;
  netProfit: number;
  expenses: number;
  tickets: number;
  avgTicket: number;
  marginPercent: number;
}

export const WeeklySalesTrendsChart: React.FC<WeeklySalesTrendsChartProps> = ({
  sales,
  expenses,
  settings,
  periodLabel,
  startDate,
  endDate
}) => {
  const [viewMode, setViewMode] = useState<TrendViewMode>('day_of_week');
  const [activeMetric, setActiveMetric] = useState<TrendMetric>('sales');
  const [chartStyle, setChartStyle] = useState<ChartStyle>('smooth_area');

  // 1. Calculate Day of Week Trends (Lundi -> Dimanche profile)
  const dayOfWeekTrends = useMemo<DayOfWeekTrend[]>(() => {
    const daysConfig = [
      { dayIndex: 1, dayName: 'Lundi', shortName: 'Lun', isWeekend: false },
      { dayIndex: 2, dayName: 'Mardi', shortName: 'Mar', isWeekend: false },
      { dayIndex: 3, dayName: 'Mercredi', shortName: 'Mer', isWeekend: false },
      { dayIndex: 4, dayName: 'Jeudi', shortName: 'Jeu', isWeekend: false },
      { dayIndex: 5, dayName: 'Vendredi', shortName: 'Ven', isWeekend: true },
      { dayIndex: 6, dayName: 'Samedi', shortName: 'Sam', isWeekend: true },
      { dayIndex: 0, dayName: 'Dimanche', shortName: 'Dim', isWeekend: true },
    ];

    const totalsByDay: Record<number, { sales: number; cogs: number; expenses: number; tickets: number }> = {
      0: { sales: 0, cogs: 0, expenses: 0, tickets: 0 },
      1: { sales: 0, cogs: 0, expenses: 0, tickets: 0 },
      2: { sales: 0, cogs: 0, expenses: 0, tickets: 0 },
      3: { sales: 0, cogs: 0, expenses: 0, tickets: 0 },
      4: { sales: 0, cogs: 0, expenses: 0, tickets: 0 },
      5: { sales: 0, cogs: 0, expenses: 0, tickets: 0 },
      6: { sales: 0, cogs: 0, expenses: 0, tickets: 0 },
    };

    sales.forEach(sale => {
      if (sale.status === 'cancelled') return;
      const day = new Date(sale.timestamp).getDay();
      totalsByDay[day].sales += sale.total;
      totalsByDay[day].tickets += 1;

      const saleCost = sale.items.reduce((sum, item) => {
        const cost = item.product.costPrice || 0;
        return sum + (cost * item.quantity);
      }, 0);
      totalsByDay[day].cogs += saleCost;
    });

    expenses.forEach(exp => {
      const expDate = new Date(exp.date + 'T12:00:00');
      const day = expDate.getDay();
      if (totalsByDay[day]) {
        totalsByDay[day].expenses += exp.amount;
      }
    });

    const totalSalesAll = Object.values(totalsByDay).reduce((sum, d) => sum + d.sales, 0);

    return daysConfig.map(day => {
      const data = totalsByDay[day.dayIndex];
      const grossProfit = data.sales - data.cogs;
      const netProfit = grossProfit - data.expenses;
      const avgTicket = data.tickets > 0 ? data.sales / data.tickets : 0;
      const marginPercent = data.sales > 0 ? (grossProfit / data.sales) * 100 : 0;
      const shareOfTotal = totalSalesAll > 0 ? (data.sales / totalSalesAll) * 100 : 0;

      return {
        ...day,
        sales: data.sales,
        cogs: data.cogs,
        grossProfit,
        netProfit,
        expenses: data.expenses,
        tickets: data.tickets,
        avgTicket,
        marginPercent,
        shareOfTotal
      };
    });
  }, [sales, expenses]);

  // 2. Calculate Weekly Series Trends (Week by Week grouping)
  const weeklySeriesTrends = useMemo<WeekSeriesTrend[]>(() => {
    if (sales.length === 0) return [];

    const weekMap: Record<string, { sales: number; cogs: number; expenses: number; tickets: number; minDate: Date; maxDate: Date }> = {};

    sales.forEach(sale => {
      if (sale.status === 'cancelled') return;
      const d = new Date(sale.timestamp);
      // Get Monday of current week
      const day = d.getDay();
      const diffToMon = d.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(d);
      mon.setDate(diffToMon);
      mon.setHours(0, 0, 0, 0);
      const weekKey = mon.toISOString().split('T')[0];

      if (!weekMap[weekKey]) {
        const sun = new Date(mon);
        sun.setDate(mon.getDate() + 6);
        weekMap[weekKey] = { sales: 0, cogs: 0, expenses: 0, tickets: 0, minDate: mon, maxDate: sun };
      }

      weekMap[weekKey].sales += sale.total;
      weekMap[weekKey].tickets += 1;

      const saleCost = sale.items.reduce((sum, item) => {
        const cost = item.product.costPrice || 0;
        return sum + (cost * item.quantity);
      }, 0);
      weekMap[weekKey].cogs += saleCost;
    });

    expenses.forEach(exp => {
      const d = new Date(exp.date + 'T12:00:00');
      const day = d.getDay();
      const diffToMon = d.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(d);
      mon.setDate(diffToMon);
      mon.setHours(0, 0, 0, 0);
      const weekKey = mon.toISOString().split('T')[0];

      if (weekMap[weekKey]) {
        weekMap[weekKey].expenses += exp.amount;
      }
    });

    const sortedWeeks = Object.keys(weekMap).sort();

    return sortedWeeks.map((wKey, idx) => {
      const wData = weekMap[wKey];
      const grossProfit = wData.sales - wData.cogs;
      const netProfit = grossProfit - wData.expenses;
      const avgTicket = wData.tickets > 0 ? wData.sales / wData.tickets : 0;
      const marginPercent = wData.sales > 0 ? (grossProfit / wData.sales) * 100 : 0;

      const startLabel = wData.minDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
      const endLabel = wData.maxDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

      let growthRate: number | undefined = undefined;
      if (idx > 0) {
        const prevSales = weekMap[sortedWeeks[idx - 1]].sales;
        if (prevSales > 0) {
          growthRate = ((wData.sales - prevSales) / prevSales) * 100;
        }
      }

      return {
        weekKey: wKey,
        weekLabel: `Semaine du ${startLabel} au ${endLabel}`,
        shortLabel: `Sem. ${startLabel}`,
        sales: wData.sales,
        cogs: wData.cogs,
        grossProfit,
        netProfit,
        expenses: wData.expenses,
        tickets: wData.tickets,
        avgTicket,
        marginPercent,
        growthRate
      };
    });
  }, [sales, expenses]);

  // 3. Calculate Daily Continuous Points
  const dailyContinuousData = useMemo<DailyContinuousPoint[]>(() => {
    const dayMap: Record<string, DailyContinuousPoint> = {};
    const curr = new Date(startDate);
    curr.setHours(0, 0, 0, 0);
    const endLimit = new Date(endDate);
    endLimit.setHours(23, 59, 59, 999);

    const frenchDays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

    while (curr <= endLimit) {
      const dStr = curr.toISOString().split('T')[0];
      const dayLabel = curr.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
      const dayName = frenchDays[curr.getDay()];

      dayMap[dStr] = {
        dateStr: dStr,
        label: `${dayName} ${dayLabel}`,
        dayName,
        sales: 0,
        cogs: 0,
        grossProfit: 0,
        netProfit: 0,
        expenses: 0,
        tickets: 0,
        avgTicket: 0,
        marginPercent: 0
      };
      curr.setDate(curr.getDate() + 1);
    }

    sales.forEach(sale => {
      if (sale.status === 'cancelled') return;
      const dStr = sale.timestamp.split('T')[0];
      if (dayMap[dStr]) {
        dayMap[dStr].sales += sale.total;
        dayMap[dStr].tickets += 1;
        const cost = sale.items.reduce((sum, i) => sum + ((i.product.costPrice || 0) * i.quantity), 0);
        dayMap[dStr].cogs += cost;
      }
    });

    expenses.forEach(exp => {
      if (dayMap[exp.date]) {
        dayMap[exp.date].expenses += exp.amount;
      }
    });

    return Object.values(dayMap).map(d => {
      const grossProfit = d.sales - d.cogs;
      const netProfit = grossProfit - d.expenses;
      const avgTicket = d.tickets > 0 ? d.sales / d.tickets : 0;
      const marginPercent = d.sales > 0 ? (grossProfit / d.sales) * 100 : 0;
      return {
        ...d,
        grossProfit,
        netProfit,
        avgTicket,
        marginPercent
      };
    });
  }, [sales, expenses, startDate, endDate]);

  // Insights derived from Day-of-Week
  const insights = useMemo(() => {
    const totalSales = dayOfWeekTrends.reduce((sum, d) => sum + d.sales, 0);
    const totalTickets = dayOfWeekTrends.reduce((sum, d) => sum + d.tickets, 0);
    const avgTicketGlobal = totalTickets > 0 ? totalSales / totalTickets : 0;

    // Peak day
    let peakDay = dayOfWeekTrends[0];
    dayOfWeekTrends.forEach(d => {
      if (d.sales > peakDay.sales) {
        peakDay = d;
      }
    });

    // Weekend vs Weekday
    const weekendSales = dayOfWeekTrends.filter(d => d.isWeekend).reduce((sum, d) => sum + d.sales, 0);
    const weekdaySales = dayOfWeekTrends.filter(d => !d.isWeekend).reduce((sum, d) => sum + d.sales, 0);
    const weekendRatio = totalSales > 0 ? (weekendSales / totalSales) * 100 : 0;

    // Best profitability day
    let mostProfitableDay = dayOfWeekTrends[0];
    dayOfWeekTrends.forEach(d => {
      if (d.grossProfit > mostProfitableDay.grossProfit) {
        mostProfitableDay = d;
      }
    });

    return {
      totalSales,
      totalTickets,
      avgTicketGlobal,
      peakDay,
      weekendSales,
      weekdaySales,
      weekendRatio,
      mostProfitableDay
    };
  }, [dayOfWeekTrends]);

  // Selected chart data based on active view mode
  const currentChartData = useMemo(() => {
    if (viewMode === 'day_of_week') {
      return dayOfWeekTrends.map(d => ({
        ...d,
        keyLabel: d.dayName,
        valueSales: d.sales,
        valueProfit: d.grossProfit,
        valueNetProfit: d.netProfit,
        valueTickets: d.tickets,
        valueAvgTicket: Math.round(d.avgTicket),
      }));
    } else if (viewMode === 'weekly_series') {
      return weeklySeriesTrends.map(w => ({
        ...w,
        keyLabel: w.shortLabel,
        valueSales: w.sales,
        valueProfit: w.grossProfit,
        valueNetProfit: w.netProfit,
        valueTickets: w.tickets,
        valueAvgTicket: Math.round(w.avgTicket),
      }));
    } else {
      return dailyContinuousData.map(d => ({
        ...d,
        keyLabel: d.label,
        valueSales: d.sales,
        valueProfit: d.grossProfit,
        valueNetProfit: d.netProfit,
        valueTickets: d.tickets,
        valueAvgTicket: Math.round(d.avgTicket),
      }));
    }
  }, [viewMode, dayOfWeekTrends, weeklySeriesTrends, dailyContinuousData]);

  // Color config based on active metric
  const metricConfig = useMemo(() => {
    switch (activeMetric) {
      case 'sales':
        return {
          title: "Chiffre d'Affaires",
          dataKey: 'valueSales',
          color: '#f59e0b',
          gradientId: 'salesTrendGrad',
          unit: settings.currency,
          secondaryKey: 'valueProfit',
          secondaryName: 'Marge Brute',
          secondaryColor: '#10b981'
        };
      case 'profit':
        return {
          title: 'Bénéfice & Marge Nette',
          dataKey: 'valueProfit',
          color: '#10b981',
          gradientId: 'profitTrendGrad',
          unit: settings.currency,
          secondaryKey: 'valueNetProfit',
          secondaryName: 'Bénéfice Net Réel',
          secondaryColor: '#059669'
        };
      case 'tickets':
        return {
          title: 'Volume de Commandes / Reçus',
          dataKey: 'valueTickets',
          color: '#3b82f6',
          gradientId: 'ticketsTrendGrad',
          unit: 'tickets',
          secondaryKey: undefined,
          secondaryName: undefined,
          secondaryColor: undefined
        };
      case 'avgTicket':
        return {
          title: 'Panier Moyen par Client',
          dataKey: 'valueAvgTicket',
          color: '#8b5cf6',
          gradientId: 'avgTicketTrendGrad',
          unit: settings.currency,
          secondaryKey: undefined,
          secondaryName: undefined,
          secondaryColor: undefined
        };
    }
  }, [activeMetric, settings.currency]);

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl shadow-xs p-4 sm:p-6 space-y-5">
      
      {/* Header with Title & Granularity Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-inner shrink-0">
              <TrendingUp className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Tendances de Ventes Hebdomadaires & Courbe Dynamique
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200/60">
                  <Activity className="w-3 h-3 text-amber-600" />
                  Recharts Analytics
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Rythme d'activité de la semaine, pics d'affluence et régularité des recettes ({periodLabel})
              </p>
            </div>
          </div>
        </div>

        {/* View Granularity Mode Selector (Day of Week vs Weekly Series vs Daily) */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-2xl self-start lg:self-auto border border-slate-200/70">
          <button
            onClick={() => setViewMode('day_of_week')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center space-x-1.5 ${
              viewMode === 'day_of_week'
                ? 'bg-slate-900 text-amber-400 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Profil Hebdo (Lun ➔ Dim)</span>
          </button>

          <button
            onClick={() => setViewMode('weekly_series')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center space-x-1.5 ${
              viewMode === 'weekly_series'
                ? 'bg-slate-900 text-amber-400 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Évolution par Semaines</span>
          </button>

          <button
            onClick={() => setViewMode('daily_continuous')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center space-x-1.5 ${
              viewMode === 'daily_continuous'
                ? 'bg-slate-900 text-amber-400 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Courbe Journalière</span>
          </button>
        </div>
      </div>

      {/* 4 Rich Dynamic Insights Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* 1. Peak Day Indicator */}
        <div className="bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-white p-3.5 rounded-2xl border border-amber-200/50 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-950 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-600" />
              Pic d'Affluence
            </span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-950">
              {insights.peakDay.shareOfTotal.toFixed(0)}% du CA
            </span>
          </div>
          <div className="text-lg font-black text-slate-900">
            {insights.peakDay.dayName}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            {insights.peakDay.sales.toLocaleString()} {settings.currency} • {insights.peakDay.tickets} commande(s)
          </p>
        </div>

        {/* 2. Weekend vs Weekday share */}
        <div className="bg-gradient-to-br from-indigo-500/15 via-indigo-500/5 to-white p-3.5 rounded-2xl border border-indigo-200/50 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              Poids Week-End
            </span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-900">
              Ven - Dim
            </span>
          </div>
          <div className="text-lg font-black text-slate-900">
            {insights.weekendRatio.toFixed(1)}% <span className="text-xs font-bold text-indigo-700">du CA Total</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            {insights.weekendSales.toLocaleString()} {settings.currency} générés le week-end
          </p>
        </div>

        {/* 3. Average Ticket */}
        <div className="bg-gradient-to-br from-purple-500/15 via-purple-500/5 to-white p-3.5 rounded-2xl border border-purple-200/50 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-950 flex items-center gap-1">
              <Receipt className="w-3.5 h-3.5 text-purple-600" />
              Panier Moyen Hebdo
            </span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-900">
              Moyenne
            </span>
          </div>
          <div className="text-lg font-black text-slate-900">
            {Math.round(insights.avgTicketGlobal).toLocaleString()} <span className="text-xs font-bold text-purple-700">{settings.currency}</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Par client sur l'ensemble de la période
          </p>
        </div>

        {/* 4. Most Profitable Day */}
        <div className="bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-white p-3.5 rounded-2xl border border-emerald-200/50 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1">
              <Percent className="w-3.5 h-3.5 text-emerald-600" />
              Top Rentabilité
            </span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-900">
              {insights.mostProfitableDay.marginPercent.toFixed(0)}% Marge
            </span>
          </div>
          <div className="text-lg font-black text-emerald-900">
            {insights.mostProfitableDay.dayName}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            +{insights.mostProfitableDay.grossProfit.toLocaleString()} {settings.currency} de gain brut dégagé
          </p>
        </div>

      </div>

      {/* Interactive Controls Bar: Metric Selector & Chart Render Type */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
        
        {/* Metric Selector Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-black uppercase text-slate-400 mr-1 shrink-0">Métrique :</span>
          {[
            { id: 'sales', label: "Chiffre d'Affaires (CA)", icon: DollarSign },
            { id: 'profit', label: 'Marge & Bénéfices', icon: Percent },
            { id: 'tickets', label: 'Volume Commandes', icon: Receipt },
            { id: 'avgTicket', label: 'Panier Moyen', icon: ShoppingBag },
          ].map(m => {
            const Icon = m.icon;
            const isActive = activeMetric === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setActiveMetric(m.id as TrendMetric)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-amber-400 font-black shadow-xs ring-1 ring-amber-400/30'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Chart Style Switcher */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 self-start md:self-auto">
          <span className="text-[10px] font-black uppercase text-slate-400 px-2 hidden sm:inline">Style :</span>
          <button
            onClick={() => setChartStyle('smooth_area')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              chartStyle === 'smooth_area' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Courbe continue lissée (Spline monotone)"
          >
            Courbe Lissée
          </button>
          <button
            onClick={() => setChartStyle('composed_mixed')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              chartStyle === 'composed_mixed' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Graphique Mixte Barres + Courbe de Tendance"
          >
            Mixte (Barres + Courbe)
          </button>
          <button
            onClick={() => setChartStyle('clean_line')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              chartStyle === 'clean_line' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Ligne continue précise"
          >
            Ligne
          </button>
        </div>
      </div>

      {/* ================= RECHARTS CONTAINER ================= */}
      <div className="h-72 sm:h-80 w-full pt-2">
        {currentChartData.length === 0 || insights.totalSales === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 space-y-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Activity className="w-8 h-8 text-slate-300 stroke-[1.5]" />
            <p>Aucune transaction enregistrée pour calculer les tendances sur cette période.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartStyle === 'composed_mixed' ? (
              <ComposedChart data={currentChartData as any} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id={metricConfig.gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={metricConfig.color} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={metricConfig.color} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="keyLabel"
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '16px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '11px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
                    padding: '10px 14px'
                  }}
                  formatter={(val: any, name: any) => [
                    `${Number(val || 0).toLocaleString()} ${metricConfig.unit}`,
                    name
                  ]}
                  labelStyle={{ color: '#fbbf24', fontWeight: 800, marginBottom: '4px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar
                  dataKey={metricConfig.dataKey}
                  name={metricConfig.title}
                  fill={metricConfig.color}
                  radius={[8, 8, 0, 0]}
                  maxBarSize={45}
                >
                  {currentChartData.map((entry, index) => {
                    const isPeak = (entry as any).sales === insights.peakDay.sales && viewMode === 'day_of_week';
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={isPeak ? '#d97706' : metricConfig.color}
                        opacity={isPeak ? 1 : 0.85}
                      />
                    );
                  })}
                </Bar>
                {metricConfig.secondaryKey && (
                  <Line
                    type="monotone"
                    dataKey={metricConfig.secondaryKey}
                    name={metricConfig.secondaryName}
                    stroke={metricConfig.secondaryColor || '#10b981'}
                    strokeWidth={3}
                    dot={{ r: 4, fill: metricConfig.secondaryColor || '#10b981', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 7, fill: '#fff', stroke: metricConfig.secondaryColor || '#10b981', strokeWidth: 3 }}
                  />
                )}
              </ComposedChart>
            ) : chartStyle === 'clean_line' ? (
              <LineChart data={currentChartData as any} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="keyLabel"
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '16px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '11px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
                    padding: '10px 14px'
                  }}
                  formatter={(val: any, name: any) => [
                    `${Number(val || 0).toLocaleString()} ${metricConfig.unit}`,
                    name
                  ]}
                  labelStyle={{ color: '#fbbf24', fontWeight: 800, marginBottom: '4px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line
                  type="monotone"
                  dataKey={metricConfig.dataKey}
                  name={metricConfig.title}
                  stroke={metricConfig.color}
                  strokeWidth={3.5}
                  dot={{ r: 4, fill: metricConfig.color, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7, fill: '#fff', stroke: metricConfig.color, strokeWidth: 3 }}
                />
                {metricConfig.secondaryKey && (
                  <Line
                    type="monotone"
                    dataKey={metricConfig.secondaryKey}
                    name={metricConfig.secondaryName}
                    stroke={metricConfig.secondaryColor || '#10b981'}
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: metricConfig.secondaryColor || '#10b981' }}
                  />
                )}
              </LineChart>
            ) : (
              <AreaChart data={currentChartData as any} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id={metricConfig.gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={metricConfig.color} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={metricConfig.color} stopOpacity={0.0} />
                  </linearGradient>
                  {metricConfig.secondaryKey && (
                    <linearGradient id="secGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={metricConfig.secondaryColor || '#10b981'} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={metricConfig.secondaryColor || '#10b981'} stopOpacity={0.0} />
                    </linearGradient>
                  )}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="keyLabel"
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '16px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '11px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
                    padding: '10px 14px'
                  }}
                  formatter={(val: any, name: any) => [
                    `${Number(val || 0).toLocaleString()} ${metricConfig.unit}`,
                    name
                  ]}
                  labelStyle={{ color: '#fbbf24', fontWeight: 800, marginBottom: '4px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area
                  type="monotone"
                  dataKey={metricConfig.dataKey}
                  name={metricConfig.title}
                  stroke={metricConfig.color}
                  strokeWidth={3}
                  fillOpacity={1}
                  fill={`url(#${metricConfig.gradientId})`}
                  dot={{ r: 4, fill: metricConfig.color, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7, fill: '#fff', stroke: metricConfig.color, strokeWidth: 3 }}
                />
                {metricConfig.secondaryKey && (
                  <Area
                    type="monotone"
                    dataKey={metricConfig.secondaryKey}
                    name={metricConfig.secondaryName}
                    stroke={metricConfig.secondaryColor || '#10b981'}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#secGrad)"
                    dot={{ r: 3, fill: metricConfig.secondaryColor || '#10b981' }}
                  />
                )}
              </AreaChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Day by Day Quick Summary Table with Weekend Badges */}
      {viewMode === 'day_of_week' && (
        <div className="pt-3 border-t border-slate-100 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-100">
                <th className="py-2 px-2">Jour</th>
                <th className="py-2 px-2 text-right">Recettes (CA)</th>
                <th className="py-2 px-2 text-right">Marge Brute</th>
                <th className="py-2 px-2 text-center">Taux Marge %</th>
                <th className="py-2 px-2 text-center">Commandes</th>
                <th className="py-2 px-2 text-right">Panier Moyen</th>
                <th className="py-2 px-2 text-right">Part Semaine</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {dayOfWeekTrends.map(day => {
                const isPeak = day.sales === insights.peakDay.sales && insights.totalSales > 0;
                return (
                  <tr
                    key={day.dayName}
                    className={`hover:bg-slate-50 transition ${isPeak ? 'bg-amber-50/40 font-bold' : ''}`}
                  >
                    <td className="py-2 px-2 font-bold text-slate-900 flex items-center space-x-1.5">
                      <span>{day.dayName}</span>
                      {isPeak && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500 text-slate-950">
                          PIC
                        </span>
                      )}
                      {day.isWeekend && !isPeak && (
                        <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700">
                          WE
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right font-black text-slate-900">
                      {day.sales.toLocaleString()} {settings.currency}
                    </td>
                    <td className="py-2 px-2 text-right font-bold text-emerald-700">
                      +{day.grossProfit.toLocaleString()} {settings.currency}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className="font-extrabold text-[11px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800">
                        {day.marginPercent.toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center font-bold text-slate-800">
                      {day.tickets}
                    </td>
                    <td className="py-2 px-2 text-right font-bold text-slate-700">
                      {Math.round(day.avgTicket).toLocaleString()} {settings.currency}
                    </td>
                    <td className="py-2 px-2 text-right font-black text-amber-700">
                      {day.shareOfTotal.toFixed(1)}%
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
};
