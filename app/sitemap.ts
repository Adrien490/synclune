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
	// Pages statiques avec leurs priorités et fréquences de mise à jour
	const staticPages: MetadataRoute.Sitemap = [
		{
			url: SITE_URL,
			lastModified: new Date(),
			changeFrequency: "weekly",
			priority: 1.0,
		},
		{
			url: `${SITE_URL}/produits`,
			lastModified: new Date(),
			changeFrequency: "daily",
			priority: 0.9,
		},
		{
			url: `${SITE_URL}/collections`,
			lastModified: new Date(),
			changeFrequency: "weekly",
			priority: 0.8,
		},
		{
			url: `${SITE_URL}/a-propos`,
			lastModified: new Date(),
			changeFrequency: "monthly",
			priority: 0.7,
		},
		{
			url: `${SITE_URL}/personnalisation`,
			lastModified: new Date(),
			changeFrequency: "monthly",
			priority: 0.6,
		},
		{
			url: `${SITE_URL}/cgv`,
			lastModified: new Date(),
			changeFrequency: "monthly",
			priority: 0.3,
		},
		{
			url: `${SITE_URL}/confidentialite`,
			lastModified: new Date(),
			changeFrequency: "monthly",
			priority: 0.3,
		},
		{
			url: `${SITE_URL}/mentions-legales`,
			lastModified: new Date(),
			changeFrequency: "monthly",
			priority: 0.3,
		},
	];

	// Récupérer tous les produits publics
	const { products } = await getProducts({
		perPage: 1000,
		sortBy: "created-descending",
		filters: {
			status: "PUBLIC",
		},
	});

	const productPages: MetadataRoute.Sitemap = products.map((product) => ({
		url: `${SITE_URL}/creations/${product.slug}`,
		lastModified: new Date(product.updatedAt),
		changeFrequency: "weekly",
		priority: 0.7,
	}));

	// Récupérer toutes les collections
	const { collections } = await getCollections({
		perPage: 1000,
		sortBy: "name-ascending",
	});

	const collectionPages: MetadataRoute.Sitemap = collections.map(
		(collection) => ({
			url: `${SITE_URL}/collections/${collection.slug}`,
			lastModified: new Date(collection.updatedAt),
			changeFrequency: "weekly",
			priority: 0.6,
		})
	);

	// Récupérer tous les types de produits actifs
	const { productTypes } = await getProductTypes({
		perPage: 100,
		sortBy: "label-ascending",
		filters: {
			isActive: true,
		},
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
