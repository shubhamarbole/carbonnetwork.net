// Permission guard configuration helper constants
export const PERMISSIONS = {
  ORGANIZATION_READ: 'organization.read',
  ORGANIZATION_CREATE: 'organization.create',
  ORGANIZATION_UPDATE: 'organization.update',
  ORGANIZATION_DELETE: 'organization.delete',
  
  USER_READ: 'user.read',
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  
  ENERGY_READ: 'energy.read',
  ENERGY_CREATE: 'energy.create',
  ENERGY_UPDATE: 'energy.update',
  ENERGY_DELETE: 'energy.delete',
  ENERGY_VERIFY: 'energy.verify',
  
  GHG_READ: 'ghg.read',
  GHG_CREATE: 'ghg.create',
  GHG_UPDATE: 'ghg.update',
  GHG_DELETE: 'ghg.delete',
  GHG_VERIFY: 'ghg.verify',
  
  WATER_READ: 'water.read',
  WATER_CREATE: 'water.create',
  WATER_UPDATE: 'water.update',
  WATER_VERIFY: 'water.verify',
  
  WASTE_READ: 'waste.read',
  WASTE_CREATE: 'waste.create',
  WASTE_UPDATE: 'waste.update',
  WASTE_VERIFY: 'waste.verify',
  
  POLLUTION_READ: 'pollution.read',
  POLLUTION_CREATE: 'pollution.create',
  POLLUTION_UPDATE: 'pollution.update',
  POLLUTION_VERIFY: 'pollution.verify',
  
  BIODIVERSITY_READ: 'biodiversity.read',
  BIODIVERSITY_CREATE: 'biodiversity.create',
  BIODIVERSITY_UPDATE: 'biodiversity.update',
  BIODIVERSITY_VERIFY: 'biodiversity.verify',
  
  EVIDENCE_READ: 'evidence.read',
  EVIDENCE_UPLOAD: 'evidence.upload',
  EVIDENCE_REVIEW: 'evidence.review',
  EVIDENCE_ACCEPT: 'evidence.accept',
  EVIDENCE_REJECT: 'evidence.reject',
  
  VERIFICATION_READ: 'verification.read',
  VERIFICATION_ASSIGN: 'verification.assign',
  VERIFICATION_REVIEW: 'verification.review',
  VERIFICATION_APPROVE: 'verification.approve',
  VERIFICATION_REJECT: 'verification.reject',
  
  REPORT_READ: 'report.read',
  REPORT_GENERATE: 'report.generate',
  REPORT_EXPORT: 'report.export',
  
  AUDIT_READ: 'audit.read',
  AUDIT_CREATE: 'audit.create',
  
  RISK_READ: 'risk.read',
  RISK_CREATE: 'risk.create',
  RISK_UPDATE: 'risk.update',
  RISK_DELETE: 'risk.delete',
  RISK_STATUS: 'risk.status',
  RISK_ASSIGN: 'risk.assign',
  
  SYSTEM_MANAGE: 'system.manage'
};

// Check if user has permission
export function hasPermission(userPermissions, code) {
  if (!userPermissions) return false;
  return userPermissions.includes(code);
}
