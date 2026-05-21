import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Material from './models/Material.js';
import Project from './models/Project.js';
import Vendor from './models/Vendor.js';
import Enquiry from './models/Enquiry.js';
import Quotation from './models/Quotation.js';
import PurchaseOrder from './models/PurchaseOrder.js';
import GRN from './models/GRN.js';
import Issue from './models/Issue.js';
import Tool from './models/Tool.js';
import ToolIssue from './models/ToolIssue.js';

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

    const enqsDeleted = await Enquiry.deleteMany({});
    console.log(`Cleared Enquiry collection: deleted ${enqsDeleted.deletedCount} documents.`);

    const quotesDeleted = await Quotation.deleteMany({});
    console.log(`Cleared Quotation collection: deleted ${quotesDeleted.deletedCount} documents.`);

    const posDeleted = await PurchaseOrder.deleteMany({});
    console.log(`Cleared PurchaseOrder collection: deleted ${posDeleted.deletedCount} documents.`);

    const grnsDeleted = await GRN.deleteMany({});
    console.log(`Cleared GRN collection: deleted ${grnsDeleted.deletedCount} documents.`);

    const issuesDeleted = await Issue.deleteMany({});
    console.log(`Cleared Issue collection: deleted ${issuesDeleted.deletedCount} documents.`);

    const toolsDeleted = await Tool.deleteMany({});
    console.log(`Cleared Tool collection: deleted ${toolsDeleted.deletedCount} documents.`);

    const toolIssuesDeleted = await ToolIssue.deleteMany({});
    console.log(`Cleared ToolIssue collection: deleted ${toolIssuesDeleted.deletedCount} documents.`);

    console.log("Database cleanup completed successfully! 🎉");
    process.exit(0);
  } catch (err) {
    console.error("Database cleanup failed:", err);
    process.exit(1);
  }
};

clean();
