import { cacheReviewableProducts } from "../constants/cache";
import { prisma } from "@/shared/lib/prisma";
import { checkReviewEligibility } from "../services/eligibility.service";
import type { CanReviewResult } from "../types/review.types";

/**
 * Vérifie si un utilisateur peut laisser un avis sur un produit (lecture cachée UI).
 *
 * Conditions requises (déléguées à `checkReviewEligibility`) :
 * 1. L'utilisateur n'a pas déjà laissé un avis sur ce produit
 * 2. L'utilisateur a commandé ce produit
 * 3. La commande a été livrée (DELIVERED)
 *
 * ⚠ Pour une mutation (Server Action), utiliser `checkReviewEligibility(prisma, ...)`
 * directement afin d'éviter une décision d'autorisation basée sur cache stale.
 * Voir audit reviews 2026-05-11 P1.8.
 *
 * @param userId - ID de l'utilisateur
 * @param productId - ID du produit
 * @returns Résultat avec raison si refus
 */
export async function canUserReviewProduct(
	userId: string,
	productId: string,
): Promise<CanReviewResult> {
	"use cache: private";
	cacheReviewableProducts(userId);

	return checkReviewEligibility(prisma, userId, productId);
}
