/**
 * Helpers d'affichage du matériau d'une variante.
 *
 * Schéma lean (lot 2) : une variante porte UN matériau (FK nullable) — les
 * helpers acceptent l'objet direct.
 */

type MaterialInput = { name: string } | null | undefined;

/** Label du matériau (identique au nom — conservé pour parité d'API). */
export function getVariantMaterialsLabel(material: MaterialInput): string | null {
	return material?.name ?? null;
}
