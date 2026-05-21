import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Material from '../models/Material.js';

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected.');
    const materials = await Material.find().lean();
    console.log(`Total materials found: ${materials.length}`);
    materials.forEach(m => {
      console.log(`- ID/Code: ${m.id}, Name: ${m.name}, Category: ${m.category}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
};

run();
