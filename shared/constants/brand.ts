/**
 * Brand constants - Centralized brand assets and identity
 * Used across the application for consistent branding
 */

export const BRAND = {
	name: "Synclune",
	tagline: "Créations uniques faites avec amour",
	description:
		"Créatrice de bijoux artisanaux faits main - Créations uniques pour occasions particulières",

	logo: {
		// Le mark se dessine en SVG inline (`shared/components/logo-mark.tsx`) ;
		// `url` et `blurDataURL` sont partis avec le raster — le `/logo.webp`
		// résiduel des emails et du JSON-LD est référencé là-bas en littéral.
		alt: "Synclune — Créations artisanales faites main",
	},

	social: {
		instagram: {
			handle: "@synclune.bijoux",
			url: "https://www.instagram.com/synclune.bijoux/",
		},
		tiktok: {
			handle: "@synclune",
			url: "https://www.tiktok.com/@synclune",
		},
	},

	contact: {
		email: process.env.RESEND_CONTACT_EMAIL ?? "contact@synclune.fr",
		location: {
			city: "Nantes",
			postalCode: "44000",
			country: "France",
		},
	},

	website: {
		url: process.env.BETTER_AUTH_URL ?? "https://synclune.fr",
	},
} as const;
