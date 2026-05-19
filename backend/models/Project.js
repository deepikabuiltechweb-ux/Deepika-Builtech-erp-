import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  client: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
  budget: { type: Number },
  status: { type: String, default: 'Active' }
}, { timestamps: true });

export default mongoose.model('Project', projectSchema);
