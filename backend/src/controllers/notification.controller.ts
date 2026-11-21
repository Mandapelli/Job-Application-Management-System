import { notificationService } from '../services/notification.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { ListNotificationsQuery } from '../validators/notification.validator.js';

const idOf = (params: Record<string, unknown>) => String(params.id);

export const notificationController = {
  list: asyncHandler(async (req, res) => {
    const { items, meta } = await notificationService.list(req.user!.id, res.locals.query as ListNotificationsQuery);
    sendSuccess(res, items, { meta });
  }),
  unreadCount: asyncHandler(async (req, res) => {
    sendSuccess(res, { count: await notificationService.unreadCount(req.user!.id) });
  }),
  setRead: asyncHandler(async (req, res) => {
    sendSuccess(res, await notificationService.setRead(req.user!.id, idOf(req.params), req.body.read));
  }),
  markAllRead: asyncHandler(async (req, res) => {
    const updated = await notificationService.markAllRead(req.user!.id);
    sendSuccess(res, { updated }, { message: 'All notifications marked as read' });
  }),
  remove: asyncHandler(async (req, res) => {
    await notificationService.remove(req.user!.id, idOf(req.params));
    sendSuccess(res, null, { message: 'Notification deleted' });
  }),
};
