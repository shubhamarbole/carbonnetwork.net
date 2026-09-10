import { Router } from 'express';
import { approvalsController } from './controller';
import { authenticateToken, authorizeSuperAdmin } from '../../common/middleware/auth';

const router = Router();

router.get('/', authenticateToken, authorizeSuperAdmin, approvalsController.listRequests);
router.put('/:id/resolve', authenticateToken, authorizeSuperAdmin, approvalsController.resolveRequest);

export default router;
