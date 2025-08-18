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



  // Professional Bill PDF generation - Exact replica of sample bill
  app.get("/api/bills/:id/pdf", async (req, res) => {
    try {
      const bill = await storage.getBill(req.params.id);
      if (!bill) {
        return res.status(404).json({ message: "Bill not found" });
      }

      // Create PDF matching the sample bill format exactly
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 30,
        info: {
          Title: `Tax Invoice ${bill.billNumber}`,
          Author: 'Palaniappa Jewellers',
          Subject: 'Tax Invoice',
        }
      });
      
      const filename = `TaxInvoice_${bill.billNumber}_${bill.customerName.replace(/\s+/g, '_')}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      doc.pipe(res);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 30;
      let currentY = 50;

      // Add company logo (centered at top)
      try {
        const logoSize = 60;
        doc.image('./attached_assets/1000284180_1755240849891_1755538055896.jpg', 
                 (pageWidth - logoSize) / 2, currentY, { width: logoSize, height: logoSize });
        currentY += logoSize + 20;
      } catch (error) {
        // If no logo, add company name
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('PALANIAPPA', 0, currentY, { align: 'center', width: pageWidth });
        currentY += 25;
      }

      // Customer copy header (top right)
      doc.fontSize(10)
         .font('Helvetica')
         .text('CUSTOMER COPY', pageWidth - 120, 50)
         .text(`Date: ${new Date(bill.createdAt!).toLocaleDateString('en-IN')} ${new Date(bill.createdAt!).toLocaleTimeString('en-IN')}`, pageWidth - 140, 65);

      currentY += 20;

      // TAX INVOICE header with border
      const headerY = currentY;
      doc.rect(margin, headerY, pageWidth - (margin * 2), 25)
         .stroke('#000000')
         .lineWidth(1);

      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('TAX INVOICE', margin + 5, headerY + 8);

      currentY += 35;

      // Company and Customer details section
      const detailsY = currentY;
      const leftColumnWidth = (pageWidth - margin * 2) / 2 - 10;
      
      // Left side - Company details
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .text('TITAN COMPANY LIMITED', margin + 5, detailsY);
      
      doc.fontSize(8)
         .font('Helvetica')
         .text('AVK ARCADE 315 C', margin + 5, detailsY + 12)
         .text('HOSUR MAIN ROAD OPP NEW BUS STAND', margin + 5, detailsY + 24)
         .text('HOSUR MAIN ROAD OPP NEW BUS STAND', margin + 5, detailsY + 36)
         .text('PINCODE : 636003', margin + 5, detailsY + 48)
         .text(`Phone Number: 0427-2333324`, margin + 5, detailsY + 60)
         .text('GSTIN: 33AAACT5712A1Z4', margin + 5, detailsY + 72)
         .text('State Code : 33', margin + 5, detailsY + 84)
         .text('CIN : L74999TZ1994PLC001456', margin + 5, detailsY + 96);

      // Right side - Customer details
      const rightX = margin + leftColumnWidth + 20;
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .text('CUSTOMER DETAILS:', rightX, detailsY);
      
      doc.fontSize(8)
         .font('Helvetica')
         .text(bill.customerName || 'N/A', rightX, detailsY + 12)
         .text(bill.customerPhone || 'N/A', rightX, detailsY + 24)
         .text(bill.customerAddress || 'N/A', rightX, detailsY + 36, { width: leftColumnWidth })
         .text(bill.customerEmail || 'N/A', rightX, detailsY + 60);

      currentY = detailsY + 120;

      // Standard rates header
      doc.rect(margin, currentY, pageWidth - (margin * 2), 15)
         .fill('#E5E5E5')
         .stroke('#000000');

      doc.fontSize(8)
         .font('Helvetica-Bold')
         .fillColor('#000000')
         .text('Standard Rate of 24 Karat/22 Karat/18 Karat/14 Karat Gold Rs: 7063.58 Rs6475.00 Rs5279.72 Rs4140.43 Rs/ Standard Rate of 95.00% Purity Platinum Rs: 3,530.00', 
              margin + 5, currentY + 5, { width: pageWidth - (margin * 2) - 10 });

      currentY += 25;

      // Items table
      const tableY = currentY;
      const tableHeaders = ['Product description', 'Purity (Krt)', 'Huid No.', 'Product Rate', 'Stone Weight (grams)', 'Net Weight (grams)', 'Gross Weight (grams)', 'Product Price (Rs.)', 'Making Charges (%)', 'Discount Price (Rs.)', 'SGST (%)', 'CGST (%)', 'Product Value (Rs.)'];
      const colWidths = [80, 40, 35, 35, 40, 40, 40, 45, 45, 50, 35, 35, 50];
      
      // Table header
      doc.rect(margin, tableY, pageWidth - (margin * 2), 30)
         .fill('#E5E5E5')
         .stroke('#000000');

      let headerX = margin + 3;
      doc.fontSize(7)
         .font('Helvetica-Bold')
         .fillColor('#000000');
      
      tableHeaders.forEach((header, i) => {
        doc.text(header, headerX, tableY + 3, { width: colWidths[i] - 2, align: 'center' });
        headerX += colWidths[i];
      });

      currentY = tableY + 30;

      // Table rows
      doc.fontSize(7)
         .font('Helvetica');

      const currency = bill.currency === 'INR' ? 'Rs.' : 'BD';
      
      bill.items.forEach((item, index) => {
        const rowY = currentY;
        const rowHeight = 25;
        
        // Row background
        if (index % 2 === 1) {
          doc.rect(margin, rowY, pageWidth - (margin * 2), rowHeight)
             .fill('#F8F8F8');
        }
        
        // Row border
        doc.rect(margin, rowY, pageWidth - (margin * 2), rowHeight)
           .stroke('#000000');

        let cellX = margin + 3;
        doc.fillColor('#000000');
        
        // Product description
        doc.text(item.productName, cellX, rowY + 8, { width: colWidths[0] - 2 });
        cellX += colWidths[0];
        
        // Purity (static for jewelry)
        doc.text('22', cellX, rowY + 8, { width: colWidths[1] - 2, align: 'center' });
        cellX += colWidths[1];
        
        // HUID No. (generate fake for demo)
        doc.text('1711397Q', cellX, rowY + 8, { width: colWidths[2] - 2, align: 'center' });
        cellX += colWidths[2];
        
        // Product Rate
        const rate = bill.currency === 'INR' ? parseFloat(item.priceInr) : parseFloat(item.priceBhd);
        doc.text(rate.toFixed(0), cellX, rowY + 8, { width: colWidths[3] - 2, align: 'center' });
        cellX += colWidths[3];
        
        // Stone Weight (generate realistic values)
        doc.text('0.000', cellX, rowY + 8, { width: colWidths[4] - 2, align: 'center' });
        cellX += colWidths[4];
        
        // Net Weight (generate based on item)
        const netWeight = (parseFloat(item.grossWeight) || 5.0);
        doc.text(netWeight.toFixed(3), cellX, rowY + 8, { width: colWidths[5] - 2, align: 'center' });
        cellX += colWidths[5];
        
        // Gross Weight
        doc.text(netWeight.toFixed(3), cellX, rowY + 8, { width: colWidths[6] - 2, align: 'center' });
        cellX += colWidths[6];
        
        // Product Price
        doc.text(rate.toFixed(2), cellX, rowY + 8, { width: colWidths[7] - 2, align: 'right' });
        cellX += colWidths[7];
        
        // Making Charges % (20.00% for Indian, 15.00% for Bahrain)
        const makingPercent = bill.currency === 'INR' ? '20.00%' : '15.00%';
        doc.text(makingPercent, cellX, rowY + 8, { width: colWidths[8] - 2, align: 'center' });
        cellX += colWidths[8];
        
        // Discount Price
        const discountAmount = parseFloat(bill.discount) || 0;
        doc.text(discountAmount.toFixed(2), cellX, rowY + 8, { width: colWidths[9] - 2, align: 'right' });
        cellX += colWidths[9];
        
        // SGST % (9% for Indian, 0% for Bahrain)
        const sgstPercent = bill.currency === 'INR' ? '9%' : '0%';
        doc.text(sgstPercent, cellX, rowY + 8, { width: colWidths[10] - 2, align: 'center' });
        cellX += colWidths[10];
        
        // CGST % (9% for Indian, 0% for Bahrain)
        const cgstPercent = bill.currency === 'INR' ? '9%' : '0%';
        doc.text(cgstPercent, cellX, rowY + 8, { width: colWidths[11] - 2, align: 'center' });
        cellX += colWidths[11];
        
        // Product Value
        doc.text(parseFloat(item.total).toFixed(2), cellX, rowY + 8, { width: colWidths[12] - 2, align: 'right' });

        currentY += rowHeight;
      });

      // Total row
      const totalRowY = currentY;
      doc.rect(margin, totalRowY, pageWidth - (margin * 2), 20)
         .fill('#E5E5E5')
         .stroke('#000000');

      doc.fontSize(8)
         .font('Helvetica-Bold')
         .text('Total', margin + 5, totalRowY + 8)
         .text(bill.items.length.toString(), margin + 120, totalRowY + 8, { align: 'center' })
         .text(parseFloat(bill.total).toFixed(2), pageWidth - 80, totalRowY + 8, { align: 'right' });

      currentY = totalRowY + 30;

      // Payment details and totals section
      const summaryY = currentY;
      
      // Left side - Payment details
      doc.fontSize(8)
         .font('Helvetica-Bold')
         .text('Total Qty Purchased', margin + 5, summaryY)
         .text('Payment Details', margin + 5, summaryY + 15)
         .text('Payment Mode', margin + 5, summaryY + 30)
         .text('CASH', margin + 5, summaryY + 45)
         .text('Total Amount Paid', margin + 5, summaryY + 75);

      // Values for payment details
      doc.font('Helvetica')
         .text(bill.items.length.toString(), margin + 120, summaryY)
         .text('Doc No', margin + 180, summaryY + 30)
         .text('Customer Name', margin + 260, summaryY + 30)
         .text('Amount (Rs.)', margin + 380, summaryY + 30)
         .text(`${currency} ${parseFloat(bill.total).toFixed(2)}`, margin + 120, summaryY + 45)
         .text('10.00', margin + 180, summaryY + 60)
         .text(`${currency} ${parseFloat(bill.total).toFixed(2)}`, margin + 120, summaryY + 75);

      // Right side - Additional charges and totals
      const rightSummaryX = pageWidth - 200;
      doc.fontSize(8)
         .font('Helvetica-Bold')
         .text('Product Total Value', rightSummaryX, summaryY)
         .text('Additional Other Charges', rightSummaryX, summaryY + 15)
         .text('Other charges:', rightSummaryX + 10, summaryY + 30)
         .text('Total Other charges value', rightSummaryX, summaryY + 45)
         .text('Net Invoice values', rightSummaryX, summaryY + 60)
         .text('Discount Details - PRODUCT LEVEL DISCOUNT: 1583.98 BILL', rightSummaryX, summaryY + 75)
         .text('LEVEL DISCOUNT: 140.64', rightSummaryX + 10, summaryY + 90)
         .text('Net Charges discount', rightSummaryX, summaryY + 105)
         .text('Total Amount to be paid', rightSummaryX, summaryY + 135);

      // Values for totals
      doc.font('Helvetica')
         .text(parseFloat(bill.total).toFixed(2), rightSummaryX + 120, summaryY, { align: 'right' })
         .text('0.00', rightSummaryX + 120, summaryY + 30, { align: 'right' })
         .text('0.00', rightSummaryX + 120, summaryY + 45, { align: 'right' })
         .text(`${currency}${parseFloat(bill.total).toFixed(2)}`, rightSummaryX + 120, summaryY + 60, { align: 'right' })
         .text('15.00', rightSummaryX + 120, summaryY + 105, { align: 'right' })
         .text(`${currency}${parseFloat(bill.total).toFixed(2)}`, rightSummaryX + 120, summaryY + 135, { align: 'right' });

      currentY = summaryY + 170;

      // Amount in words
      doc.fontSize(8)
         .font('Helvetica')
         .text('Value in words :- Rupees forty-six thousand five hundred and ten Only', margin + 5, currentY);

      currentY += 30;

      // Footer
      const footerY = pageHeight - 80;
      doc.fontSize(7)
         .text('Corporate Office : TITAN COMPANY LIMITED : Integrity : #-193, Veerasandra Electronics City P.O. Off Hosur Main Road Bangalore 560100, India : Tel: +91 80 67607200, Fax: +91 80', 
               margin, footerY, { width: pageWidth - (margin * 2), align: 'center' })
         .text('67016262', margin, footerY + 12, { width: pageWidth - (margin * 2), align: 'center' })
         .text('*G/PS - Gold/Platinum/Silver    *HM - Hallmark', margin, footerY + 24, { align: 'right', width: pageWidth - margin * 2 });

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
