import { users, products, bills, cartItems, orders, type User, type InsertUser, type Product, type InsertProduct, type Bill, type InsertBill, type CartItemRow, type InsertCartItem, type Order, type InsertOrder, type CartItem } from "@shared/schema";
import { db } from "./db";
import { eq, desc, like, and } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  authenticateUser(email: string, password: string): Promise<User | null>;
  updateStripeCustomerId(userId: string, customerId: string): Promise<User | undefined>;
  updateUserStripeInfo(userId: string, stripeInfo: { customerId: string; subscriptionId: string }): Promise<User | undefined>;

  // Product operations
  getAllProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductsByCategory(category: string): Promise<Product[]>;
  searchProducts(query: string, filters?: ProductFilters): Promise<Product[]>;
  getFeaturedProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;

  // Cart operations
  getCartItems(sessionId?: string, userId?: string): Promise<CartItem[]>;
  addToCart(item: InsertCartItem): Promise<CartItemRow>;
  updateCartItem(id: string, quantity: number): Promise<CartItemRow | undefined>;
  removeFromCart(id: string): Promise<boolean>;
  clearCart(sessionId?: string, userId?: string): Promise<boolean>;

  // Order operations
  getAllOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrderByNumber(orderNumber: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  updatePaymentStatus(id: string, status: string, paymentIntentId?: string): Promise<Order | undefined>;

  // Bill operations (for admin billing)
  getAllBills(): Promise<Bill[]>;
  getBill(id: string): Promise<Bill | undefined>;
  getBillByNumber(billNumber: string): Promise<Bill | undefined>;
  createBill(bill: InsertBill): Promise<Bill>;
  searchBills(query: string): Promise<Bill[]>;
  getBillsByDateRange(startDate: Date, endDate: Date): Promise<Bill[]>;
}

export interface ProductFilters {
  category?: string;
  subCategory?: string;
  material?: string;
  priceMin?: number;
  priceMax?: number;
  gender?: string;
  occasion?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'popular';
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        password: hashedPassword,
      })
      .returning();
    return user;
  }

  async authenticateUser(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  // Product operations
  async getAllProducts(): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.isActive, true)).orderBy(desc(products.createdAt));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(and(eq(products.id, id), eq(products.isActive, true)));
    return product || undefined;
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return await db.select().from(products).where(and(eq(products.category, category), eq(products.isActive, true))).orderBy(desc(products.createdAt));
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db
      .insert(products)
      .values({
        ...product,
        isActive: product.isActive ?? true
      })
      .returning();
    return newProduct;
  }


  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updatedProduct] = await db
      .update(products)
      .set(product)
      .where(eq(products.id, id))
      .returning();
    return updatedProduct || undefined;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const [deletedProduct] = await db
      .update(products)
      .set({ isActive: false })
      .where(eq(products.id, id))
      .returning();
    return !!deletedProduct;
  }

  // Bill operations
  // async getAllBills(): Promise<Bill[]> {
  //   return await db
  //     .selectFrom('bills')
  //     .select('*')
  //     .orderBy('created_at', 'desc')
  //     .execute()
  // }  // <- missing semicolon or closing bracket for previous method
  // getBill(id: string): Promise<Bill | undefined> {
  // ...
  // }


  // async getBill(id: string): Promise<Bill | undefined> {
  //   const [bill] = await db.select().from(bills).where(eq(bills.id, id));
  //   return bill || undefined;
  // }
  async getAllBills(): Promise<Bill[]> {
    return await db
      .select()
      .from(bills)
      .orderBy('created_at', 'desc');
  }

  async getBill(id: string): Promise<Bill | undefined> {
    const [bill] = await db
      .select()
      .from(bills)
      .where(eq(bills.id, id));
    return bill;
  }


  async createBill(bill: InsertBill): Promise<Bill> {
    const total = Number(bill.subtotal) + Number(bill.makingCharges) + Number(bill.gst) - Number(bill.discount || 0);

    // Insert bill into database
    const result = await db
      .insert(bills)
      .values({
        ...bill,
        total,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning(); // No semicolon before this

    console.log(result);

    // Depending on what .returning() returns, adjust:
    // If result is an array:
    // return result[0];
    // If result is an object:
    return result as Bill;
  }



  async getBillByNumber(billNumber: string): Promise<Bill | undefined> {
    const [bill] = await db
      .select()
      .from(bills)
      .where(eq(bills.billNumber, billNumber));
    return bill;
  }

  // async createBill(bill: InsertBill): Promise<Bill> {
  //   const [newBill] = await db
  //     .insert(bills)
  //     .values({
  //       ...bill,
  //       created_at: new Date(),
  //       updated_at: new Date()
  //     })
  //     .returning();
  //   return newBill;
  // }


  async searchBills(query: string): Promise<Bill[]> {
    return await db.select().from(bills).where(
      like(bills.customerName, `%${query}%`)
    ).orderBy(desc(bills.createdAt));
  }

  async getBillsByDateRange(startDate: Date, endDate: Date): Promise<Bill[]> {
    return await db.select().from(bills).where(
      and(
        eq(bills.createdAt, startDate),
        eq(bills.createdAt, endDate)
      )
    ).orderBy(desc(bills.createdAt));
  }
}

export const storage = new DatabaseStorage();
