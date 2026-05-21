import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Material from './models/Material.js';
import Project from './models/Project.js';
import Vendor from './models/Vendor.js';

dotenv.config();

const setup = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    // 1. Clean up existing data for fresh setup
    await User.deleteMany({ email: { $in: [
      'admin@peb.com', 'staff@peb.com', 'viewer@peb.com', 'store@peb.com', 
      'deepikabuiltech@gmail.com', 'viewer@deepikabuiltech.com',
      'store@deepikabuiltech.com', 'purchase@deepikabuiltech.com'
    ] } });
    await Material.deleteMany({});
    await Project.deleteMany({});
    await Vendor.deleteMany({});
    
    console.log("Cleared old database records.");

    // 2. Create Users
    const admin = new User({
        name: 'Deepika Builtech Admin',
        email: 'deepikabuiltech@gmail.com',
        password: 'deepikabuiltech@123',
        role: 'admin'
    });
    await admin.save();
    console.log("Admin user created (deepikabuiltech@gmail.com / deepikabuiltech@123)");

    const storeUser = new User({
        name: 'Store Team Lead',
        email: 'store@deepikabuiltech.com',
        password: 'store@123',
        role: 'store_team'
    });
    await storeUser.save();
    console.log("Store Team user created (store@deepikabuiltech.com / store@123)");

    const purchaseUser = new User({
        name: 'Purchase Manager',
        email: 'purchase@deepikabuiltech.com',
        password: 'purchase@123',
        role: 'purchase_team'
    });
    await purchaseUser.save();
    console.log("Purchase Team user created (purchase@deepikabuiltech.com / purchase@123)");

    const viewer = new User({
        name: 'View Only User',
        email: 'viewer@deepikabuiltech.com',
        password: 'viewer@123',
        role: 'viewer'
    });
    await viewer.save();
    console.log("Viewer user created (viewer@deepikabuiltech.com / viewer@123)");

    // 3. Seed Materials
    const materials = [
      { id: 'MAT001', name: 'TMT Steel Rebars Fe550', category: 'Steel', unit: 'MT', brand: 'Tata Tiscon', lastPrice: 52000, latestPrice: 53500, currentStock: 45, minLevel: 10 },
      { id: 'MAT002', name: 'OPC 53 Grade Cement', category: 'Cement', unit: 'Bags', brand: 'Ultratech', lastPrice: 420, latestPrice: 430, currentStock: 1200, minLevel: 200 },
      { id: 'MAT003', name: 'River Sand Premium', category: 'Aggregates', unit: 'CFT', brand: 'Local Co-op', lastPrice: 85, latestPrice: 90, currentStock: 3000, minLevel: 500 },
      { id: 'MAT004', name: 'Structural Steel I-Beams', category: 'Steel', unit: 'MT', brand: 'JSW Steel', lastPrice: 58000, latestPrice: 59000, currentStock: 12, minLevel: 5 },
      { id: 'MAT005', name: 'High-Tensile Bolts M20', category: 'Fasteners', unit: 'Nos', brand: 'Unbrako', lastPrice: 45, latestPrice: 48, currentStock: 350, minLevel: 400 }, // Low stock!
      { id: 'MAT006', name: 'Puff Panels 50mm', category: 'Panels', unit: 'Sqm', brand: 'Metecno', lastPrice: 750, latestPrice: 780, currentStock: 80, minLevel: 100 }, // Low stock!
      { id: 'MAT007', name: 'Industrial LED Highbay 150W', category: 'Electrical', unit: 'Nos', brand: 'Philips', lastPrice: 3200, latestPrice: 3100, currentStock: 15, minLevel: 5 },
    ];
    await Material.insertMany(materials);
    console.log("Seeded 7 materials successfully.");

    // 4. Seed Projects
    const projects = [
      { id: 'PRJ001', name: 'Smart Logistics Warehouse A', client: 'SMARTLOG Corp', startDate: new Date('2026-01-10'), endDate: new Date('2026-08-30'), budget: 25000000, status: 'Active' },
      { id: 'PRJ002', name: 'Cold Storage Facility Chennai', client: 'FrozenFoods Ltd', startDate: new Date('2026-03-01'), endDate: new Date('2026-11-15'), budget: 42000000, status: 'Active' },
      { id: 'PRJ003', name: 'Auto Components Factory Shed', client: 'PrecisionMotors', startDate: new Date('2025-10-15'), endDate: new Date('2026-04-20'), budget: 18000000, status: 'Completed' },
    ];
    await Project.insertMany(projects);
    console.log("Seeded 3 projects successfully.");

    // 5. Seed Vendors
    const vendors = [
      { id: 'VND001', name: 'Tata Steel Distribution', contact: 'Ramesh Sen', email: 'ramesh@tatasteel.com', category: 'Steel', rating: 4.8, city: 'Kolkata' },
      { id: 'VND002', name: 'Ultratech Cement Agency', contact: 'Vijay Kumar', email: 'vijay@ultratech.com', category: 'Cement', rating: 4.5, city: 'Mumbai' },
      { id: 'VND003', name: 'Industrial Fasteners Corp', contact: 'Anil Gupta', email: 'sales@indfasteners.com', category: 'Fasteners', rating: 4.2, city: 'Chennai' },
      { id: 'VND004', name: 'Apex Panels Ltd', contact: 'Sanjay Dutt', email: 'sanjay@apexpanels.in', category: 'Panels', rating: 4.0, city: 'Hyderabad' },
    ];
    await Vendor.insertMany(vendors);
    console.log("Seeded 4 vendors successfully.");

    console.log("Database Seed completed successfully! 🎉");
    process.exit(0);
  } catch (err) {
    console.error("Database seed failed:", err);
    process.exit(1);
  }
};

setup();
