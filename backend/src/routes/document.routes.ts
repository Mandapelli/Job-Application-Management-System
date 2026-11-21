import { Router } from 'express';
import { documentController as c } from '../controllers/document.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { uploadSingleFile } from '../middleware/upload.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  attachDocumentSchema,
  listDocumentsQuerySchema,
  updateDocumentSchema,
  uploadDocumentSchema,
} from '../validators/document.validator.js';

export const documentRouter = Router();

// Login is checked first, so anonymous requests are rejected before any file is read.
documentRouter.use(authenticate);

documentRouter.get('/', validateQuery(listDocumentsQuerySchema), c.list);
documentRouter.post('/', uploadSingleFile, validateBody(uploadDocumentSchema), c.upload);
documentRouter.get('/:id', c.getById);
documentRouter.patch('/:id', validateBody(updateDocumentSchema), c.update);
documentRouter.delete('/:id', c.remove);
documentRouter.get('/:id/download', c.download);
documentRouter.post('/:id/applications', validateBody(attachDocumentSchema), c.attach);
documentRouter.delete('/:id/applications/:applicationId', c.detach);
