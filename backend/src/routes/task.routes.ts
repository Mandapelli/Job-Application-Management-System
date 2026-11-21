import { Router } from 'express';
import { taskController as c } from '../controllers/task.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createTaskSchema, listTasksQuerySchema, updateTaskSchema } from '../validators/task.validator.js';

export const taskRouter = Router();

taskRouter.use(authenticate);

taskRouter.get('/', validateQuery(listTasksQuerySchema), c.list);
taskRouter.get('/summary', c.summary); // must stay above '/:id'
taskRouter.post('/', validateBody(createTaskSchema), c.create);
taskRouter.get('/:id', c.getById);
taskRouter.patch('/:id', validateBody(updateTaskSchema), c.update);
taskRouter.delete('/:id', c.remove);
