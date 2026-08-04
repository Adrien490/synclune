import { StructuredData } from "@/shared/components/structured-data";
import { SITE_URL } from "@/shared/constants/seo-config";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: {
		absolute: "Synclune | Bijoux artisanaux faits main",
	},
	description:
		"Bijoux faits main uniques et colorés. Boucles d'oreilles, colliers, bracelets créés avec amour par Léane. Éditions limitées, livraison rapide.",
	keywords: [
		"bijoux artisanaux",
		"bijoux faits main",
		"créatrice bijoux",
		"bijoux colorés",
		"bijoux originaux",
		"boucles d'oreilles artisanales",
		"colliers faits main",
		"bracelets artisanaux",
	],
	alternates: {
		canonical: "/",
	},
	openGraph: {
		title: "Synclune | Bijoux artisanaux faits main",
		description:
			"Bijoux colorés faits main dans mon atelier. Boucles d'oreilles, colliers, bracelets. Pièces uniques.",
		url: SITE_URL,
		type: "website",
		images: [
			{
				url: "/opengraph-image",
				width: 1200,
				height: 630,
				alt: "Synclune - Bijoux artisanaux faits main",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "Synclune | Bijoux artisanaux faits main",
		description:
			"Bijoux artisanaux colorés faits main. Boucles d'oreilles, colliers, bracelets uniques. Créatrice indépendante.",
	},
};

/**
 * Page d'accueil volontairement vide (2026-08-03) : les sections ont été
 * retirées en attendant la refonte complète de la landing. Navbar et footer
 * restent rendus par le layout `(shop)`. La copie de la section Atelier est
 * sauvegardée dans `docs/atelier-story.md` ; les composants complets vivent
 * dans l'historique git.
 */
export default function Page() {
	return <StructuredData includeHomepageSchemas />;
}
