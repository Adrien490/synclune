"use server";

import { prisma } from "@/shared/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";
import { COLLECTIONS_CACHE_TAGS } from "@/modules/collections/constants/cache";

/**
 * Fetches collections associated with a specific product
 */
export async function getProductCollections(
	productId: string
): Promise<{ id: string; name: string }[]> {
	return fetchProductCollections(productId);
}

/**
 * Fetches all available collections
 */
export async function getAllCollections(): Promise<
	{ id: string; name: string }[]
> {
	return fetchAllCollections();
}

async function fetchProductCollections(
	productId: string
): Promise<{ id: string; name: string }[]> {
	"use cache";
	cacheLife("products");
	cacheTag(COLLECTIONS_CACHE_TAGS.LIST);

	const productCollections = await prisma.productCollection.findMany({
		where: { productId },
		include: {
			collection: {
				select: { id: true, name: true },
			},
		},
	});

	return productCollections.map((pc) => ({
		id: pc.collection.id,
		name: pc.collection.name,
	}));
}

async function fetchAllCollections(): Promise<
	{ id: string; name: string }[]
> {
	"use cache";
	cacheLife("collections");
	cacheTag(COLLECTIONS_CACHE_TAGS.LIST);

	const collections = await prisma.collection.findMany({
		select: { id: true, name: true },
		orderBy: { name: "asc" },
	});

	return collections;
}
