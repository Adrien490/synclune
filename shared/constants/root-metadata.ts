import type { Metadata, Viewport } from "next";
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
	// TODO: Re-enable indexing when ready to go live
	robots: {
		index: false,
		follow: false,
		googleBot: {
			index: false,
			follow: false,
		},
	},
	// robots: {
	// 	index: true,
	// 	follow: true,
	// 	googleBot: {
	// 		index: true,
	// 		follow: true,
	// 	},
	// },
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
