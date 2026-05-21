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

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected.');
    
    const collections = {
      Material, Project, Vendor, Enquiry, Quotation, PurchaseOrder, GRN, Issue, Tool, ToolIssue
    };

    for (const [name, model] of Object.entries(collections)) {
      const count = await model.countDocuments();
      console.log(`${name}: ${count} documents`);
      if (count > 0) {
        const items = await model.find().limit(2).lean();
        console.log(JSON.stringify(items, null, 2));
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
};

run();
