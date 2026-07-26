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
	/** Stops du dégradé OG on-brand (clair → soutenu, contraste texte blanc en zone via/to). */
	ogFrom: "#f0b4c8",
	ogVia: "#e493b3",
	ogTo: "#c75b8f",
	/** Chrome UI mobile (status bar / tuile) — mid-tone lisible, plus soutenu que primary. */
	theme: "#e493b3",
} as const;

/** Dégradé de fond partagé par toutes les OG images (racine, produits, créations, collections). */
export const OG_GRADIENT =
	`linear-gradient(135deg, ${BRAND_PINK.ogFrom} 0%, ${BRAND_PINK.ogVia} 40%, ${BRAND_PINK.ogTo} 100%)` as const;
