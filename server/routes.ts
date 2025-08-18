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

      // Enhanced Customer and Company details with better spacing
      const boxHeight = 120;
      const boxWidth = (contentWidth - 20) / 2;
      
      // Company details box with shadow effect
      doc.rect(margin, currentY, boxWidth, boxHeight)
         .fill('#FFFFFF')
         .stroke('#D0D0D0');
      
      // Company header
      doc.fillColor(darkGray)
         .rect(margin, currentY, boxWidth, 30)
         .fill();
      
      doc.fillColor('#FFFFFF')
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('BILLED FROM', margin + 15, currentY + 10);

      // Company details with proper spacing
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor(primaryColor)
         .text('PALANIAPPA JEWELLERS', margin + 15, currentY + 42);
         
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(accentColor)
         .text('Premium Jewelry & Ornaments', margin + 15, currentY + 58)
         .text('123 Jewelry Street', margin + 15, currentY + 72)
         .text('Chennai, Tamil Nadu - 600001', margin + 15, currentY + 86)
         .text('GSTIN: 33AAACT5712A124', margin + 15, currentY + 100);

      // Customer details box with shadow effect
      const customerBoxX = margin + boxWidth + 20;
      
      doc.rect(customerBoxX, currentY, boxWidth, boxHeight)
         .fill('#FFFFFF')
         .stroke('#D0D0D0');
      
      // Customer header
      doc.fillColor(darkGray)
         .rect(customerBoxX, currentY, boxWidth, 30)
         .fill();
      
      doc.fillColor('#FFFFFF')
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('BILLED TO', customerBoxX + 15, currentY + 10);

      // Customer details with proper spacing
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor(primaryColor)
         .text(bill.customerName || 'N/A', customerBoxX + 15, currentY + 42);
         
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(accentColor)
         .text(bill.customerEmail || 'N/A', customerBoxX + 15, currentY + 58, { 
           width: boxWidth - 30, 
           ellipsis: true 
         })
         .text(bill.customerPhone || 'N/A', customerBoxX + 15, currentY + 72)
         .text(bill.customerAddress || 'N/A', customerBoxX + 15, currentY + 86, { 
           width: boxWidth - 30, 
           height: 25,
           ellipsis: true 
         });

      currentY += boxHeight + 30;

      // Items table with professional styling
      const tableHeaders = ['Description', 'Qty', 'Unit Price', 'Amount'];
      const colWidths = [280, 70, 110, 110]; // Adjusted widths
      const tableStartX = margin;
      
      // Table header background with rounded corners effect
      doc.rect(tableStartX, currentY, contentWidth, 35)
         .fill(darkGray);

      // Table headers with better spacing
      doc.fillColor('#FFFFFF')
         .fontSize(12)
         .font('Helvetica-Bold');
      
      let headerX = tableStartX + 15;
      tableHeaders.forEach((header, i) => {
        if (i === 0) {
          doc.text(header, headerX, currentY + 12);
        } else {
          doc.text(header, headerX, currentY + 12, { 
            align: i > 1 ? 'right' : 'center', 
            width: colWidths[i] - 20 
          });
        }
        headerX += colWidths[i];
      });

      currentY += 35;

      // Table rows with improved spacing
      doc.fontSize(11)
         .font('Helvetica')
         .fillColor(primaryColor);

      let rowIndex = 0;
      bill.items.forEach((item) => {
        const rowY = currentY;
        const rowHeight = 35; // Increased row height
        const rowBg = rowIndex % 2 === 0 ? '#FFFFFF' : '#F8F9FA';
        
        // Row background with subtle border
        doc.rect(tableStartX, rowY, contentWidth, rowHeight)
           .fill(rowBg);
        
        // Add subtle row border
        doc.moveTo(tableStartX, rowY + rowHeight)
           .lineTo(tableStartX + contentWidth, rowY + rowHeight)
           .strokeColor('#E0E0E0')
           .lineWidth(0.5)
           .stroke();

        // Row data with better alignment
        let cellX = tableStartX + 15;
        const rate = bill.currency === 'INR' ? parseFloat(item.priceInr) : parseFloat(item.priceBhd);
        const currency = bill.currency === 'INR' ? '₹' : 'BD ';
        
        // Product name (left aligned)
        doc.fillColor(primaryColor)
           .fontSize(11)
           .font('Helvetica')
           .text(item.productName, cellX, rowY + 12, { 
             width: colWidths[0] - 30,
             ellipsis: true 
           });
        cellX += colWidths[0];
        
        // Quantity (center aligned)
        doc.text(item.quantity.toString(), cellX, rowY + 12, { 
          align: 'center', 
          width: colWidths[1] - 20 
        });
        cellX += colWidths[1];
        
        // Unit price (right aligned)
        doc.text(`${currency}${rate.toLocaleString('en-IN', {minimumFractionDigits: 2})}`, 
                cellX, rowY + 12, { 
                  align: 'right', 
                  width: colWidths[2] - 20 
                });
        cellX += colWidths[2];
        
        // Total amount (right aligned, bold)
        doc.font('Helvetica-Bold')
           .text(`${currency}${parseFloat(item.total).toLocaleString('en-IN', {minimumFractionDigits: 2})}`, 
                cellX, rowY + 12, { 
                  align: 'right', 
                  width: colWidths[3] - 20 
                });

        currentY += rowHeight;
        rowIndex++;
        doc.font('Helvetica'); // Reset font
      });

      // Table bottom border
      doc.moveTo(tableStartX, currentY)
         .lineTo(tableStartX + contentWidth, currentY)
         .stroke(accentColor);

      currentY += 20;

      // Enhanced summary section with better styling
      const summaryStartX = pageWidth - 280;
      const summaryWidth = 250;
      const currency = bill.currency === 'INR' ? '₹' : 'BD ';
      
      // Summary box background
      doc.rect(summaryStartX - 10, currentY, summaryWidth, 140)
         .fill('#F8F9FA')
         .stroke('#E0E0E0');
      
      currentY += 15;
      
      doc.fontSize(11)
         .font('Helvetica')
         .fillColor(primaryColor);

      const summaryItems = [
        { label: 'Subtotal:', value: parseFloat(bill.subtotal) },
        { label: 'Making Charges:', value: parseFloat(bill.makingCharges) },
        { label: `${bill.currency === 'BHD' ? 'VAT' : 'GST'}:`, value: parseFloat(bill.gst) },
        { label: 'Discount:', value: parseFloat(bill.discount), isDiscount: true }
      ];

      summaryItems.forEach((item, index) => {
        const y = currentY + (index * 22);
        const labelX = summaryStartX;
        const valueX = summaryStartX + 140;
        
        doc.text(item.label, labelX, y);
        
        let valueText;
        if (item.isDiscount && item.value > 0) {
          valueText = `-${currency}${item.value.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
          doc.fillColor('#D32F2F'); // Red for discount
        } else {
          valueText = `${currency}${Math.abs(item.value).toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
          doc.fillColor(primaryColor);
        }
        
        doc.text(valueText, valueX, y, { align: 'right', width: 90 });
      });

      currentY += summaryItems.length * 22 + 15;

      // Enhanced total line with gradient effect
      doc.rect(summaryStartX - 5, currentY - 5, summaryWidth - 10, 35)
         .fill(darkGray);

      doc.fillColor('#FFFFFF')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('TOTAL AMOUNT:', summaryStartX + 5, currentY + 10);
         
      doc.fontSize(16)
         .text(`${currency}${parseFloat(bill.total).toLocaleString('en-IN', {minimumFractionDigits: 2})}`, 
              summaryStartX + 140, currentY + 8, { align: 'right', width: 90 });

      currentY += 50;

      // Enhanced payment information section
      const paymentBoxY = currentY;
      const paymentBoxHeight = 60;
      
      doc.rect(margin, paymentBoxY, contentWidth, paymentBoxHeight)
         .fill('#F0F8FF')
         .stroke('#B0C4DE');

      doc.fontSize(11)
         .fillColor(darkGray)
         .font('Helvetica-Bold')
         .text('PAYMENT DETAILS', margin + 15, paymentBoxY + 15);

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(primaryColor)
         .text('Payment Method:', margin + 15, paymentBoxY + 35)
         .font('Helvetica-Bold')
         .text(bill.paymentMethod || 'Cash', margin + 120, paymentBoxY + 35);

      if (bill.paidAmount) {
        doc.font('Helvetica')
           .text('Amount Paid:', margin + 300, paymentBoxY + 35)
           .font('Helvetica-Bold')
           .text(`${currency}${parseFloat(bill.paidAmount).toLocaleString('en-IN', {minimumFractionDigits: 2})}`, 
                margin + 380, paymentBoxY + 35);
      }

      currentY += paymentBoxHeight + 20;

      // Footer section with enhanced styling
      const footerY = doc.page.height - 120;
      
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
