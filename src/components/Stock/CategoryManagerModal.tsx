import React, { useState } from 'react';
import { useBar } from '../../context/BarContext';
import { CategoryItem } from '../../types';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  Beer, 
  GlassWater, 
  Wine, 
  Flame, 
  Utensils, 
  Pizza, 
  CupSoda, 
  Package, 
  Coffee, 
  Sparkles, 
  Apple, 
  Sandwich, 
  IceCream, 
  Cookie, 
  Croissant, 
  Milk, 
  Popcorn, 
  Grape, 
  Tag,
  Layers
} from 'lucide-react';

interface CategoryManagerModalProps {
  onClose: () => void;
}

const AVAILABLE_ICONS = [
  { name: 'Beer', label: 'Bière', icon: Beer },
  { name: 'Wine', label: 'Vin / Cocktail', icon: Wine },
  { name: 'GlassWater', label: 'Verre / Eau', icon: GlassWater },
  { name: 'Flame', label: 'Rhum / Spiritueux', icon: Flame },
  { name: 'CupSoda', label: 'Jus / Soda', icon: CupSoda },
  { name: 'Coffee', label: 'Café / Thé', icon: Coffee },
  { name: 'Utensils', label: 'Plat / Restaurant', icon: Utensils },
  { name: 'Pizza', label: 'Fast food / Snack', icon: Pizza },
  { name: 'Sandwich', label: 'Sandwich / Panini', icon: Sandwich },
  { name: 'IceCream', label: 'Glace / Dessert', icon: IceCream },
  { name: 'Croissant', label: 'Viennoiserie', icon: Croissant },
  { name: 'Cookie', label: 'Biscuit / Friandise', icon: Cookie },
  { name: 'Apple', label: 'Fruits / Frais', icon: Apple },
  { name: 'Milk', label: 'Laiterie', icon: Milk },
  { name: 'Popcorn', label: 'Aapéritif', icon: Popcorn },
  { name: 'Grape', label: 'Vignoble', icon: Grape },
  { name: 'Sparkles', label: 'Spécial / VIP', icon: Sparkles },
  { name: 'Tag', label: 'Divers / Etiquette', icon: Tag },
  { name: 'Package', label: 'Colis / Stock', icon: Package },
];

