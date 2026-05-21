import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Material from './models/Material.js';
import Project from './models/Project.js';
import Vendor from './models/Vendor.js';

dotenv.config();

const clean = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB for data purging...");

    const matsDeleted = await Material.deleteMany({});
    console.log(`Cleared Material collection: deleted ${matsDeleted.deletedCount} documents.`);

    const projsDeleted = await Project.deleteMany({});
    console.log(`Cleared Project collection: deleted ${projsDeleted.deletedCount} documents.`);

    const vendsDeleted = await Vendor.deleteMany({});
    console.log(`Cleared Vendor collection: deleted ${vendsDeleted.deletedCount} documents.`);

    console.log("Database cleanup completed successfully! 🎉");
    process.exit(0);
  } catch (err) {
    console.error("Database cleanup failed:", err);
    process.exit(1);
  }
};

clean();
