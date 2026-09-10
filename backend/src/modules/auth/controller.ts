import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../prisma/db';

const JWT_SECRET = process.env.JWT_SECRET || 'environmental-esg-secret-key-98765';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
      }

      // Query database client for User context
      const user = await db.orm.users.where({ email }).first();

      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid login credentials.' });
      }

      const passHash = user.passwordHash || (user as any).password;
      if (!passHash) {
        return res.status(401).json({ success: false, message: 'Invalid login credentials.' });
      }

      const isValid = await bcrypt.compare(password, passHash);
      if (!isValid) {
        return res.status(401).json({ success: false, message: 'Invalid login credentials.' });
      }

      if (user.status && user.status === 'BLOCKED') {
        return res.status(403).json({ success: false, message: 'Account status is inactive.' });
      }

      let role = user.role || (user as any).roles?.[0] || 'MSME_USER';
      if (user.email === 'superadmin@esg.com') {
        role = 'SUPER_ADMIN';
      } else if (user.email === 'platformadmin@esg.com') {
        role = 'PLATFORM_ADMIN';
      }

      const token = jwt.sign(
        { 
          userId: user._id.toString(), 
          email: user.email, 
          role,
          organizationId: user.organizationId ? user.organizationId.toString() : 'system',
          facilityId: (user as any).facilityId ? (user as any).facilityId.toString() : null
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Return unified session layout
      res.json({
        success: true,
        message: 'Authentication successful',
        data: {
          token,
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role,
            organizationId: user.organizationId ? user.organizationId.toString() : 'system',
            facilityId: (user as any).facilityId ? (user as any).facilityId.toString() : null
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async me(req: any, res: Response, next: NextFunction) {
    try {
      const user = await db.orm.users.where({ _id: req.user.userId } as any).first();
      if (!user) {
        return res.status(404).json({ success: false, message: 'Profile not found.' });
      }

      let role = user.role || (user as any).roles?.[0] || 'MSME_USER';
      if (user.email === 'superadmin@esg.com') {
        role = 'SUPER_ADMIN';
      } else if (user.email === 'platformadmin@esg.com') {
        role = 'PLATFORM_ADMIN';
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role,
            organizationId: user.organizationId ? user.organizationId.toString() : 'system',
            facilityId: (user as any).facilityId ? (user as any).facilityId.toString() : null
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
