import mongoose from 'mongoose';

const toolSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String },
  totalQty: { type: Number, default: 0 },
  availableQty: { type: Number, default: 0 },
  repairQty: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('Tool', toolSchema);
