import { companyRepository } from '../repositories/company.repository.js';
import { AppError } from '../utils/AppError.js';
import type {
  CreateCompanyInput,
  ListCompaniesQuery,
  UpdateCompanyInput,
} from '../validators/company.validator.js';

/** Two requests can pass the name check at the same moment; the database unique index is the final guard. */
const isUniqueViolation = (e: unknown) =>
  typeof e === 'object' && e !== null && 'code' in e && (e as { code?: string }).code === 'P2002';

const duplicate = () => AppError.conflict('You already have a company with this name');

export const companyService = {
  async list(userId: string, query: ListCompaniesQuery) {
    const { items, total } = await companyRepository.list(userId, query);
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
    const company = await companyRepository.findOwnedDetail(userId, id);
    if (!company) throw AppError.notFound('Company not found');
    return company;
  },

  async create(userId: string, input: CreateCompanyInput) {
    if (await companyRepository.nameTaken(userId, input.name)) throw duplicate();
    try {
      return await companyRepository.create(userId, input);
    } catch (e) {
      throw isUniqueViolation(e) ? duplicate() : e;
    }
  },

  async update(userId: string, id: string, input: UpdateCompanyInput) {
    if (input.name && (await companyRepository.nameTaken(userId, input.name, id))) throw duplicate();
    try {
      const company = await companyRepository.update(userId, id, input);
      if (!company) throw AppError.notFound('Company not found');
      return company;
    } catch (e) {
      throw isUniqueViolation(e) ? duplicate() : e;
    }
  },

  async remove(userId: string, id: string) {
    if (!(await companyRepository.delete(userId, id))) throw AppError.notFound('Company not found');
  },
};
