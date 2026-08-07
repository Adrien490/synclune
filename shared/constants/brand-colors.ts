/**
 * SSOT hex du rose Synclune — dérivés du token `--primary`
 * (`oklch(0.8593 0.097 340.78)`, cf. app/globals.css).
 *
 * Consommés là où les CSS variables sont inaccessibles : OG images
 * (runtime edge/ImageResponse), `themeColor` / TileColor (métadonnées
 * navigateur), `blurDataURL`. Toute retouche du rose de marque passe
 * par ce fichier ET le token CSS, jamais par un hex local.
 *
 * Fichier statique à synchroniser manuellement : public/browserconfig.xml
 * (TileColor) — il ne peut pas importer ce module.
 */
export const BRAND_PINK = {
	/** #fdb8e4 = conversion exacte oklch→sRGB de `--primary` (vérifiée par script). */
	primary: "#fdb8e4",
	/** Chrome UI mobile (status bar / tuile) — mid-tone lisible, plus soutenu que primary. */
	theme: "#e493b3",
} as const;

/**
 * Le reste de la palette de marque en hex, pour les mêmes appelants que
 * {@link BRAND_PINK} — c'est-à-dire les OG images.
 *
 * ⚠️ **Satori ne parse ni `oklch()` ni les variables CSS.** Une couleur écrite
 * en token dans une `ImageResponse` n'est pas rendue en rose : elle est
 * IGNORÉE, sans erreur, et la carte part en production avec du noir par défaut.
 * C'est la raison d'être de ce fichier, et elle vaut pour toute la palette, pas
 * seulement pour le rose.
 *
 * Chaque valeur est la conversion oklch→sRGB du token de `app/globals.css`,
 * calculée par script et calibrée sur `BRAND_PINK.primary` — dont le dépôt
 * connaissait déjà la réponse (#fdb8e4), ce qui fait du convertisseur autre
 * chose qu'une promesse.
 *
 * ⚠️ `paper` est le seul token HORS GAMUT sRGB (`oklch(0.99 0.005 270)`) : la
 * valeur ci-dessous est l'écrêtage, pas le gamut-mapping du navigateur. L'écart
 * est de quelques centièmes sur le bleu, invisible sur un aplat — mais ne pas
 * s'en servir pour un calcul de contraste.
 */
export const BRAND_HEX = {
	/** `--background` — le papier sur lequel tout le storefront est posé — un blanc très légèrement froid, PAS un crème. */
	paper: "#fafcff",
	/** `--foreground` — l'encre. */
	ink: "#06070b",
	/** `--muted-foreground` — l'encre secondaire (chapôs). */
	inkMuted: "#53555b",
	/** `--border`. */
	border: "#e2e4eb",
	/** `--color-brand-lavender`. */
	lavender: "#a996e2",
	/** `--color-brand-mint`. */
	mint: "#6ccea6",
	/** `--color-brand-sun`. */
	sun: "#eec976",
} as const;

/**
 * Les quatre accents de marque en hex, DANS L'ORDRE de `RAIL_ACCENTS`
 * (rose → lavande → menthe → soleil) — la projection hex du rail, à côté de ses
 * projections classes Tailwind (`catalog-accents.constants.ts`) et
 * `var(--…)` (`brand-brush-gradient.tsx`).
 */
export const OG_ACCENTS = [
	BRAND_PINK.primary,
	BRAND_HEX.lavender,
	BRAND_HEX.mint,
	BRAND_HEX.sun,
] as const;

/*
 * ⚠️ `OG_GRADIENT` (+ les stops `BRAND_PINK.ogFrom/ogVia/ogTo` qui n'existaient
 * que pour lui) a été retiré le 2026-08-07 : plus aucune des 4 OG images ne
 * l'importait. Sa JSDoc affirmait pourtant servir « les cartes de PIÈCE » — elle
 * décrivait une intention, pas un appelant. Le fond des cartes est le papier du
 * storefront depuis l'audit DA du 2026-08-06.
 */
