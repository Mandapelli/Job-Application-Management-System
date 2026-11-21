import { attachmentHeader } from '../lib/fileType.js';
import { documentService } from '../services/document.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { ListDocumentsQuery } from '../validators/document.validator.js';

const param = (params: Record<string, unknown>, name: string) => String(params[name]);

export const documentController = {
  list: asyncHandler(async (req, res) => {
    const { items, meta } = await documentService.list(req.user!.id, res.locals.query as ListDocumentsQuery);
    sendSuccess(res, items, { meta });
  }),

  getById: asyncHandler(async (req, res) => {
    sendSuccess(res, await documentService.getById(req.user!.id, param(req.params, 'id')));
  }),

  upload: asyncHandler(async (req, res) => {
    const doc = await documentService.upload(req.user!.id, req.file, req.body);
    sendSuccess(res, doc, { status: 201, message: 'Document uploaded' });
  }),

  update: asyncHandler(async (req, res) => {
    sendSuccess(res, await documentService.update(req.user!.id, param(req.params, 'id'), req.body), {
      message: 'Document updated',
    });
  }),

  remove: asyncHandler(async (req, res) => {
    await documentService.remove(req.user!.id, param(req.params, 'id'));
    sendSuccess(res, null, { message: 'Document deleted' });
  }),

  download: asyncHandler(async (req, res) => {
    const { doc, stream } = await documentService.openForDownload(req.user!.id, param(req.params, 'id'));
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Length', String(doc.sizeBytes));
    res.setHeader('Content-Disposition', attachmentHeader(doc.fileName)); // always a download, never rendered in the page
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  }),

  attach: asyncHandler(async (req, res) => {
    const doc = await documentService.attach(req.user!.id, param(req.params, 'id'), req.body.applicationId);
    sendSuccess(res, doc, { message: 'Document attached' });
  }),

  detach: asyncHandler(async (req, res) => {
    const doc = await documentService.detach(
      req.user!.id,
      param(req.params, 'id'),
      param(req.params, 'applicationId'),
    );
    sendSuccess(res, doc, { message: 'Document detached' });
  }),
};
