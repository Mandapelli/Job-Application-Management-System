import type { Readable } from 'node:stream';

/**
 * Where uploaded file bytes live. The app only talks to this interface, so moving from local disk to
 * AWS S3 later means adding one S3 implementation and changing STORAGE_DRIVER. Nothing else changes.
 */
export interface StorageDriver {
  /** Stores the bytes under `key` (a server-generated name). Never overwrites an existing key. */
  save(key: string, data: Buffer): Promise<void>;
  /** Opens the stored file for reading. Throws an error with code "ENOENT" if it does not exist. */
  read(key: string): Promise<Readable>;
  /** Deletes the stored file. Deleting a file that is already gone is not an error. */
  remove(key: string): Promise<void>;
}
