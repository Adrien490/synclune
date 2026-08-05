/**
 * Géométrie de la grille du catalogue — SSOT partagée entre le shell, la liste
 * et leurs squelettes.
 *
 * @description
 * Les cartes, l'état vide et la pagination sont tous des CELLULES de la même
 * grille (le bloc titre, lui, vit en tête de page depuis le 2026-08-05 — il
 * n'est plus une cellule). Les classes ci-dessous sont lues par plusieurs
 * fichiers ; les écrire à la main dans chacun laisserait le squelette dériver
 * de la grille réelle au premier changement de gouttière — c'est exactement ce
 * qui produisait un saut de layout sur la page dont le CLS est budgété en CI.
 */

/**
 * La grille elle-même.
 *
 * Plafonnée à **3 colonnes**, sans palier `2xl:` : le conteneur est capé à
 * `max-w-6xl` (1152 px) et ne grandit pas au-delà, donc un palier de plus
 * répartit le même espace en plus de parts (`2xl:grid-cols-5` faisait tomber les
 * cartes de 248 à 192 px). `items-start` : deux cartes d'une même rangée ne se
 * réalignent pas sur la plus haute — un étal n'est pas justifié.
 *
 * ⚠️ **Le palier `lg:` est passé de 4 à 3 colonnes** (« Le plan de travail »,
 * 2026-08-05) : à partir de `lg`, la colonne de gauche appartient au rail de
 * filtres (16rem) — une colonne de cartes de plus les rétrécirait au lieu de les
 * élargir. C'est l'arbitrage explicite de la direction C, tranché par l'user, et
 * `catalog-grid-columns.regression.test.ts` le verrouille : rétablir 4 colonnes
 * demande de retirer le rail d'abord.
 */
export const CATALOG_GRID =
	"grid grid-cols-2 items-start gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-3 lg:gap-8";

/**
 * Une cellule qui prend la rangée entière : état vide, erreur, pagination.
 *
 * `col-span-full` et non un compte explicite — la grille change de nombre de
 * colonnes à trois breakpoints.
 */
export const CATALOG_ROW_CELL = "col-span-full";

/**
 * Grisage pendant qu'une recherche ou un filtre est en vol.
 *
 * ⚠️ Se pose **cellule par cellule**, jamais sur la grille : sur le conteneur, il
 * éteindrait aussi les cellules qui doivent rester nettes pendant le vol (la
 * suggestion de recherche, la région vivante) — et historiquement le bloc titre,
 * dont le compteur est précisément ce qu'on veut voir changer. Le hook est
 * `data-pending`, publié par `SearchInput` et `SelectFilter` sur
 * `group/container` (`product-catalog.tsx`).
 */
export const CATALOG_PENDING_DIM =
	"transition-[opacity,filter,transform] duration-300 ease-out group-has-[[data-pending]]/container:pointer-events-none group-has-[[data-pending]]/container:scale-[0.98] group-has-[[data-pending]]/container:opacity-40 group-has-[[data-pending]]/container:blur-[2px]";
