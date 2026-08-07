/**
 * Brand constants - Centralized brand assets and identity
 * Used across the application for consistent branding
 *
 * ⚠️ **Il n'y a pas de `tagline` ni de `description` ici, et ce n'est pas un
 * oubli.** Les deux ont existé, n'ont JAMAIS eu de consommateur, et disaient
 * « Créations uniques faites avec amour » / « … pour occasions particulières » —
 * soit le registre interchangeable que `docs/BRAND-DA.md` § ADN écarte, plus un
 * mot (l'occasion, la cérémonie) de sa § « mots à NE PAS mettre au centre ».
 * Une chaîne morte dans le fichier que `CLAUDE.md` désigne comme SSOT
 * d'identité, c'est exactement l'endroit d'où la prochaine copie off-brand
 * serait recopiée.
 *
 * La description de la marque vit désormais à UN seul endroit,
 * `BUSINESS_INFO.description` (`./seo-config.ts`), d'où la lisent les nœuds
 * `LocalBusiness` et `Organization`. Les formulations de référence — longue et
 * courte — sont dans `docs/BRAND-DA.md` § L'ADN en une phrase.
 */

export const BRAND = {
	name: "Synclune",

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
		/**
		 * ⚠️ Pas de `postalCode` ici. Il valait `44000` alors que
		 * `BUSINESS_INFO.location.postalCode` vaut `44100` (le vrai, celui du
		 * boulevard du Tertre) : deux codes postaux pour un seul atelier, dans deux
		 * SSOT différentes. Celui-ci n'avait aucun consommateur — c'est le mauvais
		 * qui a été supprimé, pas les deux synchronisés.
		 */
		location: {
			city: "Nantes",
			country: "France",
		},
	},

	website: {
		url: process.env.BETTER_AUTH_URL ?? "https://synclune.fr",
	},
} as const;
