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
					"/adresses/",
					"/parametres/",
					"/mes-avis/",
					"/mes-demandes/",
					"/connexion",
					"/inscription",
					"/mot-de-passe-oublie",
					"/verifier-email",
					"/reinitialiser-mot-de-passe",
					"/renvoyer-verification",
					"/paiement/",
					// SEO: Bloquer les URLs avec query strings (filtres)
					"/produits/*?",
					"/collections/*?",
				],
			},
		],
		sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/sitemap-images.xml`],
	};
}
