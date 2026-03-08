"use server";

import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";
import { COLLECTIONS_CACHE_TAGS } from "@/modules/collections/constants/cache";

/**
 * Fetches collections associated with a specific product
 */
export async function getProductCollections(
	productId: string,
): Promise<{ id: string; name: string }[]> {
	return fetchProductCollections(productId);
}

/**
 * Fetches all available collections
 */
export async function getAllCollections(): Promise<{ id: string; name: string }[]> {
	return fetchAllCollections();
}

async function fetchProductCollections(productId: string): Promise<{ id: string; name: string }[]> {
	"use cache";
	cacheLife("products");
	cacheTag(COLLECTIONS_CACHE_TAGS.LIST);

	try {
		const productCollections = await prisma.productCollection.findMany({
			where: { productId },
			select: {
				collection: {
					select: { id: true, name: true },
				},
			},
		});

		return productCollections.map((pc) => ({
			id: pc.collection.id,
			name: pc.collection.name,
		}));
	} catch (error) {
		logger.error("Failed to fetch product collections", error, {
			service: "fetchProductCollections",
		});
		return [];
	}
}

async function fetchAllCollections(): Promise<{ id: string; name: string }[]> {
	"use cache";
	cacheLife("collections");
	cacheTag(COLLECTIONS_CACHE_TAGS.LIST);

	try {
		const collections = await prisma.collection.findMany({
			select: { id: true, name: true },
			orderBy: { name: "asc" },
		});

		return collections;
	} catch (error) {
		logger.error("Failed to fetch all collections", error, { service: "fetchAllCollections" });
		return [];
	}
}
