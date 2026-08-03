import { cacheLife, cacheTag } from "next/cache";

import { prisma } from "@/shared/lib/prisma";
import { DISCOUNT_CACHE_TAGS } from "../constants/cache";

type DiscountUsageCountsParams = {
	discountId: string;
	customerEmail?: string;
};

type DiscountUsageCountsResult = {
	emailCount: number;
};

/**
 * Récupère le compteur d'utilisation d'un code promo par email de commande —
 * seule identité de la limite `maxUsagePerUser` depuis le retrait de
 * `DiscountUsage.userId` (Lot 0 S1.5, parcours 100 % invité).
 */
export async function getDiscountUsageCounts(
	params: DiscountUsageCountsParams,
): Promise<DiscountUsageCountsResult> {
	// Cache PUBLIC assumé (audit cache 2026-07-31). `customerEmail` est
	// un ARGUMENT, donc partie intégrante de la clé de cache Next (« build ID +
	// hash de la fonction + arguments sérialisés + variables de closure ») : deux
	// clients ne peuvent pas se voir servir l'entrée de l'autre. Le tag, lui, n'est
	// pas la clé — c'est la confusion qui avait fait choisir `private` partout
	// (cf. `modules/auth/data/get-session.ts`).
	//
	// Ce qui est gagné : `private` n'est JAMAIS stocké côté serveur, donc ce
	// `count()` repartait en base à chaque rendu — sur le chemin checkout, le plus
	// chaud du site.
	"use cache";

	cacheLife("checkout");
	cacheTag(DISCOUNT_CACHE_TAGS.USAGE(params.discountId));

	const { discountId, customerEmail } = params;

	let emailCount = 0;

	if (customerEmail) {
		emailCount = await prisma.discountUsage.count({
			where: {
				discountId,
				order: {
					customerEmail,
				},
			},
		});
	}

	return { emailCount };
}
