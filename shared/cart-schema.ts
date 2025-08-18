import { z } from 'zod';

// Jewelry Categories with hierarchical structure
export const JEWELRY_CATEGORIES = {
  rings: {
    name: 'Rings',
    subCategories: {
      engagement: 'Engagement Rings',
      wedding: 'Wedding Rings',
      cocktail: 'Cocktail Rings',
      solitaire: 'Solitaire Rings',
      tennis: 'Tennis Rings',
      stackable: 'Stackable Rings',
      statement: 'Statement Rings'
    }
  },
  necklaces: {
    name: 'Necklaces',
    subCategories: {
      chain: 'Chain Necklaces',
      pendant: 'Pendant Necklaces',
      choker: 'Chokers',
      statement: 'Statement Necklaces',
      lariat: 'Lariat Necklaces',
      collar: 'Collar Necklaces'
    }
  },
  earrings: {
    name: 'Earrings',
    subCategories: {
      studs: 'Stud Earrings',
      hoops: 'Hoop Earrings',
      drops: 'Drop Earrings',
      chandeliers: 'Chandelier Earrings',
      huggies: 'Huggie Earrings',
      climbers: 'Ear Climbers'
    }
  },
  bracelets: {
    name: 'Bracelets',
    subCategories: {
      tennis: 'Tennis Bracelets',
      chain: 'Chain Bracelets',
      bangle: 'Bangles',
      charm: 'Charm Bracelets',
      cuff: 'Cuff Bracelets',
      link: 'Link Bracelets'
    }
  },
  pendants: {
    name: 'Pendants',
    subCategories: {
      solitaire: 'Solitaire Pendants',
      heart: 'Heart Pendants',
      cross: 'Cross Pendants',
      initial: 'Initial Pendants',
      locket: 'Lockets',
      charm: 'Charm Pendants'
    }
  },
  mangalsutra: {
    name: 'Mangalsutra',
    subCategories: {
      traditional: 'Traditional Mangalsutra',
      modern: 'Modern Mangalsutra',
      designer: 'Designer Mangalsutra',
      pendant: 'Mangalsutra Pendants'
    }
  },
  nose_jewelry: {
    name: 'Nose Jewelry',
    subCategories: {
      nose_pins: 'Nose Pins',
      nose_rings: 'Nose Rings',
      nose_studs: 'Nose Studs'
    }
  },
  anklets: {
    name: 'Anklets',
    subCategories: {
      chain: 'Chain Anklets',
      charm: 'Charm Anklets',
      beaded: 'Beaded Anklets'
    }
  },
  brooches: {
    name: 'Brooches',
    subCategories: {
      vintage: 'Vintage Brooches',
      modern: 'Modern Brooches',
      floral: 'Floral Brooches'
    }
  },
  kids_jewelry: {
    name: 'Kids Jewelry',
    subCategories: {
      earrings: 'Kids Earrings',
      bracelets: 'Kids Bracelets',
      necklaces: 'Kids Necklaces',
      rings: 'Kids Rings'
    }
  },
  bridal: {
    name: 'Bridal Collection',
    subCategories: {
      sets: 'Bridal Sets',
      necklaces: 'Bridal Necklaces',
      earrings: 'Bridal Earrings',
      accessories: 'Bridal Accessories'
    }
  },
  material_based: {
    name: 'By Material',
    subCategories: {
      gold_22k: '22K Gold',
      gold_18k: '18K Gold',
      gold_14k: '14K Gold',
      silver: 'Silver',
      platinum: 'Platinum',
      diamond: 'Diamond Jewelry',
      gemstone: 'Gemstone Jewelry'
    }
  }
} as const;

// Materials
export const MATERIALS = {
  GOLD_22K: '22K Gold',
  GOLD_18K: '18K Gold', 
  GOLD_14K: '14K Gold',
  SILVER_STERLING: 'Sterling Silver',
  SILVER_OXIDIZED: 'Oxidized Silver',
  PLATINUM: 'Platinum',
  DIAMOND: 'Diamond',
  RUBY: 'Ruby',
  EMERALD: 'Emerald',
  SAPPHIRE: 'Sapphire',
  PEARL: 'Pearl',
  ARTIFICIAL: 'Artificial/Fashion'
} as const;

// Genders
export const GENDERS = {
  MALE: 'Men',
  FEMALE: 'Women', 
  UNISEX: 'Unisex',
  KIDS: 'Kids'
} as const;

// Occasions
export const OCCASIONS = {
  WEDDING: 'Wedding',
  ENGAGEMENT: 'Engagement',
  DAILY: 'Daily Wear',
  PARTY: 'Party/Event',
  RELIGIOUS: 'Religious/Traditional',
  OFFICE: 'Office Wear',
  CASUAL: 'Casual',
  FORMAL: 'Formal'
} as const;

// Product Filters interface
export interface ProductFilters {
  search?: string;
  category?: string;
  subCategory?: string;
  material?: string;
  gender?: string;
  occasion?: string;
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
  sortBy?: 'newest' | 'popular' | 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc';
}

// Cart schemas
export const cartItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().min(1),
  price: z.number(),
  name: z.string(),
  image: z.string().optional(),
});

export const cartSchema = z.object({
  items: z.array(cartItemSchema),
  total: z.number(),
  currency: z.enum(['INR', 'BHD']),
});

export type CartItem = z.infer<typeof cartItemSchema>;
export type Cart = z.infer<typeof cartSchema>;