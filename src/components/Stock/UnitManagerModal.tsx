import React, { useState } from 'react';
import { useBar } from '../../context/BarContext';
import { DEFAULT_UNITS, SECTOR_PRESETS, SectorPreset } from '../../data/unitsConfig';
import { 
  X, 
  Scale, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  AlertCircle, 
  Boxes, 
  Zap, 
  RotateCcw,
  ArrowRight,
  Layers,
  ShoppingBag
} from 'lucide-react';

interface UnitManagerModalProps {
  onClose: () => void;
  onSelectUnit?: (unitName: string) => void;
}

export const UnitManagerModal: React.FC<UnitManagerModalProps> = ({ onClose, onSelectUnit }) => {
  const { settings, updateSettings, products, updateProduct } = useBar();

  const currentUnits: string[] = settings.customUnits && settings.customUnits.length > 0 
    ? settings.customUnits 
    : DEFAULT_UNITS;

  const [unitsList, setUnitsList] = useState<string[]>(currentUnits);
  const [newUnitName, setNewUnitName] = useState('');
  const [editingUnit, setEditingUnit] = useState<{ original: string; current: string } | null>(null);
  const [updateExistingProducts, setUpdateExistingProducts] = useState(true);
  const [selectedSector, setSelectedSector] = useState<SectorPreset | null>(null);
  const [showSectorConfirm, setShowSectorConfirm] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Compute product count per unit
  const getProductCountForUnit = (unitName: string) => {
    return products.filter(p => p.unit?.toLowerCase() === unitName.toLowerCase()).length;
  };

  const showNotification = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Add new unit
  const handleAddUnit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newUnitName.trim();
    if (!clean) return;

    if (unitsList.some(u => u.toLowerCase() === clean.toLowerCase())) {
      alert(`L'unité "${clean}" existe déjà dans la liste.`);
      return;
    }

    const updated = [...unitsList, clean];
    setUnitsList(updated);
    updateSettings({ customUnits: updated });
    setNewUnitName('');
    showNotification(`Unité "${clean}" ajoutée avec succès !`);

    if (onSelectUnit) {
      onSelectUnit(clean);
    }
  };

  // Save renamed unit
  const handleSaveRename = () => {
    if (!editingUnit) return;
    const oldName = editingUnit.original.trim();
    const newName = editingUnit.current.trim();

    if (!newName) {
      alert("Le nom de l'unité ne peut pas être vide.");
      return;
    }

    if (oldName.toLowerCase() !== newName.toLowerCase() && unitsList.some(u => u.toLowerCase() === newName.toLowerCase())) {
      alert(`L'unité "${newName}" existe déjà.`);
      return;
    }

    // Update in units list
    const updatedUnits = unitsList.map(u => u.toLowerCase() === oldName.toLowerCase() ? newName : u);
    setUnitsList(updatedUnits);
    updateSettings({ customUnits: updatedUnits });

    // Optionally update products using the old unit
    if (updateExistingProducts) {
      const affectedProducts = products.filter(p => p.unit?.toLowerCase() === oldName.toLowerCase());
      affectedProducts.forEach(prod => {
        updateProduct(prod.id, { unit: newName });
      });
      showNotification(`Unité renommée en "${newName}" et appliquée à ${affectedProducts.length} produit(s) !`);
    } else {
      showNotification(`Unité renommée en "${newName}".`);
    }

    setEditingUnit(null);
  };

  // Delete unit
  const handleDeleteUnit = (unitToDelete: string) => {
    const count = getProductCountForUnit(unitToDelete);
    if (count > 0) {
      const confirmDel = window.confirm(
        `Attention : ${count} produit(s) utilisent actuellement l'unité "${unitToDelete}". Si vous la supprimez de la liste des unités, ces produits conserveront leur libellé actuel mais l'unité ne sera plus proposée par défaut. Continuer ?`
      );
      if (!confirmDel) return;
    }

    const updated = unitsList.filter(u => u.toLowerCase() !== unitToDelete.toLowerCase());
    setUnitsList(updated);
    updateSettings({ customUnits: updated });
    showNotification(`Unité "${unitToDelete}" retirée de la liste.`);
  };

  // Apply Sector Preset
  const handleApplyPreset = (preset: SectorPreset) => {
    // Merge new units without duplicates
    const existingLower = new Set(unitsList.map(u => u.toLowerCase()));
    const merged = [...unitsList];

    preset.units.forEach(u => {
      if (!existingLower.has(u.toLowerCase())) {
        merged.push(u);
        existingLower.add(u.toLowerCase());
      }
    });

    setUnitsList(merged);
    updateSettings({ 
      customUnits: merged,
      defaultVarietyLabel: preset.defaultVarietyLabel,
    });
    setShowSectorConfirm(false);
    showNotification(`Modèle de commerce "${preset.name}" appliqué (${preset.units.length} unités configurées) !`);
  };

  // Reset to system defaults
  const handleResetDefaults = () => {
    if (window.confirm("Rétablir la liste des unités standard par défaut ?")) {
      setUnitsList(DEFAULT_UNITS);
      updateSettings({ customUnits: DEFAULT_UNITS });
      showNotification("Unités par défaut rétablies.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn overflow-y-auto overscroll-contain">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 text-slate-900 my-auto relative max-h-[92dvh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Gestion des Unités de Mesure & Vente
              </h3>
              <p className="text-xs text-slate-500">
                Définissez les unités pour votre établissement (Bouteille, Cannette, Caisse, Kg, Pièce, etc.)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 animate-fadeIn shrink-0">
            <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3]" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="space-y-4 overflow-y-auto flex-1 pr-1">

          {/* Sector Presets Bar */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 p-3.5 rounded-2xl border border-amber-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-950 flex items-center space-x-1.5">
                <Zap className="w-4 h-4 text-amber-600" />
                <span>Modèles Rapides par Type de Commerce :</span>
              </span>
              <span className="text-[10px] font-bold text-amber-800">1-clic pour charger</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {SECTOR_PRESETS.map((sector) => (
                <button
                  key={sector.id}
                  type="button"
                  onClick={() => {
                    setSelectedSector(sector);
                    setShowSectorConfirm(true);
                  }}
                  className="p-2 bg-white hover:bg-amber-100/70 border border-amber-200 rounded-xl text-left transition flex items-center space-x-2 cursor-pointer shadow-2xs group"
                >
                  <span className="text-base shrink-0">{sector.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate group-hover:text-amber-900">
                      {sector.name.split(',')[0]}
                    </p>
                    <p className="text-[9.5px] text-slate-500 truncate">
                      {sector.units.slice(0, 3).join(', ')}...
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Confirmation Sector Preset Modal/Box */}
          {showSectorConfirm && selectedSector && (
            <div className="bg-amber-500/15 border-2 border-amber-400 p-4 rounded-2xl space-y-3 animate-fadeIn">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{selectedSector.icon}</span>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">
                      Appliquer le modèle : {selectedSector.name}
                    </h4>
                    <p className="text-[11px] text-slate-600">{selectedSector.description}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSectorConfirm(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200 text-xs space-y-1.5">
                <p className="font-bold text-slate-800 text-[11px]">Unités incluses :</p>
                <div className="flex flex-wrap gap-1">
                  {selectedSector.units.map(u => (
                    <span key={u} className="px-2 py-0.5 bg-amber-100 text-amber-900 font-bold text-[10px] rounded-md border border-amber-200">
                      {u}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Libellé de déclinaison conseillé : <strong className="text-amber-800">{selectedSector.defaultVarietyLabel}</strong> (ex: {selectedSector.sampleVarieties.slice(0, 4).join(', ')})
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowSectorConfirm(false)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(selectedSector)}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-xs flex items-center space-x-1"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Confirmer et Ajouter ces Unités</span>
                </button>
              </div>
            </div>
          )}

          {/* Add New Unit Form */}
          <form onSubmit={handleAddUnit} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              Créer une Nouvelle Unité Personnalisée
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newUnitName}
                onChange={(e) => setNewUnitName(e.target.value)}
                placeholder="ex: Caisse 24x, Bouteille 75cl, Sac 25kg, Paquet, Flacon, Portion, Mètre..."
                className="flex-1 bg-white border border-slate-300 text-slate-900 font-bold p-2.5 rounded-xl focus:outline-none focus:border-amber-500 text-xs"
              />
              <button
                type="submit"
                disabled={!newUnitName.trim()}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Ajouter</span>
              </button>
            </div>
          </form>

          {/* Units List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center space-x-1">
                <Boxes className="w-4 h-4 text-amber-600" />
                <span>Unités Actives ({unitsList.length})</span>
              </span>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center space-x-1 underline cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Rétablir unités standard</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {unitsList.map((unitName) => {
                const count = getProductCountForUnit(unitName);
                const isEditing = editingUnit && editingUnit.original.toLowerCase() === unitName.toLowerCase();

                if (isEditing) {
                  return (
                    <div 
                      key={unitName} 
                      className="p-3 bg-amber-500/10 border-2 border-amber-400 rounded-2xl space-y-2 col-span-1 sm:col-span-2 animate-fadeIn"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-950">
                          Renommer l'unité : <strong>{editingUnit.original}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingUnit(null)}
                          className="text-slate-400 hover:text-slate-600 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={editingUnit.current}
                        onChange={(e) => setEditingUnit({ ...editingUnit, current: e.target.value })}
                        autoFocus
                        className="w-full bg-white border border-amber-400 text-slate-900 font-black p-2 rounded-xl text-xs focus:outline-none"
                      />

                      {count > 0 && (
                        <label className="flex items-center space-x-2 text-[11px] text-slate-700 font-bold bg-white p-2 rounded-xl border border-amber-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={updateExistingProducts}
                            onChange={(e) => setUpdateExistingProducts(e.target.checked)}
                            className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                          />
                          <span>
                            Mettre à jour aussi les <strong>{count} produit(s)</strong> utilisant actuellement cette unité
                          </span>
                        </label>
                      )}

                      <div className="flex items-center justify-end space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingUnit(null)}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveRename}
                          className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-xs flex items-center space-x-1"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Enregistrer la modification</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={unitName}
                    className="p-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl flex items-center justify-between text-xs transition"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="font-black text-slate-900 truncate">{unitName}</span>
                      {count > 0 ? (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-200 rounded-md text-[10px] font-bold shrink-0">
                          {count} {count > 1 ? 'articles' : 'article'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 shrink-0">Inutilisée</span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      {onSelectUnit && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectUnit(unitName);
                            onClose();
                          }}
                          className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10.5px] font-black rounded-lg transition"
                          title="Sélectionner cette unité"
                        >
                          Choisir
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setEditingUnit({ original: unitName, current: unitName });
                          setUpdateExistingProducts(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-white rounded-lg transition cursor-pointer"
                        title="Renommer cette unité"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteUnit(unitName)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition cursor-pointer"
                        title="Supprimer cette unité"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-500">
            {unitsList.length} unité(s) disponibles pour le catalogue
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
          >
            Fermer & Appliquer
          </button>
        </div>

      </div>
    </div>
  );
};
