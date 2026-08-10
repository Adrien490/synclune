import { BusinessError } from "@/shared/lib/actions";

/**
 * Garantit qu'un produit PUBLIC conserve au moins 1 SKU actif
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

/** SKU tombé à 0 et candidat à la désactivation automatique post-vente. */
export type DeactivationCandidate = {
	skuId: string;
	productId: string;
	productStatus: string;
};

export function assertPublicProductKeepsActiveSku(
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
 * `assertPublicProductKeepsActiveSku` ci-dessus n'est opposable qu'à un humain :
 * elle lève, et ses deux appelants sont des Server Actions admin. Le webhook
 * d'encaissement, lui, désactive les SKU tombés à 0 après la vente — il ne peut
 * pas « refuser » l'encaissement, donc il a besoin de *filtrer* plutôt que de
 * lever. Sans ce filtre, vendre la dernière unité d'un produit mono-SKU laissait
 * un produit PUBLIC sans aucun SKU actif : `GET_PRODUCT_SELECT` filtre
 * `isActive: true`, la PDP fait alors `notFound()`, et comme
 * `buildProductWhereClause` n'exige nulle part un SKU actif, la carte restait en
 * grille → **lien interne cassé** + URL indexée qui 404, sans retour possible
 * hors réactivation manuelle.
 *
 * Le SKU épargné reste actif à `inventory: 0` : c'est l'état que la vitrine sait
 * déjà rendre (« rupture de stock »), `isSkuAvailable` exigeant `inventory > 0`
 * et add-to-cart rejetant sous `FOR UPDATE`. La surface « prévenez-moi » de la
 * wishlist reste donc atteignable, ce qui est tout l'intérêt.
 *
 * @param candidates SKU tombés à 0 et encore actifs, avec le statut de leur produit
 * @param activeTotalByProductId nombre de SKU actifs (non soft-deleted) par produit,
 *   lu AVANT toute désactivation
 * @returns les ids réellement désactivables, triés (déterminisme)
 */
export function selectDeactivatableSkuIds(
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
			deactivatable.push(...group.map((c) => c.skuId));
			continue;
		}

		// À défaut de total connu, on suppose que le groupe EST la totalité des SKU
		// actifs : l'hypothèse prudente, celle qui épargne un SKU.
		const activeTotal = activeTotalByProductId.get(productId) ?? group.length;
		if (activeTotal - group.length >= 1) {
			// Un frère actif survit : tout le groupe peut tomber.
			deactivatable.push(...group.map((c) => c.skuId));
			continue;
		}

		// Sinon on en épargne exactement un. Choix par id croissant plutôt que par
		// rang : le représentant (rang 0) n'est pas garanti d'être dans le groupe,
		// et l'ordre lexicographique est stable d'un run à l'autre (rejouabilité
		// d'un webhook).
		const [, ...sacrificeable] = [...group].sort((a, b) => a.skuId.localeCompare(b.skuId));
		deactivatable.push(...sacrificeable.map((c) => c.skuId));
	}

	return deactivatable.sort();
}

// `assertBulkPublicProductsKeepActiveSku` + `BulkProductActiveBreakdown` retirés
// (audit « Admin catalogue » 2026-07-26) : reliquat du retrait de la machinerie
// bulk / multi-select, aucun appelant hors tests.
