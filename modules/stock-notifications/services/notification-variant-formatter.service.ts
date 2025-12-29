/**
 * Service de formatage des variantes pour les notifications de stock
 *
 * Contient la logique métier de construction des descriptions de variantes
 */

/**
 * Construit une description lisible des variantes d'un SKU
 *
 * @param color - Nom de la couleur (optionnel)
 * @param material - Nom du matériau (optionnel)
 * @param size - Taille (optionnel)
 * @returns Description des variantes formatée (ex: "Or / Argent 925 / 52") ou null si aucune variante
 *
 * @example
 * ```typescript
 * formatVariantDescription("Or", "Argent 925", "52"); // "Or / Argent 925 / 52"
 * formatVariantDescription("Or", null, null); // "Or"
 * formatVariantDescription(null, null, null); // null
 * ```
 */
export function formatVariantDescription(
	color: string | null | undefined,
	material: string | null | undefined,
	size: string | null | undefined
): string | null {
	const variantParts = [color, material, size].filter(Boolean);
	return variantParts.length > 0 ? variantParts.join(" / ") : null;
}

/**
 * Construit une description de variante à partir d'un objet SKU
 *
 * @param sku - Objet SKU avec color, material et size
 * @returns Description formatée ou null
 */
export function formatSkuVariantDescription(sku: {
	color?: { name: string } | null;
	material?: { name: string } | null;
	size?: string | null;
}): string | null {
	return formatVariantDescription(
		sku.color?.name ?? null,
		sku.material?.name ?? null,
		sku.size ?? null
	);
}
