import { sql } from "drizzle-orm";
import { pgTable, uuid, text, decimal, integer, boolean, jsonb, timestamp, varchar, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Removed enum types to simplify database schema - using text fields with defaults

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("guest"), // 'admin' or 'guest'
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  subCategory: text("sub_category"),
  material: text("material").default("GOLD_22K"),
  priceInr: decimal("price_inr", { precision: 10, scale: 2 }).notNull(),
  priceBhd: decimal("price_bhd", { precision: 10, scale: 3 }).notNull(),
  grossWeight: decimal("gross_weight", { precision: 8, scale: 2 }).notNull(),
  netWeight: decimal("net_weight", { precision: 8, scale: 2 }).notNull(),
  purity: text("purity"), // e.g., "22K", "925", "PT950"
  gemstones: jsonb("gemstones").$type<string[]>().default(sql`'[]'::jsonb`),
  size: text("size"), // Ring size, chain length, etc.
  gender: text("gender").default("UNISEX"), // MALE, FEMALE, UNISEX
  occasion: text("occasion"), // WEDDING, ENGAGEMENT, DAILY, PARTY, RELIGIOUS
  stock: integer("stock").notNull().default(0),
  images: jsonb("images").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  isActive: boolean("is_active").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});


// Shopping Cart Table
export const cartItems = pgTable("cart_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(), // For guest users
  userId: varchar("user_id"), // For logged-in users
  productId: varchar("product_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Orders Table (replaces bills for e-commerce)
export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerAddress: text("customer_address").notNull(),
  currency: text("currency").default("INR"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  makingCharges: decimal("making_charges", { precision: 12, scale: 2 }).notNull(),
  gst: decimal("gst", { precision: 12, scale: 2 }).notNull(),
  vat: decimal("vat", { precision: 12, scale: 2 }).notNull().default(0),
  discount: decimal("discount", { precision: 12, scale: 2 }).notNull().default(0),
  shipping: decimal("shipping", { precision: 12, scale: 2 }).notNull().default(0),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").default("CASH"),
  paymentStatus: text("payment_status").notNull().default("PENDING"), // PENDING, PAID, FAILED, REFUNDED
  orderStatus: text("order_status").notNull().default("PENDING"), // PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  items: jsonb("items").$type<OrderItem[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Keep bills table for backward compatibility (admin billing)
export const bills = pgTable("bills", {
  id: uuid("id").defaultRandom().primaryKey(),
  billNumber: text("bill_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerAddress: text("customer_address").notNull(),
  currency: text("currency").default("INR"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  makingCharges: decimal("making_charges", { precision: 12, scale: 2 }).notNull(),
  gst: decimal("gst", { precision: 12, scale: 2 }).notNull(),
  vat: decimal("vat", { precision: 12, scale: 2 }).notNull().default(0),
  discount: decimal("discount", { precision: 12, scale: 2 }).notNull().default(0),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").default("CASH"),
  items: jsonb("items").$type<BillItem[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  bills: many(bills),
  orders: many(orders),
  cartItems: many(cartItems),
}));

export const productsRelations = relations(products, ({ many }) => ({
  billItems: many(bills),
  orderItems: many(orders),
  cartItems: many(cartItems),
}));

export const billsRelations = relations(bills, ({ one }) => ({
  customer: one(users, {
    fields: [bills.customerEmail],
    references: [users.email],
  }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  customer: one(users, {
    fields: [orders.customerEmail],
    references: [users.email],
  }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, {
    fields: [cartItems.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
}));

// Types
export type BillItem = {
  productId: string;
  productName: string;
  quantity: number;
  priceInr: string;
  priceBhd: string;
  grossWeight: string;
  netWeight: string;
  makingCharges: string;
  discount: string;
  sgst: string;
  cgst: string;
  vat: string; // Bahrain VAT
  total: string;
};

export type OrderItem = {
  productId: string;
  productName: string;
  quantity: number;
  priceInr: string;
  priceBhd: string;
  grossWeight: string;
  netWeight: string;
  makingCharges: string;
  discount: string;
  sgst: string;
  cgst: string;
  vat: string;
  total: string;
};

export type CartItem = {
  id: string;
  productId: string;
  quantity: number;
  product: Product;
};

// Jewelry Categories
export const JEWELRY_CATEGORIES = {
  "RINGS": {
    name: "Rings 💍",
    subCategories: [
      "ENGAGEMENT_RINGS",
      "WEDDING_BANDS", 
      "COUPLE_RINGS",
      "COCKTAIL_PARTY_RINGS",
      "DAILY_WEAR_RINGS",
      "MENS_RINGS"
    ]
  },
  "NECKLACES_CHAINS": {
    name: "Necklaces & Chains 📿",
    subCategories: [
      "GOLD_CHAINS",
      "SILVER_CHAINS",
      "PLATINUM_CHAINS",
      "BEADED_PEARL_NECKLACES",
      "BRIDAL_NECKLACES", 
      "TEMPLE_JEWELLERY_NECKLACES",
      "MENS_CHAINS",
      "KIDS_CHAINS"
    ]
  },
  "EARRINGS": {
    name: "Earrings 🌸",
    subCategories: [
      "STUDS",
      "HOOPS",
      "DROPS_DANGLERS",
      "CHANDBALIS",
      "JHUMKAS",
      "EAR_CUFFS",
      "KIDS_EARRINGS"
    ]
  },
  "BRACELETS_BANGLES": {
    name: "Bracelets & Bangles 🔗",
    subCategories: [
      "GOLD_BANGLES",
      "DIAMOND_BANGLES",
      "SILVER_BANGLES", 
      "KADA_SINGLE_BANGLE",
      "CHARM_BRACELETS",
      "CUFF_BRACELETS",
      "MENS_BRACELETS",
      "KIDS_BANGLES"
    ]
  },
  "PENDANTS_LOCKETS": {
    name: "Pendants & Lockets ✨",
    subCategories: [
      "GOLD_PENDANTS",
      "DIAMOND_PENDANTS",
      "RELIGIOUS_PENDANTS",
      "NAME_PENDANTS",
      "COUPLE_PENDANTS"
    ]
  },
  "MANGALSUTRA": {
    name: "Mangalsutra & Thali Chains 🖤",
    subCategories: [
      "TRADITIONAL_MANGALSUTRA",
      "MODERN_MANGALSUTRA",
      "THALI_THIRUMANGALYAM_CHAINS"
    ]
  },
  "NOSE_JEWELLERY": {
    name: "Nose Jewellery 👃",
    subCategories: [
      "NOSE_PINS",
      "NOSE_RINGS_NATH",
      "SEPTUM_RINGS"
    ]
  },
  "ANKLETS_TOE_RINGS": {
    name: "Anklets & Toe Rings 👣",
    subCategories: [
      "SILVER_ANKLETS",
      "BEADED_ANKLETS",
      "BRIDAL_TOE_RINGS",
      "DAILY_WEAR_TOE_RINGS"
    ]
  },
  "BROOCHES_PINS": {
    name: "Brooches & Pins 🎀",
    subCategories: [
      "SAREE_PINS",
      "SUIT_BROOCHES",
      "BRIDAL_BROOCHES",
      "CUFFLINKS",
      "TIE_PINS"
    ]
  },
  "KIDS_JEWELLERY": {
    name: "Kids Jewellery 🧒",
    subCategories: [
      "BABY_BANGLES",
      "NAZARIYA_BRACELETS",
      "KIDS_EARRINGS",
      "KIDS_CHAINS",
      "KIDS_RINGS"
    ]
  },
  "BRIDAL_COLLECTIONS": {
    name: "Bridal & Special Collections 👰",
    subCategories: [
      "BRIDAL_SETS",
      "TEMPLE_JEWELLERY_SETS",
      "ANTIQUE_JEWELLERY_COLLECTIONS",
      "CUSTOM_MADE_JEWELLERY"
    ]
  },
  "MATERIAL_GEMSTONE": {
    name: "Shop by Material / Gemstone 💎",
    subCategories: [
      "GOLD_JEWELLERY_22K_18K_14K",
      "SILVER_JEWELLERY_STERLING_OXIDIZED",
      "PLATINUM_JEWELLERY",
      "DIAMOND_JEWELLERY",
      "GEMSTONE_JEWELLERY",
      "PEARL_JEWELLERY",
      "FASHION_ARTIFICIAL_JEWELLERY"
    ]
  }
} as const;

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertProductSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.string(),
  subCategory: z.string().optional(),
  material: z.enum(["GOLD_22K", "GOLD_18K", "GOLD_14K", "SILVER_STERLING", "SILVER_OXIDIZED", "PLATINUM", "DIAMOND", "RUBY", "EMERALD", "SAPPHIRE", "PEARL", "ARTIFICIAL"]),
  priceInr: z.coerce.number(),
  priceBhd: z.coerce.number(),
  grossWeight: z.coerce.number(),
  netWeight: z.coerce.number(),
  purity: z.string().optional(),
  gemstones: z.array(z.string()).default([]),
  size: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "UNISEX"]).default("UNISEX"),
  occasion: z.string().optional(),
  stock: z.coerce.number(),
  images: z.array(z.string()).default([]),
  isActive: z.coerce.boolean().default(true),
  isFeatured: z.coerce.boolean().default(false),
});

export const insertCartItemSchema = z.object({
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  productId: z.string(),
  quantity: z.number().min(1).default(1),
});

export const insertOrderSchema = z.object({
  customerName: z.string(),
  customerEmail: z.string().email(),
  customerPhone: z.string(),
  customerAddress: z.string(),
  currency: z.enum(["INR", "BHD"]),
  subtotal: z.coerce.number(),
  makingCharges: z.coerce.number(),
  gst: z.coerce.number(),
  vat: z.coerce.number().default(0),
  discount: z.coerce.number().default(0),
  shipping: z.coerce.number().default(0),
  total: z.coerce.number(),
  paidAmount: z.coerce.number(),
  paymentMethod: z.enum(["CASH", "CARD", "UPI", "BANK_TRANSFER", "STRIPE"]),
  items: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    quantity: z.number(),
    priceInr: z.string(),
    priceBhd: z.string(),
    grossWeight: z.string(),
    netWeight: z.string(),
    makingCharges: z.string(),
    discount: z.string(),
    sgst: z.string(),
    cgst: z.string(),
    vat: z.string(),
    total: z.string(),
  })),
});




export const insertBillSchema = createInsertSchema(bills).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  billNumber: true
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertBill = z.infer<typeof insertBillSchema>;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;

export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Bill = typeof bills.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type CartItemRow = typeof cartItems.$inferSelect;
