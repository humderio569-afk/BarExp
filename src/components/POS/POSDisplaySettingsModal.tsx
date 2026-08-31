import React from 'react';
import { 
  SlidersHorizontal, 
  LayoutGrid, 
  List, 
  Grid3X3, 
  Check, 
  X, 
  Layers, 
  Columns, 
  Maximize2,
  Minimize2,
  Smartphone,
  Monitor
} from 'lucide-react';

export type POSViewMode = 'cards' | 'simple_icon' | 'list';
export type POSCardSize = 'small' | 'medium' | 'large';
export type POSGridColumns = 'auto' | '2' | '3' | '4' | '5' | '6' | '8';

export interface POSDisplayPreferences {
  viewMode: POSViewMode;
  cardSize: POSCardSize;
  columns: POSGridColumns;
  showImages: boolean;
  showStockBadges: boolean;
}

export const DEFAULT_DISPLAY_PREFERENCES: POSDisplayPreferences = {
  viewMode: 'cards',
  cardSize: 'medium',
  columns: 'auto',
  showImages: true,
  showStockBadges: true,
};

interface POSDisplaySettingsModalProps {
  preferences: POSDisplayPreferences;
  onChange: (updated: POSDisplayPreferences) => void;
  onClose: () => void;
}

export const POSDisplaySettingsModal: React.FC<POSDisplaySettingsModalProps> = ({
  preferences,
  onChange,
  onClose,
}) => {
  const update = <K extends keyof POSDisplayPreferences>(key: K, value: POSDisplayPreferences[K]) => {
    onChange({
      ...preferences,
      [key]: value,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn overflow-y-auto overscroll-contain">
      <div className="bg-white rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-200 relative overflow-hidden text-slate-900 max-h-[92dvh] flex flex-col my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm sm:text-base leading-tight">
                Personnalisation de l'Affichage
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Ajustez la vue caisse selon votre écran et vos habitudes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-3 sm:py-4 space-y-4 sm:space-y-5 flex-1 overflow-y-auto overscroll-contain pr-1">
          
          {/* 1. Mode d'affichage */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              1. Mode d'affichage des produits
            </label>
            <div className="grid grid-cols-3 gap-2">
              
              {/* Mode Cartes */}
              <button
                type="button"
                onClick={() => update('viewMode', 'cards')}
                className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                  preferences.viewMode === 'cards'
                    ? 'bg-amber-500 text-slate-950 border-amber-600 font-black shadow-md ring-2 ring-amber-400/50'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 font-semibold'
                }`}
              >
                <LayoutGrid className="w-5 h-5" />
                <span className="text-xs">Cartes Photos</span>
              </button>

              {/* Mode Icône Simple */}
              <button
                type="button"
                onClick={() => update('viewMode', 'simple_icon')}
                className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                  preferences.viewMode === 'simple_icon'
                    ? 'bg-amber-500 text-slate-950 border-amber-600 font-black shadow-md ring-2 ring-amber-400/50'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 font-semibold'
                }`}
              >
                <Grid3X3 className="w-5 h-5" />
                <span className="text-xs">Icône Simple</span>
              </button>

              {/* Mode Liste */}
              <button
                type="button"
                onClick={() => update('viewMode', 'list')}
                className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                  preferences.viewMode === 'list'
                    ? 'bg-amber-500 text-slate-950 border-amber-600 font-black shadow-md ring-2 ring-amber-400/50'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 font-semibold'
                }`}
              >
                <List className="w-5 h-5" />
                <span className="text-xs">Liste Compacte</span>
              </button>

            </div>
          </div>

          {/* 2. Taille des cartes (uniquement pour mode cartes) */}
          {preferences.viewMode === 'cards' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                2. Taille des cartes produits
              </label>
              <div className="grid grid-cols-3 gap-2">
                
                <button
                  type="button"
                  onClick={() => update('cardSize', 'small')}
                  className={`p-2.5 rounded-xl border text-center transition flex items-center justify-center gap-1.5 cursor-pointer text-xs ${
                    preferences.cardSize === 'small'
                      ? 'bg-slate-900 text-amber-400 border-slate-900 font-black shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 font-semibold'
                  }`}
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Petite</span>
                </button>

                <button
                  type="button"
                  onClick={() => update('cardSize', 'medium')}
                  className={`p-2.5 rounded-xl border text-center transition flex items-center justify-center gap-1.5 cursor-pointer text-xs ${
                    preferences.cardSize === 'medium'
                      ? 'bg-slate-900 text-amber-400 border-slate-900 font-black shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 font-semibold'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Moyenne</span>
                </button>

                <button
                  type="button"
                  onClick={() => update('cardSize', 'large')}
                  className={`p-2.5 rounded-xl border text-center transition flex items-center justify-center gap-1.5 cursor-pointer text-xs ${
                    preferences.cardSize === 'large'
                      ? 'bg-slate-900 text-amber-400 border-slate-900 font-black shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 font-semibold'
                  }`}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Grande</span>
                </button>

              </div>
            </div>
          )}

          {/* 3. Quantité par colonne / Densité de grille */}
          {preferences.viewMode !== 'list' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
                <span>3. Quantité par colonne (Grille)</span>
                <span className="text-[10px] lowercase text-slate-400 font-normal">
                  {preferences.columns === 'auto' ? 'Automatique' : `${preferences.columns} colonnes`}
                </span>
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                {(['auto', '2', '3', '4', '5', '6', '8'] as POSGridColumns[]).map((col) => {
                  const isSelected = preferences.columns === col;
                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => update('columns', col)}
                      className={`py-2 px-1 rounded-xl border text-center transition cursor-pointer text-xs font-bold ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {col === 'auto' ? 'Auto' : `${col} col`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Options visuelles complémentaires */}
          <div className="pt-2 border-t border-slate-100 space-y-2.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Options visuelles
            </label>
            
            <div 
              onClick={() => update('showImages', !preferences.showImages)}
              className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer transition border border-slate-200"
            >
              <span className="text-xs font-semibold text-slate-700">Afficher les photos des produits</span>
              <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                preferences.showImages ? 'bg-amber-500 border-amber-600 text-slate-950' : 'bg-white border-slate-300'
              }`}>
                {preferences.showImages && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>

            <div 
              onClick={() => update('showStockBadges', !preferences.showStockBadges)}
              className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer transition border border-slate-200"
            >
              <span className="text-xs font-semibold text-slate-700">Afficher le niveau de stock en direct</span>
              <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                preferences.showStockBadges ? 'bg-amber-500 border-amber-600 text-slate-950' : 'bg-white border-slate-300'
              }`}>
                {preferences.showStockBadges && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onChange(DEFAULT_DISPLAY_PREFERENCES)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
          >
            Réinitialiser
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-6 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl text-xs font-bold transition shadow-md cursor-pointer flex items-center space-x-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Appliquer & Fermer</span>
          </button>
        </div>

      </div>
    </div>
  );
};
