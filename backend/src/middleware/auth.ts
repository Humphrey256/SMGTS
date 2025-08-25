import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { User, IUser } from '../models/User.js';

export interface AuthRequest extends Request {
  user?: IUser & { _id: string };
}

export function protect(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  // Debug: log incoming auth header to help diagnose 401s
  console.log('[auth] incoming Authorization header:', authHeader);
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as { id: string; role: string };
    console.log('[auth] token decoded:', decoded);
    User.findById(decoded.id).then((user: any) => {
      if (!user) return res.status(401).json({ message: 'User not found' });
      console.log('[auth] user found:', { id: user._id, email: user.email, role: user.role });
      req.user = user;
      next();
    }).catch(() => res.status(401).json({ message: 'User lookup failed' }));
  } catch (err) {
    console.error('[auth] token verification error:', err);
    return res.status(401).json({ message: 'Token failed' });
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}
