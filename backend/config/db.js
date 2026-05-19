import mongoose from 'mongoose';

const connectDB = async () => {
  const options = {
    minPoolSize: 2,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  try {
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected! Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected successfully.');
    });

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    setTimeout(connectDB, 5000);
  }
};

export default connectDB;
