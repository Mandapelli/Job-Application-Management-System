import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { dashboardService } from '../services/dashboard.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

dashboardRouter.get(
  '/summary',
  asyncHandler(async (req, res) => {
    sendSuccess(res, await dashboardService.summary(req.user!.id));
  }),
);
