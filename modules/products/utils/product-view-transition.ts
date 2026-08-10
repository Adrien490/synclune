/**
 * `view-transition-name` du visuel produit — SSOT du morph carte → PDP.
 *
 * Deux invariants, dont aucun n'est vérifiable par le typage :
 *
 * 1. **Égalité** : la photo de `ProductCard` et la première slide de la galerie
 *    PDP (`modules/media/components/gallery/gallery.tsx`) doivent porter le
 *    MÊME nom — c'est cette égalité qui déclenche le morph à la navigation.
 *    Avant cette SSOT, chaque fichier écrivait son propre littéral
 *    `product-${id}`, alignés par un commentaire croisé que rien ne gardait
 *    (audit ProductCard 2026-08-08).
 * 2. **Unicité par document** : deux éléments portant le même
 *    `view-transition-name` dans un même DOM font échouer TOUTE la view
 *    transition, silencieusement (`ViewTransition` skipped). Un produit ne
 *    doit donc apparaître que dans UNE grille par page — les pages actuelles
 *    le garantissent structurellement (une grille produit par route ; la
 *    galerie PDP ne nomme que le produit courant, absent de « Produits
 *    similaires »).
 *
 * Verrouillé par `product-view-transition.regression.test.ts` (les deux
 * consommateurs importent la SSOT, aucun littéral résiduel).
 */
export function productViewTransitionName(productId: string): string {
	return `product-${productId}`;
}
