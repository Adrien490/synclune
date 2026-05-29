/**
 * Formate le compteur de sélection bulk en français avec pluralisation correcte.
 *
 * SSOT partagée entre `MobileSelectionHeader` (branche count simple) et
 * `BulkSelectionToolbar` (présentation inline). Évite la duplication de la
 * logique singulier/pluriel + accord du participe « sélectionné(s) ».
 *
 * @example
 * formatSelectionCount(1, { singular: "produit", plural: "produits" })
 * // → "1 produit sélectionné"
 * formatSelectionCount(3, { singular: "produit", plural: "produits" })
 * // → "3 produits sélectionnés"
 */
export function formatSelectionCount(
	count: number,
	itemsLabel: { singular: string; plural: string },
): string {
	const label = count > 1 ? itemsLabel.plural : itemsLabel.singular;
	return `${count} ${label} sélectionné${count > 1 ? "s" : ""}`;
}
