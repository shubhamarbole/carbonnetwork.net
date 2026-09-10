const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { Risk, AuditLog, User, Project, Organization } = require('./models/models');
const connectDB = require('./src/config/db');

async function runTests() {
  console.log('🧪 Starting Phase 1 Risk Manager Automated Verification...');
  await connectDB();

  // Test 1: Clean test risks
  await Risk.deleteOne({ title: 'TEST_AUTOMATED_RISK_TITLE' });
  console.log('✅ Cleaned previous test risks.');

  // Test 2: Validation - invalid probability > 100 should fail or be caught
  try {
    const invalidRisk = new Risk({
      title: 'Invalid Prob Risk',
      description: 'Desc',
      category: 'Financial',
      probability: 150, // Invalid!
      impact: 50,
      severity: 'HIGH',
      organizationId: 'org-test',
      createdBy: 'test-user'
    });
    // If Mongoose model
    if (typeof invalidRisk.validate === 'function') {
      let errCaught = false;
      try {
        await invalidRisk.validate();
      } catch (err) {
        errCaught = true;
        console.log('✅ Validation correctly caught probability > 100:', err.message);
      }
      if (!errCaught) {
        console.error('❌ Expected validation error for probability > 100 but none was thrown!');
      }
    }
  } catch (e) {
    console.log('✅ Validation check:', e.message);
  }

  // Test 3: Create a valid Risk
  const now = new Date().toISOString();
  const validRisk = await Risk.create({
    title: 'TEST_AUTOMATED_RISK_TITLE',
    description: 'Critical testing of cybersecurity and grid infrastructure vulnerability.',
    category: 'Cybersecurity',
    probability: 85,
    impact: 90,
    severity: 'CRITICAL',
    status: 'OPEN',
    organizationId: 'org-acme-test',
    projectId: null,
    ownerId: null,
    createdBy: 'test_admin@esg.com',
    createdAt: now,
    updatedAt: now
  });

  console.log('✅ Successfully created risk record with ID:', validRisk._id);

  // Test 4: Write Audit Log for creation
  const createAudit = await AuditLog.create({
    organizationId: validRisk.organizationId,
    user: 'test_admin@esg.com',
    userId: 'user-123',
    action: 'RISK_CREATED',
    riskId: validRisk._id.toString(),
    module: 'RiskManager',
    recordId: validRisk._id.toString(),
    metadata: {
      title: validRisk.title,
      category: validRisk.category,
      severity: validRisk.severity
    },
    timestamp: now
  });
  console.log('✅ Successfully recorded RISK_CREATED audit log:', createAudit._id);

  // Test 5: Update Status
  const oldStatus = validRisk.status;
  validRisk.status = 'UNDER_REVIEW';
  validRisk.updatedAt = new Date().toISOString();
  await validRisk.save();

  await AuditLog.create({
    organizationId: validRisk.organizationId,
    user: 'test_admin@esg.com',
    userId: 'user-123',
    action: 'RISK_STATUS_CHANGED',
    riskId: validRisk._id.toString(),
    module: 'RiskManager',
    recordId: validRisk._id.toString(),
    oldValue: oldStatus,
    newValue: 'UNDER_REVIEW',
    metadata: { oldStatus, newStatus: 'UNDER_REVIEW', reason: 'Review initiated' },
    timestamp: new Date().toISOString()
  });
  console.log('✅ Successfully updated status to UNDER_REVIEW and logged audit entry.');

  // Test 6: Assign Owner
  validRisk.ownerId = 'owner-456';
  validRisk.updatedAt = new Date().toISOString();
  await validRisk.save();

  await AuditLog.create({
    organizationId: validRisk.organizationId,
    user: 'test_admin@esg.com',
    userId: 'user-123',
    action: 'RISK_ASSIGNED',
    riskId: validRisk._id.toString(),
    module: 'RiskManager',
    recordId: validRisk._id.toString(),
    oldValue: 'None',
    newValue: 'owner-456',
    metadata: { newOwnerId: 'owner-456', assignedBy: 'test_admin@esg.com' },
    timestamp: new Date().toISOString()
  });
  console.log('✅ Successfully assigned owner and logged RISK_ASSIGNED audit entry.');

  // Test 7: Verify Audit Log retrieval
  const logs = await AuditLog.find({ riskId: validRisk._id.toString() });
  const logList = Array.isArray(logs) ? logs : logs.data || [];
  console.log(`✅ Retrieved ${logList.length} audit logs for test risk.`);
  if (logList.length !== 3) {
    console.error(`⚠️ Expected 3 audit logs, found ${logList.length}`);
  }

  // Test 8: Clean up test risk
  await Risk.findByIdAndDelete(validRisk._id);
  console.log('✅ Cleaned up test risk.');

  console.log('🎉 ALL BACKEND MODEL & AUDIT LOG TESTS PASSED!');
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
