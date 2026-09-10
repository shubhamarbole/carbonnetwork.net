const authService = require('./service');
const User = require('../users/model');
const Organization = require('../organizations/model');
const Facility = require('../facilities/model');

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const result = await authService.login(email, password);
      res.json(result);
    } catch (err) {
      res.status(401).json({ error: err.message });
    }
  }

  async register(req, res, next) {
    try {
      const { name, email, password, roles, organizationId, facilitiesScope } = req.body;
      const result = await authService.register(name, email, password, roles, organizationId, facilitiesScope);
      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required.' });
      }

      const tokens = await authService.rotateToken(refreshToken);
      res.json(tokens);
    } catch (err) {
      res.status(401).json({ error: err.message });
    }
  }

  async logout(req, res, next) {
    try {
      if (req.user && req.user.userId) {
        await authService.logout(req.user.userId);
      }
      res.json({ message: 'Successfully logged out.' });
    } catch (err) {
      next(err);
    }
  }

  async me(req, res, next) {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ error: 'Unauthenticated.' });
      }

      const user = await User.findById(req.user.userId, '-passwordHash');
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const org = await Organization.findById(user.organizationId);
      const facilities = await Facility.find({ _id: { $in: user.facilitiesScope } });

      res.json({
        user: { id: user._id.toString(), name: user.name, email: user.email },
        activeOrganization: org ? { id: org._id.toString(), name: org.name } : null,
        roles: user.roles,
        permissions: req.user.permissions || [],
        facilities: facilities.map(f => ({ id: f._id.toString(), name: f.name }))
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
