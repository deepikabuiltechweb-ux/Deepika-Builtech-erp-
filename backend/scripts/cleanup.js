import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Material from '../models/Material.js';
import Project from '../models/Project.js';
import Vendor from '../models/Vendor.js';
import Enquiry from '../models/Enquiry.js';
import Quotation from '../models/Quotation.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import GRN from '../models/GRN.js';
import Issue from '../models/Issue.js';
import Tool from '../models/Tool.js';
import ToolIssue from '../models/ToolIssue.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function cleanup() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB...");

    // Delete all documents from core collections
    const result1 = await Material.deleteMany({});
    const result2 = await Project.deleteMany({});
    const result3 = await Vendor.deleteMany({});
    const result4 = await Enquiry.deleteMany({});
    const result5 = await Quotation.deleteMany({});
    const result6 = await PurchaseOrder.deleteMany({});
    const result7 = await GRN.deleteMany({});
    const result8 = await Issue.deleteMany({});
    const result9 = await Tool.deleteMany({});
    const result10 = await ToolIssue.deleteMany({});

    console.log(`Deleted ${result1.deletedCount} materials`);
    console.log(`Deleted ${result2.deletedCount} projects`);
    console.log(`Deleted ${result3.deletedCount} vendors`);
    console.log(`Deleted ${result4.deletedCount} enquiries`);
    console.log(`Deleted ${result5.deletedCount} quotations`);
    console.log(`Deleted ${result6.deletedCount} purchase orders`);
    console.log(`Deleted ${result7.deletedCount} GRNs`);
    console.log(`Deleted ${result8.deletedCount} issues`);
    console.log(`Deleted ${result9.deletedCount} tools`);
    console.log(`Deleted ${result10.deletedCount} tool issues`);

    console.log("Database cleared for production!");
    process.exit(0);
  } catch (err) {
    console.error("Error during cleanup:", err);
    process.exit(1);
  }
}

cleanup();
