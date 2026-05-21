import mongoose from 'mongoose';

const materialSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  unit: { type: String, required: true },
  brand: { type: String },
  lastPrice: { type: Number, default: 0 },
  latestPrice: { type: Number, default: 0 },
  currentStock: { type: Number, default: 0 },
  minLevel: { type: Number, default: 0 }
}, { timestamps: true });

materialSchema.pre('validate', async function() {
  if (!this.id) {
    const highestMaterial = await this.constructor.findOne({ id: /^MAT\d+$/ }).sort({ id: -1 });
    let nextNum = 1;
    if (highestMaterial && highestMaterial.id) {
      const match = highestMaterial.id.match(/MAT(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    this.id = `MAT${String(nextNum).padStart(3, '0')}`;
  }
});

const Material = mongoose.model('Material', materialSchema);
export default Material;
