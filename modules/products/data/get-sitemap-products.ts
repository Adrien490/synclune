import { cacheLife, cacheTag } from "next/cache";
import { logger } from "@/shared/lib/logger";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

export type SitemapProduct = {
	slug: string;
	title: string;
	updatedAt: Date;
	type: { label: string } | null;
	skus: Array<{
		images: Array<{
			url: string;
			altText: string | null;
		}>;
	}>;
};

/**
 * Fetches public products with their SKU images for the image sitemap.
 * Cached with the sitemap-images tag for targeted invalidation.
 *
 * @throws Propage l'erreur DB au lieu de retourner `[]`. Un tableau vide était
 * indistinguable d'un catalogue réellement vide : la route servait alors un
 * `<urlset>` vide avec `s-maxage=86400`, désindexant tout le catalogue de Google
 * Images pendant 24 h sur un simple incident DB. L'appelant répond 503 + no-store.
 * `"use cache"` ne met pas en cache une promesse rejetée : le prochain hit retente.
 */
export async function getSitemapProducts(): Promise<SitemapProduct[]> {
	"use cache";
	cacheLife("reference");
	cacheTag(SHARED_CACHE_TAGS.SITEMAP_IMAGES);

	try {
		return await prisma.product.findMany({
			where: {
				status: "PUBLIC",
				...notDeleted,
			},
			select: {
				slug: true,
				title: true,
				updatedAt: true,
				type: {
					select: {
						label: true,
					},
				},
				skus: {
					where: {
						isActive: true,
						deletedAt: null,
					},
					select: {
						images: {
							where: {
								mediaType: "IMAGE",
							},
							select: {
								url: true,
								altText: true,
							},
							// Ordre canonique (position, id) : Google privilégie la première
							// `<image:image>` d'une `<url>` comme visuel représentatif — le
							// rang 0 est donc l'image représentative du SKU.
							orderBy: [{ position: "asc" }, { id: "asc" }],
						},
					},
				},
			},
		});
	} catch (error) {
		logger.error("Failed to fetch sitemap products", error, { service: "getSitemapProducts" });
		// Rethrow : cf. JSDoc — un `[]` silencieux se ferait cacher 24 h par le CDN.
		throw error;
	}
}
