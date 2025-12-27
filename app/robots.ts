import { SITE_URL } from "@/shared/constants/seo-config";
import type { MetadataRoute } from "next";

/**
 * Fichier robots.txt dynamique pour le référencement
 * Configure les règles d'indexation pour les moteurs de recherche
 */
export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{
				userAgent: "*",
				allow: "/",
				disallow: [
					"/api/",
					"/admin/",
					"/compte/",
					"/panier/",
					"/commandes/",
					"/favoris/",
					// SEO: Bloquer les URLs avec filtres pour éviter duplicate content
					// Bloquer les paramètres de filtre (prix, couleurs, etc.)
					"/produits/*?*priceMin*",
					"/produits/*?*priceMax*",
					"/produits/*?*color=*",
					"/produits/*?*collectionId*",
					// Bloquer les URLs avec multiples query params (filtres combinés)
					"/produits/*?*&*",
					"/collections/*?*&*",
				],
			},
		],
		sitemap: [
			`${SITE_URL}/sitemap.xml`,
			`${SITE_URL}/sitemap-images.xml`,
		],
	};
}
