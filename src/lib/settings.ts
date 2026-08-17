import type { User, UserSettings } from './types';

export const DEFAULT_SETTINGS: UserSettings = {
  showSubspecies: false,
};

/**
 * The user's stored settings layered over the defaults. Any key the user has
 * never saved — including every key on a user who predates a new setting —
 * falls back, so callers never deal with undefined.
 */
export function readSettings(user: User | null | undefined): UserSettings {
  return { ...DEFAULT_SETTINGS, ...(user?.settings ?? {}) };
}
