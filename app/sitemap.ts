import { SITE_URL } from "@/shared/constants/seo-config";
import { getCollections } from "@/modules/collections/data/get-collections";
import { getProductTypes } from "@/modules/product-types/data/get-product-types";
import { getProducts } from "@/modules/products/data/get-products";
import { type MetadataRoute } from "next";

/**
 * Génération dynamique du sitemap pour le référencement
 * Inclut toutes les pages importantes du site : pages statiques, produits, collections, types
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	// Date figée pour pages légales (rarement modifiées)
	const legalLastModified = new Date(process.env.DEPLOY_DATE ?? "2026-03-01");

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
			filters: { status: "PUBLIC", hasProducts: true },
		});
		allCollections.push(...collections);
		collectionCursor = pagination.nextCursor ?? undefined;
		hasMoreCollections = pagination.hasNextPage;
	}

	const collectionPages: MetadataRoute.Sitemap = allCollections.map((collection) => ({
		url: `${SITE_URL}/collections/${collection.slug}`,
		lastModified: new Date(collection.updatedAt),
		changeFrequency: "weekly",
		priority: 0.6,
	}));

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

	// lastModified dynamique pour pages-index (home, /produits, /collections) :
	// signale à Google une re-indexation quand le catalogue change réellement.
	const latestProductUpdate = allProducts.reduce(
		(max, p) => (p.updatedAt > max ? p.updatedAt : max),
		new Date(0),
	);
	const latestCollectionUpdate = allCollections.reduce(
		(max, c) => (c.updatedAt > max ? c.updatedAt : max),
		new Date(0),
	);
	const homeLastModified =
		latestProductUpdate.getTime() > latestCollectionUpdate.getTime()
			? latestProductUpdate
			: latestCollectionUpdate;
	const fallbackLastModified = homeLastModified.getTime() === 0 ? legalLastModified : null;

	// Pages statiques avec leurs priorités et fréquences de mise à jour
	const staticPages: MetadataRoute.Sitemap = [
		{
			url: SITE_URL,
			lastModified: fallbackLastModified ?? homeLastModified,
			changeFrequency: "weekly",
			priority: 1.0,
		},
		{
			url: `${SITE_URL}/produits`,
			lastModified: fallbackLastModified ?? latestProductUpdate,
			changeFrequency: "daily",
			priority: 0.9,
		},
		{
			url: `${SITE_URL}/collections`,
			lastModified: fallbackLastModified ?? latestCollectionUpdate,
			changeFrequency: "weekly",
			priority: 0.8,
		},
		{
			url: `${SITE_URL}/cgv`,
			lastModified: legalLastModified,
			changeFrequency: "monthly",
			priority: 0.3,
		},
		{
			url: `${SITE_URL}/confidentialite`,
			lastModified: legalLastModified,
			changeFrequency: "monthly",
			priority: 0.3,
		},
		{
			url: `${SITE_URL}/mentions-legales`,
			lastModified: legalLastModified,
			changeFrequency: "monthly",
			priority: 0.3,
		},
		{
			url: `${SITE_URL}/informations-legales`,
			lastModified: legalLastModified,
			changeFrequency: "monthly",
			priority: 0.3,
		},
		{
			url: `${SITE_URL}/accessibilite`,
			lastModified: legalLastModified,
			changeFrequency: "monthly",
			priority: 0.3,
		},
		{
			url: `${SITE_URL}/cookies`,
			lastModified: legalLastModified,
			changeFrequency: "monthly",
			priority: 0.3,
		},
		{
			url: `${SITE_URL}/retractation`,
			lastModified: legalLastModified,
			changeFrequency: "monthly",
			priority: 0.3,
		},
		{
			url: `${SITE_URL}/aide`,
			lastModified: legalLastModified,
			changeFrequency: "monthly",
			priority: 0.5,
		},
	];

	// Combiner toutes les pages
	return [...staticPages, ...productPages, ...collectionPages, ...productTypePages];
}
