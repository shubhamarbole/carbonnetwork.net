const Evidence = require('./model');
const EnvironmentalRecord = require('../environmental/model');
const AuditLog = require('../audit/model');

class EvidenceController {
  async upload(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No evidence file provided.' });
      }

      const { facilityId, recordId } = req.body;
      if (!facilityId) {
        return res.status(400).json({ error: 'Facility ID is required.' });
      }

      const newEvidence = await Evidence.create({
        organizationId: req.user.organizationId,
        facilityId,
        fileName: req.file.originalname,
        filePath: req.file.path.replace(/\\/g, '/'), // cross-platform slash normalizer
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        status: 'UPLOADED',
        uploadedBy: req.user.userId
      });

      // If a specific EnvironmentalRecord ID is passed, link this file to it automatically
      if (recordId) {
        const record = await EnvironmentalRecord.findOne({
          _id: recordId,
          ...req.tenantFilter
        });
        if (record) {
          record.evidenceFiles.push(newEvidence._id);
          // Advance draft record to submitted/under review if evidence uploaded
          if (record.verificationStatus === 'DRAFT') {
            record.verificationStatus = 'SUBMITTED';
          }
          await record.save();
        }
      }

      // Write Audit Log
      await AuditLog.create({
        actorId: req.user.userId,
        organizationId: req.user.organizationId,
        action: 'evidence.upload',
        resourceType: 'Evidence',
        resourceId: newEvidence._id,
        newValue: JSON.stringify(newEvidence),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(201).json(newEvidence);
    } catch (err) {
      next(err);
    }
  }

  async list(req, res, next) {
    try {
      const list = await Evidence.find(req.tenantFilter)
        .populate('uploadedBy', 'name email')
        .sort({ uploadedAt: -1 });
      res.json(list);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new EvidenceController();
