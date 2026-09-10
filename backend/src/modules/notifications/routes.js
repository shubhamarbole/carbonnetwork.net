/**
 * Notifications Routes
 * Phase 7: Alerts + Workflow Automation
 */

const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticateRiskUser } = require('../../middleware/riskAuth');

router.get('/', authenticateRiskUser, controller.listNotifications);
router.post('/', authenticateRiskUser, controller.createNotification);

// Read-all routes (must precede /:id)
router.post('/read-all', authenticateRiskUser, controller.markAllNotificationsRead);
router.post('/mark-all-read', authenticateRiskUser, controller.markAllNotificationsRead);

// Single read routes (supports POST and PUT)
router.post('/:id/read', authenticateRiskUser, controller.markNotificationAsRead);
router.put('/:id/read', authenticateRiskUser, controller.markNotificationAsRead);

module.exports = router;
