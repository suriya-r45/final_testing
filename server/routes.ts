import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProductSchema, insertBillSchema, loginSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import PDFDocument from "pdfkit";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-11-20.acacia",
});

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Admin credentials
const ADMIN_CREDENTIALS = {
  email: "jewelerypalaniappa@gmail.com",
  password: "P@lani@ppA@321"
};

// Multer configuration for file uploads
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  }
});

// Authentication middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Admin middleware
const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      // Check for admin credentials
      if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
        const token = jwt.sign(
          { id: "admin", email, role: "admin", name: "Admin" },
          JWT_SECRET,
          { expiresIn: '24h' }
        );
        return res.json({
          user: { id: "admin", email, role: "admin", name: "Admin" },
          token
        });
      }

      // Regular user authentication
      const user = await storage.authenticateUser(email, password);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ user: { id: user.id, email: user.email, role: user.role, name: user.name }, token });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByEmail(userData.email);

      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      const user = await storage.createUser({
        ...userData,
        role: "guest"
      });

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ user: { id: user.id, email: user.email, role: user.role, name: user.name }, token });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  // Product routes
  app.get("/api/products", async (req, res) => {
    try {
      const { category } = req.query;
      let products;

      if (category && typeof category === 'string') {
        products = await storage.getProductsByCategory(category);
      } else {
        products = await storage.getAllProducts();
      }

      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.post("/api/products", authenticateToken, requireAdmin, upload.array('images', 5), async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);

      // Handle uploaded images
      const imageUrls: string[] = [];
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          const filename = `${Date.now()}-${file.originalname}`;
          const filepath = path.join(uploadsDir, filename);
          fs.renameSync(file.path, filepath);
          imageUrls.push(`/uploads/${filename}`);
        }
      }

      const product = await storage.createProduct({
        ...productData,
        images: imageUrls,
        isActive: productData.isActive ?? true
      });

      res.status(201).json(product);
    } catch (error) {
      res.status(400).json({ message: "Invalid product data" });
    }
  });

  app.put("/api/products/:id", authenticateToken, requireAdmin, upload.array('images', 5), async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);

      // Handle uploaded images
      let updateData = { ...productData };
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        const imageUrls: string[] = [];
        for (const file of req.files) {
          const filename = `${Date.now()}-${file.originalname}`;
          const filepath = path.join(uploadsDir, filename);
          fs.renameSync(file.path, filepath);
          imageUrls.push(`/uploads/${filename}`);
        }
        updateData.images = imageUrls;
      }

      const product = await storage.updateProduct(req.params.id, updateData);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json(product);
    } catch (error) {
      res.status(400).json({ message: "Invalid product data" });
    }
  });

  app.delete("/api/products/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteProduct(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Bill routes
  app.get("/api/bills", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { search, startDate, endDate } = req.query;
      let bills;

      if (search && typeof search === 'string') {
        bills = await storage.searchBills(search);
      } else if (startDate && endDate) {
        bills = await storage.getBillsByDateRange(new Date(startDate as string), new Date(endDate as string));
      } else {
        bills = await storage.getAllBills();
      }

      res.json(bills);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bills" });
    }
  });

  app.get("/api/bills/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const bill = await storage.getBill(req.params.id);
      if (!bill) {
        return res.status(404).json({ message: "Bill not found" });
      }
      res.json(bill);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bill" });
    }
  });

  //app.post("/api/bills", authenticateToken, requireAdmin, async (req, res) => {
  // app.post("/api/bills", requireAdmin, async (req, res) => {
  //   try {
  //     const billData = insertBillSchema.parse(req.body);

  //     // Generate bill number
  //     const billCount = (await storage.getAllBills()).length;
  //     const billNumber = `INV-${String(billCount + 1).padStart(3, '0')}`;

  //     const bill = await storage.createBill({
  //       ...billData,
  //       billNumber
  //     });

  //     res.status(201).json(bill);
  //   } catch (error) {
  //     console.error(error);
  //     res.status(400).json({ message: "Invalid bill data" });
  //   }
  // });

  app.post("/api/bills", async (req, res) => {
    try {
      const billData = insertBillSchema.parse(req.body);
      const billCount = (await storage.getAllBills()).length;
      const date = new Date();
      const formattedDate = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
      const billNumber = `PJ/${formattedDate}-${String(billCount + 1).padStart(3, '0')}`;

      const bill = await storage.createBill({
        ...billData,
        billNumber: billNumber
      } as any);

      res.status(201).json(bill);
    } catch (error) {
      console.error("Zod validation error:", error.errors || error);
      res.status(400).json({
        message: "Invalid bill data",
        details: error.errors || error.message
      });
    }
  });



  // Bill PDF generation - Remove authentication temporarily to test
  app.get("/api/bills/:id/pdf", async (req, res) => {
    try {
      const bill = await storage.getBill(req.params.id);
      if (!bill) {
        return res.status(404).json({ message: "Bill not found" });
      }

      // Create PDF
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const filename = `${bill.customerName.replace(/\s+/g, '_')}_${bill.billNumber}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      doc.pipe(res);

      // Add company logo if available
      try {
        doc.image('./attached_assets/1000284180_1755240849891_1755538055896.jpg', 250, 50, { width: 100, height: 100 });
      } catch (error) {
        console.log('Logo not found, continuing without image');
      }

      // Company header moved below logo
      doc.fontSize(18).text('PALANIAPPA JEWELLERS', 50, 170, { align: 'center' });
      doc.fontSize(12).text('Since 2025', 50, 190, { align: 'center' });

      // Bill Info
      doc.fontSize(16).text('TAX INVOICE', 50, 220);
      doc.fontSize(10);
      doc.text(`Bill No: ${bill.billNumber}`, 50, 245);
      doc.text(`Date: ${new Date(bill.createdAt!).toLocaleDateString()}`, 50, 260);
      doc.text(`Currency: ${bill.currency}`, 50, 275);
      
      // Customer copy info
      doc.text('CUSTOMER COPY', 400, 220);
      doc.text(`Date: ${new Date(bill.createdAt!).toLocaleString()}`, 400, 235);

      // Company and Customer Details in bordered sections
      doc.rect(50, 300, 240, 120).stroke();
      doc.rect(310, 300, 240, 120).stroke();
      
      // Company Details
      doc.fontSize(10).text('PALANIAPPA JEWELLERS', 60, 310, { width: 220 });
      doc.text('Premium Jewelry Store', 60, 325);
      doc.text('123 Jewelry Street', 60, 340);
      doc.text('Chennai, Tamil Nadu', 60, 355);
      doc.text('PINCODE: 600001', 60, 370);
      doc.text('Phone Number: +919597201554', 60, 385);
      doc.text('GSTIN: 33AAACT5712A124', 60, 400);
      
      // Customer Details
      doc.text('CUSTOMER DETAILS:', 320, 310, { width: 220 });
      doc.text(`Name: ${bill.customerName}`, 320, 325);
      doc.text(`Email: ${bill.customerEmail}`, 320, 340);
      doc.text(`Phone: ${bill.customerPhone}`, 320, 355);
      doc.text(`Address: ${bill.customerAddress}`, 320, 370, { width: 220 });

      // Items Table
      let yPos = 450;
      doc.text('Items:', 50, yPos);
      yPos += 20;

      // Table headers
      doc.text('Product', 50, yPos);
      doc.text('Qty', 200, yPos);
      doc.text('Price', 250, yPos);
      doc.text('Total', 350, yPos);
      yPos += 15;

      // Table data
      bill.items.forEach((item) => {
        doc.text(item.productName, 50, yPos);
        doc.text(item.quantity.toString(), 200, yPos);
        doc.text(bill.currency === 'INR' ? `₹${item.priceInr}` : `BD ${item.priceBhd}`, 250, yPos);
        doc.text(item.total, 350, yPos);
        yPos += 15;
      });

      // Totals
      yPos += 20;
      doc.text(`Subtotal: ${bill.currency === 'INR' ? '₹' : 'BD'} ${bill.subtotal}`, 300, yPos);
      yPos += 15;
      doc.text(`Making Charges: ${bill.currency === 'INR' ? '₹' : 'BD'} ${bill.makingCharges}`, 300, yPos);
      yPos += 15;
      doc.text(`${bill.currency === 'BHD' ? 'VAT' : 'GST'}: ${bill.currency === 'INR' ? '₹' : 'BD'} ${bill.gst}`, 300, yPos);
      yPos += 15;
      doc.text(`Discount: ${bill.currency === 'INR' ? '₹' : 'BD'} ${bill.discount}`, 300, yPos);
      yPos += 15;
      doc.fontSize(12).text(`Total: ${bill.currency === 'INR' ? '₹' : 'BD'} ${bill.total}`, 300, yPos);

      doc.end();
    } catch (error) {
      console.error('PDF generation error:', error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  // Stripe payment routes
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount, currency = 'inr', items } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * (currency === 'bhd' ? 1000 : 100)), // Convert to minor units
        currency: currency.toLowerCase(),
        metadata: {
          integration_check: 'accept_a_payment',
          items: JSON.stringify(items || [])
        },
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error('Stripe payment intent error:', error);
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Orders routes (for e-commerce checkout)
  app.post("/api/orders", async (req, res) => {
    try {
      const orderData = req.body;
      
      // Generate order number
      const orderCount = (await storage.getAllBills()).length; // Reuse bill count for now
      const date = new Date();
      const formattedDate = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
      const orderNumber = `ORD/${formattedDate}-${String(orderCount + 1).padStart(3, '0')}`;

      // For now, create as a bill since we haven't migrated the schema yet
      const bill = await storage.createBill({
        billNumber: orderNumber,
        customerName: orderData.customerName,
        customerEmail: orderData.customerEmail,
        customerPhone: orderData.customerPhone,
        customerAddress: orderData.customerAddress,
        currency: orderData.currency || 'INR',
        subtotal: orderData.subtotal.toString(),
        makingCharges: (orderData.makingCharges || 0).toString(),
        gst: (orderData.gst || 0).toString(),
        vat: (orderData.vat || 0).toString(),
        discount: (orderData.discount || 0).toString(),
        total: orderData.total.toString(),
        paidAmount: orderData.paidAmount.toString(),
        paymentMethod: orderData.paymentMethod || 'CASH',
        items: orderData.items || [],
      });

      res.status(201).json({
        id: bill.id,
        orderNumber: bill.billNumber,
        ...bill
      });
    } catch (error: any) {
      console.error("Order creation error:", error);
      res.status(400).json({
        message: "Failed to create order",
        details: error.message
      });
    }
  });

  // Static file serving for uploads
  app.use('/uploads', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
  });

  const httpServer = createServer(app);
  return httpServer;
}
