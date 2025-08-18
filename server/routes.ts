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



  // Enhanced Bill PDF generation with elegant styling
  app.get("/api/bills/:id/pdf", async (req, res) => {
    try {
      const bill = await storage.getBill(req.params.id);
      if (!bill) {
        return res.status(404).json({ message: "Bill not found" });
      }

      // Create PDF with enhanced settings
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 40,
        info: {
          Title: `Invoice ${bill.billNumber}`,
          Author: 'Palaniappa Jewellers',
          Subject: 'Tax Invoice',
          Keywords: 'invoice, jewelry, tax'
        }
      });
      
      const filename = `Invoice_${bill.billNumber}_${bill.customerName.replace(/\s+/g, '_')}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      doc.pipe(res);

      const pageWidth = doc.page.width;
      const margin = 40;
      const contentWidth = pageWidth - (margin * 2);

      // Colors for styling
      const primaryColor = '#000000';
      const accentColor = '#666666';
      const lightGray = '#F5F5F5';
      const darkGray = '#333333';

      // Helper function to add watermark
      function addWatermark() {
        doc.save();
        doc.fillColor('#EEEEEE')
           .fontSize(60)
           .text('PALANIAPPA JEWELLERS', 0, 300, {
             align: 'center',
             width: pageWidth,
             rotate: -45
           });
        doc.restore();
      }

      // Add elegant header background
      doc.rect(0, 0, pageWidth, 140)
         .fill('#F8F9FA');

      // Add company logo if available
      let logoY = 25;
      try {
        doc.image('./attached_assets/1000284180_1755240849891_1755538055896.jpg', 
                 pageWidth - 130, logoY, { width: 80, height: 80 });
      } catch (error) {
        console.log('Logo not found, continuing without image');
      }

      // Elegant company header
      doc.fillColor(primaryColor)
         .fontSize(28)
         .font('Helvetica-Bold')
         .text('PALANIAPPA JEWELLERS', margin, 35);

      doc.fontSize(11)
         .fillColor(accentColor)
         .font('Helvetica')
         .text('Premium Jewelry & Ornaments Since 2025', margin, 70)
         .text('123 Jewelry Street, Chennai, Tamil Nadu - 600001', margin, 85)
         .text('Phone: +91 95972 01554 | Email: jewelerypalaniappa@gmail.com', margin, 100)
         .text('GSTIN: 33AAACT5712A124', margin, 115);

      // Invoice title and details section
      let currentY = 160;
      
      // Invoice header with background
      doc.rect(margin, currentY, contentWidth, 35)
         .fill(primaryColor);
      
      doc.fillColor('#FFFFFF')
         .fontSize(18)
         .font('Helvetica-Bold')
         .text('TAX INVOICE', margin + 15, currentY + 10);

      const invoiceDate = new Date(bill.createdAt!);
      doc.fontSize(11)
         .text(`Invoice No: ${bill.billNumber}`, pageWidth - 200, currentY + 8)
         .text(`Date: ${invoiceDate.toLocaleDateString('en-IN')}`, pageWidth - 200, currentY + 22);

      currentY += 55;

      // Customer and Company details in elegant boxes
      const boxHeight = 100;
      
      // Company details box
      doc.rect(margin, currentY, contentWidth/2 - 10, boxHeight)
         .stroke(accentColor);
      
      doc.fillColor(lightGray)
         .rect(margin, currentY, contentWidth/2 - 10, 25)
         .fill();
      
      doc.fillColor(darkGray)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('BILLED FROM', margin + 10, currentY + 8);

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(primaryColor)
         .text('PALANIAPPA JEWELLERS', margin + 10, currentY + 35)
         .text('Premium Jewelry Store', margin + 10, currentY + 50)
         .text('Chennai, Tamil Nadu - 600001', margin + 10, currentY + 65)
         .text('GSTIN: 33AAACT5712A124', margin + 10, currentY + 80);

      // Customer details box
      const customerBoxX = margin + contentWidth/2 + 10;
      
      doc.rect(customerBoxX, currentY, contentWidth/2 - 10, boxHeight)
         .stroke(accentColor);
      
      doc.fillColor(lightGray)
         .rect(customerBoxX, currentY, contentWidth/2 - 10, 25)
         .fill();
      
      doc.fillColor(darkGray)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('BILLED TO', customerBoxX + 10, currentY + 8);

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(primaryColor)
         .text(bill.customerName, customerBoxX + 10, currentY + 35)
         .text(bill.customerEmail, customerBoxX + 10, currentY + 50)
         .text(bill.customerPhone, customerBoxX + 10, currentY + 65)
         .text(bill.customerAddress, customerBoxX + 10, currentY + 80, { width: contentWidth/2 - 30 });

      currentY += boxHeight + 30;

      // Items table with professional styling
      const tableHeaders = ['Description', 'Qty', 'Rate', 'Amount'];
      const colWidths = [250, 60, 100, 100];
      const tableStartX = margin;
      
      // Table header background
      doc.rect(tableStartX, currentY, contentWidth, 30)
         .fill(darkGray);

      // Table headers
      doc.fillColor('#FFFFFF')
         .fontSize(11)
         .font('Helvetica-Bold');
      
      let headerX = tableStartX + 10;
      tableHeaders.forEach((header, i) => {
        doc.text(header, headerX, currentY + 10);
        headerX += colWidths[i];
      });

      currentY += 30;

      // Table rows
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(primaryColor);

      let rowIndex = 0;
      bill.items.forEach((item) => {
        const rowY = currentY;
        const rowBg = rowIndex % 2 === 0 ? '#FFFFFF' : '#F9F9F9';
        
        // Row background
        doc.rect(tableStartX, rowY, contentWidth, 25)
           .fill(rowBg);

        // Row data
        let cellX = tableStartX + 10;
        const rate = bill.currency === 'INR' ? parseFloat(item.priceInr) : parseFloat(item.priceBhd);
        const currency = bill.currency === 'INR' ? '₹' : 'BD ';
        
        doc.fillColor(primaryColor)
           .text(item.productName, cellX, rowY + 8, { width: colWidths[0] - 15 });
        cellX += colWidths[0];
        
        doc.text(item.quantity.toString(), cellX, rowY + 8, { align: 'center', width: colWidths[1] });
        cellX += colWidths[1];
        
        doc.text(`${currency}${rate.toLocaleString('en-IN', {minimumFractionDigits: 2})}`, 
                cellX, rowY + 8, { align: 'right', width: colWidths[2] - 10 });
        cellX += colWidths[2];
        
        doc.text(`${currency}${parseFloat(item.total).toLocaleString('en-IN', {minimumFractionDigits: 2})}`, 
                cellX, rowY + 8, { align: 'right', width: colWidths[3] - 10 });

        currentY += 25;
        rowIndex++;
      });

      // Table bottom border
      doc.moveTo(tableStartX, currentY)
         .lineTo(tableStartX + contentWidth, currentY)
         .stroke(accentColor);

      currentY += 20;

      // Summary section
      const summaryStartX = pageWidth - 250;
      const currency = bill.currency === 'INR' ? '₹' : 'BD ';
      
      doc.fontSize(10)
         .font('Helvetica');

      const summaryItems = [
        { label: 'Subtotal:', value: parseFloat(bill.subtotal) },
        { label: 'Making Charges:', value: parseFloat(bill.makingCharges) },
        { label: `${bill.currency === 'BHD' ? 'VAT' : 'GST'}:`, value: parseFloat(bill.gst) },
        { label: 'Discount:', value: -parseFloat(bill.discount) }
      ];

      summaryItems.forEach((item, index) => {
        const y = currentY + (index * 18);
        doc.text(item.label, summaryStartX, y)
           .text(`${currency}${Math.abs(item.value).toLocaleString('en-IN', {minimumFractionDigits: 2})}`, 
                summaryStartX + 80, y, { align: 'right', width: 120 });
      });

      currentY += summaryItems.length * 18 + 10;

      // Total line
      doc.rect(summaryStartX - 10, currentY - 5, 210, 25)
         .fill(darkGray);

      doc.fillColor('#FFFFFF')
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('TOTAL:', summaryStartX, currentY + 5)
         .text(`${currency}${parseFloat(bill.total).toLocaleString('en-IN', {minimumFractionDigits: 2})}`, 
              summaryStartX + 80, currentY + 5, { align: 'right', width: 120 });

      currentY += 40;

      // Payment information
      doc.fontSize(10)
         .fillColor(primaryColor)
         .font('Helvetica-Bold')
         .text('Payment Method:', margin, currentY)
         .font('Helvetica')
         .text(bill.paymentMethod, margin + 100, currentY);

      if (bill.paidAmount) {
        doc.text('Amount Paid:', margin, currentY + 15)
           .text(`${currency}${parseFloat(bill.paidAmount).toLocaleString('en-IN', {minimumFractionDigits: 2})}`, 
                margin + 100, currentY + 15);
      }

      // Footer section
      const footerY = doc.page.height - 100;
      
      doc.rect(0, footerY - 10, pageWidth, 60)
         .fill('#F8F9FA');

      doc.fontSize(9)
         .fillColor(accentColor)
         .text('Thank you for choosing Palaniappa Jewellers!', margin, footerY, { align: 'center', width: contentWidth })
         .text('For any queries, please contact us at +91 95972 01554 or jewelerypalaniappa@gmail.com', 
              margin, footerY + 15, { align: 'center', width: contentWidth });

      // Terms and conditions
      doc.fontSize(8)
         .text('Terms & Conditions: All sales are final. Please inspect your purchase before leaving the store.', 
              margin, footerY + 35, { width: contentWidth });

      // Add subtle watermark
      addWatermark();

      // Add page numbers for multi-page documents
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8)
           .fillColor(accentColor)
           .text(`Page ${i + 1} of ${pageCount}`, margin, doc.page.height - 30, 
                 { align: 'center', width: contentWidth });
      }

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
