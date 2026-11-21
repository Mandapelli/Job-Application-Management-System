import { Router } from 'express';
import { notificationController as c } from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { listNotificationsQuerySchema, markReadSchema } from '../validators/notification.validator.js';

export const notificationRouter = Router();

notificationRouter.use(authenticate);

notificationRouter.get('/', validateQuery(listNotificationsQuerySchema), c.list);
// Fixed paths must stay above '/:id'.
notificationRouter.get('/unread-count', c.unreadCount);
notificationRouter.post('/read-all', c.markAllRead);
notificationRouter.patch('/:id', validateBody(markReadSchema), c.setRead);
notificationRouter.delete('/:id', c.remove);
