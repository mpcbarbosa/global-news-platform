import { Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendNoContent } from '../utils/response';

export class UserController {
  async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const profile = await userService.getProfile(req.user!.userId);
      sendSuccess(res, profile);
    } catch (error) { next(error); }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const profile = await userService.updateProfile(req.user!.userId, req.body);
      sendSuccess(res, profile, 'Profile updated');
    } catch (error) { next(error); }
  }

  async listUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit } = req.query;
      const result = await userService.listUsers(page as string, limit as string);
      sendSuccess(res, result);
    } catch (error) { next(error); }
  }

  async deactivateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await userService.deactivateUser(req.params.id);
      sendNoContent(res);
    } catch (error) { next(error); }
  }
}

export const userController = new UserController();
