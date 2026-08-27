export const DEFAULT_UNITS: string[] = [
  'Bouteille',
  'Cannette',
  'Caisse',
  'Verre',
  'Portion',
  'Plat',
  'Paquet',
  'Boîte',
  'Pièce',
  'Kg',
  'Gramme',
  'Litre',
  'Shot',
  'Sachet',
  'Carton',
  'Paire',
  'Flacon',
  'Mètre',
];

export interface SectorPreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  units: string[];
  defaultVarietyLabel: string;
  sampleVarieties: string[];
}

export const SECTOR_PRESETS: SectorPreset[] = [
  {
    id: 'bar_lounge',
    name: 'Bar, Discothèque & Lounge',
    icon: '🍸',
    description: 'Boissons, bouteilles, cocktails, chichas et snacks de bar',
    units: ['Bouteille', 'Cannette', 'Verre', 'Caisse', 'Shot', 'Pichet', 'Casier', 'Carton'],
    defaultVarietyLabel: 'Saveur / Parfum',
    sampleVarieties: ['Double Pomme', 'Menthe Fraîche', 'Mangue', 'Raisin Glacé', 'Citron'],
  },
  {
    id: 'restaurant_cafe',
    name: 'Restaurant, Fast-Food & Café',
    icon: '🍽️',
    description: 'Plats cuisinés, portions, menus, desserts et boissons chaudes',
    units: ['Plat', 'Portion', 'Assiette', 'Menu', 'Bol', 'Bouteille', 'Verre', 'Tasse'],
    defaultVarietyLabel: 'Format / Cuisson',
    sampleVarieties: ['Petit (Solo)', 'Moyen', 'Grand (XL)', 'Saignant', 'À point', 'Bien cuit'],
  },
  {
    id: 'retail_boutique',
    name: 'Prêt-à-Porter & Chaussures',
    icon: '👗',
    description: 'Vêtements, chaussures, accessoires et maroquinerie',
    units: ['Pièce', 'Paire', 'Lot', 'Ensemble', 'Carton'],
    defaultVarietyLabel: 'Taille / Pointure',
    sampleVarieties: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '38', '39', '40', '41', '42', '43'],
  },
  {
    id: 'grocery_market',
    name: 'Épicerie, Supérette & Alimentation',
    icon: '🛒',
    description: 'Produits au poids, conserves, emballages et produits frais',
    units: ['Kg', 'Gramme', 'Litre', 'Pièce', 'Paquet', 'Boîte', 'Sachet', 'Sac', 'Bocal', 'Pack'],
    defaultVarietyLabel: 'Arôme / Format',
    sampleVarieties: ['Nature', 'Vanille', 'Chocolat', '500g', '1 Kg', '2 Litres', 'Pack x6'],
  },
  {
    id: 'cosmetics_beauty',
    name: 'Cosmétique, Beauté & Parfumerie',
    icon: '💄',
    description: 'Parfums, lotions, crèmes, perruques et soins',
    units: ['Flacon', 'Tube', 'Pot', 'Boîte', 'Pièce', 'Kit', 'Spray'],
    defaultVarietyLabel: 'Teinte / Parfum',
    sampleVarieties: ['Fleur d’Oranger', 'Bois de Santal', 'Teinte 01 Clair', 'Teinte 02 Doré', '50ml', '100ml'],
  },
  {
    id: 'hardware_electronics',
    name: 'Quincaillerie & Électronique',
    icon: '🔧',
    description: 'Outillage, câbles, matériaux, accessoires et téléphones',
    units: ['Pièce', 'Mètre', 'Rouleau', 'Paquet', 'Boîte', 'Lot', 'Kg'],
    defaultVarietyLabel: 'Modèle / Couleur',
    sampleVarieties: ['Noir', 'Blanc', 'Argent', '64 Go', '128 Go', '256 Go', '1.5m', '3m', '5m'],
  },
];

export const VARIETY_LABEL_PRESETS: string[] = [
  'Saveur',
  'Parfum',
  'Arôme',
  'Taille',
  'Pointure',
  'Couleur',
  'Format',
  'Contenance',
  'Modèle',
  'Capacité',
  'Cuisson',
  'Variante',
];
