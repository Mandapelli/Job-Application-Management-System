import { Router } from 'express';
import { applicationController as c } from '../controllers/application.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  createApplicationSchema,
  listApplicationsQuerySchema,
  updateApplicationSchema,
  updateStatusSchema,
} from '../validators/application.validator.js';

export const applicationRouter = Router();

applicationRouter.use(authenticate); // every route below requires a logged-in user

applicationRouter.get('/', validateQuery(listApplicationsQuerySchema), c.list);
applicationRouter.post('/', validateBody(createApplicationSchema), c.create);
applicationRouter.get('/:id', c.getById);
applicationRouter.patch('/:id', validateBody(updateApplicationSchema), c.update);
applicationRouter.patch('/:id/status', validateBody(updateStatusSchema), c.changeStatus);
applicationRouter.delete('/:id', c.remove);
