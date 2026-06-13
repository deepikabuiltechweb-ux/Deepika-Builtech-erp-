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
  remarks: { type: String },
  reference: { type: String },
  vendorName: { type: String },
  vendorAddressLine1: { type: String },
  vendorAddressLine2: { type: String },
  vendorCityPin: { type: String },
  vendorGstin: { type: String },
  vendorContact: { type: String },
  vendorEmail: { type: String },
  freightCharges: { type: String, default: '0' },
  loadingCharges: { type: String, default: '0' },
  unloadingCharges: { type: String, default: '0' },
  weighingCharges: { type: String, default: '0' },
  taxType: { type: String, default: 'Intra-State' }
}, { timestamps: true });

export default mongoose.model('PurchaseOrder', purchaseOrderSchema);
