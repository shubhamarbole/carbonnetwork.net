import { Router } from 'express';
import { controlCenterController } from './controller';
import { authenticateToken, authorizeSuperAdmin } from '../../common/middleware/auth';

const router = Router();

router.get('/alerts', authenticateToken, authorizeSuperAdmin, controlCenterController.getAlerts);
router.post('/alerts', authenticateToken, authorizeSuperAdmin, controlCenterController.createAlert);
router.put('/alerts/:id/resolve', authenticateToken, authorizeSuperAdmin, controlCenterController.resolveAlert);
router.get('/health', authenticateToken, authorizeSuperAdmin, controlCenterController.getSystemHealth);

export default router;
