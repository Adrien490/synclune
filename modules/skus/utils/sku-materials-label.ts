/**
 * Helpers d'affichage pour la relation M2M ProductSku <-> Material.
 *
 * L'ordre des matériaux dans le tableau reflète la priorité saisie côté admin :
 * - position[0] = matériau principal (utilisé pour SEO / Schema.org / care-tips)
 * - position[1..N] = matériaux secondaires
 *
 * Les requêtes Prisma doivent toujours inclure `orderBy: { position: "asc" }`
 * sur la relation `materials` pour garantir cet invariant côté front.
 */

type SkuMaterialEntry = {
	material: {
		name: string;
	};
};

type SkuMaterialsInput = readonly SkuMaterialEntry[] | null | undefined;

/**
 * Retourne le label compact joint des matériaux d'un SKU, ordre = priorité.
 *
 * @example
 * getSkuMaterialsLabel([{ material: { name: "Verre" } }, { material: { name: "Acier" } }])
 * // → "Verre, Acier"
 *
 * @returns `null` si aucun matériau, sinon les noms joints par ", ".
 */
export function getSkuMaterialsLabel(materials: SkuMaterialsInput): string | null {
	if (!materials || materials.length === 0) return null;
	return materials.map((m) => m.material.name).join(", ");
}

/**
 * Retourne le matériau principal (1er de la liste).
 * Utilisé pour SEO (JSON-LD `material`) et care-tips où un seul matériau a du sens.
 *
 * @returns `null` si aucun matériau, sinon le nom du 1er.
 */
export function getPrimaryMaterialName(materials: SkuMaterialsInput): string | null {
	return materials?.[0]?.material.name ?? null;
}

/**
 * Retourne la liste plate des noms de matériaux (ordre préservé).
 * Utile pour itérer (chips, badges, care-tips multi-critères).
 */
export function getMaterialNames(materials: SkuMaterialsInput): string[] {
	if (!materials || materials.length === 0) return [];
	return materials.map((m) => m.material.name);
}
