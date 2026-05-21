import mongoose from 'mongoose';

const grnSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  grnDate: { type: String },
  poId: { type: String },
  poRef: { type: String },
  vendorId: { type: String },
  vendorName: { type: String },
  vehicleNo: { type: String },
  driverName: { type: String },
  dcNo: { type: String },
  invoiceNo: { type: String },
  receivedBy: { type: String },
  remarks: { type: String },
  items: { type: mongoose.Schema.Types.Mixed },
  status: { type: String, default: 'Completed' }
}, { timestamps: true });

export default mongoose.model('GRN', grnSchema);
