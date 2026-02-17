import { cacheLife, cacheTag } from "next/cache";
import { CollectionStatus } from "@/app/generated/prisma/client";

import { prisma } from "@/shared/lib/prisma";
import { COLLECTIONS_CACHE_TAGS } from "../constants/cache";

/**
 * Récupère les slugs de toutes les collections publiques
 * Utilisé pour generateStaticParams (SSG)
 */
export async function getPublicCollectionSlugs(): Promise<{ slug: string }[]> {
	"use cache";

	cacheLife("collections");
	cacheTag(COLLECTIONS_CACHE_TAGS.LIST);

	try {
		const collections = await prisma.collection.findMany({
			where: { status: CollectionStatus.PUBLIC },
			select: { slug: true },
		});

		return collections;
	} catch {
		return [];
	}
}
