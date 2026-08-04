/**
 * Géométrie de la grille du catalogue — SSOT partagée entre le shell, la liste
 * et leurs squelettes.
 *
 * @description
 * Direction « L'étal continue » (2026-08-05) : le bloc titre, les cartes, l'état
 * vide et la pagination sont tous des CELLULES de la même grille. Les classes
 * ci-dessous sont donc lues par quatre fichiers ; les écrire à la main dans
 * chacun laisserait le squelette dériver de la grille réelle au premier
 * changement de gouttière — c'est exactement ce qui produisait un saut de layout
 * sur la page dont le CLS est budgété en CI.
 */

/**
 * La grille elle-même.
 *
 * Plafonnée à 4 colonnes, **sans palier `2xl:`** : le conteneur est capé à
 * `max-w-6xl` (1152 px) et ne grandit pas au-delà, donc un palier de plus
 * répartit le même espace en plus de parts (`2xl:grid-cols-5` faisait tomber les
 * cartes de 248 à 192 px). `items-start` : deux cartes d'une même rangée ne se
 * réalignent pas sur la plus haute — un étal n'est pas justifié.
 */
export const CATALOG_GRID =
	"grid grid-cols-2 items-start gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-8";

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
 * éteindrait aussi le bloc titre et son compteur — or c'est précisément le
 * compteur qu'on veut voir changer. Le hook est `data-pending`, publié par
 * `SearchInput` et `SelectFilter` sur `group/container` (`product-catalog.tsx`).
 */
export const CATALOG_PENDING_DIM =
	"transition-[opacity,filter,transform] duration-300 ease-out group-has-[[data-pending]]/container:pointer-events-none group-has-[[data-pending]]/container:scale-[0.98] group-has-[[data-pending]]/container:opacity-40 group-has-[[data-pending]]/container:blur-[2px]";
