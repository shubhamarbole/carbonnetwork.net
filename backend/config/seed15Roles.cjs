const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/esg-environmental';

const rolesData = [
  {
    role: 'SUPER_ADMIN',
    name: 'System Super Admin',
    email: 'superadmin@esg.com',
    orgName: 'CarbonCredit.Network SaaS Admins',
    orgType: 'SYSTEM'
  },
  {
    role: 'PLATFORM_ADMIN',
    name: 'System Platform Ops',
    email: 'platformadmin@esg.com',
    orgName: 'CarbonCredit.Network Operations',
    orgType: 'OPERATIONS'
  },
  {
    role: 'MSME',
    name: 'Eco MSME Coordinator',
    email: 'msme@esg.com',
    orgName: 'Eco Corp MSME',
    orgType: 'MSME'
  },
  {
    role: 'ENTERPRISE',
    name: 'Acme Enterprise Director',
    email: 'enterprise@esg.com',
    orgName: 'Acme Corporation',
    orgType: 'ENTERPRISE'
  },
  {
    role: 'INVESTOR',
    name: 'Green Horizon Portfolio Manager',
    email: 'investor@esg.com',
    orgName: 'Green Horizon Capital Partners',
    orgType: 'INVESTOR'
  },
  {
    role: 'CREDIT_BUYER',
    name: 'Carbon Offset Procurement Lead',
    email: 'buyer@esg.com',
    orgName: 'Global Carbon Offsets Corp',
    orgType: 'BUYER'
  },
  {
    role: 'VERIFIER',
    name: 'Lead Climate Verifier',
    email: 'verifier@esg.com',
    orgName: 'SGS Climate Verification Agency',
    orgType: 'VERIFIER'
  },
  {
    role: 'AUDITOR',
    name: 'Assurance Lead Auditor',
    email: 'auditor@acme.com',
    orgName: 'Apex Environmental Assurance LLP',
    orgType: 'AUDITOR'
  },
  {
    role: 'REGULATOR',
    name: 'Statutory Compliance Inspector',
    email: 'regulator@esg.com',
    orgName: 'National Environmental Protection Agency',
    orgType: 'REGULATOR'
  },
  {
    role: 'REGISTRY',
    name: 'Carbon Registry Custodian',
    email: 'registry@esg.com',
    orgName: 'Global Carbon Standards Registry',
    orgType: 'REGISTRY'
  },
  {
    role: 'ADVISOR',
    name: 'Principal Sustainability Advisor',
    email: 'advisor@esg.com',
    orgName: 'EcoStrategies Advisory Partners',
    orgType: 'ADVISOR'
  },
  {
    role: 'ASSOCIATION',
    name: 'Industry Alliance Benchmarking Lead',
    email: 'association@esg.com',
    orgName: 'Sustainable Manufacturing Alliance',
    orgType: 'ASSOCIATION'
  },
  {
    role: 'TECHNOLOGY_PROVIDER',
    name: 'IoT Infrastructure Engineer',
    email: 'techprovider@esg.com',
    orgName: 'IoT SmartGrid Solutions',
    orgType: 'TECHNOLOGY_PROVIDER'
  },
  {
    role: 'INSURER',
    name: 'Climate Risk Underwriter',
    email: 'insurer@esg.com',
    orgName: 'ClimateRisk Underwriting Group',
    orgType: 'INSURER'
  },
  {
    role: 'RESEARCHER',
    name: 'Environmental Research Analyst',
    email: 'researcher@esg.com',
    orgName: 'Institute for Climate Economics',
    orgType: 'RESEARCHER'
  }
];

async function seed15Roles() {
  try {
    console.log('Connecting to MongoDB:', mongoURI);
    await mongoose.connect(mongoURI);
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    const orgsCollection = db.collection('organizations');

    const dateStr = new Date().toISOString().split('T')[0];
    const passwordHash = await bcrypt.hash('password123', 10);

    console.log('Seeding organizations and users for all 15 platform roles...');

    for (const item of rolesData) {
      // 1. Ensure Organization
      let org = await orgsCollection.findOne({ name: item.orgName });
      if (!org) {
        const result = await orgsCollection.insertOne({
          name: item.orgName,
          type: item.orgType,
          status: 'ACTIVE',
          subscriptionPlan: 'ENTERPRISE',
          createdAt: dateStr,
          updatedAt: dateStr
        });
        org = { _id: result.insertedId, name: item.orgName };
        console.log(`Created organization: ${item.orgName} [${item.orgType}]`);
      }

      const orgObjectId = org._id instanceof mongoose.Types.ObjectId ? org._id : new mongoose.Types.ObjectId(org._id);

      // 2. Ensure User
      let user = await usersCollection.findOne({ email: item.email });
      if (user) {
        await usersCollection.updateOne(
          { email: item.email },
          {
            $set: {
              name: item.name,
              role: item.role,
              organizationId: orgObjectId,
              status: 'ACTIVE',
              password: passwordHash,
              passwordHash: passwordHash,
              updatedAt: dateStr
            }
          }
        );
        console.log(`Updated user: ${item.email} -> Role: ${item.role}`);
      } else {
        await usersCollection.insertOne({
          name: item.name,
          email: item.email,
          role: item.role,
          organizationId: orgObjectId,
          facilityId: null,
          status: 'ACTIVE',
          password: passwordHash,
          passwordHash: passwordHash,
          createdAt: dateStr,
          updatedAt: dateStr
        });
        console.log(`Created user: ${item.email} -> Role: ${item.role}`);
      }
    }

    // Fix any legacy users where organizationId was saved as string
    const allUsers = await usersCollection.find({}).toArray();
    for (const u of allUsers) {
      if (typeof u.organizationId === 'string' && mongoose.Types.ObjectId.isValid(u.organizationId)) {
        await usersCollection.updateOne(
          { _id: u._id },
          { $set: { organizationId: new mongoose.Types.ObjectId(u.organizationId) } }
        );
      }
    }

    console.log('All 15 roles seeded successfully with password: password123');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding 15 roles:', err);
    process.exit(1);
  }
}

seed15Roles();
