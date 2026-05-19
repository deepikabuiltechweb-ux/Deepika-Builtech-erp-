import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Material from '../models/Material.js';
import Project from '../models/Project.js';
import Vendor from '../models/Vendor.js';

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

    console.log(`Deleted ${result1.deletedCount} materials`);
    console.log(`Deleted ${result2.deletedCount} projects`);
    console.log(`Deleted ${result3.deletedCount} vendors`);

    console.log("Database cleared for production!");
    process.exit(0);
  } catch (err) {
    console.error("Error during cleanup:", err);
    process.exit(1);
  }
}

cleanup();
