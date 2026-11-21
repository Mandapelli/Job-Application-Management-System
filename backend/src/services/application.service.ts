import type { ApplicationStatus } from '../generated/prisma/client.js';
import { applicationRepository } from '../repositories/application.repository.js';
import { companyRepository } from '../repositories/company.repository.js';
import { recruiterRepository } from '../repositories/recruiter.repository.js';
import { AppError } from '../utils/AppError.js';
import type {
  CreateApplicationInput,
  ListApplicationsQuery,
  UpdateApplicationInput,
} from '../validators/application.validator.js';

async function assertOwnedCompany(userId: string, companyId: string) {
  const company = await companyRepository.findOwned(userId, companyId);
  if (!company) throw AppError.badRequest('Company not found');
  return company;
}

/** A linked recruiter is the source of truth: its contact details are copied onto the application. */
async function recruiterDetails(userId: string, recruiterId: string) {
  const r = await recruiterRepository.findOwned(userId, recruiterId);
  if (!r) throw AppError.badRequest('Recruiter not found');
  return { recruiterName: r.name, recruiterEmail: r.email, recruiterPhone: r.phone };
}

export const applicationService = {
  async list(userId: string, query: ListApplicationsQuery) {
    const { items, total } = await applicationRepository.list(userId, query);
    return {
      items,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  },

  async getById(userId: string, id: string) {
    const app = await applicationRepository.findOwnedDetail(userId, id);
    if (!app) throw AppError.notFound('Application not found');
    return app;
  },

  async create(userId: string, input: CreateApplicationInput) {
    const { companyName, ...rest } = input;
    let name = companyName;
    if (input.companyId) {
      const company = await assertOwnedCompany(userId, input.companyId);
      name ??= company.name;
    }
    const linked = input.recruiterId ? await recruiterDetails(userId, input.recruiterId) : {};
    return applicationRepository.create(userId, { ...rest, companyName: name!, ...linked });
  },

  async update(userId: string, id: string, input: UpdateApplicationInput) {
    const data: UpdateApplicationInput = { ...input };
    if (input.companyId) {
      const company = await assertOwnedCompany(userId, input.companyId);
      data.companyName ??= company.name; // linking a company fills in its name
    }
    if (input.recruiterId) Object.assign(data, await recruiterDetails(userId, input.recruiterId));
    const app = await applicationRepository.update(userId, id, data);
    if (!app) throw AppError.notFound('Application not found');
    return app;
  },

  async remove(userId: string, id: string) {
    const deleted = await applicationRepository.delete(userId, id);
    if (!deleted) throw AppError.notFound('Application not found');
  },

  async changeStatus(userId: string, id: string, status: ApplicationStatus) {
    const result = await applicationRepository.changeStatus(userId, id, status);
    if (result.kind === 'not_found') throw AppError.notFound('Application not found');
    if (result.kind === 'conflict') {
      throw AppError.conflict('Application was modified by another request, please retry');
    }
    return applicationRepository.findOwnedDetail(userId, id);
  },
};
