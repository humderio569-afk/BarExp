export interface PresetImage {
  id: string;
  label: string;
  url: string;
  category: string;
}

export const PRESET_PRODUCT_IMAGES: PresetImage[] = [
  {
    id: 'biere_btl',
    label: 'Bière Bouteille',
    url: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=400&q=80',
    category: 'Bières'
  },
  {
    id: 'biere_can',
    label: 'Bière Cannette',
    url: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?auto=format&fit=crop&w=400&q=80',
    category: 'Bières'
  },
  {
    id: 'biere_brune',
    label: 'Bière Stout / Brune',
    url: 'https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?auto=format&fit=crop&w=400&q=80',
    category: 'Bières'
  },
  {
    id: 'rhum_btl',
    label: 'Bouteille Rhum',
    url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=400&q=80',
    category: 'Spiritueux'
  },
  {
    id: 'rhum_verre',
    label: 'Verre Rhum / Whisky',
    url: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?auto=format&fit=crop&w=400&q=80',
    category: 'Spiritueux'
  },
  {
    id: 'mojito',
    label: 'Mojito / Cocktail',
    url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=400&q=80',
    category: 'Cocktails'
  },
  {
    id: 'pina',
    label: 'Piña Colada',
    url: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=400&q=80',
    category: 'Cocktails'
  },
  {
    id: 'griot',
    label: 'Griot / Viande Frite',
    url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80',
    category: 'Plats'
  },
  {
    id: 'poulet',
    label: 'Poulet Grillé / BBQ',
    url: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=400&q=80',
    category: 'Plats'
  },
  {
    id: 'burger',
    label: 'Burger Gourmet',
    url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80',
    category: 'Plats'
  },
  {
    id: 'pizza',
    label: 'Pizza Peperoni',
    url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80',
    category: 'Plats'
  },
  {
    id: 'coca',
    label: 'Soda / Coca',
    url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=80',
    category: 'Jus & Sodas'
  },
  {
    id: 'orange',
    label: 'Jus d\'Orange',
    url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=400&q=80',
    category: 'Jus & Sodas'
  },
  {
    id: 'eau',
    label: 'Eau Minérale',
    url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=400&q=80',
    category: 'Boissons'
  },
  {
    id: 'redbull',
    label: 'Energy Drink',
    url: 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?auto=format&fit=crop&w=400&q=80',
    category: 'Jus & Sodas'
  }
];
