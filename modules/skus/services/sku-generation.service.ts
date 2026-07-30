/**
 * Service de génération de codes SKU
 *
 * Ce module contient les fonctions pures pour :
 * - Générer des codes SKU uniques
 * - Formater des codes SKU
 */

// ============================================================================
// SKU GENERATION SERVICE
// Pure functions for generating unique SKU codes
// ============================================================================

/**
 * Génère un code SKU unique
 *
 * Format : SKU-{timestamp}-{random7chars}
 * Exemple : SKU-1704067200000-A2B3C4D
 *
 * @returns Code SKU unique
 */
export function generateSkuCode(): string {
	const timestamp = Date.now();
	const randomSuffix = crypto.randomUUID().replace(/-/g, "").slice(0, 7).toUpperCase();

	return `SKU-${timestamp}-${randomSuffix}`;
}

/**
 * Génère un code SKU neuf ET libre en base.
 *
 * ⚠️ Ne PAS réutiliser `generateUniqueTechnicalName` ici : ce helper est conçu pour la
 * DUPLICATION et suffixe son tout premier candidat en `-COPY`. Employé sur un code
 * fraîchement généré, il faisait donc porter « -COPY » à **tous** les codes
 * auto-générés du catalogue — des variantes créées de zéro s'annonçaient comme des
 * copies. Pour un code neuf, la bonne réponse à une collision est un NOUVEAU tirage
 * aléatoire, pas un suffixe.
 *
 * La collision est en pratique inatteignable (timestamp ms + 7 caractères hex, soit
 * ~2,7e8 possibilités par milliseconde) ; la boucle est une ceinture, pas un chemin
 * chaud.
 *
 * @param isTaken - vérifie si un code est déjà pris (requête d'unicité)
 * @param maxAttempts - nombre de tirages avant abandon
 */
export async function generateAvailableSkuCode(
	isTaken: (candidate: string) => Promise<boolean>,
	maxAttempts = 5,
): Promise<{ success: true; name: string } | { success: false; error: string }> {
	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const candidate = generateSkuCode();
		if (!(await isTaken(candidate))) {
			return { success: true, name: candidate };
		}
	}

	return {
		success: false,
		error: `Impossible de générer un code SKU unique après ${maxAttempts} tentatives`,
	};
}