const COLOR_PRESETS = [
  { label: 'Ambre', color: 'bg-amber-600', bgLight: 'bg-amber-50 text-amber-700 border-amber-200' },
  { label: 'Bleu', color: 'bg-blue-600', bgLight: 'bg-blue-50 text-blue-700 border-blue-200' },
  { label: 'Rose / Rouge', color: 'bg-pink-600', bgLight: 'bg-pink-50 text-pink-700 border-pink-200' },
  { label: 'Vert Émeraude', color: 'bg-emerald-600', bgLight: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { label: 'Orange', color: 'bg-orange-600', bgLight: 'bg-orange-50 text-orange-700 border-orange-200' },
  { label: 'Violet', color: 'bg-purple-600', bgLight: 'bg-purple-50 text-purple-700 border-purple-200' },
  { label: 'Cyan / Turq.', color: 'bg-cyan-600', bgLight: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { label: 'Sombre', color: 'bg-slate-800', bgLight: 'bg-slate-100 text-slate-800 border-slate-300' },
];

export const renderCategoryIcon = (iconName: string, className = "w-4 h-4") => {
  const found = AVAILABLE_ICONS.find(i => i.name === iconName);
  const IconComponent = found ? found.icon : Package;
  return <IconComponent className={className} />;
};

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({ onClose }) => {
  const { categories, addCategory, updateCategory, deleteCategory, products } = useBar();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Beer');
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setSelectedIcon('Beer');
    setSelectedColor(COLOR_PRESETS[0]);
  };

  const handleStartEdit = (cat: CategoryItem) => {
    setEditingId(cat.id);
    setName(cat.name);
    setSelectedIcon(cat.icon || 'Package');
    const matchedColor = COLOR_PRESETS.find(c => c.color === cat.color) || COLOR_PRESETS[0];
    setSelectedColor(matchedColor);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Veuillez entrer un nom de catégorie.");
      return;
    }

    if (editingId) {
      updateCategory(editingId, {
        name: name.trim(),
        icon: selectedIcon,
        color: selectedColor.color,
        bgLight: selectedColor.bgLight,
      });
    } else {
      // Check duplicate name
      if (categories.some(c => c.name.toLowerCase() === name.trim().toLowerCase())) {
        alert("Une catégorie portant ce nom existe déjà.");
        return;
      }

      addCategory({
        name: name.trim(),
        icon: selectedIcon,
        color: selectedColor.color,
        bgLight: selectedColor.bgLight,
      });
    }

    resetForm();
  };

  const handleDelete = (cat: CategoryItem) => {
    const productCount = products.filter(p => p.category === cat.name).length;
    if (productCount > 0) {
      if (!confirm(`La catégorie "${cat.name}" contient ${productCount} produit(s). Souhaitez-vous quand même la supprimer ?`)) {
        return;
      }
    } else {
      if (!confirm(`Supprimer la catégorie "${cat.name}" ?`)) return;
    }

    deleteCategory(cat.id);
    if (editingId === cat.id) resetForm();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 text-slate-900 my-8 relative max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 shrink-0">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="text-lg font-black text-slate-900">Gestion des Catégories</h3>
              <p className="text-xs text-slate-500">Ajoutez, modifiez ou supprimez des catégories accompagnées d'icônes.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 overflow-y-auto flex-1 pr-1">
          
          {/* Left: List of existing categories */}
          <div className="md:col-span-6 space-y-3">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Catégories Existant ({categories.length})</span>
              <button
                onClick={resetForm}
                className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold hover:bg-amber-200"
              >
                + Nouvelle
              </button>
            </h4>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {categories.map((cat) => {
                const count = products.filter(p => p.category === cat.name).length;
                const isEditing = editingId === cat.id;

                return (
                  <div
                    key={cat.id}
                    className={`p-3 rounded-2xl border transition flex items-center justify-between ${
                      isEditing
                        ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20'
                        : 'border-slate-200 bg-slate-50 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2.5 rounded-xl text-white ${cat.color || 'bg-amber-600'} shadow-sm`}>
                        {renderCategoryIcon(cat.icon, "w-4 h-4")}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 leading-tight">{cat.name}</p>
                        <p className="text-[10px] text-slate-500 font-bold">{count} produit(s) associé(s)</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleStartEdit(cat)}
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-200 rounded-lg transition"
                        title="Modifier"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Form to add / edit category */}
          <div className="md:col-span-6 bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-4">
            <h4 className="text-xs font-black text-slate-900 border-b border-slate-200 pb-2">
              {editingId ? 'Modifier la catégorie' : 'Créer une nouvelle catégorie'}
            </h4>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              
              {/* Category Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nom de la Catégorie *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Champagnes, Chichas, Desserts..."
                  className="w-full bg-white p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              {/* Icon Selector Grid */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Choisir une Icône</label>
                <div className="grid grid-cols-5 gap-1.5 max-h-[140px] overflow-y-auto p-1 border border-slate-200 rounded-xl bg-white">
                  {AVAILABLE_ICONS.map((item) => {
                    const IconComp = item.icon;
                    const isSelected = selectedIcon === item.name;

                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setSelectedIcon(item.name)}
                        className={`p-2 rounded-xl flex flex-col items-center justify-center transition border cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-600 font-black shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                        }`}
                        title={item.label}
                      >
                        <IconComp className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Preset Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Couleur du Badge</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {COLOR_PRESETS.map((preset) => {
                    const isSelected = selectedColor.color === preset.color;

                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setSelectedColor(preset)}
                        className={`p-2 rounded-xl text-[10px] font-bold border transition flex items-center space-x-1 cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-amber-500 border-amber-600 font-black'
                            : 'border-slate-200'
                        }`}
                      >
                        <span className={`w-3 h-3 rounded-full ${preset.color} shrink-0`} />
                        <span className="truncate">{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow transition cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{editingId ? 'Mettre à jour' : 'Créer la catégorie'}</span>
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-3 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition cursor-pointer"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
};
