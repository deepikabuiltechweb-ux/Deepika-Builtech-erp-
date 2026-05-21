import mongoose from 'mongoose';

const issueSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  issueDate: { type: String },
  projectId: { type: String },
  workOrderNo: { type: String },
  issuedTo: { type: String },
  purpose: { type: String },
  items: { type: mongoose.Schema.Types.Mixed },
  totalCost: { type: Number },
  status: { type: String, default: 'Issued' }
}, { timestamps: true });

export default mongoose.model('Issue', issueSchema);
