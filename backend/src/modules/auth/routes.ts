import { Router } from 'express';
import { authController } from './controller';
import { authenticateToken } from '../../common/middleware/auth';

const router = Router();

router.post('/login', authController.login);
router.get('/me', authenticateToken, authController.me);

export default router;
