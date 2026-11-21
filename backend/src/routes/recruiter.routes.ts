import { Router } from 'express';
import { recruiterController as c } from '../controllers/recruiter.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  createRecruiterSchema,
  listRecruitersQuerySchema,
  updateRecruiterSchema,
} from '../validators/recruiter.validator.js';

export const recruiterRouter = Router();

recruiterRouter.use(authenticate);

recruiterRouter.get('/', validateQuery(listRecruitersQuerySchema), c.list);
recruiterRouter.post('/', validateBody(createRecruiterSchema), c.create);
recruiterRouter.get('/:id', c.getById);
recruiterRouter.patch('/:id', validateBody(updateRecruiterSchema), c.update);
recruiterRouter.delete('/:id', c.remove);
