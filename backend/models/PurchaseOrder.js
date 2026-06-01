import mongoose from 'mongoose';

const purchaseOrderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  date: { type: String },
  vendorId: { type: String },
  enquiryId: { type: String },
  projectId: { type: String },
  workOrderNo: { type: String },
  items: { type: mongoose.Schema.Types.Mixed },
  status: { type: String, default: 'Sent' },
  deliveryDate: { type: String },
  deliveryTerms: { type: String },
  paymentTerms: { type: String },
  dispatchTo: { type: String },
  remarks: { type: String }
}, { timestamps: true });

export default mongoose.model('PurchaseOrder', purchaseOrderSchema);
