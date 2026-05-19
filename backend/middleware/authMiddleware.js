import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
      req.user = await User.findById(decoded.id).select('-password');
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    console.log(`Checking authorization for user: ${req.user?.name}, role: ${req.user?.role}. Required roles: ${roles}`);
    if (req.user && roles.includes(req.user.role)) {
      next();
    } else {
      console.log(`Authorization FAILED for user: ${req.user?.name}, role: ${req.user?.role}`);
      res.status(403).json({ message: `Role ${req.user?.role} is not authorized to access this route` });
    }
  };
};
