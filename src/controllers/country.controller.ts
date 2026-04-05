import { Request, Response, NextFunction } from 'express';
import { countryRepository } from '../repositories/country.repository';
import { cacheGet, cacheSet } from '../config/redis';
import { sendSuccess } from '../utils/response';
import { NotFoundError } from '../utils/errors';

export class CountryController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const lang = (req.query.lang as string) || 'en';
      const cacheKey = `countries:${lang}`;
      const cached = await cacheGet<Record<string, unknown>[]>(cacheKey);
      if (cached) return sendSuccess(res, cached);

      const countries = await countryRepository.findAll(lang);
      await cacheSet(cacheKey, countries, 600);
      sendSuccess(res, countries);
    } catch (error) { next(error); }
  }

  async getByCode(req: Request, res: Response, next: NextFunction) {
    try {
      const country = await countryRepository.findByCode(req.params.code.toUpperCase());
      if (!country) throw new NotFoundError('Country');
      sendSuccess(res, country);
    } catch (error) { next(error); }
  }
}

export const countryController = new CountryController();
