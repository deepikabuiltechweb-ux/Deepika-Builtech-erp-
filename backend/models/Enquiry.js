import mongoose from 'mongoose';

const enquirySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  date: { type: String },
  projectId: { type: String },
  workOrderNo: { type: String },
  requiredDate: { type: String },
  items: { type: mongoose.Schema.Types.Mixed },
  selectedVendors: { type: [String] },
  awardedVendors: { type: mongoose.Schema.Types.Mixed },
  status: { type: String, default: 'Open' }
}, { timestamps: true });

export default mongoose.model('Enquiry', enquirySchema);
