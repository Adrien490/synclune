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

export type BulkProductActiveBreakdown = Map<
	string,
	{
		productStatus: string;
		activeTotal: number;
		activeAffected: number;
	}
>;

export function assertBulkPublicProductsKeepActiveSku(breakdown: BulkProductActiveBreakdown): void {
	for (const [, data] of breakdown) {
		assertPublicProductKeepsActiveSku({
			productStatus: data.productStatus,
			activeTotal: data.activeTotal,
			activeAffected: data.activeAffected,
		});
	}
}
