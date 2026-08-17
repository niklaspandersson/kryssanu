import type { Bird } from './types';

/** Rarities are the taxa Sverigelistan marks with status R (<100 fynd). */
export function isRarity(bird: Pick<Bird, 'status'>): boolean {
  return bird.status === 'R';
}

/**
 * Fyndkategori E: escaped or introduced birds, rather than ones that reached
 * Sweden under their own steam. Equivalent to status 'I', which is the value we
 * give every E taxon.
 */
export function isIntroduced(bird: Pick<Bird, 'kategori'>): boolean {
  return bird.kategori === 'E';
}

/** Sverigelistan lists subspecies alongside species; these are the subspecies. */
export function isSubspecies(bird: Pick<Bird, 'parentId'>): boolean {
  return bird.parentId !== null;
}
