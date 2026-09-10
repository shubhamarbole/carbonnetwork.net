import { Router } from 'express';
import { dashboardController } from './controller';
import { authenticateToken, authorizeSuperAdmin } from '../../common/middleware/auth';

const router = Router();

router.get('/summary', authenticateToken, authorizeSuperAdmin, dashboardController.getSummary);
router.get('/:role', authenticateToken, dashboardController.getRoleDashboard);

export default router;
