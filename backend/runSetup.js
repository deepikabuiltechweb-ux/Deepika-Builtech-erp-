import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const setup = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    // Delete existing old users
    await User.deleteMany({ email: { $in: ['admin@peb.com', 'staff@peb.com', 'viewer@peb.com', 'store@peb.com', 'deepikabuiltech@gmail.com', 'viewer@deepikabuiltech.com'] } });
    console.log("Deleted old users for fresh setup.");

    // Create Admin
    const admin = new User({
        name: 'Deepika Builtech Admin',
        email: 'deepikabuiltech@gmail.com',
        password: 'deepikabuiltech@123',
        role: 'admin'
    });
    await admin.save();
    console.log("Admin user created.");

    // Create View Only user
    const viewer = new User({
        name: 'View Only User',
        email: 'viewer@deepikabuiltech.com',
        password: 'viewer@123',
        role: 'viewer'
    });
    await viewer.save();
    console.log("Viewer user created.");

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

setup();
