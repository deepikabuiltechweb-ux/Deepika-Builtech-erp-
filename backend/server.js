import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';

import connectDB from './config/db.js';
import { connectRedis } from './config/redis.js';
import { initBackupCron } from './utils/backup.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

import apiRoutes from './routes/api.js';
import authRoutes from './routes/authRoutes.js';

dotenv.config();

// 1. Validate Environment Variables
const requiredEnvs = ['MONGODB_URI', 'JWT_SECRET'];
requiredEnvs.forEach((envVar) => {
  if (!process.env[envVar]) {
    console.error(`FATAL ERROR: ${envVar} is not defined in .env`);
    process.exit(1);
  }
});

// 2. Validate JWT Secret Security
if (process.env.JWT_SECRET.length < 64) {
  console.error(`FATAL ERROR: JWT_SECRET must be at least 64 characters long.`);
  process.exit(1);
}

// 3. Connect Services
connectDB();
connectRedis();
initBackupCron();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 4. Security Middlewares
app.use(helmet());
app.disable('x-powered-by');

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate Limiting (Global)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', limiter);

// 5. Body Parsers & Sanitization
app.use(express.json({ limit: '10kb' })); // Max payload size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(xss());
app.use(hpp()); // Prevent HTTP Parameter Pollution

// 6. Performance Middlewares
app.use(compression());
app.use((req, res, next) => {
  res.set('Connection', 'keep-alive');
  next();
});

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Serve Static Assets in Production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
}

// 7. Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', apiRoutes);

if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) =>
    res.sendFile(path.resolve(__dirname, '../frontend', 'dist', 'index.html'))
  );
}

// 8. Error Handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Production Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// 9. Reliability & Graceful Shutdown
const shutdown = () => {
  console.log('SIGTERM/SIGINT Received. Shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed.');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed.');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Shutting down...');
  console.error(err.name, err.message);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});
