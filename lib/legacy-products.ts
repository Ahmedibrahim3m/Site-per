
export type Category = "For Him" | "For Her" | "Unisex";

export type Product = {
  id: number;
  name: string;
  brand: string;
  category: Category;
  price: number;
  stock?: number;
  active?: boolean;
  oldPrice?: number;
  size: string;
  notes: string;
  description: string;
  image: string;
  tag?: string;
  rating: string;
};

export type CartItem = {
  product: Product;
  qty: number;
};
export type OrderStatus =
  | "Pending"
  | "Confirmed"
  | "Preparing"
  | "Shipped"
  | "Delivered"
  | "Cancelled";

export type Order = {
  id: string;
  createdAt: string;
  customer: string;
  phone: string;
  governorate: string;
  address: string;
  notes: string;
  payment: "cod" | "card";
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
  status: OrderStatus;
  userId?: string | null;
};

export const products: Product[] = [
  {
    id: 1,
    name: "Oud Royale",
    brand: "NOIRÉ SIGNATURE",
    category: "Unisex",
    price: 1850,
    oldPrice: 2200,
    size: "100 ML",
    notes: "Oud · Saffron · Amber",
    description:
      "A bold, enveloping fragrance built around rich oud, warm saffron and glowing amber. Made for unforgettable entrances.",
    image:
      "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=900&q=85",
    tag: "BESTSELLER",
    rating: "4.9",
    stock: 18,
    active: true,
  },
  {
    id: 2,
    name: "Velvet Rose",
    brand: "MAISON NOIRÉ",
    category: "For Her",
    price: 1590,
    size: "80 ML",
    notes: "Rose · Peony · Musk",
    description:
      "Soft petals meet creamy musk in a modern floral scent that feels effortlessly elegant from day to night.",
    image:
      "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=900&q=85",
    tag: "NEW",
    rating: "4.8",
    stock: 12,
    active: true,
  },
  {
    id: 3,
    name: "Midnight Essence",
    brand: "NOIRÉ SIGNATURE",
    category: "For Him",
    price: 2100,
    size: "100 ML",
    notes: "Leather · Cedar · Tonka",
    description:
      "Deep woods and smooth leather create a confident signature with a warm, magnetic dry-down.",
    image:
      "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=900&q=85",
    rating: "4.9",
    stock: 9,
    active: true,
  },
  {
    id: 4,
    name: "Citrus Bloom",
    brand: "ATELIER NOIRÉ",
    category: "Unisex",
    price: 1250,
    size: "75 ML",
    notes: "Bergamot · Neroli · White Tea",
    description:
      "A fresh, luminous blend of bright citrus and delicate white tea. Clean, uplifting and easy to wear.",
    image:
      "https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?auto=format&fit=crop&w=900&q=85",
    rating: "4.7",
    stock: 15,
    active: true,
  },
  {
    id: 5,
    name: "Amber Affair",
    brand: "MAISON NOIRÉ",
    category: "For Her",
    price: 1750,
    oldPrice: 1950,
    size: "90 ML",
    notes: "Vanilla · Amber · Jasmine",
    description:
      "A sensual amber composition softened by vanilla and luminous jasmine. Comforting, addictive and refined.",
    image:
      "https://images.unsplash.com/photo-1590736969955-71cc94901144?auto=format&fit=crop&w=900&q=85",
    tag: "LIMITED",
    rating: "4.8",
    stock: 6,
    active: true,
  },
  {
    id: 6,
    name: "Blue Horizon",
    brand: "NOIRÉ SIGNATURE",
    category: "For Him",
    price: 1450,
    size: "100 ML",
    notes: "Sea Salt · Sage · Vetiver",
    description:
      "An invigorating aromatic fragrance inspired by open horizons, sea air and sun-warmed woods.",
    image:
      "https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=900&q=85",
    rating: "4.6",
    stock: 0,
    active: true,
  },
];
