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
					"/commandes/",
					"/favoris/",
					// SEO: Bloquer les URLs avec filtres pour éviter duplicate content
					// Bloquer les paramètres de filtre (prix, couleurs, etc.)
					"/produits/*?*priceMin*",
					"/produits/*?*priceMax*",
					"/produits/*?*color=*",
					"/produits/*?*collectionId*",
					// Bloquer les combinaisons de filtres (multi-params de filtrage)
					// Mais ne pas bloquer les paramètres UTM ou sorting seuls
					"/produits/*?*priceMin*&*",
					"/produits/*?*priceMax*&*",
					"/produits/*?*color=*&*",
					"/produits/*?*collectionId*&*",
					"/collections/*?*priceMin*&*",
					"/collections/*?*priceMax*&*",
					"/collections/*?*color=*&*",
				],
			},
		],
		sitemap: [
			`${SITE_URL}/sitemap.xml`,
			`${SITE_URL}/sitemap-images.xml`,
		],
	};
}
