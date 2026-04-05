import { Router } from 'express';
import { categoryController } from '../controllers/category.controller';

const router = Router();

router.get('/', (req, res, next) => categoryController.list(req, res, next));
router.get('/:slug', (req, res, next) => categoryController.getBySlug(req, res, next));

export default router;
