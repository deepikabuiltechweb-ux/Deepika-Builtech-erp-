import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PurchaseOrder from './models/PurchaseOrder.js';

dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");
    
    const id = "6a2ab1b4eb63563118177088";
    console.log("ObjectId is valid:", mongoose.Types.ObjectId.isValid(id));
    
    const docByFind = await PurchaseOrder.findOne({ id: id });
    console.log("Found by { id }:", docByFind);
    
    const docById = await PurchaseOrder.findById(id);
    console.log("Found by findById:", docById);
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
