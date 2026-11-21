import { createReadStream } from 'node:fs';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Readable } from 'node:stream';
import type { StorageDriver } from './types.js';

/** Stores files on the local disk under one root folder (outside anything served publicly). */
export class LocalStorage implements StorageDriver {
  private readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  /** Maps a key to a file path and refuses anything that would land outside the root folder. */
  private resolve(key: string) {
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) throw new Error('Invalid storage key');
    return full;
  }

  async save(key: string, data: Buffer) {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data, { flag: 'wx' }); // "wx": fail instead of overwriting
  }

  async read(key: string): Promise<Readable> {
    const full = this.resolve(key);
    await stat(full); // throws ENOENT now, rather than half-way through the response
    return createReadStream(full);
  }

  async remove(key: string) {
    try {
      await unlink(this.resolve(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}
