import { interviewRepository } from '../repositories/interview.repository.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import { AppError } from '../utils/AppError.js';
import type {
  CreateInterviewInput,
  ListInterviewsQuery,
  UpdateInterviewInput,
} from '../validators/interview.validator.js';

export const interviewService = {
  async list(userId: string, query: ListInterviewsQuery) {
    const { items, total } = await interviewRepository.list(userId, query);
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
    const interview = await interviewRepository.findOwnedDetail(userId, id);
    if (!interview) throw AppError.notFound('Interview not found');
    return interview;
  },

  async create(userId: string, input: CreateInterviewInput) {
    if (!(await interviewRepository.applicationOwned(userId, input.applicationId))) {
      throw AppError.badRequest('Application not found');
    }
    return interviewRepository.create(userId, input);
  },

  async update(userId: string, id: string, input: UpdateInterviewInput) {
    const interview = await interviewRepository.update(userId, id, input);
    if (!interview) throw AppError.notFound('Interview not found');
    // Rescheduled, cancelled or completed: drop the unread reminders that no longer apply.
    await notificationRepository.deleteStaleForInterview(interview);
    return interview;
  },

  async remove(userId: string, id: string) {
    if (!(await interviewRepository.delete(userId, id))) throw AppError.notFound('Interview not found');
  },
};
