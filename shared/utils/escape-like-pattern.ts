/**
 * Échappe les métacaractères LIKE (`%`, `_`, `\`) d'un terme de recherche.
 *
 * Prisma `contains` NE les échappe PAS : le terme part tel quel en paramètre
 * d'un `ILIKE ('%' || $1 || '%')` (vérifié empiriquement sur Prisma 7.9,
 * adapter pg — audit recherche 2026-08-01, P3-3). Un `%` saisi dans un champ
 * de recherche admin matchait donc tout, et un `_` n'importe quel caractère :
 * résultats faux + scan élargi. Pas d'injection (paramétré), mais faux.
 *
 * Le caractère d'échappement LIKE par défaut de Postgres est le backslash :
 * pré-échapper ici suffit, sans clause `ESCAPE`.
 *
 * SSOT — consommé par les query builders admin (`contains`) ET par le SQL brut
 * du fuzzy search (via le re-export de `modules/products/utils/search-helpers`).
 */
export function escapeLikePattern(term: string): string {
	return term.replace(/[%_\\]/g, "\\$&");
}
