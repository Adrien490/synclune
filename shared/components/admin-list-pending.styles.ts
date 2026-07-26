/**
 * État « recherche en cours » des listes admin.
 *
 * `SearchInput` pose `data-pending` sur son `<form role="search">` pendant la
 * transition, mais cet attribut n'avait **aucun consommateur côté admin** : seuls
 * la boutique (`group/container` dans `product-catalog.tsx`) et le dialog de
 * recherche rapide (`group/search`) déclaraient un groupe. Les listes admin ne
 * montraient donc rien d'autre que les points dans le champ — aucun signal que la
 * liste affichée était en train d'être remplacée. Audit recherche 2026-07-26.
 *
 * ## Pourquoi le groupe est sur le CONTENEUR DE PAGE
 *
 * `group-has-*` compile vers `.group\/list:has(…) &` : le groupe doit être un
 * **ancêtre commun** du champ de recherche et de la liste. La toolbar est une
 * sœur de la liste, donc y poser le groupe ne porterait pas. Le conteneur de page
 * enveloppe les deux surfaces de recherche (`<Toolbar search>` desktop et le slot
 * `search` du `StickyActionBar` mobile — ce dernier rend en place, sans portail,
 * ce qui est la condition pour que `:has()` le voie).
 *
 * ## Usage
 *
 * ```tsx
 * <div className={cn(ADMIN_LIST_GROUP_CLASS, "space-y-6")}>
 *   <XBottomBar />            // slot search mobile
 *   <Toolbar search={…} />    // champ desktop
 *   <XMobileList … />         // ← ADMIN_LIST_PENDING_CLASS sur sa racine
 *   <XDataTable … />          // ← idem
 * </div>
 * ```
 *
 * Les deux constantes vont par paire : poser l'une sans l'autre ne produit rien.
 */

/** À poser sur le conteneur de page, ancêtre du champ ET de la liste. */
export const ADMIN_LIST_GROUP_CLASS = "group/list";

/**
 * À poser sur la racine de la liste (data-table desktop, mobile-list).
 *
 * Pas de `scale-*` — contrairement à la grille produit boutique : sur un tableau
 * dense, une mise à l'échelle rend le texte flou et fait sauter l'alignement des
 * colonnes. Opacité + flou suffisent à signaler « ce contenu est périmé ».
 */
export const ADMIN_LIST_PENDING_CLASS =
	"transition-[opacity,filter] duration-300 ease-out " +
	"group-has-[[data-pending]]/list:pointer-events-none " +
	"group-has-[[data-pending]]/list:opacity-40 " +
	"group-has-[[data-pending]]/list:blur-[2px]";
