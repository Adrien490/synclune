import { cacheLife, cacheTag } from "next/cache";

import { prisma } from "@/shared/lib/prisma";
import { DISCOUNT_CACHE_TAGS } from "../constants/cache";

type DiscountUsageCountsParams = {
	discountId: string;
	userId?: string;
	customerEmail?: string;
};

type DiscountUsageCountsResult = {
	userCount: number;
	emailCount: number;
};

/**
 * Récupère les compteurs d'utilisation d'un code promo
 * - userCount: nombre d'utilisations par l'utilisateur connecté
 * - emailCount: nombre d'utilisations par email (guest checkout)
 */
export async function getDiscountUsageCounts(
	params: DiscountUsageCountsParams,
): Promise<DiscountUsageCountsResult> {
	// Cache PUBLIC assumé (audit cache 2026-07-31). `userId`/`customerEmail` sont
	// des ARGUMENTS, donc partie intégrante de la clé de cache Next (« build ID +
	// hash de la fonction + arguments sérialisés + variables de closure ») : deux
	// clients ne peuvent pas se voir servir l'entrée de l'autre. Le tag, lui, n'est
	// pas la clé — c'est la confusion qui avait fait choisir `private` partout
	// (cf. `modules/auth/data/get-session.ts`).
	//
	// Ce qui est gagné : `private` n'est JAMAIS stocké côté serveur, donc ces deux
	// `count()` repartaient en base à chaque rendu — sur le chemin checkout, le plus
	// chaud du site.
	"use cache";

	cacheLife("checkout");
	cacheTag(DISCOUNT_CACHE_TAGS.USAGE(params.discountId));

	const { discountId, userId, customerEmail } = params;

	let userCount = 0;
	let emailCount = 0;

	if (userId) {
		userCount = await prisma.discountUsage.count({
			where: {
				discountId,
				userId,
			},
		});
	}

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

	return { userCount, emailCount };
}
