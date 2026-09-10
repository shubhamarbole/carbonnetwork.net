const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

/**
 * 1. Assign Role and Custom Claims (Callable Function for Super Admin)
 */
exports.setUserCustomClaims = functions.https.onCall(async (data, context) => {
  // Enforce caller authentication & Super Admin authority
  if (!context.auth || context.auth.token.role !== 'SUPER_ADMIN') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only Super Administrators can assign roles and tenant claims.'
    );
  }

  const { uid, role, organizationId } = data;
  if (!uid || !role || !organizationId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The function must be called with uid, role, and organizationId.'
    );
  }

  await admin.auth().setCustomUserClaims(uid, {
    role,
    organizationId
  });

  // Sync to Firestore user document
  await db.collection('users').doc(uid).set({
    role,
    organizationId,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  // Record audit log
  await db.collection('audit_logs').add({
    userId: context.auth.uid,
    userRole: context.auth.token.role,
    action: 'User Role & Claims Assigned',
    entityType: 'User',
    entityId: uid,
    organizationId,
    newValue: JSON.stringify({ role, organizationId }),
    timestamp: new Date().toISOString()
  });

  return { success: true, message: `Custom claims assigned to ${uid}` };
});

/**
 * 2. Firestore Trigger on Project Lifecycle Status Update
 */
exports.onProjectStatusUpdated = functions.firestore
  .document('projects/{projectId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status !== after.status) {
      const { organizationId, name, status } = after;
      const projectId = context.params.projectId;

      // 1. Log immutable audit entry
      await db.collection('audit_logs').add({
        userId: after.updatedBy || 'system',
        userRole: 'REVIEWER',
        action: `Project Status: ${before.status} -> ${status}`,
        entityType: 'Project',
        entityId: projectId,
        organizationId,
        previousValue: before.status,
        newValue: status,
        timestamp: new Date().toISOString()
      });

      // 2. Dispatch notification to organization users
      await db.collection('notifications').add({
        organizationId,
        title: `Project Status Updated: ${name}`,
        message: `Your project "${name}" has transitioned to ${status}.`,
        type: status === 'APPROVED' ? 'SUCCESS' : (status === 'CHANGES_REQUESTED' ? 'WARNING' : 'INFO'),
        link: `/projects?id=${projectId}`,
        isRead: false,
        createdAt: new Date().toISOString()
      });

      // 3. If project is VERIFIED, prepare Carbon Credit Batch draft
      if (status === 'VERIFIED' && after.targetCO2eReduction > 0) {
        const batchRef = db.collection('carbon_credits').doc();
        await batchRef.set({
          projectId,
          organizationId,
          batchNumber: `CC-${new Date().getFullYear()}-${projectId.substring(0, 6).toUpperCase()}`,
          vintageYear: new Date().getFullYear(),
          creditsTotal: Math.floor(after.targetCO2eReduction),
          creditsAvailable: Math.floor(after.targetCO2eReduction),
          creditsRetired: 0,
          standard: 'VCS-Verified Carbon Standard',
          status: 'ISSUED',
          createdAt: new Date().toISOString()
        });
      }
    }
  });

/**
 * 3. Firestore Trigger on Evidence Upload
 */
exports.onEvidenceCreated = functions.firestore
  .document('documents/{docId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const docId = context.params.docId;

    // Trigger notification for Platform Admin review queue
    await db.collection('notifications').add({
      organizationId: data.organizationId,
      title: 'New Evidence Uploaded',
      message: `New evidence document "${data.title || data.fileName}" was submitted for review.`,
      type: 'INFO',
      link: '/evidence',
      isRead: false,
      createdAt: new Date().toISOString()
    });
  });
