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
		// `url` et `blurDataURL` sont partis avec le raster. Les surfaces qui ont
		// besoin d'un bitmap (emails, JSON-LD) servent `/logo.png`, rendu 512 px
		// du vectoriel généré par `scripts/generate-brand-icons.ts` — `logo.webp`
		// (le raster peint par Léane) reste dans `public/` comme pièce de
		// provenance, plus aucune surface ne le sert.
		// « Créations artisanales faites main » (redondant, et signable par
		// n'importe quelle boutique — le registre interchangeable que
		// `docs/BRAND-DA.md` § ADN écarte) → noyau lexical de la marque :
		// bijoux + colorés + faits main + Nantes (audit logo 2026-08-15).
		alt: "Synclune — bijoux colorés faits main à Nantes",
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
		// Même résolution que SITE_URL (seo-config), dupliquée ici parce que
		// seo-config importe brand.ts — l'inverse ferait un cycle.
		url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://synclune.fr",
	},
} as const;
