/**
 * Helpers d'affichage du matériau d'une variante.
 *
 * Schéma lean (lot 2) : une variante porte UN matériau (FK nullable) — les
 * helpers acceptent l'objet direct.
 */

type MaterialInput = { name: string } | null | undefined;

/** Nom du matériau de la variante, ou null. */
export function getPrimaryMaterialName(material: MaterialInput): string | null {
	return material?.name ?? null;
}

/** Label du matériau (identique au nom — conservé pour parité d'API). */
export function getVariantMaterialsLabel(material: MaterialInput): string | null {
	return material?.name ?? null;
}

/** Liste plate des noms (0 ou 1 élément depuis le schéma lean). */
export function getMaterialNames(material: MaterialInput): string[] {
	return material ? [material.name] : [];
}
