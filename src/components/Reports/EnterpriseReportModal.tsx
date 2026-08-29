import React, { useState, useMemo } from 'react';
import { useBar } from '../../context/BarContext';
import { EnterpriseReportType, ReportCustomization } from '../../types';
import { printElementById } from '../../utils/receiptGenerator';
import { generateReportIntegrityHash, HAITIAN_BANKS, STATE_ENTITIES } from '../../utils/reportSecurity';
import { 
  Printer, 
  X, 
  FileText, 
  Building2, 
  Calendar, 
  Check, 
  Download, 
  TrendingUp, 
  Package, 
  Receipt, 
  DollarSign, 
  PieChart, 
  ShieldCheck, 
  FileCheck,
  Sliders,
  Settings2,
  Landmark,
  Scale,
  Lock,
  Sparkles,
  Award,
  CheckCircle2,
  Percent,
  Flame,
  Activity,
  Layers,
  BarChart3
} from 'lucide-react';

interface EnterpriseReportModalProps {
  onClose: () => void;
  defaultReportType?: EnterpriseReportType;
}

export const EnterpriseReportModal: React.FC<EnterpriseReportModalProps> = ({ 
  onClose,
  defaultReportType = 'consolidated_financial' 
}) => {
  const { products, sales, expenses, stockLogs, settings, activeCompany } = useBar();

  // Customization Configuration State
  const [config, setConfig] = useState<ReportCustomization>({
    reportType: defaultReportType,
    period: 'month',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    includeLogo: true,
    includeManagerNotes: true,
    managerNotes: 'Rapport officiel certifié conforme aux registres de caisse et de stock informatisés.',
    includeSignatures: true,
    printFormat: 'a4',
    targetEntity: defaultReportType === 'tax_compliance_dgi' ? 'state_dgi' : defaultReportType === 'bank_credit_statement' ? 'bank' : 'internal',
    recipientName: defaultReportType === 'tax_compliance_dgi' 
      ? 'Direction Générale des Impôts (DGI) - Bureau des Contributions' 
      : defaultReportType === 'bank_credit_statement' 
      ? 'UNIBANK S.A. - Direction du Crédit Commercial' 
      : '',
    bankAccountReference: '',
    includeIntegrityHash: true,
  });

  const [activeTab, setActiveTab] = useState<'configure' | 'preview'>('preview');

  // Filter Data based on selected period
  const filteredData = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (config.period === 'today') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (config.period === 'yesterday') {
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
    } else if (config.period === '7days') {
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else if (config.period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    } else if (config.period === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (config.period === 'quarter') {
      const q = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), q * 3, 1, 0, 0, 0);
      end = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999);
    } else if (config.period === 'year') {
      start = new Date(now.getFullYear(), 0, 1);
    } else if (config.period === 'last_year') {
      start = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0);
      end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    } else if (config.period === 'all_time') {
      start = new Date(2020, 0, 1, 0, 0, 0);
      end = new Date(now.getFullYear() + 1, 11, 31, 23, 59, 59, 999);
    } else if (config.period === 'custom' && config.startDate && config.endDate) {
      start = new Date(config.startDate + 'T00:00:00');
      end = new Date(config.endDate + 'T23:59:59');
    }

    // Filter Sales
    const matchedSales = sales.filter(s => {
      if (s.status !== 'completed') return false;
      const d = new Date(s.timestamp);
      return d >= start && d <= end;
    });

    // Filter Expenses
    const matchedExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d >= start && d <= end;
    });

    // Filter Stock Logs
    const matchedLogs = stockLogs.filter(l => {
      const d = new Date(l.timestamp);
      return d >= start && d <= end;
    });

    // Financial Metrics
    const totalSalesRevenue = matchedSales.reduce((sum, s) => sum + s.total, 0);
    const totalExpensesAmount = matchedExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Calculate Tax Metrics (DGI Compliance)
    const totalTaxRecorded = matchedSales.reduce((sum, s) => sum + ((s as any).tax ?? s.taxTotal ?? 0), 0);
    const taxRate = settings.taxRate || 10;
    const taxableBase = totalSalesRevenue / (1 + (taxRate / 100));
    const computedTax = totalTaxRecorded > 0 ? totalTaxRecorded : (totalSalesRevenue - taxableBase);

    // Calculate COGS (Cost of Goods Sold)
    let totalCOGS = 0;
    matchedSales.forEach(s => {
      s.items.forEach(item => {
        const prod = products.find(p => p.id === item.product.id);
        const costPrice = prod ? prod.costPrice : (item.product.costPrice || 0);
        totalCOGS += costPrice * item.quantity;
      });
    });

    const grossProfit = totalSalesRevenue - totalCOGS;
    const netProfit = totalSalesRevenue - totalExpensesAmount;

    // Banking Ratios
    const daysInPeriod = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const averageDailyRevenue = totalSalesRevenue / daysInPeriod;
    const averageTicket = matchedSales.length > 0 ? totalSalesRevenue / matchedSales.length : 0;
    const grossMarginPercent = totalSalesRevenue > 0 ? (grossProfit / totalSalesRevenue) * 100 : 0;
    const netMarginPercent = totalSalesRevenue > 0 ? (netProfit / totalSalesRevenue) * 100 : 0;
    const ebitda = totalSalesRevenue - totalCOGS - totalExpensesAmount;
    const ebitdaMarginPercent = totalSalesRevenue > 0 ? (ebitda / totalSalesRevenue) * 100 : 0;

    // Payment Methods Breakdown
    const paymentBreakdown = matchedSales.reduce((acc, s) => {
      acc[s.paymentMethod] = (acc[s.paymentMethod] || 0) + s.total;
      return acc;
    }, {} as Record<string, number>);

    // Product Sales Ranking
    const productSalesMap: Record<string, { name: string; category: string; qty: number; revenue: number }> = {};
    matchedSales.forEach(s => {
      s.items.forEach(item => {
        const pid = item.product.id;
        if (!productSalesMap[pid]) {
          productSalesMap[pid] = {
            name: item.product.name,
            category: item.product.category,
            qty: 0,
            revenue: 0,
          };
        }
        productSalesMap[pid].qty += item.quantity;
        productSalesMap[pid].revenue += (item.product.price * item.quantity) - item.discount;
      });
    });

    const topSellingProducts = Object.values(productSalesMap).sort((a, b) => b.revenue - a.revenue);

    // Product Profitability & Margins Metrics (Reflecting recent app financial upgrades)
    const productProfitabilityReportList = products.map(p => {
      const soldInfo = productSalesMap[p.id] || { qty: 0, revenue: 0 };
      const unitMargin = p.price - p.costPrice;
      const unitMarginPercent = p.price > 0 ? (unitMargin / p.price) * 100 : 0;
      const multiplier = p.costPrice > 0 ? (p.price / p.costPrice) : 1;
      const totalMarginGenerated = unitMargin * soldInfo.qty;

      return {
        id: p.id,
        name: p.name,
        category: p.category,
        costPrice: p.costPrice,
        sellingPrice: p.price,
        unit: p.unit,
        stock: p.stock,
        unitMargin,
        unitMarginPercent,
        multiplier,
        unitsSold: soldInfo.qty,
        totalRevenue: soldInfo.revenue,
        totalMarginGenerated
      };
    }).sort((a, b) => b.totalMarginGenerated - a.totalMarginGenerated);

    // Weekly Day by Day Trends
    const daysConfig = [
      { dayIndex: 1, dayName: 'Lundi', shortName: 'Lun', isWeekend: false },
      { dayIndex: 2, dayName: 'Mardi', shortName: 'Mar', isWeekend: false },
      { dayIndex: 3, dayName: 'Mercredi', shortName: 'Mer', isWeekend: false },
      { dayIndex: 4, dayName: 'Jeudi', shortName: 'Jeu', isWeekend: false },
      { dayIndex: 5, dayName: 'Vendredi', shortName: 'Ven', isWeekend: true },
      { dayIndex: 6, dayName: 'Samedi', shortName: 'Sam', isWeekend: true },
      { dayIndex: 0, dayName: 'Dimanche', shortName: 'Dim', isWeekend: true },
    ];

    const totalsByDay: Record<number, { sales: number; cogs: number; tickets: number }> = {
      0: { sales: 0, cogs: 0, tickets: 0 },
      1: { sales: 0, cogs: 0, tickets: 0 },
      2: { sales: 0, cogs: 0, tickets: 0 },
      3: { sales: 0, cogs: 0, tickets: 0 },
      4: { sales: 0, cogs: 0, tickets: 0 },
      5: { sales: 0, cogs: 0, tickets: 0 },
      6: { sales: 0, cogs: 0, tickets: 0 },
    };

    matchedSales.forEach(sale => {
      const day = new Date(sale.timestamp).getDay();
      totalsByDay[day].sales += sale.total;
      totalsByDay[day].tickets += 1;
      const saleCost = sale.items.reduce((sum, item) => {
        const prod = products.find(p => p.id === item.product.id);
        const cost = prod ? prod.costPrice : (item.product.costPrice || 0);
        return sum + (cost * item.quantity);
      }, 0);
      totalsByDay[day].cogs += saleCost;
    });

    const weeklyDayTrends = daysConfig.map(day => {
      const data = totalsByDay[day.dayIndex];
      const grossProfit = data.sales - data.cogs;
      const avgTicket = data.tickets > 0 ? data.sales / data.tickets : 0;
      const marginPercent = data.sales > 0 ? (grossProfit / data.sales) * 100 : 0;
      const shareOfTotal = totalSalesRevenue > 0 ? (data.sales / totalSalesRevenue) * 100 : 0;

      return {
        ...day,
        sales: data.sales,
        cogs: data.cogs,
        grossProfit,
        tickets: data.tickets,
        avgTicket,
        marginPercent,
        shareOfTotal
      };
    });

    // Stock Valuation Metrics
    const totalStockCostValuation = products.reduce((sum, p) => sum + (p.stock * p.costPrice), 0);
    const totalStockSalesValuation = products.reduce((sum, p) => sum + (p.stock * p.price), 0);
    const lowStockItemsCount = products.filter(p => p.stock <= p.minStockAlert).length;

    // Zero-Hallucination Integrity Hash
    const integrityHash = generateReportIntegrityHash(
      activeCompany?.code || settings.barName,
      settings.nifCif || 'HT-NIF-000',
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0],
      matchedSales.length,
      totalSalesRevenue,
      computedTax
    );

    return {
      startDateStr: start.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      endDateStr: end.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      sales: matchedSales,
      expenses: matchedExpenses,
      logs: matchedLogs,
      totalSalesRevenue,
      totalExpensesAmount,
      totalCOGS,
      grossProfit,
      netProfit,
      taxRate,
      taxableBase,
      computedTax,
      totalTaxRecorded,
      daysInPeriod,
      averageDailyRevenue,
      averageTicket,
      grossMarginPercent,
      netMarginPercent,
      ebitda,
      ebitdaMarginPercent,
      paymentBreakdown,
      topSellingProducts,
      productProfitabilityReportList,
      weeklyDayTrends,
      totalStockCostValuation,
      totalStockSalesValuation,
      lowStockItemsCount,
      integrityHash
    };
  }, [config, sales, expenses, stockLogs, products, settings, activeCompany]);

  const handlePrint = () => {
    const reportTitle = getReportTitle(config.reportType);
    if (activeTab !== 'preview') {
      setActiveTab('preview');
      setTimeout(() => {
        printElementById('printable-report-area', `${reportTitle} - ${settings.barName}`);
      }, 250);
    } else {
      printElementById('printable-report-area', `${reportTitle} - ${settings.barName}`);
    }
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `Rapport Entreprise - ${settings.barName}\n`;
    csvContent += `Type: ${config.reportType}\n`;
    csvContent += `Periode: du ${filteredData.startDateStr} au ${filteredData.endDateStr}\n`;
    csvContent += `NIF/CIF: ${settings.nifCif || 'N/A'}\n`;
    csvContent += `Certification Hash: ${filteredData.integrityHash}\n\n`;

    if (config.reportType === 'tax_compliance_dgi') {
      csvContent += "Chiffre d'Affaires Brut,Base Imposable,Taux TVA,Montant TVA Collecte,Total Depenses,Resultat Net\n";
      csvContent += `${filteredData.totalSalesRevenue},${filteredData.taxableBase.toFixed(2)},${filteredData.taxRate}%,${filteredData.computedTax.toFixed(2)},${filteredData.totalExpensesAmount},${filteredData.netProfit}\n\n`;
      csvContent += "N Reçu,Date,Mode Paiement,Total Vente,Taxe\n";
      filteredData.sales.forEach(s => {
        csvContent += `"${s.receiptNumber}","${new Date(s.timestamp).toLocaleString()}","${s.paymentMethod}",${s.total},${(s as any).tax ?? s.taxTotal ?? 0}\n`;
      });
    } else if (config.reportType === 'bank_credit_statement') {
      csvContent += "Chiffre Affaires Total,Moyenne Journaliere,Panier Moyen,Marge Brute %,EBITDA,Stock Prix Coutant,Stock Prix Vente\n";
      csvContent += `${filteredData.totalSalesRevenue},${filteredData.averageDailyRevenue.toFixed(2)},${filteredData.averageTicket.toFixed(2)},${filteredData.grossMarginPercent.toFixed(1)}%,${filteredData.ebitda},${filteredData.totalStockCostValuation},${filteredData.totalStockSalesValuation}\n`;
    } else if (config.reportType === 'profitability_margins') {
      csvContent += "Code,Produit,Categorie,Stock,Prix Achat,Prix Vente,Marge Unitaire,Taux Marge %,Coeff Multiplicateur,Unites Vendues,CA Genere,Marge Totale\n";
      filteredData.productProfitabilityReportList.forEach(p => {
        csvContent += `"${p.id}","${p.name}","${p.category}",${p.stock},${p.costPrice},${p.sellingPrice},${p.unitMargin},${p.unitMarginPercent.toFixed(1)}%,x${p.multiplier.toFixed(2)},${p.unitsSold},${p.totalRevenue},${p.totalMarginGenerated}\n`;
      });
    } else if (config.reportType === 'weekly_sales_trends') {
      csvContent += "Jour,Recettes (CA),Cout Matiere (COGS),Marge Brute,Taux Marge %,Commandes (Tickets),Panier Moyen,Part Total %\n";
      filteredData.weeklyDayTrends.forEach(d => {
        csvContent += `"${d.dayName}",${d.sales},${d.cogs},${d.grossProfit},${d.marginPercent.toFixed(1)}%,${d.tickets},${d.avgTicket.toFixed(2)},${d.shareOfTotal.toFixed(1)}%\n`;
      });
    } else if (config.reportType === 'inventory_perpetual') {
      csvContent += "Code,Produit,Categorie,Stock Actuel,Unite,Prix Coutant,Prix Vente,Valeur Stock Coût,Valeur Stock Vente,Statut\n";
      products.forEach(p => {
        const status = p.stock === 0 ? "Rupture" : p.stock <= p.minStockAlert ? "Alerte Stock" : "Normal";
        csvContent += `"${p.id}","${p.name}","${p.category}",${p.stock},"${p.unit}",${p.costPrice},${p.price},${p.stock * p.costPrice},${p.stock * p.price},"${status}"\n`;
      });
    } else {
      csvContent += "N Reçu,Date,Mode Paiement,Client/Table,Caissier,Montant Total\n";
      filteredData.sales.forEach(s => {
        csvContent += `"${s.receiptNumber}","${new Date(s.timestamp).toLocaleString()}","${s.paymentMethod}","${s.tableName || 'Comptoir'}","${s.cashierName}",${s.total}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rapport_${settings.barName.replace(/\s+/g, '_')}_${config.reportType}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getReportTitle = (type: EnterpriseReportType) => {
    switch (type) {
      case 'tax_compliance_dgi': return "Déclaration de Conformité Fiscale & Chiffre d'Affaires (DGI)";
      case 'bank_credit_statement': return "Attestation Financière Officielle & Dossier de Crédit Bancaire";
      case 'profitability_margins': return "Rapport de Rentabilité, Marges & Coefficients Multiplicateurs";
      case 'weekly_sales_trends': return "Rapport Analytique des Tendances & Profil Hebdomadaire";
      case 'consolidated_financial': return "Bilan Financier & Opérationnel Consolidé";
      case 'inventory_perpetual': return "Rapport d'Inventaire & État du Stock Perpétuel";
      case 'z_close_cashier': return "Procès-Verbal de Clôture Z & Caisse";
      case 'expenses_procurement': return "Rapport des Dépenses & Achats Fournisseurs";
      case 'sales_analytics': return "Rapport Analytique des Ventes & Performances";
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fadeIn overflow-y-auto overscroll-contain">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-5xl w-full max-h-[94dvh] flex flex-col shadow-2xl overflow-hidden text-slate-900 relative my-auto">
        
        {/* Modal Header Controls (Hidden during print) */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black leading-tight flex items-center gap-2">
                <span>Rapports & Certifications Officielles</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                  Zéro Hallucination • 100% Réel
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {settings.barName} — {getReportTitle(config.reportType)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="bg-slate-800 p-1 rounded-xl flex items-center space-x-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('configure')}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center space-x-1 cursor-pointer ${
                  activeTab === 'configure' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Configuration</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center space-x-1 cursor-pointer ${
                  activeTab === 'preview' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Aperçu Impression</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition cursor-pointer ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TAB 1: CONFIGURATION CONTROLS */}
        {activeTab === 'configure' && (
          <div className="p-6 overflow-y-auto space-y-6 no-print flex-1">
            
            {/* 1. Report Type Selection */}
            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2">
                1. Choisissez le type de rapport ou certification
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  {
                    id: 'tax_compliance_dgi',
                    label: "Déclaration Fiscale d'État (DGI)",
                    desc: 'Certificat officiel de CA imposable, TVA/TCS collectée, NIF & conformité fiscale.',
                    badge: 'Organismes d\'État',
                    icon: <Scale className="w-5 h-5 text-red-600" />
                  },
                  {
                    id: 'bank_credit_statement',
                    label: 'Dossier de Crédit Bancaire (Banques)',
                    desc: 'Attestation pour Unibank, Sogebank, BNC, BUH avec ratios, EBITDA et flux certifiés.',
                    badge: 'Banques & Prêts',
                    icon: <Landmark className="w-5 h-5 text-emerald-600" />
                  },
                  {
                    id: 'profitability_margins',
                    label: 'Rentabilité & Coefficients (Marges)',
                    desc: 'Tableau exhaustif des marges par produit, coefficients multiplicateurs et gains bruts.',
                    badge: 'Rentabilité & Marges',
                    icon: <Percent className="w-5 h-5 text-emerald-600" />
                  },
                  {
                    id: 'weekly_sales_trends',
                    label: 'Tendances & Profil Hebdomadaire',
                    desc: 'Rythme d\'activité Lun-Dim, pics d\'affluence, panier moyen et part week-end.',
                    badge: 'Tendances Hebdo',
                    icon: <TrendingUp className="w-5 h-5 text-amber-600" />
                  },
                  {
                    id: 'consolidated_financial',
                    label: 'Bilan Financier Consolidé',
                    desc: 'Aperçu global des recettes, dépenses, profits nets et marges réelles.',
                    badge: 'Gestion Interne',
                    icon: <Layers className="w-5 h-5 text-amber-600" />
                  },
                  {
                    id: 'inventory_perpetual',
                    label: 'Inventaire & Stock Perpétuel',
                    desc: 'Liste complète des produits, valeur d\'achat/vente et alertes.',
                    badge: 'Patrimoine Stock',
                    icon: <Package className="w-5 h-5 text-blue-600" />
                  },
                  {
                    id: 'z_close_cashier',
                    label: 'Clôture Z / Caisse Journalière',
                    desc: 'Procès-verbal de fin de journée pour comptabilité et recettes.',
                    badge: 'Contrôle Caisse',
                    icon: <Receipt className="w-5 h-5 text-purple-600" />
                  },
                  {
                    id: 'expenses_procurement',
                    label: 'Dépenses & Achats Fournisseurs',
                    desc: 'Registre détaillé des achats fournisseurs, factures et charges.',
                    badge: 'Charges & Achats',
                    icon: <DollarSign className="w-5 h-5 text-cyan-600" />
                  },
                  {
                    id: 'sales_analytics',
                    label: 'Analyse des Ventes & Produits',
                    desc: 'Classement des meilleures ventes et ventilation des paiements.',
                    badge: 'Performance',
                    icon: <PieChart className="w-5 h-5 text-indigo-600" />
                  },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setConfig(prev => ({ 
                        ...prev, 
                        reportType: item.id as any,
                        targetEntity: item.id === 'tax_compliance_dgi' ? 'state_dgi' : item.id === 'bank_credit_statement' ? 'bank' : 'internal',
                        recipientName: item.id === 'tax_compliance_dgi' 
                          ? 'Direction Générale des Impôts (DGI) - Bureau des Contributions' 
                          : item.id === 'bank_credit_statement' 
                          ? 'UNIBANK S.A. - Direction du Crédit Commercial' 
                          : ''
                      }));
                    }}
                    className={`p-4 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between space-y-2 ${
                      config.reportType === item.id
                        ? 'border-amber-500 bg-amber-50/50 shadow-sm ring-2 ring-amber-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-2xs">
                        {item.icon}
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {item.badge}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900">{item.label}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Destinataire Officiel & Entité Cible (DGI, Banques) */}
            {(config.reportType === 'tax_compliance_dgi' || config.reportType === 'bank_credit_statement') && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center space-x-2 text-xs font-black text-slate-900 uppercase">
                  <Landmark className="w-4 h-4 text-amber-600" />
                  <span>Destinataire Officiel & Identification Bancaire / Fiscale</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Sélectionner l'organisme ou la banque destinataire :
                    </label>
                    <select
                      value={config.recipientName}
                      onChange={(e) => setConfig(prev => ({ ...prev, recipientName: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-500"
                    >
                      {config.reportType === 'tax_compliance_dgi' ? (
                        STATE_ENTITIES.map(ent => (
                          <option key={ent.id} value={ent.name}>{ent.name}</option>
                        ))
                      ) : (
                        HAITIAN_BANKS.map(bank => (
                          <option key={bank.id} value={bank.name}>{bank.name}</option>
                        ))
                      )}
                      <option value="Autre Institution Officielle">Autre Institution Officielle...</option>
                    </select>
                  </div>

                  {config.reportType === 'bank_credit_statement' && (
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        N° Compte Bancaire de l'entreprise (pour attestation) :
                      </label>
                      <input
                        type="text"
                        placeholder="ex: 101-2039-482910-HTG"
                        value={config.bankAccountReference || ''}
                        onChange={(e) => setConfig(prev => ({ ...prev, bankAccountReference: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  )}
                </div>

                <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start space-x-2 text-[11px] text-amber-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Garantie Zéro-Hallucination :</strong> Tous les totaux, montants de taxes et moyennes sont calculés mathématiquement à 100% à partir des ventes et dépenses enregistrées dans le système. Le document comporte un hachage d'audit cryptographique infalsifiable.
                  </span>
                </div>
              </div>
            )}

            {/* 3. Period Selection */}
            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2">
                3. Période couverte par le rapport
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'today', label: "Aujourd'hui" },
                  { id: 'yesterday', label: "Hier" },
                  { id: '7days', label: "7 derniers jours" },
                  { id: 'month', label: "Ce mois-ci" },
                  { id: 'last_month', label: "Mois précédent" },
                  { id: 'quarter', label: "Ce trimestre" },
                  { id: 'year', label: "Cette année fiscale" },
                  { id: 'last_year', label: "Exercice précédent" },
                  { id: 'all_time', label: "Historique complet" },
                  { id: 'custom', label: "Période sur-mesure" },
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, period: p.id as any }))}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      config.period === p.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {config.period === 'custom' && (
                <div className="grid grid-cols-2 gap-3 mt-3 max-w-md bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Date de début</label>
                    <input
                      type="date"
                      value={config.startDate}
                      onChange={(e) => setConfig(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Date de fin</label>
                    <input
                      type="date"
                      value={config.endDate}
                      onChange={(e) => setConfig(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 4. Options & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Options d'Affichage
                </h4>
                <div className="space-y-2 text-xs">
                  <label className="flex items-center space-x-2 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={config.includeLogo}
                      onChange={(e) => setConfig(prev => ({ ...prev, includeLogo: e.target.checked }))}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span>Inclure l'en-tête & logo de l'entreprise</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={config.includeSignatures}
                      onChange={(e) => setConfig(prev => ({ ...prev, includeSignatures: e.target.checked }))}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span>Inclure blocs de signature & cachet officiel</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={config.includeIntegrityHash}
                      onChange={(e) => setConfig(prev => ({ ...prev, includeIntegrityHash: e.target.checked }))}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span>Inclure l'empreinte numérique d'intégrité (Anti-falsification)</span>
                  </label>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Remarques du Gérant / Note Officielle
                </h4>
                <textarea
                  value={config.managerNotes || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, managerNotes: e.target.value }))}
                  placeholder="Note ou commentaire légal à ajouter à la fin du document..."
                  rows={4}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center space-x-2 cursor-pointer"
              >
                <span>Voir le Document Certifié</span>
                <FileCheck className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}

        {/* TAB 2: LIVE PRINTABLE REPORT PREVIEW */}
        {activeTab === 'preview' && (
          <div className="flex-1 overflow-y-auto bg-slate-200/70 p-3 sm:p-6 flex flex-col items-center">
            
            {/* Printable Document Sheet Container */}
            <div 
              id="printable-report-area"
              className={`bg-white text-slate-900 shadow-2xl rounded-xl p-6 sm:p-10 w-full transition-all border border-slate-300 ${
                config.printFormat === 'receipt' ? 'max-w-xs p-4 text-xs font-mono' : 'max-w-3xl'
              }`}
            >
              
              {/* Document Letterhead Header */}
              <div className="border-b-2 border-slate-900 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  {config.includeLogo && settings.logo ? (
                    <img
                      src={settings.logo}
                      alt={settings.barName}
                      className="w-14 h-14 object-contain rounded-xl border border-slate-200 bg-white p-1 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-900 text-amber-400 font-black text-xl flex items-center justify-center shrink-0">
                      {settings.barName.charAt(0)}
                    </div>
                  )}

                  <div>
                    <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                      {settings.barName}
                    </h1>
                    <p className="text-xs text-slate-600 font-medium">
                      {settings.businessSectorName || settings.tagline || 'Entreprise Commerciale & Services'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {settings.address} — Tél : {settings.phone}
                    </p>
                    <div className="flex flex-wrap gap-2 text-[10px] text-slate-700 font-bold mt-1">
                      {settings.nifCif && (
                        <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                          NIF/Patente : {settings.nifCif}
                        </span>
                      )}
                      {settings.rcNumber && (
                        <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                          RC : {settings.rcNumber}
                        </span>
                      )}
                      {activeCompany?.code && (
                        <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                          Code Entreprise : {activeCompany.code}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right text-xs space-y-0.5 shrink-0 bg-slate-50 sm:bg-transparent p-2.5 sm:p-0 rounded-lg border sm:border-0 border-slate-200">
                  <span className="inline-block px-2 py-0.5 bg-slate-900 text-amber-400 font-black text-[10px] uppercase rounded mb-1">
                    {config.reportType === 'tax_compliance_dgi' ? 'Déclaration Fiscale' : config.reportType === 'bank_credit_statement' ? 'Attestation Bancaire' : 'Document Officiel'}
                  </span>
                  <p className="font-extrabold text-slate-900">{getReportTitle(config.reportType)}</p>
                  <p className="text-slate-500">Période : {filteredData.startDateStr} au {filteredData.endDateStr}</p>
                  <p className="text-slate-400 text-[10px]">Émis le : {new Date().toLocaleString('fr-FR')}</p>
                  {config.recipientName && (
                    <p className="text-[11px] font-bold text-amber-900 mt-1">
                      À l'attention de : {config.recipientName}
                    </p>
                  )}
                </div>
              </div>

              {/* REPORT CONTENT TYPE 0: TAX COMPLIANCE & STATE DGI DECLARATION */}
              {config.reportType === 'tax_compliance_dgi' && (
                <div className="space-y-6">
                  {/* Fiscal Notice Banner */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-900 uppercase">
                        Déclaration Récapitulative du Chiffre d'Affaires & Contributions Fiscales
                      </span>
                      <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold rounded">
                        DGI / Contributions Directes
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      Conformément aux dispositions du Code Fiscal, ce récapitulatif atteste des recettes brutes perçues et des taxes collectées sur la période spécifiée.
                    </p>
                  </div>

                  {/* Fiscal Numbers Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Recettes Brutes (TTC)</span>
                      <span className="text-base font-black text-slate-900">
                        {filteredData.totalSalesRevenue.toLocaleString()} {settings.currency}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Base Hors Taxe (HT)</span>
                      <span className="text-base font-black text-slate-800">
                        {Math.round(filteredData.taxableBase).toLocaleString()} {settings.currency}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">TVA / Taxe ({filteredData.taxRate}%)</span>
                      <span className="text-base font-black text-red-600">
                        {Math.round(filteredData.computedTax).toLocaleString()} {settings.currency}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Charges Déductibles</span>
                      <span className="text-base font-black text-slate-700">
                        {filteredData.totalExpensesAmount.toLocaleString()} {settings.currency}
                      </span>
                    </div>
                  </div>

                  {/* Monthly & Daily Breakdown */}
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider mb-2">
                      Ventilation des Recettes Fiscales & Modes de Règlements
                    </h3>
                    <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
                      <thead className="bg-slate-100 text-slate-700 font-black">
                        <tr>
                          <th className="p-2 border-b border-slate-200">Mode de Paiement</th>
                          <th className="p-2 border-b border-slate-200 text-right">Volume Encaissé</th>
                          <th className="p-2 border-b border-slate-200 text-right">Part relative</th>
                          <th className="p-2 border-b border-slate-200 text-right">TVA Associée ({filteredData.taxRate}%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {Object.entries(filteredData.paymentBreakdown).map(([method, amount]) => {
                          const pct = filteredData.totalSalesRevenue > 0 ? ((amount / filteredData.totalSalesRevenue) * 100).toFixed(1) : '0.0';
                          const estTax = (amount - (amount / (1 + filteredData.taxRate / 100)));
                          return (
                            <tr key={method}>
                              <td className="p-2 font-bold">{method}</td>
                              <td className="p-2 text-right font-black">{amount.toLocaleString()} {settings.currency}</td>
                              <td className="p-2 text-right text-slate-600">{pct}%</td>
                              <td className="p-2 text-right text-red-600 font-bold">{Math.round(estTax).toLocaleString()} {settings.currency}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary of Volume */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-800">Nombre de transactions contrôlées : </span>
                      <span className="font-black text-slate-900">{filteredData.sales.length} factures / reçus de caisse</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-800">Bénéfice Net d'Exploitation : </span>
                      <span className="font-black text-emerald-700">{filteredData.netProfit.toLocaleString()} {settings.currency}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* REPORT CONTENT TYPE 00: BANK CREDIT STATEMENT & LOAN DOSSIER */}
              {config.reportType === 'bank_credit_statement' && (
                <div className="space-y-6">
                  {/* Bank Header Card */}
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-emerald-950 uppercase flex items-center gap-1.5">
                        <Landmark className="w-4 h-4 text-emerald-700" />
                        Attestation de Solvabilité & Chiffre d'Affaires pour Établissement Bancaire
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 text-[10px] font-bold rounded">
                        Dossier de Crédit / Prêt
                      </span>
                    </div>
                    <p className="text-emerald-800 text-[11px]">
                      Document officiel certifiant la viabilité économique, le flux de trésorerie net et la valeur des actifs de l'entreprise.
                      {config.bankAccountReference ? ` Compte n° ${config.bankAccountReference}.` : ''}
                    </p>
                  </div>

                  {/* Banking Key Financial Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Chiffre d'Affaires Période</span>
                      <span className="text-base font-black text-slate-900">
                        {filteredData.totalSalesRevenue.toLocaleString()} {settings.currency}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Moy. {Math.round(filteredData.averageDailyRevenue).toLocaleString()} {settings.currency}/jour
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Marge Brute Réelle</span>
                      <span className="text-base font-black text-emerald-700">
                        {filteredData.grossMarginPercent.toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {filteredData.grossProfit.toLocaleString()} {settings.currency}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">EBITDA Opérationnel</span>
                      <span className="text-base font-black text-slate-900">
                        {filteredData.ebitda.toLocaleString()} {settings.currency}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Marge : {filteredData.ebitdaMarginPercent.toFixed(1)}%
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Actif Stock (Coût)</span>
                      <span className="text-base font-black text-blue-700">
                        {filteredData.totalStockCostValuation.toLocaleString()} {settings.currency}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Revente : {filteredData.totalStockSalesValuation.toLocaleString()} {settings.currency}
                      </span>
                    </div>
                  </div>

                  {/* Cashflow & Health Indicators */}
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider mb-2">
                      Indicateurs d'Activité & Régularité des Encaissements
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Panier Moyen Client</span>
                        <strong className="text-sm font-black text-slate-900">{Math.round(filteredData.averageTicket).toLocaleString()} {settings.currency}</strong>
                        <p className="text-[10px] text-slate-500 mt-1">Sur {filteredData.sales.length} transactions auditées</p>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Ratio Dépenses / CA</span>
                        <strong className="text-sm font-black text-slate-900">
                          {filteredData.totalSalesRevenue > 0 ? ((filteredData.totalExpensesAmount / filteredData.totalSalesRevenue) * 100).toFixed(1) : 0}%
                        </strong>
                        <p className="text-[10px] text-slate-500 mt-1">Charges maîtrisées sur la période</p>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Encaissements Liquides (Cash/MonCash)</span>
                        <strong className="text-sm font-black text-emerald-700">
                          {((filteredData.paymentBreakdown['Espèces'] || 0) + (filteredData.paymentBreakdown['MonCash'] || 0)).toLocaleString()} {settings.currency}
                        </strong>
                        <p className="text-[10px] text-slate-500 mt-1">Liquidités directes immédiatement disponibles</p>
                      </div>
                    </div>
                  </div>

                  {/* Top Products Driving Turnover */}
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider mb-2">
                      Principales Lignes de Revenus (Top Produits & Services)
                    </h3>
                    <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
                      <thead className="bg-slate-100 text-slate-700 font-black">
                        <tr>
                          <th className="p-2 border-b border-slate-200">Article / Prestation</th>
                          <th className="p-2 border-b border-slate-200">Catégorie</th>
                          <th className="p-2 border-b border-slate-200 text-right">Volume Vendu</th>
                          <th className="p-2 border-b border-slate-200 text-right">CA Généré</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredData.topSellingProducts.slice(0, 6).map(item => (
                          <tr key={item.name}>
                            <td className="p-2 font-bold text-slate-900">{item.name}</td>
                            <td className="p-2 text-slate-600">{item.category}</td>
                            <td className="p-2 text-right font-black">{item.qty} u.</td>
                            <td className="p-2 text-right font-black">{item.revenue.toLocaleString()} {settings.currency}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* REPORT CONTENT TYPE: PROFITABILITY & MARGINS REPORT */}
              {config.reportType === 'profitability_margins' && (
                <div className="space-y-6">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Chiffre d'Affaires</span>
                      <span className="text-base font-black text-slate-900">
                        {filteredData.totalSalesRevenue.toLocaleString()} {settings.currency}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">Sur la période choisie</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Marge Brute Totale</span>
                      <span className="text-base font-black text-emerald-700">
                        {filteredData.grossProfit.toLocaleString()} {settings.currency}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                        Taux moyen : {filteredData.grossMarginPercent.toFixed(1)}%
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Coût Ventes (COGS)</span>
                      <span className="text-base font-black text-slate-700">
                        {filteredData.totalCOGS.toLocaleString()} {settings.currency}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">Achats consommés</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Coeff. Moyen Global</span>
                      <span className="text-base font-black text-indigo-700">
                        x{filteredData.totalCOGS > 0 ? (filteredData.totalSalesRevenue / filteredData.totalCOGS).toFixed(2) : '1.00'}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">Ratio Vente / Achat</span>
                    </div>
                  </div>

                  {/* Detailed Profitability & Multiplier Table */}
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider mb-2">
                      Détail de la Rentabilité, Prix d'Achat, Prix de Vente & Coefficients Multiplicateurs
                    </h3>
                    <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
                      <thead className="bg-slate-900 text-white font-bold">
                        <tr>
                          <th className="p-2">Article / Prestation</th>
                          <th className="p-2">Catégorie</th>
                          <th className="p-2 text-right">P. Achat</th>
                          <th className="p-2 text-right">P. Vente</th>
                          <th className="p-2 text-right">Marge Unit.</th>
                          <th className="p-2 text-center">Taux %</th>
                          <th className="p-2 text-center">Coeff. Multi.</th>
                          <th className="p-2 text-right">Unités</th>
                          <th className="p-2 text-right">Marge Totale</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredData.productProfitabilityReportList.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="p-2 font-bold text-slate-900">{item.name}</td>
                            <td className="p-2 text-slate-600">{item.category}</td>
                            <td className="p-2 text-right text-slate-600">{item.costPrice} {settings.currency}</td>
                            <td className="p-2 text-right font-bold text-slate-900">{item.sellingPrice} {settings.currency}</td>
                            <td className="p-2 text-right font-black text-emerald-700">+{item.unitMargin} {settings.currency}</td>
                            <td className="p-2 text-center font-bold text-emerald-700">
                              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 rounded">
                                {item.unitMarginPercent.toFixed(0)}%
                              </span>
                            </td>
                            <td className="p-2 text-center font-black text-indigo-700">
                              <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-900 rounded font-mono">
                                x{item.multiplier.toFixed(2)}
                              </span>
                            </td>
                            <td className="p-2 text-right font-semibold text-slate-700">{item.unitsSold}</td>
                            <td className="p-2 text-right font-black text-slate-900">
                              {item.totalMarginGenerated.toLocaleString()} {settings.currency}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* REPORT CONTENT TYPE: WEEKLY SALES TRENDS REPORT */}
              {config.reportType === 'weekly_sales_trends' && (
                <div className="space-y-6">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Chiffre Global Période</span>
                      <span className="text-base font-black text-slate-900">
                        {filteredData.totalSalesRevenue.toLocaleString()} {settings.currency}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">{filteredData.sales.length} commandes</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Panier Moyen Global</span>
                      <span className="text-base font-black text-amber-700">
                        {Math.round(filteredData.averageTicket).toLocaleString()} {settings.currency}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">Par client / commande</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Marge Brute Hebdo</span>
                      <span className="text-base font-black text-emerald-700">
                        {filteredData.grossMarginPercent.toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-emerald-600 block mt-0.5">{filteredData.grossProfit.toLocaleString()} {settings.currency}</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Meilleur Jour d'Affluence</span>
                      <span className="text-base font-black text-indigo-700">
                        {[...filteredData.weeklyDayTrends].sort((a, b) => b.sales - a.sales)[0]?.dayName || 'N/A'}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {[...filteredData.weeklyDayTrends].sort((a, b) => b.sales - a.sales)[0]?.sales.toLocaleString() || '0'} {settings.currency}
                      </span>
                    </div>
                  </div>

                  {/* Day of week Table */}
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider mb-2">
                      Ventilation des Ventes, Coûts et Marge par Jour de la Semaine (Lundi au Dimanche)
                    </h3>
                    <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
                      <thead className="bg-slate-900 text-white font-bold">
                        <tr>
                          <th className="p-2">Jour de la Semaine</th>
                          <th className="p-2 text-right">Recettes (CA)</th>
                          <th className="p-2 text-right">Coût Matière</th>
                          <th className="p-2 text-right">Marge Brute</th>
                          <th className="p-2 text-center">Taux Marge</th>
                          <th className="p-2 text-right">Commandes</th>
                          <th className="p-2 text-right">Panier Moyen</th>
                          <th className="p-2 text-right">Part du Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredData.weeklyDayTrends.map(day => (
                          <tr key={day.dayIndex} className={day.isWeekend ? 'bg-amber-50/40 font-medium' : ''}>
                            <td className="p-2 font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{day.dayName}</span>
                              {day.isWeekend && (
                                <span className="text-[9px] px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded font-semibold">
                                  Week-end
                                </span>
                              )}
                            </td>
                            <td className="p-2 text-right font-black text-slate-900">{day.sales.toLocaleString()} {settings.currency}</td>
                            <td className="p-2 text-right text-slate-600">{day.cogs.toLocaleString()} {settings.currency}</td>
                            <td className="p-2 text-right font-black text-emerald-700">+{day.grossProfit.toLocaleString()} {settings.currency}</td>
                            <td className="p-2 text-center font-bold text-emerald-700">
                              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 rounded">
                                {day.marginPercent.toFixed(0)}%
                              </span>
                            </td>
                            <td className="p-2 text-right font-bold text-slate-700">{day.tickets}</td>
                            <td className="p-2 text-right font-bold text-slate-900">{Math.round(day.avgTicket).toLocaleString()} {settings.currency}</td>
                            <td className="p-2 text-right font-black text-indigo-700">{day.shareOfTotal.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* REPORT CONTENT TYPE 1: CONSOLIDATED FINANCIAL */}
              {config.reportType === 'consolidated_financial' && (
                <div className="space-y-6">
                  {/* Key Metrics Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Chiffre d'Affaires</span>
                      <span className="text-base font-black text-slate-900">
                        {filteredData.totalSalesRevenue.toLocaleString()} {settings.currency}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Coût Ventes (COGS)</span>
                      <span className="text-base font-black text-slate-700">
                        {filteredData.totalCOGS.toLocaleString()} {settings.currency}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Dépenses</span>
                      <span className="text-base font-black text-red-600">
                        {filteredData.totalExpensesAmount.toLocaleString()} {settings.currency}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Bénéfice Net</span>
                      <span className={`text-base font-black ${filteredData.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {filteredData.netProfit.toLocaleString()} {settings.currency}
                      </span>
                    </div>
                  </div>

                  {/* Payment Methods Breakdown */}
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider mb-2">
                      Ventilation des Recettes par Mode de Paiement
                    </h3>
                    <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
                      <thead className="bg-slate-100 text-slate-700 font-black">
                        <tr>
                          <th className="p-2 border-b border-slate-200">Mode de Paiement</th>
                          <th className="p-2 border-b border-slate-200 text-right">Montant Encaissé</th>
                          <th className="p-2 border-b border-slate-200 text-right">% du CA</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {Object.entries(filteredData.paymentBreakdown).map(([method, amount]) => {
                          const pct = filteredData.totalSalesRevenue > 0 ? ((amount / filteredData.totalSalesRevenue) * 100).toFixed(1) : 0;
                          return (
                            <tr key={method}>
                              <td className="p-2 font-bold">{method}</td>
                              <td className="p-2 text-right font-black">{amount.toLocaleString()} {settings.currency}</td>
                              <td className="p-2 text-right font-medium text-slate-600">{pct}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Top Selling Products List */}
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider mb-2">
                      Top 5 des Produits & Services les Plus Vendus
                    </h3>
                    <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
                      <thead className="bg-slate-100 text-slate-700 font-black">
                        <tr>
                          <th className="p-2 border-b border-slate-200">Article / Prestation</th>
                          <th className="p-2 border-b border-slate-200">Catégorie</th>
                          <th className="p-2 border-b border-slate-200 text-right">Quantité Vendue</th>
                          <th className="p-2 border-b border-slate-200 text-right">Chiffre Généré</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredData.topSellingProducts.slice(0, 5).map(item => (
                          <tr key={item.name}>
                            <td className="p-2 font-bold text-slate-900">{item.name}</td>
                            <td className="p-2 text-slate-600">{item.category}</td>
                            <td className="p-2 text-right font-black">{item.qty} u.</td>
                            <td className="p-2 text-right font-black">{item.revenue.toLocaleString()} {settings.currency}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* REPORT CONTENT TYPE 2: INVENTORY & PERPETUAL STOCK */}
              {config.reportType === 'inventory_perpetual' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold block">Valeur Stock (Prix Coûtant)</span>
                      <span className="text-sm font-black text-slate-900">{filteredData.totalStockCostValuation.toLocaleString()} {settings.currency}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold block">Valeur Stock (Vente Potentielle)</span>
                      <span className="text-sm font-black text-slate-900">{filteredData.totalStockSalesValuation.toLocaleString()} {settings.currency}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold block">Articles en Stock Faible</span>
                      <span className="text-sm font-black text-red-600">{filteredData.lowStockItemsCount} référence(s)</span>
                    </div>
                  </div>

                  <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-900 text-white font-bold">
                      <tr>
                        <th className="p-2">Référence</th>
                        <th className="p-2">Catégorie</th>
                        <th className="p-2 text-right">Stock</th>
                        <th className="p-2 text-right">Prix Achat</th>
                        <th className="p-2 text-right">Prix Vente</th>
                        <th className="p-2 text-right">Valeur Stock</th>
                        <th className="p-2 text-center">État</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {products.map(p => {
                        const status = p.stock === 0 ? "Rupture" : p.stock <= p.minStockAlert ? "Alerte" : "OK";
                        return (
                          <tr key={p.id}>
                            <td className="p-2 font-bold text-slate-900">{p.name} {p.isService ? '(Service)' : ''}</td>
                            <td className="p-2 text-slate-600">{p.category}</td>
                            <td className="p-2 text-right font-black">{p.stock} {p.unit}</td>
                            <td className="p-2 text-right">{p.costPrice} {settings.currency}</td>
                            <td className="p-2 text-right font-bold">{p.price} {settings.currency}</td>
                            <td className="p-2 text-right font-black">{(p.stock * p.costPrice).toLocaleString()} {settings.currency}</td>
                            <td className="p-2 text-center">
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                status === 'Rupture' ? 'bg-red-200 text-red-900' : status === 'Alerte' ? 'bg-amber-200 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* REPORT CONTENT TYPE 3: Z-REPORT CASH CLOSURE */}
              {config.reportType === 'z_close_cashier' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <h3 className="font-black text-sm text-slate-900 uppercase">Résumé de Caisse Z</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>Nombre de ventes : <strong>{filteredData.sales.length} transactions</strong></div>
                      <div>Caissier responsable : <strong>{settings.cashierName}</strong></div>
                      <div>Chiffre d'Affaires Brut : <strong>{filteredData.totalSalesRevenue.toLocaleString()} {settings.currency}</strong></div>
                      <div>Encaissements Espèces : <strong>{(filteredData.paymentBreakdown['Espèces'] || 0).toLocaleString()} {settings.currency}</strong></div>
                      <div>Encaissements MonCash : <strong>{(filteredData.paymentBreakdown['MonCash'] || 0).toLocaleString()} {settings.currency}</strong></div>
                      <div>Ventes Carte/Crédit : <strong>{((filteredData.paymentBreakdown['Carte'] || 0) + (filteredData.paymentBreakdown['Crédit Client'] || 0)).toLocaleString()} {settings.currency}</strong></div>
                    </div>
                  </div>

                  <h4 className="font-bold text-xs uppercase text-slate-700 pt-2">Détail des Transactions Récentes</h4>
                  <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-100 text-slate-800 font-bold">
                      <tr>
                        <th className="p-2">N° Reçu</th>
                        <th className="p-2">Heure</th>
                        <th className="p-2">Paiement</th>
                        <th className="p-2 text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredData.sales.slice(0, 15).map(s => (
                        <tr key={s.id}>
                          <td className="p-2 font-bold">{s.receiptNumber}</td>
                          <td className="p-2 text-slate-500">{new Date(s.timestamp).toLocaleTimeString('fr-FR')}</td>
                          <td className="p-2 font-medium">{s.paymentMethod}</td>
                          <td className="p-2 text-right font-black">{s.total.toLocaleString()} {settings.currency}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* REPORT CONTENT TYPE 4 & 5: EXPENSES & SALES ANALYTICS */}
              {(config.reportType === 'expenses_procurement' || config.reportType === 'sales_analytics') && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h3 className="font-black text-sm text-slate-900 uppercase mb-2">
                      {config.reportType === 'expenses_procurement' ? "Aperçu des Dépenses & Charges d'Exploitation" : "Analyse des Tendances de Ventes"}
                    </h3>
                    <p className="text-xs text-slate-600">
                      {config.reportType === 'expenses_procurement' 
                        ? `${filteredData.expenses.length} dépenses enregistrées pour un total de ${filteredData.totalExpensesAmount.toLocaleString()} ${settings.currency}.`
                        : `${filteredData.sales.length} transactions analysées pour un volume global de ${filteredData.totalSalesRevenue.toLocaleString()} ${settings.currency}.`}
                    </p>
                  </div>
                </div>
              )}

              {/* Cryptographic Zero-Hallucination Security Footer Stamp */}
              {config.includeIntegrityHash && (
                <div className="mt-6 p-3 rounded-xl bg-slate-50 border border-slate-300 flex items-center justify-between gap-3 text-[10px] text-slate-600">
                  <div className="flex items-center space-x-2">
                    <Lock className="w-4 h-4 text-slate-800 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-900 block">
                        Certificat d'Intégrité des Données (Garantie Zéro-Hallucination)
                      </span>
                      <span className="text-slate-500">
                        Calculé sur {filteredData.sales.length} écritures vérifiables • Empreinte : <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-900">{filteredData.integrityHash}</code>
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Audit Validé</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Manager Notes Block */}
              {config.includeManagerNotes && config.managerNotes && (
                <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-700 bg-slate-50 p-3 rounded-lg">
                  <span className="font-bold block uppercase text-[10px] text-slate-500">Attestation & Remarques :</span>
                  <p className="italic mt-0.5">{config.managerNotes}</p>
                </div>
              )}

              {/* Signature Block */}
              {config.includeSignatures && (
                <div className="mt-8 pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs print-break-inside-avoid">
                  <div>
                    <span className="font-bold text-slate-800 block">Pour l'Établissement / La Gérance</span>
                    <span className="text-[10px] text-slate-500">{settings.cashierName} (Représentant(e) Agréé(e))</span>
                    <div className="mt-8 border-b border-slate-400 w-3/4 mx-auto"></div>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block">
                      {config.recipientName ? `Visa de Réception (${config.recipientName.split('-')[0].trim()})` : "Visa & Cachet Officiel"}
                    </span>
                    <span className="text-[10px] text-slate-500">{settings.barName}</span>
                    <div className="mt-8 border-b border-slate-400 w-3/4 mx-auto"></div>
                  </div>
                </div>
              )}

            </div>

          </div>
        )}

        {/* Modal Bottom Action Bar (Hidden during print) */}
        <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 no-print border-t border-slate-800">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">Conforme pour la DGI, les Banques (Unibank, Sogebank, BNC) & l'Archivage Légal</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Exporter CSV Officiel</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center space-x-2 cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4 stroke-[2.5]" />
              <span>Imprimer / Télécharger PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
