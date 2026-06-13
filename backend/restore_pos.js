import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PurchaseOrder from './models/PurchaseOrder.js';
import GRN from './models/GRN.js';

dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Fetch POs
    const pos = await PurchaseOrder.find({}, { id: 1 }).lean();
    pos.sort((a, b) => parseInt(a.id?.replace(/\D/g, '') || 0) - parseInt(b.id?.replace(/\D/g, '') || 0));
    console.log("Current POs in DB:", pos.map(p => p.id));

    // If PO-025 is in DB, and PO-027 is not in DB:
    // We had PO-023, PO-024, PO-025, PO-026
    // We want: PO-023, PO-024, PO-025 (restored), PO-026, PO-027
    
    // Let's do the shifting manually to avoid duplicate keys.
    // 1. Shift PO-026 to PO-027
    const po26 = await PurchaseOrder.findOne({ id: "PO-026" });
    if (po26) {
      console.log("Shifting PO-026 back to PO-027");
      await PurchaseOrder.updateOne({ _id: po26._id }, { $set: { id: "PO-027" } });
      await GRN.updateMany({ poId: "PO-026" }, { $set: { poId: "PO-027" } });
      await GRN.updateMany({ poRef: "PO-026" }, { $set: { poRef: "PO-027" } });
    }

    // 2. Shift PO-025 to PO-026
    const po25 = await PurchaseOrder.findOne({ id: "PO-025" });
    if (po25) {
      console.log("Shifting PO-025 back to PO-026");
      await PurchaseOrder.updateOne({ _id: po25._id }, { $set: { id: "PO-026" } });
      await GRN.updateMany({ poId: "PO-025" }, { $set: { poId: "PO-026" } });
      await GRN.updateMany({ poRef: "PO-025" }, { $set: { poRef: "PO-026" } });
    }

    // 3. Now re-insert the original PO-025
    // Let's recreate PO-025. What was its data?
    // Wait, let's look at the database. Did we lose PO-025?
    // Wait! Let's check if the backup data is somewhere.
    // Oh, the backup was stored in the memory of the previous script process which exited!
    // But wait, do we have PO-025 in the backups or in Git?
    // Wait, we can look at the database backups folder, or we can check if it is in git or MongoDB backups.
    // Wait, let's see what is inside the backend/backups folder!
    // Or let's see: what was the createdAt, vendorId, etc. of PO-025?
    // Wait, let's look at the logs of task-77. Did it print PO-025?
    // No, it printed:
    // Found PO-025, backed up.
    // But it did not print the full object.
    // Wait, did we print the list of POs in `inspect_pos` output?
    // Yes! In `inspect_pos` output we saw:
    // ID: PO-025, DB _id: 6a2ab1b4eb63563118177088, createdAt: Thu Jun 11 2026 18:31:40 GMT+0530 (India Standard Time)
    // Wait, the _id of PO-025 was `6a2ab1b4eb63563118177088`!
    // Is that document still in the database or did it get deleted?
    // Yes, we did: `await PurchaseOrder.deleteOne({ id: "PO-025" });`
    // So the document with _id `6a2ab1b4eb63563118177088` is indeed deleted from MongoDB.
    // But wait! Is there a backup of the database?
    // Let's check `backend/backups` directory. Let's list it.
    
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
