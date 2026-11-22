import { env } from '../config/env.js';
import { userRepository } from '../repositories/user.repository.js';

/** `null` = the user no longer exists. */
export type AuthState = { passwordChangedAt: number | null } | null;

const MAX_ENTRIES = 10_000;
const cache = new Map<string, { state: AuthState; at: number }>();

/**
 * Whether a user still exists and when their password last changed. Remembered briefly so a busy user does not cost
 * a database query on every click. After a password change on THIS server it is refreshed immediately;
 * other servers notice within AUTH_STATE_CACHE_SECONDS.
 */
export async function getAuthState(userId: string): Promise<AuthState> {
  const ttl = env.AUTH_STATE_CACHE_SECONDS * 1000;
  const hit = cache.get(userId);
  if (hit && ttl > 0 && Date.now() - hit.at < ttl) return hit.state;

  const row = await userRepository.findAuthState(userId);
  const state: AuthState = row ? { passwordChangedAt: row.passwordChangedAt?.getTime() ?? null } : null;

  if (ttl > 0) {
    if (cache.size >= MAX_ENTRIES) cache.clear(); // simple bound so memory can't grow forever
    cache.set(userId, { state, at: Date.now() });
  }
  return state;
}

export function invalidateAuthState(userId: string) {
  cache.delete(userId);
}
