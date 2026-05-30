import mongoose from 'mongoose';

const emergencyDCSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  dcDate: { type: String, required: true },
  dcNo: { type: String },
  projectId: { type: String },
  projectName: { type: String },
  localVendorName: { type: String, required: true },
  localVendorPhone: { type: String },
  localVendorAddress: { type: String },
  emergencyReason: { type: String, required: true },
  purchasedBy: { type: String, required: true },
  approvedBy: { type: String },
  totalAmount: { type: Number, default: 0 },
  paymentMode: { type: String, enum: ['Cash', 'UPI', 'Card', 'Credit'], default: 'Cash' },
  billAttached: { type: Boolean, default: false },
  items: { type: mongoose.Schema.Types.Mixed, default: [] },
  status: { type: String, enum: ['Pending Approval', 'Approved', 'Rejected'], default: 'Pending Approval' },
  remarks: { type: String },
}, { timestamps: true });

export default mongoose.model('EmergencyDC', emergencyDCSchema);
