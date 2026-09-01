import React, { useState } from 'react';
import { useBar } from '../../context/BarContext';
import { QuotaTracker } from '../../services/quotaTracker';
import {
  Bot,
  KeyRound,
  Cpu,
  Eye,
  EyeOff,
  Save,
  Check,
  Zap,
  Activity,
  Layers,
  Building2,
  HelpCircle,
  Radio,
  Sliders,
  AlertCircle
} from 'lucide-react';

export const PlatformAIView: React.FC = () => {
  const {
    settings,
    updateSettings,
    companies,
    products,
    sales,
    expenses,
    tabs,
    stockLogs,
    auditLogs,
    allUsers,
    categories,
  } = useBar();

  const [enableDonaChat, setEnableDonaChat] = useState<boolean>(settings.enableDonaChat !== false);
  const [enableDonaWebSearch, setEnableDonaWebSearch] = useState<boolean>(settings.enableDonaWebSearch !== false);
  const [enableDonaVoice, setEnableDonaVoice] = useState<boolean>(settings.enableDonaVoice !== false);
  const [customGeminiApiKey, setCustomGeminiApiKey] = useState<string>(settings.customGeminiApiKey || '');
  const [donaCustomInstructions, setDonaCustomInstructions] = useState<string>(settings.donaCustomInstructions || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    updateSettings({
      enableDonaChat,
      enableDonaWebSearch,
      enableDonaVoice,
      customGeminiApiKey: customGeminiApiKey.trim(),
      donaCustomInstructions: donaCustomInstructions.trim(),
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  // Real aggregated AI consumption metrics via QuotaTracker
  const aggregated = QuotaTracker.getAggregatedStats({
    products,
    sales,
    expenses,
    tabs,
    stockLogs,
    auditLogs,
    allUsers,
    categories,
    settings,
  });

  const totalAIQueries = aggregated.gemini.requestsToday;
  const totalTokensEstimated = aggregated.gemini.estimatedTokensToday;
  const aiStatus = aggregated.gemini.status;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
          <Bot className="w-5 h-5 text-amber-600" />
          Intelligence Artificielle Dona (Plateforme Globale)
        </h3>
        <p className="text-xs text-slate-500">
          Supervision de l'assistant IA, configuration des clés Google Gemini et métriques de consommation de tokens
        </p>
      </div>

      {/* AI Metrics KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>Requêtes IA Traitées Aujourd'hui</span>
            <Bot className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalAIQueries.toLocaleString('fr-FR')}</span>
            <span className="text-xs font-bold text-slate-500">invocations</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Sur l'ensemble des établissements
          </p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>Tokens Consommés Aujourd'hui</span>
            <Zap className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalTokensEstimated.toLocaleString('fr-FR')}</span>
            <span className="text-xs font-bold text-slate-500">tokens</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Gemini 2.5 Flash API
          </p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>Statut du Moteur IA</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${aiStatus === 'healthy' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className={`text-lg font-black ${aiStatus === 'healthy' ? 'text-emerald-700' : 'text-amber-700'}`}>
              {aiStatus === 'healthy' ? 'Opérationnel' : 'Quota élevé'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Limite : {aggregated.gemini.requestsLimitPerDay} requêtes / jour
          </p>
        </div>
      </div>

      {/* Global AI Engine Settings */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900">Paramétrage Global du Moteur Dona</h4>
              <p className="text-xs text-slate-500">Contrôle de l'activation et directives maîtresses du modèle</p>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition cursor-pointer"
          >
            {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{isSaved ? "Paramètres Enregistrés !" : "Enregistrer la Configuration"}</span>
          </button>
        </div>

        {/* Feature Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-900">Assistant Dona Activé</p>
              <p className="text-[10px] text-slate-500">Disponible pour tous les bars</p>
            </div>
            <input
              type="checkbox"
              checked={enableDonaChat}
              onChange={(e) => setEnableDonaChat(e.target.checked)}
              className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
            />
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-900">Recherche Web Google Live</p>
              <p className="text-[10px] text-slate-500">Données en temps réel (Search grounding)</p>
            </div>
            <input
              type="checkbox"
              checked={enableDonaWebSearch}
              onChange={(e) => setEnableDonaWebSearch(e.target.checked)}
              className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
            />
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-900">Synthèse Vocale & Audio</p>
              <p className="text-[10px] text-slate-500">Écoute et réponses orales</p>
            </div>
            <input
              type="checkbox"
              checked={enableDonaVoice}
              onChange={(e) => setEnableDonaVoice(e.target.checked)}
              className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* API Key Master */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-amber-600" />
              <span>Clé API Google Gemini Maître (Plateforme)</span>
            </label>
            <span className="text-[10px] text-slate-500">
              Optionnel. Si vide, le serveur utilise la clé d'environnement par défaut.
            </span>
          </div>

          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              placeholder="AIzaSy..."
              value={customGeminiApiKey}
              onChange={(e) => setCustomGeminiApiKey(e.target.value)}
              className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Custom Instructions */}
        <div className="space-y-2 pt-2">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-amber-600" />
            <span>Directives Globales du Modèle (System Prompt)</span>
          </label>
          <textarea
            rows={4}
            placeholder="Directives maîtresses injectées à l'IA Dona pour la gestion de bar, les recettes de mixologie, l'analyse des stocks..."
            value={donaCustomInstructions}
            onChange={(e) => setDonaCustomInstructions(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
          />
        </div>
      </div>

      {/* AI Consumption Table per Company */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-600" />
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Disponibilité de l'IA par Établissement
            </h4>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Statut & intégration</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold">
              <tr>
                <th className="py-3 px-4">Établissement</th>
                <th className="py-3 px-4">Statut IA</th>
                <th className="py-3 px-4">Permissions IA</th>
                <th className="py-3 px-4 text-right">Disponibilité</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {companies.map((comp) => {
                const isActive = comp.status === 'active' && enableDonaChat;

                return (
                  <tr key={comp.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{comp.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{comp.code}</div>
                    </td>
                    <td className="py-3 px-4">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <Bot className="w-3 h-3 text-emerald-500" />
                          Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          Désactivé
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      Chat Mixologie, Alertes & Recettes
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700 font-bold text-[11px]">
                      {isActive ? 'Disponible 24/7' : 'Suspendu'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
