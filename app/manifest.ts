import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "Synclune - Créations artisanales",
		short_name: "Synclune",
		description:
			"Découvrez nos créations de bijoux artisanaux faits main. Bagues, colliers, bracelets et boucles d'oreilles uniques.",
		start_url: "/",
		display: "standalone",
		background_color: "#fcfcfd",
		theme_color: "#e493b3",
		orientation: "portrait-primary",
		scope: "/",
		lang: "fr",
		dir: "ltr",
		categories: ["shopping", "lifestyle"],
		icons: [
			// Icône standard (avec marges de sécurité pour les anciens appareils)
			{
				src: "/icon-192x192.png",
				sizes: "192x192",
				type: "image/png",
				purpose: "any",
			},
			{
				src: "/icon-512x512.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "any",
			},
			// Icônes maskable (adaptatives Android, remplissent tout l'espace)
			{
				src: "/icon-192x192-maskable.png",
				sizes: "192x192",
				type: "image/png",
				purpose: "maskable",
			},
			{
				src: "/icon-512x512-maskable.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "maskable",
			},
			// Icône combinée (prioritaire, supporte les deux modes)
			{
				src: "/icon-192x192-maskable.png",
				sizes: "192x192",
				type: "image/png",
				purpose: "maskable",
			},
			{
				src: "/icon-512x512-maskable.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "maskable",
			},
		],
		shortcuts: [
			{
				name: "Nos Bijoux",
				short_name: "Bijoux",
				description: "Découvrir nos créations",
				url: "/produits",
				icons: [{ src: "/icon-192x192.png", sizes: "192x192" }],
			},
			{
				name: "Panier",
				short_name: "Panier",
				description: "Voir mon panier",
				url: "/panier",
				icons: [{ src: "/icon-192x192.png", sizes: "192x192" }],
			},
			{
				name: "Mon Compte",
				short_name: "Compte",
				description: "Accéder à mon compte",
				url: "/compte",
				icons: [{ src: "/icon-192x192.png", sizes: "192x192" }],
			},
		],
	};
}
