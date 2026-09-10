const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const connectDB = require('../config/db');
const Organization = require('../modules/organizations/model');
const Facility = require('../modules/facilities/model');
const Permission = require('../modules/permissions/model');
const Role = require('../modules/roles/model');
const User = require('../modules/users/model');

const permissionsList = [
  { code: 'organization.read', description: 'Read organization profile' },
  { code: 'organization.create', description: 'Create new organization' },
  { code: 'organization.update', description: 'Update organization profile' },
  { code: 'organization.delete', description: 'Delete organization' },
  { code: 'user.read', description: 'Read user rosters' },
  { code: 'user.create', description: 'Register new user profiles' },
  { code: 'user.update', description: 'Update user profiles' },
  { code: 'user.delete', description: 'Remove user profiles' },
  
  { code: 'energy.read', description: 'Read energy logs' },
  { code: 'energy.create', description: 'Add energy readings' },
  { code: 'energy.update', description: 'Edit energy records' },
  { code: 'energy.delete', description: 'Soft delete energy logs' },
  { code: 'energy.verify', description: 'Approve energy audits' },

  { code: 'ghg.read', description: 'Read GHG emission registries' },
  { code: 'ghg.create', description: 'Add emission activities' },
  { code: 'ghg.update', description: 'Edit emission logs' },
  { code: 'ghg.delete', description: 'Archive emission records' },
  { code: 'ghg.verify', description: 'Approve emissions' },

  { code: 'water.read', description: 'Read water metrics' },
  { code: 'water.create', description: 'Log water withdrawals' },
  { code: 'water.update', description: 'Edit water logs' },
  { code: 'water.verify', description: 'Verify water audits' },

  { code: 'waste.read', description: 'Read waste manifests' },
  { code: 'waste.create', description: 'Add waste records' },
  { code: 'waste.update', description: 'Edit waste manifests' },
  { code: 'waste.verify', description: 'Verify waste diversion' },

  { code: 'pollution.read', description: 'Read pollution emissions' },
  { code: 'pollution.create', description: 'Add pollution records' },
  { code: 'pollution.update', description: 'Edit pollution monitors' },
  { code: 'pollution.verify', description: 'Verify stack filters' },

  { code: 'biodiversity.read', description: 'Read biodiversity logs' },
  { code: 'biodiversity.create', description: 'Add assessments' },
  { code: 'biodiversity.update', description: 'Edit conservation schedules' },
  { code: 'biodiversity.verify', description: 'Approve biodiversity audits' },

  { code: 'evidence.read', description: 'Read uploaded evidence files' },
  { code: 'evidence.upload', description: 'Upload evidence attachment' },
  { code: 'evidence.review', description: 'Auditor review file status' },
  { code: 'evidence.accept', description: 'Auditor accept evidence' },
  { code: 'evidence.reject', description: 'Auditor decline evidence' },

  { code: 'verification.read', description: 'Read verification scopes' },
  { code: 'verification.assign', description: 'Assign auditor email to file' },
  { code: 'verification.review', description: 'Perform verifier audits' },
  { code: 'verification.approve', description: 'Approve carbon project' },
  { code: 'verification.reject', description: 'Reject carbon project' },

  { code: 'report.read', description: 'View generated platform reports' },
  { code: 'report.generate', description: 'Compile new ESG report' },
  { code: 'report.export', description: 'Export ESG records to CSV/Excel' },
  
  { code: 'audit.read', description: 'Read security audit trail logs' },
  { code: 'audit.create', description: 'Log manual security check' },
  { code: 'system.manage', description: 'Global SaaS admin settings control' }
];

