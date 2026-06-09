/**
 * fix_negative_stock.js
 * One-time repair script: resets all materials with currentStock < 0 back to 0.
 * Run with:  node fix_negative_stock.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Material from './models/Material.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌  MONGODB_URI not set in .env');
  process.exit(1);
}

async function fixNegativeStock() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅  Connected to MongoDB');

  // Find all materials with negative stock
  const broken = await Material.find({ currentStock: { $lt: 0 } }).lean();

  if (broken.length === 0) {
    console.log('✅  No materials with negative stock found — nothing to fix!');
    await mongoose.disconnect();
    return;
  }

  console.log(`\n⚠️  Found ${broken.length} material(s) with negative stock:\n`);
  broken.forEach(m => {
    console.log(`   • [${m.id}] ${m.name}  →  currentStock = ${m.currentStock}`);
  });

  // Reset them all to 0
  const result = await Material.updateMany(
    { currentStock: { $lt: 0 } },
    { $set: { currentStock: 0 } }
  );

  console.log(`\n✅  Fixed ${result.modifiedCount} material(s) — stock reset to 0.`);
  await mongoose.disconnect();
  console.log('✅  Disconnected. Done!');
}

fixNegativeStock().catch(err => {
  console.error('❌  Error:', err.message);
  process.exit(1);
});
