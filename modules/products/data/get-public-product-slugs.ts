import { cacheLife, cacheTag } from "next/cache";

import { prisma, notDeleted } from "@/shared/lib/prisma";
import { PRODUCTS_CACHE_TAGS } from "../constants/cache";

/**
 * Récupère les slugs de tous les produits publics
 * Utilisé pour generateStaticParams (SSG)
 */
export async function getPublicProductSlugs(): Promise<{ slug: string }[]> {
	"use cache";

	cacheLife("products");
	cacheTag(PRODUCTS_CACHE_TAGS.LIST);

	const products = await prisma.product.findMany({
		where: { status: "PUBLIC", ...notDeleted },
		select: { slug: true },
	});

	return products;
}
