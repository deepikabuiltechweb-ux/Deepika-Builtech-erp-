import mongoose from 'mongoose';

const materialSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  unit: { type: String, required: true },
  brand: { type: String },
  lastPrice: { type: Number, default: 0 },
  latestPrice: { type: Number, default: 0 },
  currentStock: { type: Number, default: 0 },
  minLevel: { type: Number, default: 0 }
}, { timestamps: true });

const Material = mongoose.model('Material', materialSchema);
export default Material;
