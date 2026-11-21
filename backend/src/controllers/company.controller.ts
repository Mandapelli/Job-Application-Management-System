import { companyService } from '../services/company.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { ListCompaniesQuery } from '../validators/company.validator.js';

const idOf = (params: Record<string, unknown>) => String(params.id);

export const companyController = {
  list: asyncHandler(async (req, res) => {
    const { items, meta } = await companyService.list(req.user!.id, res.locals.query as ListCompaniesQuery);
    sendSuccess(res, items, { meta });
  }),
  getById: asyncHandler(async (req, res) => {
    sendSuccess(res, await companyService.getById(req.user!.id, idOf(req.params)));
  }),
  create: asyncHandler(async (req, res) => {
    sendSuccess(res, await companyService.create(req.user!.id, req.body), {
      status: 201,
      message: 'Company created',
    });
  }),
  update: asyncHandler(async (req, res) => {
    sendSuccess(res, await companyService.update(req.user!.id, idOf(req.params), req.body), {
      message: 'Company updated',
    });
  }),
  remove: asyncHandler(async (req, res) => {
    await companyService.remove(req.user!.id, idOf(req.params));
    sendSuccess(res, null, { message: 'Company deleted' });
  }),
};
