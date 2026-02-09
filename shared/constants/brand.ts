/**
 * Brand constants - Centralized brand assets and identity
 * Used across the application for consistent branding
 */

export const BRAND = {
	name: "Synclune",
	tagline: "Créations uniques faites avec amour",
	description:
		"Créatrice de bijoux artisanaux faits main à Nantes - Créations uniques pour occasions particulières",

	logo: {
		url: "/logo.webp",
		alt: "Logo Synclune - Créations artisanales faites main",
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
			region: "Loire-Atlantique",
			country: "France",
		},
	},

	website: {
		url: process.env.BETTER_AUTH_URL ?? "https://synclune.fr",
	},
} as const;
