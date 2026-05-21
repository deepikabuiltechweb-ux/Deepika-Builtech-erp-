import mongoose from 'mongoose';

const toolIssueSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  toolId: { type: String },
  toolName: { type: String },
  qty: { type: Number, default: 1 },
  issuedTo: { type: String },
  projectId: { type: String },
  issueDate: { type: String },
  expectedReturnDate: { type: String },
  status: { type: String, default: 'Issued' }
}, { timestamps: true });

export default mongoose.model('ToolIssue', toolIssueSchema);
