const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../users/model');
const Role = require('../roles/model');
const Organization = require('../organizations/model');
const Facility = require('../facilities/model');
const { JWT_SECRET, JWT_ACCESS_EXPIRATION, JWT_REFRESH_EXPIRATION } = require('../../config/security');

// Helper to compile permissions across roles
async function getPermissionsForRoles(roles) {
  const roleDocs = await Role.find({ name: { $in: roles } });
  const permissions = new Set();
  roleDocs.forEach(r => {
    r.permissions.forEach(p => permissions.add(p));
  });
  return Array.from(permissions);
}

// Generate tokens payload
function generateTokens(payload) {
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRATION });
  const refreshToken = jwt.sign({ userId: payload.userId, isRefresh: true }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRATION });
  return { accessToken, refreshToken };
}

class AuthService {
  async login(email, password) {
    const user = await User.findOne({ email });
    if (!user || user.status === 'BLOCKED') {
      throw new Error('Authentication failed: Invalid credentials or inactive status.');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Authentication failed: Invalid credentials.');
    }

    // Resolve tenant details
    const org = await Organization.findById(user.organizationId);
    if (!org || org.status !== 'ACTIVE') {
      throw new Error('Organization tenant is inactive or suspended.');
    }

    // Resolve facilities scope details
    const facilities = await Facility.find({
      _id: { $in: user.facilitiesScope },
      organizationId: user.organizationId
    });

    // Compile flat permissions
    const permissions = await getPermissionsForRoles(user.roles);

    // Tokens payload
    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      organizationId: user.organizationId.toString(),
      roles: user.roles,
      permissions
    };

    const tokens = generateTokens(tokenPayload);

    // Save refresh token
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return {
      tokens,
      context: {
        user: { id: user._id.toString(), name: user.name, email: user.email },
        activeOrganization: { id: org._id.toString(), name: org.name },
        roles: user.roles,
        permissions,
        facilities: facilities.map(f => ({ id: f._id.toString(), name: f.name }))
      }
    };
  }

  async register(name, email, password, roles, organizationId, facilitiesScope = []) {
    const existing = await User.findOne({ email });
    if (existing) {
      throw new Error('Email is already registered.');
    }

    // Default to VIEWER if roles empty
    const resolvedRoles = roles && roles.length > 0 ? roles : ['VIEWER'];

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      passwordHash,
      organizationId,
      roles: resolvedRoles,
      facilitiesScope,
      status: 'ACTIVE'
    });

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      roles: user.roles
    };
  }

  async rotateToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, JWT_SECRET);
      if (!decoded.isRefresh) throw new Error('Invalid token type');

      const user = await User.findOne({ _id: decoded.userId, refreshToken });
      if (!user || user.status === 'BLOCKED') {
        throw new Error('Token verification failed: Invalid refresh token.');
      }

      const org = await Organization.findById(user.organizationId);
      if (!org || org.status !== 'ACTIVE') {
        throw new Error('Organization tenant is inactive.');
      }

      const permissions = await getPermissionsForRoles(user.roles);
      const tokenPayload = {
        userId: user._id.toString(),
        email: user.email,
        organizationId: user.organizationId.toString(),
        roles: user.roles,
        permissions
      };

      const tokens = generateTokens(tokenPayload);
      user.refreshToken = tokens.refreshToken;
      await user.save();

      return tokens;
    } catch (err) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  async logout(userId) {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
    return true;
  }
}

module.exports = new AuthService();
