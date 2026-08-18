import { createSignal } from 'solid-js';
import type { ListWithDetails } from './types';
import { lists as listsApi } from './api';

const [userLists, setUserLists] = createSignal<ListWithDetails[]>([]);

export { userLists };

/**
 * Reload the user's lists, keeping what is already loaded if the request
 * fails.
 *
 * Clearing on failure meant one transient error emptied a data set the user
 * owns. Everything reads this signal — the sidebar's "Listor" section, and the
 * list chips in the quick-add, edit and bulk-edit sheets — and the only
 * unprompted caller re-runs on a change of login state, so nothing refetched.
 * On desktop, where the sidebar is permanently on screen, "Inga listor" then
 * stayed wrong for the rest of the session.
 *
 * Stale lists are strictly better than none: the failure modes are being
 * offline or a server error, and in both cases the previous set is still the
 * best answer available.
 *
 * Nothing needs to clear this explicitly — signing out and the 401 handler both
 * reload the page, which discards the signal with everything else.
 */
export async function refreshLists(): Promise<void> {
  try {
    setUserLists(await listsApi.getAll());
  } catch {
    // Keep the previously loaded lists.
  }
}
