import { SITE_URL } from "@/shared/constants/seo-config";
import { getCollections } from "@/modules/collections/data/get-collections";
import { getProductTypes } from "@/modules/product-types/data/get-product-types";
import { getProducts } from "@/modules/products/data/get-products";
import { MetadataRoute } from "next";

/**
 * Génération dynamique du sitemap pour le référencement
 * Inclut toutes les pages importantes du site : pages statiques, produits, collections, types
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	// Fixed date for static pages — only update when content actually changes
	const staticLastModified = new Date(process.env.DEPLOY_DATE ?? "2025-06-01");

	// Pages statiques avec leurs priorités et fréquences de mise à jour
	const staticPages: MetadataRoute.Sitemap = [
		{
			url: SITE_URL,
			lastModified: staticLastModified,
			changeFrequency: "weekly",
			priority: 1.0,
		},
		{
			url: `${SITE_URL}/produits`,
			lastModified: staticLastModified,
			changeFrequency: "daily",
			priority: 0.9,
		},
		{
			url: `${SITE_URL}/collections`,
			lastModified: staticLastModified,
			changeFrequency: "weekly",
			priority: 0.8,
		},
		{
			url: `${SITE_URL}/personnalisation`,
			lastModified: staticLastModified,
			changeFrequency: "monthly",
			priority: 0.6,
		},
		{
			url: `${SITE_URL}/cgv`,
			lastModified: staticLastModified,
			changeFrequency: "monthly",
			priority: 0.3,
		},
		{
			url: `${SITE_URL}/confidentialite`,
			lastModified: staticLastModified,
			changeFrequency: "monthly",
			priority: 0.3,
		},
		{
			url: `${SITE_URL}/mentions-legales`,
			lastModified: staticLastModified,
			changeFrequency: "monthly",
			priority: 0.3,
		},
		{
			url: `${SITE_URL}/informations-legales`,
			lastModified: staticLastModified,
			changeFrequency: "monthly",
			priority: 0.3,
		},
		{
			url: `${SITE_URL}/accessibilite`,
			lastModified: staticLastModified,
			changeFrequency: "monthly",
			priority: 0.3,
		},
		{
			url: `${SITE_URL}/cookies`,
			lastModified: staticLastModified,
			changeFrequency: "monthly",
			priority: 0.3,
		},
		{
			url: `${SITE_URL}/retractation`,
			lastModified: staticLastModified,
			changeFrequency: "monthly",
			priority: 0.3,
		},
	];

	// Récupérer tous les produits publics (pagination pour respecter la limite de 200)
	const allProducts: Array<{ slug: string; updatedAt: Date }> = [];
	let productCursor: string | undefined;
	let hasMoreProducts = true;

	while (hasMoreProducts) {
		const { products, pagination } = await getProducts({
			perPage: 200,
			cursor: productCursor,
			sortBy: "created-descending",
			filters: { status: "PUBLIC" },
		});
		allProducts.push(...products);
		productCursor = pagination.nextCursor ?? undefined;
		hasMoreProducts = pagination.hasNextPage;
	}

	const productPages: MetadataRoute.Sitemap = allProducts.map((product) => ({
		url: `${SITE_URL}/creations/${product.slug}`,
		lastModified: new Date(product.updatedAt),
		changeFrequency: "weekly",
		priority: 0.7,
	}));

	// Récupérer toutes les collections (pagination)
	const allCollections: Array<{ slug: string; updatedAt: Date }> = [];
	let collectionCursor: string | undefined;
	let hasMoreCollections = true;

	while (hasMoreCollections) {
		const { collections, pagination } = await getCollections({
			perPage: 200,
			cursor: collectionCursor,
			sortBy: "name-ascending",
		});
		allCollections.push(...collections);
		collectionCursor = pagination.nextCursor ?? undefined;
		hasMoreCollections = pagination.hasNextPage;
	}

	const collectionPages: MetadataRoute.Sitemap = allCollections.map(
		(collection) => ({
			url: `${SITE_URL}/collections/${collection.slug}`,
			lastModified: new Date(collection.updatedAt),
			changeFrequency: "weekly",
			priority: 0.6,
		})
	);

	// Récupérer tous les types de produits actifs avec au moins 1 produit
	const { productTypes } = await getProductTypes({
		perPage: 200,
		sortBy: "label-ascending",
		filters: { isActive: true, hasProducts: true },
	});

	const productTypePages: MetadataRoute.Sitemap = productTypes.map((type) => ({
		url: `${SITE_URL}/produits/${type.slug}`,
		lastModified: new Date(type.updatedAt),
		changeFrequency: "daily",
		priority: 0.8,
	}));

	// Combiner toutes les pages
	return [
		...staticPages,
		...productPages,
		...collectionPages,
		...productTypePages,
	];
}
