import { companyRepository } from '../repositories/company.repository.js';
import { recruiterRepository } from '../repositories/recruiter.repository.js';
import { AppError } from '../utils/AppError.js';
import type {
  CreateRecruiterInput,
  ListRecruitersQuery,
  UpdateRecruiterInput,
} from '../validators/recruiter.validator.js';

async function assertOwnedCompany(userId: string, companyId: string | null | undefined) {
  if (companyId && !(await companyRepository.findOwned(userId, companyId))) {
    throw AppError.badRequest('Company not found');
  }
}

export const recruiterService = {
  async list(userId: string, query: ListRecruitersQuery) {
    const { items, total } = await recruiterRepository.list(userId, query);
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
    const recruiter = await recruiterRepository.findOwnedDetail(userId, id);
    if (!recruiter) throw AppError.notFound('Recruiter not found');
    return recruiter;
  },

  async create(userId: string, input: CreateRecruiterInput) {
    await assertOwnedCompany(userId, input.companyId);
    return recruiterRepository.create(userId, input);
  },

  async update(userId: string, id: string, input: UpdateRecruiterInput) {
    await assertOwnedCompany(userId, input.companyId);
    const recruiter = await recruiterRepository.update(userId, id, input);
    if (!recruiter) throw AppError.notFound('Recruiter not found');
    return recruiter;
  },

  async remove(userId: string, id: string) {
    if (!(await recruiterRepository.delete(userId, id))) throw AppError.notFound('Recruiter not found');
  },
};
