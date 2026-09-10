const EnvironmentalRecord = require('../environmental/model');
const Evidence = require('../evidence/model');
const AuditLog = require('../audit/model');

// Valid state machine transitions for environmental record verificationStatus
const VALID_TRANSITIONS = {
  'DRAFT': ['SUBMITTED'],
  'SUBMITTED': ['EVIDENCE_REVIEW', 'CORRECTION_REQUIRED', 'REJECTED'],
  'EVIDENCE_REVIEW': ['VERIFICATION', 'CORRECTION_REQUIRED', 'REJECTED'],
  'CORRECTION_REQUIRED': ['SUBMITTED', 'DRAFT'],
  'VERIFICATION': ['VERIFIED', 'REJECTED', 'CORRECTION_REQUIRED'],
  'VERIFIED': [], // Terminal State
  'REJECTED': ['DRAFT']
};

class VerificationController {
  async listQueue(req, res, next) {
    try {
      const query = {
        ...req.tenantFilter,
        isArchived: false,
        verificationStatus: { $ne: 'DRAFT' } // Exclude draft records from the public audit queue
      };

      const records = await EnvironmentalRecord.find(query)
        .populate('facilityId', 'name location')
        .populate('assignedVerifier', 'name email')
        .populate('evidenceFiles')
        .sort({ updatedAt: -1 });

      res.json(records);
    } catch (err) {
      next(err);
    }
  }

  async assignVerifier(req, res, next) {
    try {
      const { verifierId } = req.body;
      if (!verifierId) {
        return res.status(400).json({ error: 'Verifier ID is required.' });
      }

      const record = await EnvironmentalRecord.findOne({
        _id: req.params.id,
        ...req.tenantFilter,
        isArchived: false
      });

      if (!record) {
        return res.status(404).json({ error: 'Environmental record not found or access unauthorized.' });
      }

      const previousValue = JSON.stringify(record);
      record.assignedVerifier = verifierId;
      
      // Advance status to VERIFICATION if in review or submitted
      if (record.verificationStatus === 'SUBMITTED' || record.verificationStatus === 'EVIDENCE_REVIEW') {
        record.verificationStatus = 'VERIFICATION';
      }

      const updatedRecord = await record.save();

      // Write Audit Log
      await AuditLog.create({
        actorId: req.user.userId,
        organizationId: record.organizationId,
        action: 'verification.assign',
        resourceType: 'EnvironmentalRecord',
        resourceId: record._id,
        previousValue,
        newValue: JSON.stringify(updatedRecord),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json(updatedRecord);
    } catch (err) {
      next(err);
    }
  }

  async transitionStatus(req, res, next) {
    try {
      const { status, comment } = req.body;
      if (!status) {
        return res.status(400).json({ error: 'Target verification status is required.' });
      }

      const record = await EnvironmentalRecord.findOne({
        _id: req.params.id,
        ...req.tenantFilter,
        isArchived: false
      });

      if (!record) {
        return res.status(404).json({ error: 'Environmental record not found.' });
      }

      const currentStatus = record.verificationStatus || 'DRAFT';
      const allowedTargets = VALID_TRANSITIONS[currentStatus] || [];

      if (!allowedTargets.includes(status)) {
        return res.status(400).json({
          error: `Invalid state transition: Cannot transition from [${currentStatus}] to [${status}].`
        });
      }

      const previousValue = JSON.stringify(record);
      record.verificationStatus = status;
      record.updatedAt = new Date();
      
      const updatedRecord = await record.save();

      // Write Audit Log containing decision comment
      await AuditLog.create({
        actorId: req.user.userId,
        organizationId: record.organizationId,
        action: `verification.${status.toLowerCase()}`,
        resourceType: 'EnvironmentalRecord',
        resourceId: record._id,
        previousValue,
        newValue: JSON.stringify({ updatedRecord, comment }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json(updatedRecord);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new VerificationController();
