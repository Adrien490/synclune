/**
 * SSOT des tracés « fait main » — la même main pour tous les gestes du dépôt.
 *
 * Avant l'audit du 2026-08-05, quatre implémentations cousines
 * (`HandDrawnAccent`, `SquiggleUnderline`, `HandDrawnRail`, `DrawnChevron`) se
 * citaient en commentaire sans partager une ligne de path. Changer la main
 * (direction C « La main appuyée », restée au chaud) doit être UN fichier :
 * celui-ci.
 *
 * Chaque entrée déclare son viewBox ET ses width/height natifs — toujours au
 * même ratio, c'est ce que verrouille
 * `hand-drawn-accent-aspect-ratio.regression.test.ts` : un couple désaccordé
 * letterboxe le tracé en silence (`preserveAspectRatio` par défaut =
 * `xMidYMid meet`, encre rétrécie et centrée — payé sur 7 appelants).
 */

/**
 * Le souligné, en trois longueurs de GESTE — trois tracés dessinés à leur
 * ratio, pas un path étiré. L'appelant choisit la longueur la plus proche du
 * mot ; la hauteur est toujours dérivée (cf. `HandDrawnAccent`).
 * - `s` (5:1) : dialogs, petits titres (« Créations », titre de variante) ;
 * - `m` (6:1) : le tracé historique — signatures, mots soulignés ;
 * - `l` (11:1) : les grands h1 (404).
 */
export const UNDERLINE_PATHS = {
	s: { d: "M2 8.5 Q16 5, 32 7.5 Q46 9.5, 58 6.5", viewBox: "0 0 60 12", width: 60, height: 12 },
	m: { d: "M2 15 Q30 8, 60 12 Q90 16, 118 10", viewBox: "0 0 120 20", width: 120, height: 20 },
	l: {
		d: "M2 11 Q30 6, 58 9 Q90 12.5, 122 9 Q150 6.5, 174 10",
		viewBox: "0 0 176 16",
		width: 176,
		height: 16,
	},
} as const;

/**
 * Les glyphes (admin) : cercle d'annotation, étoile et cœur remplis à 15 %.
 * ⚠️ Le variant `arrow` a été PURGÉ (lot 0, audit 2026-08-05) : zéro call site,
 * mais un path, un type et des dimensions entretenus à trois étages. Ne pas le
 * ré-introduire sans consommateur.
 */
export const ACCENT_SHAPE_PATHS = {
	circle: {
		d: "M40 5 Q75 2, 90 25 Q105 50, 85 70 Q65 90, 35 85 Q5 80, 5 50 Q5 20, 40 5",
		viewBox: "0 0 100 95",
		width: 100,
		height: 95,
	},
	star: {
		d: "M25 2 L30 18 L48 18 L34 28 L40 45 L25 35 L10 45 L16 28 L2 18 L20 18 Z",
		viewBox: "0 0 50 50",
		width: 50,
		height: 50,
	},
	heart: {
		d: "M25 45 Q5 30, 5 18 Q5 5, 15 5 Q25 5, 25 15 Q25 5, 35 5 Q45 5, 45 18 Q45 30, 25 45",
		viewBox: "0 0 50 50",
		width: 50,
		height: 50,
	},
} as const;

/**
 * Les quatre touches de pinceau du rail (StorefrontHeading / EtalHeading),
 * dans l'ordre de `RAIL_ACCENTS` (rose → lavande → menthe → soleil).
 * Longueurs inégales (33/45/27/39) et inclinaisons alternées — la régularité
 * est ce que la direction « Les quatre touches » remplace.
 * Repère : viewBox 176×12, l'encre (trait 5, arrondi) reste dans [2.5, 9.5].
 */
export const RAIL_STROKE_PATHS = [
	"M1 6.8 Q17 5.4 34 6.2",
	"M44 5.8 Q66.5 7.2 89 5.9",
	"M99 6.9 Q112.5 5.6 126 7.1",
	"M136 6.3 Q155.5 7.8 175 5.6",
] as const;

/** La touche unique d'une page fille — plus longue, même registre. */
export const RAIL_MONO_STROKE_PATH = "M2 6.6 Q88 5.2 174 6.8";

export const RAIL_VIEWBOX = "0 0 176 12";

/**
 * Le squiggle des cartes — l'AFFORDANCE de lien (hover/focus), pas un ornement
 * de titre : il garde son déclencheur et son dash en unités utilisateur dans
 * `squiggle-underline.tsx` ; seul le tracé vit ici.
 */
export const SQUIGGLE_PATH = "M2 7 Q 16 2, 30 6 T 56 5 T 82 6";

/**
 * Les chevrons de la galerie — tracés volontairement irréguliers (léger
 * décrochage au coude), la seule « reprise de trait » du vocabulaire avant la
 * direction C.
 */
export const CHEVRON_LEFT_PATH =
	"M16.1 4.4 Q10.1 7.6 8.5 11.2 Q8 12.5 8.9 13.6 Q11.4 17.1 15.4 19.7";
export const CHEVRON_RIGHT_PATH =
	"M7.9 4.4 Q13.9 7.6 15.5 11.2 Q16 12.5 15.1 13.6 Q12.6 17.1 8.6 19.7";
