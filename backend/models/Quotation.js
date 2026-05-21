import mongoose from 'mongoose';

const quotationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  enquiryId: { type: String },
  vendorId: { type: String },
  quoteDate: { type: String },
  validityDate: { type: String },
  items: { type: mongoose.Schema.Types.Mixed },
  status: { type: String, default: 'Pending' }
}, { timestamps: true });

export default mongoose.model('Quotation', quotationSchema);