const rolesConfig = [
  { name: 'SUPER_ADMIN', description: 'Highest SaaS authority', permissions: permissionsList.map(p => p.code) },
  { name: 'PLATFORM_ADMIN', description: 'Operations manager', permissions: ['organization.read', 'organization.create', 'user.read', 'user.create', 'verification.read', 'verification.assign', 'report.read', 'report.generate', 'audit.read'] },
  { name: 'MSME_USER', description: 'MSME Tenant user', permissions: ['energy.read', 'energy.create', 'ghg.read', 'ghg.create', 'water.read', 'water.create', 'waste.read', 'waste.create', 'evidence.read', 'evidence.upload'] },
  { name: 'ENTERPRISE_USER', description: 'Enterprise user', permissions: ['organization.read', 'user.read', 'energy.read', 'energy.create', 'energy.update', 'ghg.read', 'ghg.create', 'ghg.update', 'water.read', 'water.create', 'water.update', 'waste.read', 'waste.create', 'waste.update', 'biodiversity.read', 'biodiversity.create', 'pollution.read', 'pollution.create', 'evidence.read', 'evidence.upload', 'report.read', 'report.generate'] },
  { name: 'INVESTOR', description: 'Read-only portfolio investor', permissions: ['organization.read', 'energy.read', 'ghg.read', 'water.read', 'waste.read', 'biodiversity.read', 'pollution.read', 'report.read'] },
  { name: 'CREDIT_BUYER', description: 'Credit purchase requester', permissions: ['organization.read', 'report.read', 'verification.read'] },
  { name: 'VERIFIER', description: 'Assigned ESG auditor', permissions: ['organization.read', 'energy.read', 'ghg.read', 'water.read', 'waste.read', 'biodiversity.read', 'pollution.read', 'evidence.read', 'verification.read', 'verification.review', 'verification.approve', 'verification.reject'] },
  { name: 'ASSURANCE_AUDITOR', description: 'Independent financial assurance', permissions: ['organization.read', 'energy.read', 'ghg.read', 'water.read', 'waste.read', 'evidence.read', 'audit.read'] },
  { name: 'REGULATOR', description: 'Government inspector', permissions: ['organization.read', 'energy.read', 'ghg.read', 'water.read', 'waste.read', 'pollution.read', 'audit.read'] },
  { name: 'CARBON_REGISTRY', description: 'Carbon credits validator', permissions: ['organization.read', 'verification.read', 'verification.approve'] },
  { name: 'ADVISOR', description: 'External ESG consultant', permissions: ['organization.read', 'energy.read', 'ghg.read', 'water.read', 'waste.read', 'report.read', 'report.generate'] },
  { name: 'INDUSTRY_ASSOCIATION', description: 'Trade group averages analyzer', permissions: ['organization.read', 'energy.read', 'ghg.read', 'water.read', 'waste.read'] },
  { name: 'TECHNOLOGY_PROVIDER', description: 'API sensor provider', permissions: ['energy.create', 'ghg.create', 'water.create'] },
  { name: 'INSURER', description: 'ESG underwriting reviewer', permissions: ['organization.read', 'energy.read', 'ghg.read', 'water.read', 'waste.read', 'report.read'] },
  { name: 'RESEARCHER', description: 'Academic statistics analyst', permissions: ['energy.read', 'ghg.read', 'water.read', 'waste.read'] }
];

async function seed() {
  await connectDB();
  
  console.log('🔄 Cleaning MERN SaaS collections...');
  await Promise.all([
    Permission.deleteMany({}),
    Role.deleteMany({}),
    Organization.deleteMany({}),
    Facility.deleteMany({}),
    User.deleteMany({})
  ]);

  console.log('🌱 Seeding Permissions...');
  await Permission.create(permissionsList);
  console.log('✅ Seeded Permissions');

  console.log('🌱 Seeding Roles...');
  await Role.create(rolesConfig);
  console.log('✅ Seeded Roles');

  console.log('🌱 Seeding Tenant Organizations...');
  const systemOrg = await Organization.create({ name: 'SaaS System Administration', type: 'SYSTEM', status: 'ACTIVE' });
  const acmeOrg = await Organization.create({ name: 'Acme ESG Corporation', type: 'ENTERPRISE', status: 'ACTIVE', subscriptionPlan: 'ENTERPRISE_GOLD' });
  const msmeOrg = await Organization.create({ name: 'Eco MSME Solutions', type: 'MSME', status: 'ACTIVE' });
  console.log('✅ Seeded Organizations');

  console.log('🌱 Seeding Facilities...');
  const acmePlant = await Facility.create({ name: 'Pune Fabrication Plant', location: 'Chakan MIDC, Pune', floorArea: 25000, organizationId: acmeOrg._id });
  const msmeOffice = await Facility.create({ name: 'Mumbai Retail Block', location: 'Bandra, Mumbai', floorArea: 3500, organizationId: msmeOrg._id });
  console.log('✅ Seeded Facilities');

  console.log('🌱 Seeding SaaS User Accounts...');
  const passwordHash = await bcrypt.hash('password123', 10);
  
  await User.create([
    { name: 'System Super Admin', email: 'superadmin@esg.com', passwordHash, organizationId: systemOrg._id, roles: ['SUPER_ADMIN'] },
    { name: 'System Platform Ops', email: 'platformadmin@esg.com', passwordHash, organizationId: systemOrg._id, roles: ['PLATFORM_ADMIN'] },
    { name: 'Acme Enterprise Director', email: 'enterprise@esg.com', passwordHash, organizationId: acmeOrg._id, roles: ['ENTERPRISE_USER'], facilitiesScope: [acmePlant._id] },
    { name: 'Eco MSME Coordinator', email: 'msme@esg.com', passwordHash, organizationId: msmeOrg._id, roles: ['MSME_USER'], facilitiesScope: [msmeOffice._id] },
    { name: 'ESG Lead Verifier', email: 'verifier@esg.com', passwordHash, organizationId: systemOrg._id, roles: ['VERIFIER'] }
  ]);
  console.log('✅ Seeded Users');

  console.log('🎉 MERN SaaS Seeding Complete! Exiting...');
  mongoose.connection.close();
}

seed().catch(err => {
  console.error(err);
  mongoose.connection.close();
});
