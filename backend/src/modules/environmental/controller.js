const EnvironmentalRecord = require('./model');
const AuditLog = require('../audit/model');

class EnvironmentalController {
  async list(req, res, next) {
    try {
      // tenantFilter includes organizationId and allowed facility scope (if restricted)
      const query = { 
        ...req.tenantFilter,
        isArchived: false 
      };

      if (req.query.moduleType) {
        query.moduleType = req.query.moduleType;
      }
      if (req.query.reportingPeriod) {
        query.reportingPeriod = req.query.reportingPeriod;
      }

      const records = await EnvironmentalRecord.find(query)
        .populate('facilityId', 'name location')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 });

      res.json(records);
    } catch (err) {
      next(err);
    }
  }

  async retrieve(req, res, next) {
    try {
      const record = await EnvironmentalRecord.findOne({
        _id: req.params.id,
        ...req.tenantFilter,
        isArchived: false
      }).populate('facilityId', 'name location');

      if (!record) {
        return res.status(404).json({ error: 'Environmental record not found.' });
      }

      res.json(record);
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const { moduleType, facilityId, reportingPeriod, periodStart, periodEnd, dataPayload, dataQuality } = req.body;
      if (!moduleType || !facilityId || !reportingPeriod || !periodStart || !periodEnd || !dataPayload) {
        return res.status(400).json({ error: 'Missing required environmental payload fields.' });
      }

      const newRecord = await EnvironmentalRecord.create({
        organizationId: req.user.organizationId,
        facilityId,
        moduleType,
        reportingPeriod,
        periodStart,
        periodEnd,
        dataPayload,
        dataQuality: dataQuality || 'Actual',
        verificationStatus: 'DRAFT',
        createdBy: req.user.userId
      });

      // Write Audit Log
      await AuditLog.create({
        actorId: req.user.userId,
        organizationId: req.user.organizationId,
        action: 'record.create',
        resourceType: 'EnvironmentalRecord',
        resourceId: newRecord._id,
        newValue: JSON.stringify(newRecord),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(201).json(newRecord);
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const { dataPayload, dataQuality, periodStart, periodEnd } = req.body;
      
      const record = await EnvironmentalRecord.findOne({
        _id: req.params.id,
        ...req.tenantFilter,
        isArchived: false
      });

      if (!record) {
        return res.status(404).json({ error: 'Environmental record not found or access unauthorized.' });
      }

      // Evidences/Auditors cannot edit verified records directly without resetting
      if (record.verificationStatus === 'VERIFIED') {
        return res.status(403).json({ error: 'Cannot modify a verified environmental record.' });
      }

      const previousValue = JSON.stringify(record);

      if (dataPayload) record.dataPayload = dataPayload;
      if (dataQuality) record.dataQuality = dataQuality;
      if (periodStart) record.periodStart = periodStart;
      if (periodEnd) record.periodEnd = periodEnd;
      record.verificationStatus = 'DRAFT'; // Reset status back to draft for re-verification
      record.updatedBy = req.user.userId;
      record.updatedAt = new Date();

      const updatedRecord = await record.save();

      // Write Audit Log
      await AuditLog.create({
        actorId: req.user.userId,
        organizationId: req.user.organizationId,
        action: 'record.update',
        resourceType: 'EnvironmentalRecord',
        resourceId: updatedRecord._id,
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

  async archive(req, res, next) {
    try {
      const record = await EnvironmentalRecord.findOne({
        _id: req.params.id,
        ...req.tenantFilter,
        isArchived: false
      });

      if (!record) {
        return res.status(404).json({ error: 'Environmental record not found or access unauthorized.' });
      }

      const previousValue = JSON.stringify(record);
      record.isArchived = true;
      record.updatedBy = req.user.userId;
      await record.save();

      // Write Audit Log
      await AuditLog.create({
        actorId: req.user.userId,
        organizationId: req.user.organizationId,
        action: 'record.archive',
        resourceType: 'EnvironmentalRecord',
        resourceId: record._id,
        previousValue,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json({ message: 'Environmental record successfully archived.' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new EnvironmentalController();
