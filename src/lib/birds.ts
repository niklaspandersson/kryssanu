import type { Bird } from './types';

/** Rarities are the taxa Sverigelistan marks with status R (<100 fynd). */
export function isRarity(bird: Pick<Bird, 'status'>): boolean {
  return bird.status === 'R';
}

/** Sverigelistan lists subspecies alongside species; these are the subspecies. */
export function isSubspecies(bird: Pick<Bird, 'parentId'>): boolean {
  return bird.parentId !== null;
}
