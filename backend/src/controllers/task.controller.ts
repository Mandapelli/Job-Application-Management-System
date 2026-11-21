import { taskService } from '../services/task.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { ListTasksQuery } from '../validators/task.validator.js';

const idOf = (params: Record<string, unknown>) => String(params.id);

export const taskController = {
  list: asyncHandler(async (req, res) => {
    const { items, meta } = await taskService.list(req.user!.id, res.locals.query as ListTasksQuery);
    sendSuccess(res, items, { meta });
  }),
  summary: asyncHandler(async (req, res) => {
    sendSuccess(res, await taskService.summary(req.user!.id));
  }),
  getById: asyncHandler(async (req, res) => {
    sendSuccess(res, await taskService.getById(req.user!.id, idOf(req.params)));
  }),
  create: asyncHandler(async (req, res) => {
    sendSuccess(res, await taskService.create(req.user!.id, req.body), { status: 201, message: 'Task created' });
  }),
  update: asyncHandler(async (req, res) => {
    sendSuccess(res, await taskService.update(req.user!.id, idOf(req.params), req.body), {
      message: 'Task updated',
    });
  }),
  remove: asyncHandler(async (req, res) => {
    await taskService.remove(req.user!.id, idOf(req.params));
    sendSuccess(res, null, { message: 'Task deleted' });
  }),
};
