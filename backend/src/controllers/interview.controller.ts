import { interviewService } from '../services/interview.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { ListInterviewsQuery } from '../validators/interview.validator.js';

const idOf = (params: Record<string, unknown>) => String(params.id);

export const interviewController = {
  list: asyncHandler(async (req, res) => {
    const { items, meta } = await interviewService.list(req.user!.id, res.locals.query as ListInterviewsQuery);
    sendSuccess(res, items, { meta });
  }),
  getById: asyncHandler(async (req, res) => {
    sendSuccess(res, await interviewService.getById(req.user!.id, idOf(req.params)));
  }),
  create: asyncHandler(async (req, res) => {
    sendSuccess(res, await interviewService.create(req.user!.id, req.body), {
      status: 201,
      message: 'Interview scheduled',
    });
  }),
  update: asyncHandler(async (req, res) => {
    sendSuccess(res, await interviewService.update(req.user!.id, idOf(req.params), req.body), {
      message: 'Interview updated',
    });
  }),
  remove: asyncHandler(async (req, res) => {
    await interviewService.remove(req.user!.id, idOf(req.params));
    sendSuccess(res, null, { message: 'Interview deleted' });
  }),
};
