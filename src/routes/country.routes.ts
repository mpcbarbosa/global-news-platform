import { Router } from 'express';
import { countryController } from '../controllers/country.controller';

const router = Router();

router.get('/', (req, res, next) => countryController.list(req, res, next));
router.get('/:code', (req, res, next) => countryController.getByCode(req, res, next));

export default router;
