import { Router } from 'express';
import { interviewController as c } from '../controllers/interview.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  createInterviewSchema,
  listInterviewsQuerySchema,
  updateInterviewSchema,
} from '../validators/interview.validator.js';

export const interviewRouter = Router();

interviewRouter.use(authenticate);

interviewRouter.get('/', validateQuery(listInterviewsQuerySchema), c.list);
interviewRouter.post('/', validateBody(createInterviewSchema), c.create);
interviewRouter.get('/:id', c.getById);
interviewRouter.patch('/:id', validateBody(updateInterviewSchema), c.update);
interviewRouter.delete('/:id', c.remove);
