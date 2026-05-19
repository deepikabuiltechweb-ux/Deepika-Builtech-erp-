import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const checkAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne({ email: 'deepikabuiltech@gmail.com' });
    if (user) {
      console.log(`User Found: ${user.name}, Role: ${user.role}`);
    } else {
      console.log("Admin user NOT FOUND. Please run /setup route.");
    }
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkAdmin();
