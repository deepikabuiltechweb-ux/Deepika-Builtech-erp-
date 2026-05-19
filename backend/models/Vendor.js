import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  contact: { type: String },
  email: { type: String },
  category: { type: String },
  rating: { type: Number, default: 0 },
  city: { type: String }
}, { timestamps: true });

export default mongoose.model('Vendor', vendorSchema);
