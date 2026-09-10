import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'Access Denied: Token missing.' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'environmental-esg-secret-key-98765', (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Access Denied: Invalid or expired session.' });
    }
    req.user = decoded as { userId: string; email: string; role: string };
    next();
  });
}

export function authorizeSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, message: 'Access Denied: Super Admin role authorization required.' });
  }
  next();
}
