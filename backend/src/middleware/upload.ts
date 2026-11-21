import multer from 'multer';
import { env } from '../config/env.js';

// Files are held in memory (max MAX_UPLOAD_MB each) so their content can be checked BEFORE anything touches the disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
    files: 1,
    fields: 10,
    fieldSize: 10_000,
  },
});

/** Accepts one file in the form field named "file". */
export const uploadSingleFile = upload.single('file');
