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
				// `/commandes/`, `/parametres/` et `/inscription` ont disparu de cette
				// liste avec les routes elles-mêmes (retrait de l'espace client
				// 2026-07-31) ; `/suivi-commande` s'y ajoute — c'est une URL nominative
				// porteuse d'un token, elle ne doit jamais être explorée.
				disallow: [
					"/api/",
					"/admin/",
					"/favoris/",
					"/suivi-commande",
					"/connexion",
					"/mot-de-passe-oublie",
					"/verifier-email",
					"/reinitialiser-mot-de-passe",
					"/renvoyer-verification",
					"/paiement/",
				],
			},
		],
		sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/sitemap-images.xml`],
	};
}
