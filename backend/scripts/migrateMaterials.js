import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Material from '../models/Material.js';

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected.');
    
    const materials = await Material.find().sort({ createdAt: 1 });
    console.log(`Checking ${materials.length} existing materials...`);

    let nextNum = 1;
    for (const m of materials) {
      let currentId = m.id;
      let needsUpdate = false;

      // If id is missing, or doesn't match standard MAT000 format
      if (!currentId || !/^MAT\d+$/.test(currentId)) {
        console.log(`Material "${m.name}" has invalid or missing ID: "${currentId}"`);
        needsUpdate = true;
      }

      if (needsUpdate || !currentId) {
        // Find next unused ID
        let candidateId = `MAT${String(nextNum).padStart(3, '0')}`;
        // Ensure candidateId is not already taken
        while (await Material.findOne({ id: candidateId })) {
          nextNum++;
          candidateId = `MAT${String(nextNum).padStart(3, '0')}`;
        }
        
        console.log(`Assigning new ID: "${candidateId}" to "${m.name}"`);
        m.id = candidateId;
        await m.save();
        nextNum++;
      } else {
        // Extract number to keep track of sequence
        const match = currentId.match(/MAT(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= nextNum) {
            nextNum = num + 1;
          }
        }
      }
    }

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
};

run();
