import { randomUUID } from 'node:crypto';
import { fixNameEncoding, sanitizeFileName, sniffDocument } from '../lib/fileType.js';
import { getStorage } from '../lib/storage/index.js';
import { documentRepository } from '../repositories/document.repository.js';
import { AppError } from '../utils/AppError.js';
import type {
  ListDocumentsQuery,
  UpdateDocumentInput,
  UploadDocumentInput,
} from '../validators/document.validator.js';

export const MAX_DOCUMENTS_PER_USER = 100;

/** Flattens the join rows: documents show the applications they are attached to. */
function withApplications<T extends { applications?: { application: unknown }[] }>(doc: T) {
  const { applications, ...rest } = doc;
  return { ...rest, applications: applications?.map((a) => a.application) };
}

export const documentService = {
  async list(userId: string, query: ListDocumentsQuery) {
    const { items, total } = await documentRepository.list(userId, query);
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
    const doc = await documentRepository.findOwnedDetail(userId, id);
    if (!doc) throw AppError.notFound('Document not found');
    return withApplications(doc);
  },

  async upload(userId: string, file: Express.Multer.File | undefined, input: UploadDocumentInput) {
    if (!file) throw AppError.badRequest('Choose a file to upload');

    const fileName = sanitizeFileName(fixNameEncoding(file.originalname));
    // Trust the bytes, not the browser: the content must really be a PDF/DOC/DOCX matching the extension.
    const kind = sniffDocument(file.buffer, fileName);
    if (!kind) {
      throw AppError.badRequest('Only PDF, DOC and DOCX files are allowed, and the file content must match its type');
    }
    if (file.size === 0) throw AppError.badRequest('The file is empty');

    if ((await documentRepository.count(userId)) >= MAX_DOCUMENTS_PER_USER) {
      throw AppError.badRequest(`Document limit reached (${MAX_DOCUMENTS_PER_USER}). Delete some documents first.`);
    }

    // The stored name is random and chosen here; the uploaded name never touches the file system.
    const id = randomUUID();
    const storageKey = `${id.slice(0, 2)}/${id}.${kind.ext}`;
    const storage = getStorage();
    await storage.save(storageKey, file.buffer);
    try {
      return await documentRepository.create(userId, {
        name: input.name ?? fileName,
        fileName,
        mimeType: kind.mime,
        sizeBytes: file.size,
        storageKey,
        type: input.type,
        description: input.description,
      });
    } catch (error) {
      await storage.remove(storageKey).catch(() => undefined); // don't leave an orphaned file behind
      throw error;
    }
  },

  async update(userId: string, id: string, input: UpdateDocumentInput) {
    const doc = await documentRepository.update(userId, id, input);
    if (!doc) throw AppError.notFound('Document not found');
    return withApplications(doc);
  },

  async remove(userId: string, id: string) {
    const storageKey = await documentRepository.delete(userId, id);
    if (!storageKey) throw AppError.notFound('Document not found');
    // The database row is already gone; failing to delete the file must not fail the request.
    await getStorage()
      .remove(storageKey)
      .catch((error) => console.error('Could not delete stored file', storageKey, error));
  },

  /** Returns the metadata and an open stream of the file, only for its owner. */
  async openForDownload(userId: string, id: string) {
    const doc = await documentRepository.findOwnedForDownload(userId, id);
    if (!doc) throw AppError.notFound('Document not found');
    try {
      return { doc, stream: await getStorage().read(doc.storageKey) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw AppError.notFound('The stored file is missing');
      throw error;
    }
  },

  async attach(userId: string, documentId: string, applicationId: string) {
    if (!(await documentRepository.findOwnedForDownload(userId, documentId))) {
      throw AppError.notFound('Document not found');
    }
    if (!(await documentRepository.applicationOwned(userId, applicationId))) {
      throw AppError.badRequest('Application not found');
    }
    await documentRepository.attach(documentId, applicationId);
    return this.getById(userId, documentId);
  },

  async detach(userId: string, documentId: string, applicationId: string) {
    if (!(await documentRepository.findOwnedForDownload(userId, documentId))) {
      throw AppError.notFound('Document not found');
    }
    if (!(await documentRepository.applicationOwned(userId, applicationId))) {
      throw AppError.badRequest('Application not found');
    }
    await documentRepository.detach(documentId, applicationId); // detaching something not attached is fine
    return this.getById(userId, documentId);
  },
};
