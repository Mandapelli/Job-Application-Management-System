import path from 'node:path';

export type DocumentKind = { ext: 'pdf' | 'doc' | 'docx'; mime: string };

const MIME: Record<DocumentKind['ext'], string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const startsWith = (buf: Buffer, bytes: number[]) => bytes.every((b, i) => buf[i] === b);

/**
 * Decides what a file really is by looking at its bytes, never at what the upload claims to be.
 * Returns null unless the content is a PDF, DOC or DOCX AND the file name's extension agrees.
 * (A DOC check can't tell Word from other old Office formats; the extension rule narrows it down.)
 */
export function sniffDocument(buf: Buffer, fileName: string): DocumentKind | null {
  const ext = path.extname(fileName).slice(1).toLowerCase();

  if (ext === 'pdf' && buf.subarray(0, 1024).includes('%PDF-')) {
    return { ext: 'pdf', mime: MIME.pdf };
  }
  // Legacy Word: OLE2 compound file signature.
  if (ext === 'doc' && startsWith(buf, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    return { ext: 'doc', mime: MIME.doc };
  }
  // DOCX is a ZIP ("PK") that contains a Word document part. Other ZIPs (xlsx, jar, plain zip) are rejected.
  if (
    ext === 'docx' &&
    startsWith(buf, [0x50, 0x4b, 0x03, 0x04]) &&
    buf.includes('[Content_Types].xml') &&
    buf.includes('word/')
  ) {
    return { ext: 'docx', mime: MIME.docx };
  }
  return null;
}

/** Browsers send UTF-8 names that multer may read as Latin-1 ("RÃ©sumÃ©"); undo that when it round-trips cleanly. */
export function fixNameEncoding(name: string): string {
  if (/[^\u0000-\u00ff]/.test(name)) return name; // already real Unicode
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  return decoded.includes('\uFFFD') ? name : decoded;
}

/** A safe display/download name: no folders, no control or reserved characters, bounded length. */
export function sanitizeFileName(raw: string): string {
  const base = raw.replace(/\\/g, '/').split('/').pop() ?? '';
  const cleaned = base
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '_')
    .replace(/^\.+/, '') // no hidden / dot-only names
    .trim();
  const ext = path.extname(cleaned);
  const stem = cleaned.slice(0, cleaned.length - ext.length).slice(0, 200);
  return stem ? `${stem}${ext}` : `document${ext}`;
}

/** Content-Disposition for downloads: forces a download, with an ASCII fallback plus the real UTF-8 name. */
export function attachmentHeader(fileName: string): string {
  const fallback = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
