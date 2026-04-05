import { Router } from 'express';
import { z } from 'zod';
import { articleController } from '../controllers/article.controller';
import { authenticate, optionalAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';

const router = Router();

const reactionSchema = z.object({
  reaction_type: z.enum(['like', 'love', 'wow', 'sad', 'angry']),
});

const commentSchema = z.object({
  content: z.string().min(1).max(2000),
  parent_id: z.string().uuid().optional(),
});

const shareSchema = z.object({
  platform: z.enum(['twitter', 'facebook', 'linkedin', 'whatsapp', 'email', 'copy_link']),
});

router.get('/', optionalAuth, (req, res, next) => articleController.list(req, res, next));
router.get('/trending', (req, res, next) => articleController.trending(req, res, next));
router.get('/saved', authenticate, (req, res, next) => articleController.savedList(req, res, next));
router.get('/:id', optionalAuth, (req, res, next) => articleController.getById(req, res, next));

router.post('/:id/save', authenticate, (req, res, next) => articleController.save(req, res, next));
router.delete('/:id/save', authenticate, (req, res, next) => articleController.unsave(req, res, next));

router.post('/:id/reactions', authenticate, validate(reactionSchema), (req, res, next) => articleController.react(req, res, next));
router.delete('/:id/reactions', authenticate, (req, res, next) => articleController.unreact(req, res, next));

router.get('/:id/comments', (req, res, next) => articleController.listComments(req, res, next));
router.post('/:id/comments', authenticate, validate(commentSchema), (req, res, next) => articleController.comment(req, res, next));

router.post('/:id/share', authenticate, validate(shareSchema), (req, res, next) => articleController.share(req, res, next));

export default router;
