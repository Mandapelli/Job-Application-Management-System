import { applicationService } from '../services/application.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { ListApplicationsQuery } from '../validators/application.validator.js';

const idOf = (params: Record<string, unknown>) => String(params.id);

export const applicationController = {
  list: asyncHandler(async (req, res) => {
    const { items, meta } = await applicationService.list(
      req.user!.id,
      res.locals.query as ListApplicationsQuery,
    );
    sendSuccess(res, items, { meta });
  }),

  getById: asyncHandler(async (req, res) => {
    sendSuccess(res, await applicationService.getById(req.user!.id, idOf(req.params)));
  }),

  create: asyncHandler(async (req, res) => {
    const app = await applicationService.create(req.user!.id, req.body);
    sendSuccess(res, app, { status: 201, message: 'Application created' });
  }),

  update: asyncHandler(async (req, res) => {
    const app = await applicationService.update(req.user!.id, idOf(req.params), req.body);
    sendSuccess(res, app, { message: 'Application updated' });
  }),

  remove: asyncHandler(async (req, res) => {
    await applicationService.remove(req.user!.id, idOf(req.params));
    sendSuccess(res, null, { message: 'Application deleted' });
  }),

  changeStatus: asyncHandler(async (req, res) => {
    const app = await applicationService.changeStatus(
      req.user!.id,
      idOf(req.params),
      req.body.status,
    );
    sendSuccess(res, app, { message: 'Status updated' });
  }),
};
