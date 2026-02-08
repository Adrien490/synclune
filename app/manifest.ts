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
			// Icônes Android petites tailles
			{
				src: "/icons/android-icon-36x36.png",
				sizes: "36x36",
				type: "image/png",
				purpose: "any",
			},
			{
				src: "/icons/android-icon-48x48.png",
				sizes: "48x48",
				type: "image/png",
				purpose: "any",
			},
			{
				src: "/icons/android-icon-72x72.png",
				sizes: "72x72",
				type: "image/png",
				purpose: "any",
			},
			{
				src: "/icons/android-icon-96x96.png",
				sizes: "96x96",
				type: "image/png",
				purpose: "any",
			},
			{
				src: "/icons/android-icon-144x144.png",
				sizes: "144x144",
				type: "image/png",
				purpose: "any",
			},
			// Icône standard (avec marges de sécurité pour les anciens appareils)
			{
				src: "/icons/icon-192x192.png",
				sizes: "192x192",
				type: "image/png",
				purpose: "any",
			},
			{
				src: "/icons/icon-512x512.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "any",
			},
			// Icônes maskable (adaptatives Android, remplissent tout l'espace)
			{
				src: "/icons/icon-192x192-maskable.png",
				sizes: "192x192",
				type: "image/png",
				purpose: "maskable",
			},
			{
				src: "/icons/icon-512x512-maskable.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "maskable",
			},
		],
		screenshots: [
			{
				src: "/screenshots/desktop-home.png",
				sizes: "1920x1080",
				type: "image/png",
				form_factor: "wide",
				label: "Page d'accueil Synclune sur desktop",
			},
			{
				src: "/screenshots/mobile-home.png",
				sizes: "750x1334",
				type: "image/png",
				form_factor: "narrow",
				label: "Page d'accueil Synclune sur mobile",
			},
			{
				src: "/screenshots/mobile-product.png",
				sizes: "750x1334",
				type: "image/png",
				form_factor: "narrow",
				label: "Page produit Synclune sur mobile",
			},
		],
		shortcuts: [
			{
				name: "Nos Bijoux",
				short_name: "Bijoux",
				description: "Découvrir nos créations",
				url: "/produits",
				icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
			},
			{
				name: "Collections",
				short_name: "Collections",
				description: "Parcourir nos collections",
				url: "/collections",
				icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
			},
			{
				name: "Personnalisation",
				short_name: "Sur mesure",
				description: "Créer votre bijou sur mesure",
				url: "/personnalisation",
				icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
			},
			{
				name: "Mon Compte",
				short_name: "Compte",
				description: "Accéder à mon compte",
				url: "/compte",
				icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
			},
		],
	};
}
