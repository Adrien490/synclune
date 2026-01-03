import type { Metadata, Viewport } from "next";
import { BUSINESS_INFO, SEO_DEFAULTS, SITE_URL } from "./seo-config";
import { ICONS_CONFIG } from "./icons-config";

export const rootMetadata: Metadata = {
	title: {
		default: "Synclune - Bijoux artisanaux faits main à Nantes (44) - Loire-Atlantique",
		template: "%s | Synclune Nantes",
	},
	description:
		"Bijoux artisanaux faits main à Nantes. Boucles d'oreilles, colliers, bracelets colorés. Éditions limitées uniques en Loire-Atlantique.",
	keywords: [
		"bijoux faits main Nantes",
		"bijoux artisanaux Nantes",
		"créatrice bijoux Nantes",
		"bijoux colorés Nantes",
		"boucles d'oreilles Nantes",
		"colliers Nantes",
		"bracelets Nantes",
		"bijoux Loire-Atlantique",
		"atelier bijoux Nantes 44",
		"bijoux originaux Nantes",
		"Synclune",
		"bijoux français",
		"création artisanale",
		"bijoux personnalisés Nantes",
		...BUSINESS_INFO.localKeywords,
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
		languages: {
			fr: "/",
			"x-default": "/",
		},
	},
	openGraph: {
		type: "website",
		locale: SEO_DEFAULTS.locale,
		url: SITE_URL,
		siteName: SEO_DEFAULTS.siteName,
		title: "Synclune - Bijoux artisanaux faits main à Nantes (44)",
		description:
			"Bijoux artisanaux faits main à Nantes. Boucles d'oreilles, colliers, bracelets colorés. Éditions limitées uniques en Loire-Atlantique.",
		images: [
			{
				url: SEO_DEFAULTS.images.default,
				width: SEO_DEFAULTS.images.width,
				height: SEO_DEFAULTS.images.height,
				alt: "Synclune - Bijoux artisanaux faits main à Nantes (44) Loire-Atlantique",
			},
		],
	},
	twitter: {
		card: SEO_DEFAULTS.twitter.card,
		title: "Synclune - Bijoux artisanaux faits main à Nantes (44)",
		description:
			"Bijoux colorés faits main à Nantes. Boucles d'oreilles, colliers, bracelets. Créations uniques en Loire-Atlantique.",
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
		other: {
			"msvalidate.01": process.env.BING_SITE_VERIFICATION ?? "",
		},
	},
	appleWebApp: {
		capable: true,
		statusBarStyle: "black-translucent",
		title: "Synclune",
	},
	icons: ICONS_CONFIG,
	other: {
		"msapplication-TileColor": "#F5B0C1",
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
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#e493b3" },
		{ media: "(prefers-color-scheme: dark)", color: "#e493b3" },
	],
};
