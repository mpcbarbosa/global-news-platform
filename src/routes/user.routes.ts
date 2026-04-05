import { Router } from 'express';
import { z } from 'zod';
import { userController } from '../controllers/user.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';

const router = Router();

const updateProfileSchema = z.object({
  display_name: z.string().min(2).max(100).optional(),
  avatar_url: z.string().url().optional(),
  preferred_language: z.string().length(2).optional(),
});

router.get('/profile', authenticate, (req, res, next) => userController.getProfile(req, res, next));
router.patch('/profile', authenticate, validate(updateProfileSchema), (req, res, next) => userController.updateProfile(req, res, next));

// Admin routes
router.get('/', authenticate, authorize('admin'), (req, res, next) => userController.listUsers(req, res, next));
router.delete('/:id', authenticate, authorize('admin'), (req, res, next) => userController.deactivateUser(req, res, next));

export default router;
