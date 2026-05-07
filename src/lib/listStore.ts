import { createSignal } from 'solid-js';
import type { ListWithDetails } from './types';
import { lists as listsApi } from './api';

const [userLists, setUserLists] = createSignal<ListWithDetails[]>([]);

export { userLists };

export async function refreshLists(): Promise<void> {
  try {
    const data = await listsApi.getAll();
    setUserLists(data);
  } catch {
    setUserLists([]);
  }
}
