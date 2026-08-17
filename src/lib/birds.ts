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

/**
 * Kategori A-C together make up Sveriges officiella fågellista. D (uncertain
 * origin) and E (escapes and introductions) are listed alongside them but are
 * not part of it.
 */
export function isOfficial(bird: Pick<Bird, 'kategori'>): boolean {
  return bird.kategori === 'A' || bird.kategori === 'B' || bird.kategori === 'C';
}

/** Sverigelistan lists subspecies alongside species; these are the subspecies. */
export function isSubspecies(bird: Pick<Bird, 'parentId'>): boolean {
  return bird.parentId !== null;
}

/** Explanations shown as tooltips on the badges the predicates above drive. */
export const RARITY_TOOLTIP = 'Raritet: färre än 100 fynd i Sverige';
export const INTRODUCED_TOOLTIP =
  'Introducerad: förvildad eller införd art, som inte tagit sig hit på egen vinge';
