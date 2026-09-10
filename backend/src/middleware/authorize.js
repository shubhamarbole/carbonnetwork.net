function authorizePermission(requiredPermission) {
  return (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthenticated.' });
      }

      // SUPER_ADMIN has global permissions bypass
      if (user.roles && user.roles.includes('SUPER_ADMIN')) {
        return next();
      }

      // Verify that user's pre-resolved permissions array contains the permission code
      const hasPermission = user.permissions && user.permissions.includes(requiredPermission);
      if (!hasPermission) {
        return res.status(403).json({
          error: `Forbidden: Access restricted. Requires permission [${requiredPermission}].`
        });
      }

      next();
    } catch (err) {
      res.status(500).json({ error: 'Authorization verification failed.' });
    }
  };
}

module.exports = authorizePermission;
