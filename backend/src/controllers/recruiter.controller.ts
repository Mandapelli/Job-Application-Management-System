import { recruiterService } from '../services/recruiter.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { ListRecruitersQuery } from '../validators/recruiter.validator.js';

const idOf = (params: Record<string, unknown>) => String(params.id);

export const recruiterController = {
  list: asyncHandler(async (req, res) => {
    const { items, meta } = await recruiterService.list(req.user!.id, res.locals.query as ListRecruitersQuery);
    sendSuccess(res, items, { meta });
  }),
  getById: asyncHandler(async (req, res) => {
    sendSuccess(res, await recruiterService.getById(req.user!.id, idOf(req.params)));
  }),
  create: asyncHandler(async (req, res) => {
    sendSuccess(res, await recruiterService.create(req.user!.id, req.body), {
      status: 201,
      message: 'Recruiter created',
    });
  }),
  update: asyncHandler(async (req, res) => {
    sendSuccess(res, await recruiterService.update(req.user!.id, idOf(req.params), req.body), {
      message: 'Recruiter updated',
    });
  }),
  remove: asyncHandler(async (req, res) => {
    await recruiterService.remove(req.user!.id, idOf(req.params));
    sendSuccess(res, null, { message: 'Recruiter deleted' });
  }),
};
