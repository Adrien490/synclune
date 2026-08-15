import { BusinessError } from "@/shared/lib/actions";

/**
 * Garantit qu'un produit PUBLIC conserve au moins 1 VARIANT actif
 * apres une desactivation/suppression.
 *
 * Regle metier: un produit visible storefront (status=PUBLIC) sans variante
 * achetable affiche une page produit cassee.
 */

export type ProductPublicActiveCheck = {
	productStatus: string;
	activeTotal: number;
	activeAffected: number;
};

/** VARIANT tombé à 0 et candidat à la désactivation automatique post-vente. */
export type DeactivationCandidate = {
	variantId: string;
	productId: string;
	productStatus: string;
};

export function assertPublicProductKeepsActiveVariant(
	check: ProductPublicActiveCheck,
	messageOverride?: string,
): void {
	if (check.productStatus !== "PUBLIC") return;
	if (check.activeTotal - check.activeAffected >= 1) return;

	throw new BusinessError(
		messageOverride ??
			"Impossible de desactiver la derniere variante active d'un produit PUBLIC. " +
				"Veuillez activer une autre variante ou mettre le produit en DRAFT.",
	);
}

/**
 * Variante NON levante du même invariant, pour les chemins automatiques.
 *
 * `assertPublicProductKeepsActiveVariant` ci-dessus n'est opposable qu'à un humain :
 * elle lève, et ses deux appelants sont des Server Actions admin. Le webhook
 * d'encaissement, lui, désactive les VARIANT tombés à 0 après la vente — il ne peut
 * pas « refuser » l'encaissement, donc il a besoin de *filtrer* plutôt que de
 * lever. Sans ce filtre, vendre la dernière unité d'un produit mono-VARIANT laissait
 * un produit PUBLIC sans aucun VARIANT actif : `GET_PRODUCT_SELECT` filtre
 * `active: true`, la PDP fait alors `notFound()`, et comme
 * `buildProductWhereClause` n'exige nulle part un VARIANT actif, la carte restait en
 * grille → **lien interne cassé** + URL indexée qui 404, sans retour possible
 * hors réactivation manuelle.
 *
 * Le VARIANT épargné reste actif à `stock: 0` : c'est l'état que la vitrine sait
 * déjà rendre (« rupture de stock »), `isVariantAvailable` exigeant `stock > 0`
 * et add-to-cart rejetant sous `FOR UPDATE`. La surface « prévenez-moi » de la
 * wishlist reste donc atteignable, ce qui est tout l'intérêt.
 *
 * @param candidates VARIANT tombés à 0 et encore actifs, avec le statut de leur produit
 * @param activeTotalByProductId nombre de VARIANT actifs (non soft-deleted) par produit,
 *   lu AVANT toute désactivation
 * @returns les ids réellement désactivables, triés (déterminisme)
 */
export function selectDeactivatableVariantIds(
	candidates: readonly DeactivationCandidate[],
	activeTotalByProductId: ReadonlyMap<string, number>,
): string[] {
	const byProductId = new Map<string, DeactivationCandidate[]>();
	for (const candidate of candidates) {
		const group = byProductId.get(candidate.productId);
		if (group) group.push(candidate);
		else byProductId.set(candidate.productId, [candidate]);
	}

	const deactivatable: string[] = [];

	for (const [productId, group] of byProductId) {
		// Un produit non PUBLIC n'a pas de vitrine à protéger.
		if (group[0]!.productStatus !== "PUBLIC") {
			deactivatable.push(...group.map((c) => c.variantId));
			continue;
		}

		// À défaut de total connu, on suppose que le groupe EST la totalité des VARIANT
		// actifs : l'hypothèse prudente, celle qui épargne un VARIANT.
		const activeTotal = activeTotalByProductId.get(productId) ?? group.length;
		if (activeTotal - group.length >= 1) {
			// Un frère actif survit : tout le groupe peut tomber.
			deactivatable.push(...group.map((c) => c.variantId));
			continue;
		}

		// Sinon on en épargne exactement un. Choix par id croissant plutôt que par
		// rang : le représentant (rang 0) n'est pas garanti d'être dans le groupe,
		// et l'ordre lexicographique est stable d'un run à l'autre (rejouabilité
		// d'un webhook).
		const [, ...sacrificeable] = [...group].sort((a, b) => a.variantId.localeCompare(b.variantId));
		deactivatable.push(...sacrificeable.map((c) => c.variantId));
	}

	return deactivatable.sort();
}

// `assertBulkPublicProductsKeepActiveVariant` + `BulkProductActiveBreakdown` retirés
// (audit « Admin catalogue » 2026-07-26) : reliquat du retrait de la machinerie
// bulk / multi-select, aucun appelant hors tests.
