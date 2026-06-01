import express from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: process.env.NODE_ENV === 'production' ? 5 : 1000,
  message: 'Too many login attempts from this IP, please try again after 15 minutes',
  skip: (req) => process.env.NODE_ENV !== 'production'
});

const generateTokens = (id) => {
  const accessToken = jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const refreshToken = jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
  return { accessToken, refreshToken };
};

router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  // Check brute force lock
  if (user.lockUntil && user.lockUntil > Date.now()) {
    res.status(403);
    throw new Error('Account locked due to too many failed attempts. Try again later.');
  }

  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    user.loginAttempts += 1;
    if (user.loginAttempts >= 5) {
      user.lockUntil = Date.now() + 15 * 60 * 1000; // Lock for 15 mins
    }
    await user.save();
    res.status(401);
    throw new Error('Invalid email or password');
  }

  // Success
  user.loginAttempts = 0;
  user.lockUntil = undefined;
  
  const { accessToken, refreshToken } = generateTokens(user._id);
  user.refreshToken = refreshToken;
  await user.save();

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    maxAge: 15 * 60 * 1000,
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // Sending backward-compatible format for existing frontend structure, but in standard form
  res.status(200).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    profileImage: user.profileImage,
    token: accessToken // Send token for fallback
  });
}));

router.post('/logout', (req, res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
});

// Refresh Token route — accepts refresh token from Authorization header or cookie
router.post('/refresh', asyncHandler(async (req, res) => {
  // Accept token from Authorization header (Bearer) or cookie
  let refreshToken = req.cookies?.refreshToken;
  if (!refreshToken && req.headers.authorization?.startsWith('Bearer')) {
    refreshToken = req.headers.authorization.split(' ')[1];
  }

  if (!refreshToken) {
    res.status(401);
    throw new Error('No refresh token provided');
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
  } catch {
    res.status(401);
    throw new Error('Refresh token invalid or expired. Please log in again.');
  }

  const user = await User.findById(decoded.id).select('-password');
  if (!user) {
    res.status(401);
    throw new Error('User not found');
  }

  const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens(user._id);
  user.refreshToken = newRefreshToken;
  await user.save();

  res.cookie('accessToken', newAccessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({
    token: newAccessToken,
    refreshToken: newRefreshToken,
  });
}));

// Update Profile route
router.put('/profile', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.name = req.body.name || user.name;
  user.email = req.body.email || user.email;
  user.profileImage = req.body.profileImage !== undefined ? req.body.profileImage : user.profileImage;

  if (req.body.password) {
    user.password = req.body.password;
  }

  const updatedUser = await user.save();

  res.status(200).json({
    _id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
    profileImage: updatedUser.profileImage,
    token: req.cookies?.accessToken || req.headers.authorization?.split(' ')[1]
  });
}));

// Create setup route just in case
router.post('/setup', async (req, res) => {
    try {
        const users = await User.find();
        if (users.length > 0) {
            return res.status(400).json({ message: 'Setup already completed' });
        }
        
        const admin = new User({
            name: 'Super Admin',
            email: 'deepikabuiltech@gmail.com',
            password: 'deepikabuiltech@123',
            role: 'superadmin' // using new superadmin role
        });
        await admin.save();
        
        const viewer = new User({
            name: 'Viewer',
            email: 'viewer@deepikabuiltech.com',
            password: 'viewer@123',
            role: 'viewer'
        });
        await viewer.save();

        res.status(201).json({ message: 'Setup completed successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
