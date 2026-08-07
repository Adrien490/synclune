import type { Metadata, Viewport } from "next";
import { BRAND_PINK } from "./brand-colors";
import {
	BUSINESS_INFO,
	HOME_DESCRIPTION,
	HOME_OG_ALT,
	HOME_TITLE,
	SEO_DEFAULTS,
	SITE_URL,
} from "./seo-config";
import { ICONS_CONFIG } from "./icons-config";

export const rootMetadata: Metadata = {
	/* ⚠️ Titre, description et alt viennent de la SSOT `seo-config` depuis le
	 * 2026-08-06. Ils étaient écrits ici en CINQ littéraux disant « Bijoux
	 * artisanaux faits main » — la copie que la marque a explicitement écartée —
	 * avec deux variantes divergentes entre l'OG et Twitter. Le repli global est la
	 * surface la plus HÉRITÉE du site : toute page qui ne redéfinit pas son OG en
	 * hérite, donc c'est elle qu'il faut tenir en premier, pas en dernier. */
	title: {
		default: HOME_TITLE,
		template: "%s | Synclune",
	},
	description: HOME_DESCRIPTION,
	// Repris de `BUSINESS_INFO.localKeywords`, eux-mêmes verbatim du § Expressions
	// à privilégier de `docs/BRAND-DA.md`. L'ancienne liste (« bijoux artisanaux »,
	// « bijoux français », « création artisanale ») ne portait ni le lieu, ni la
	// peinture, ni la couleur comme sujet.
	keywords: [...BUSINESS_INFO.localKeywords, "Synclune"],
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
		title: HOME_TITLE,
		description: HOME_DESCRIPTION,
		images: [
			{
				url: SEO_DEFAULTS.images.default,
				width: SEO_DEFAULTS.images.width,
				height: SEO_DEFAULTS.images.height,
				alt: HOME_OG_ALT,
			},
		],
	},
	twitter: {
		card: SEO_DEFAULTS.twitter.card,
		title: HOME_TITLE,
		description: HOME_DESCRIPTION,
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
