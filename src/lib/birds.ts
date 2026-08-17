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

/** Species id -> how many of its subspecies are in the given list. */
function subspeciesCounts(birds: Bird[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const bird of birds) {
    if (!bird.parentId) continue;
    counts.set(bird.parentId, (counts.get(bird.parentId) ?? 0) + 1);
  }
  return counts;
}

/**
 * The taxa to offer when picking a bird.
 *
 * With subspecies hidden, only species are offered. With them shown, a species
 * is dropped when it has exactly one subspecies — the two are then the same bird
 * written twice (grågås / västlig grågås), and they always share a status.
 *
 * A species with several subspecies is kept, because a bird often cannot be
 * identified to subspecies in the field and has to be logged as the species;
 * Sverigelistan makes the same allowance with its own "obest." rows. A species
 * with no listed subspecies is kept because nothing else represents it.
 */
export function selectableTaxa(birds: Bird[], showSubspecies: boolean): Bird[] {
  if (!showSubspecies) return birds.filter(bird => !isSubspecies(bird));
  const counts = subspeciesCounts(birds);
  return birds.filter(bird => isSubspecies(bird) || counts.get(bird.id) !== 1);
}

/** Explanations shown as tooltips on the badges the predicates above drive. */
export const RARITY_TOOLTIP = 'Raritet: färre än 100 fynd i Sverige';
export const INTRODUCED_TOOLTIP =
  'Introducerad: förvildad eller införd art, som inte tagit sig hit på egen vinge';
export const SUBSPECIES_TOOLTIP =
  'Underart: en av flera former av arten, som Sverigelistan listar separat';
