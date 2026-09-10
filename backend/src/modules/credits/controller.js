const CarbonProject = require('./model');
const CreditTransaction = require('./transactionModel');
const AuditLog = require('../audit/model');

class CreditsController {
  async listProjects(req, res, next) {
    try {
      const list = await CarbonProject.find({ status: 'VERIFIED' });
      res.json(list);
    } catch (err) {
      next(err);
    }
  }

  async requestPurchase(req, res, next) {
    try {
      const { projectId, creditAmount, purchasePrice } = req.body;
      if (!projectId || !creditAmount || !purchasePrice) {
        return res.status(400).json({ error: 'Project ID, credit amount, and purchase price are required.' });
      }

      const project = await CarbonProject.findById(projectId);
      if (!project || project.status !== 'VERIFIED') {
        return res.status(404).json({ error: 'Verified carbon project not found.' });
      }

      if (project.creditsAvailable < creditAmount) {
        return res.status(400).json({ error: 'Requested offset credit volume exceeds project availability.' });
      }

      // Create transaction in PENDING_APPROVAL status
      const transaction = await CreditTransaction.create({
        projectId,
        buyerId: req.user.userId,
        sellerId: project.organizationId, // maps to organization contact
        creditAmount,
        purchasePrice,
        status: 'PENDING_APPROVAL'
      });

      // Write Audit Log
      await AuditLog.create({
        actorId: req.user.userId,
        organizationId: req.user.organizationId,
        action: 'credits.request',
        resourceType: 'CreditTransaction',
        resourceId: transaction._id,
        newValue: JSON.stringify(transaction),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(201).json(transaction);
    } catch (err) {
      next(err);
    }
  }

  async approveTransaction(req, res, next) {
    try {
      const transaction = await CreditTransaction.findById(req.params.id);
      if (!transaction) {
        return res.status(404).json({ error: 'Credit transaction not found.' });
      }

      if (transaction.status !== 'PENDING_APPROVAL') {
        return res.status(400).json({ error: 'Transaction is already processed or completed.' });
      }

      const project = await CarbonProject.findById(transaction.projectId);
      if (!project) {
        return res.status(404).json({ error: 'Carbon project associated with transaction not found.' });
      }

      if (project.creditsAvailable < transaction.creditAmount) {
        return res.status(400).json({ error: 'Insufficient credits available in the registry for this project.' });
      }

      const previousProjVal = JSON.stringify(project);
      const previousTxVal = JSON.stringify(transaction);

      // Perform the transfer transaction
      project.creditsAvailable -= transaction.creditAmount;
      await project.save();

      transaction.status = 'COMPLETED';
      await transaction.save();

      // Write Audit Log
      await AuditLog.create({
        actorId: req.user.userId,
        organizationId: req.user.organizationId,
        action: 'credits.approve',
        resourceType: 'CreditTransaction',
        resourceId: transaction._id,
        previousValue: JSON.stringify({ project: previousProjVal, transaction: previousTxVal }),
        newValue: JSON.stringify({ project, transaction }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json({ message: 'Transaction approved and credit ownership transferred.', transaction });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CreditsController();
