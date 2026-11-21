import { Router } from 'express';
import { companyController as c } from '../controllers/company.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  createCompanySchema,
  listCompaniesQuerySchema,
  updateCompanySchema,
} from '../validators/company.validator.js';

export const companyRouter = Router();

companyRouter.use(authenticate);

companyRouter.get('/', validateQuery(listCompaniesQuerySchema), c.list);
companyRouter.post('/', validateBody(createCompanySchema), c.create);
companyRouter.get('/:id', c.getById);
companyRouter.patch('/:id', validateBody(updateCompanySchema), c.update);
companyRouter.delete('/:id', c.remove);
