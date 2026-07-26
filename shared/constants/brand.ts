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
		url: "/logo.webp",
		alt: "Synclune — Créations artisanales faites main",
		// SVG 10×10 flouté, fill = BRAND_PINK.primary (#fdb8e4, cf. brand-colors.ts).
		// Régénérer via node (décoder le base64, remplacer le fill, ré-encoder) à toute retouche du rose.
		blurDataURL:
			"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGZpbHRlciBpZD0iYiI+PGZlR2F1c3NpYW5CbHVyIHN0ZERldmlhdGlvbj0iMiIvPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmRiOGU0IiBmaWx0ZXI9InVybCgjYikiLz48L3N2Zz4=",
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
