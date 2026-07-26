import type { Metadata, Viewport } from "next";
import { BRAND_PINK } from "./brand-colors";
import { SEO_DEFAULTS, SITE_URL } from "./seo-config";
import { ICONS_CONFIG } from "./icons-config";

export const rootMetadata: Metadata = {
	title: {
		default: "Synclune - Bijoux artisanaux faits main",
		template: "%s | Synclune",
	},
	description:
		"Bijoux artisanaux faits main. Boucles d'oreilles, colliers, bracelets colorés. Créations uniques en éditions limitées.",
	keywords: [
		"bijoux faits main",
		"bijoux artisanaux",
		"bijoux colorés",
		"boucles d'oreilles faites main",
		"colliers artisanaux",
		"bracelets faits main",
		"bijoux français",
		"création artisanale",
		"bijoux originaux",
		"Synclune",
	],
	authors: [{ name: "Synclune" }],
	creator: "Synclune",
	publisher: "Synclune",
	formatDetection: {
		email: false,
		address: false,
		telephone: false,
	},
	metadataBase: new URL(SITE_URL),
	alternates: {
		canonical: "/",
	},
	openGraph: {
		type: "website",
		locale: SEO_DEFAULTS.locale,
		url: SITE_URL,
		siteName: SEO_DEFAULTS.siteName,
		title: "Synclune - Bijoux artisanaux faits main",
		description:
			"Bijoux artisanaux faits main. Boucles d'oreilles, colliers, bracelets colorés. Créations uniques en éditions limitées.",
		images: [
			{
				url: SEO_DEFAULTS.images.default,
				width: SEO_DEFAULTS.images.width,
				height: SEO_DEFAULTS.images.height,
				alt: "Synclune - Bijoux artisanaux faits main",
			},
		],
	},
	twitter: {
		card: SEO_DEFAULTS.twitter.card,
		title: "Synclune - Bijoux artisanaux faits main",
		description:
			"Bijoux colorés faits main. Boucles d'oreilles, colliers, bracelets. Créations uniques en éditions limitées.",
		images: [SEO_DEFAULTS.images.default],
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
		},
	},
	verification: {
		google: process.env.GOOGLE_SITE_VERIFICATION,
		...(process.env.BING_SITE_VERIFICATION && {
			other: {
				"msvalidate.01": process.env.BING_SITE_VERIFICATION,
			},
		}),
	},
	icons: ICONS_CONFIG,
	other: {
		// Synchroniser public/browserconfig.xml (fichier statique) à toute retouche.
		"msapplication-TileColor": BRAND_PINK.theme,
		"msapplication-TileImage": "/icons/ms-icon-144x144.png",
		"msapplication-config": "/browserconfig.xml",
	},
};

export const rootViewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 5,
	userScalable: true,
	viewportFit: "cover",
	themeColor: BRAND_PINK.theme,
};
