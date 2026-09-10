import React from 'react';
import { useAuth } from '../../context/AuthContext';

export default function PermissionGuard({ requiredPermission, fallback = null, children }) {
  const { permissions, roles } = useAuth();

  // SUPER_ADMIN has global permissions bypass
  if (roles && roles.includes('SUPER_ADMIN')) {
    return <>{children}</>;
  }

  const hasPermission = permissions && permissions.includes(requiredPermission);

  if (!hasPermission) {
    return fallback;
  }

  return <>{children}</>;
}
