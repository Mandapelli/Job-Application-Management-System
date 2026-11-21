import path from 'node:path';
import { env } from '../../config/env.js';
import { LocalStorage } from './local.js';
import type { StorageDriver } from './types.js';

let instance: StorageDriver | undefined;

/** The storage backend chosen by STORAGE_DRIVER. Created on first use. */
export function getStorage(): StorageDriver {
  instance ??= createStorage();
  return instance;
}

function createStorage(): StorageDriver {
  if (env.STORAGE_DRIVER === 's3') {
    // Future work: implement StorageDriver with the AWS SDK (PutObject / GetObject / DeleteObject) and return it here.
    throw new Error('STORAGE_DRIVER=s3 is not implemented yet. Use STORAGE_DRIVER=local.');
  }
  return new LocalStorage(path.resolve(process.cwd(), env.UPLOAD_DIR));
}

export type { StorageDriver } from './types.js';
