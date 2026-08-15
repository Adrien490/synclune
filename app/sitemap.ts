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
			filters: { status: "active" },
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
	const allCollections: Array<{ slug: string }> = [];
	let collectionCursor: string | undefined;
	let hasMoreCollections = true;

	while (hasMoreCollections) {
		const { collections, pagination } = await getCollections({
			perPage: 200,
			cursor: collectionCursor,
			sortBy: "name-ascending",
			filters: { active: true, hasProducts: true },
		});
		allCollections.push(...collections);
		collectionCursor = pagination.nextCursor ?? undefined;
		hasMoreCollections = pagination.hasNextPage;
	}

	// Schéma lean : Collection n'a plus d'updatedAt — lastModified omis.
	const collectionPages: MetadataRoute.Sitemap = allCollections.map((collection) => ({
		url: `${SITE_URL}/collections/${collection.slug}`,
		changeFrequency: "weekly",
		priority: 0.6,
	}));

	// Récupérer tous les types de produits actifs avec au moins 1 produit
	const { productTypes } = await getProductTypes({
		perPage: 200,
		sortBy: "label-ascending",
		filters: { hasProducts: true },
	});

	// Schéma lean : ProductType n'a plus d'updatedAt — lastModified omis.
	const productTypePages: MetadataRoute.Sitemap = productTypes.map((type) => ({
		url: `${SITE_URL}/produits/${type.slug}`,
		changeFrequency: "daily",
		priority: 0.8,
	}));

	// lastModified dynamique pour pages-index (home, /produits, /collections) :
	// signale à Google une re-indexation quand le catalogue change réellement.
	const latestProductUpdate = allProducts.reduce(
		(max, p) => (p.updatedAt > max ? p.updatedAt : max),
		new Date(0),
	);
	// Schéma lean : Collection n'a plus d'updatedAt — l'index suit les produits.
	const homeLastModified = latestProductUpdate;
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
			lastModified: fallbackLastModified ?? latestProductUpdate,
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
		// Plus d'entrée `/aide` : la FAQ avait rejoint la landing le 2026-08-05,
		// puis a été retirée le 2026-08-08 (à refaire) avec l'ancre `/#faq` et la
		// redirection 308. L'URL n'a donc plus rien à indexer — et une URL
		// redirigée dans un sitemap est de toute façon signalée « Page avec
		// redirection » dans la Search Console.
	];

	// Combiner toutes les pages
	return [...staticPages, ...productPages, ...collectionPages, ...productTypePages];
}
