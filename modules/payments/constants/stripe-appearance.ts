import type { Appearance } from "@stripe/stripe-js";

/**
 * Apparence du PaymentElement, alignée sur les jetons OKLCH de Synclune.
 *
 * ⚠️ **Les hex ci-dessous se dérivent en OKLab, JAMAIS en CIE Lab.** Les deux
 * espaces ont un `L` qui ne veut pas dire la même chose, et la confusion est
 * silencieuse : elle rend des gris trop clairs et trop violacés. C'est ce qui
 * s'était produit — le fichier annonçait `--foreground oklch(.13 .01 270)` et
 * écrivait `#1a1a2e` (la lecture CIE Lab) là où la vraie conversion donne
 * `#06070b`, et `--muted-foreground` valait `#868592` pour un jeton à `#53555b`.
 * Conséquence mesurée : le texte secondaire des champs bancaires tombait à
 * **3,63:1**, seul texte du tunnel sous le seuil AA, quand le jeton qu'il
 * prétendait refléter est à 7,45:1.
 *
 * | Variable Stripe    | Jeton                       | OKLCH                  | HEX       |
 * | ------------------ | --------------------------- | ---------------------- | --------- |
 * | colorPrimary       | --color-brand-rose-strong   | 0.55 0.16 340.78       | `#ac448d` |
 * | colorBackground    | --card                      | 1 0 0                  | `#ffffff` |
 * | colorText          | --foreground                | 0.13 0.01 270          | `#06070b` |
 * | colorTextSecondary | --muted-foreground          | 0.45 0.01 270          | `#53555b` |
 * | colorDanger        | --destructive               | 0.54 0.17 25           | `#bd3838` |
 * | (bordure)          | --border                    | 0.92 0.01 270          | `#e2e4eb` |
 *
 * `colorPrimary` prend `--color-brand-rose-strong` et non `--primary` : le rose
 * primaire est un pastel (1,60:1 sur blanc), excellent en aplat et illisible en
 * trait. C'est la même règle que partout ailleurs dans le dépôt.
 *
 * Rayon : `2rem`, soit **la valeur déclarée par nos propres champs** (`Input`
 * porte `rounded-xl`, et `--radius-xl` vaut 2rem dans ce dépôt). Sur une boîte
 * de ~44px de haut les deux moteurs clampent à la moitié de la hauteur, donc les
 * deux familles de champs prennent la MÊME forme par construction, sans qu'on
 * ait à deviner un pixel. Il valait `0.75rem` (12px) face à des champs maison
 * clampés à 22px : deux formes qui ne pouvaient pas se raccorder.
 *
 * `.Input` padding vertical 14px → cible tactile de 44px (WCAG 2.5.5 AAA).
 *
 * ⚠️ **La police reste une pile système, et c'est une limite assumée.** Onest
 * est auto-hébergée par `next/font/google` sous `/_next/static/media/*.woff2` :
 * la charger dans l'iframe Stripe demanderait une feuille publique et des
 * en-têtes CORS sur ces fichiers, donc une requête externe supplémentaire au
 * cœur du tunnel de paiement, invérifiable hors production. La pile ci-dessous
 * est celle qui s'en approche le plus sur chaque plateforme.
 */

/** Anneau de focus des champs maison, reproduit à l'identique dans l'iframe. */
const FOCUS_RING = {
	/*
	 * `@utility focus-ring` (app/globals.css) peint un `outline: 2px solid
	 * var(--foreground)` PAR-DESSUS un anneau rose de 5px : 2px d'encre à
	 * 19,59:1 qui porte l'information, 3px de rose visibles qui portent la
	 * marque. Stripe n'accepte pas `outline` dans ses `rules`, mais deux ombres
	 * empilées rendent exactement la même chose — la première déclarée est
	 * peinte au-dessus, donc l'encre couvre les 2px intérieurs du rose.
	 */
	light: "0 0 0 2px #06070b, 0 0 0 5px #fdb8e4",
	dark: "0 0 0 2px #fcfcfd, 0 0 0 5px #d977b0",
} as const;

const FONT_STACK =
	'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const stripeAppearance: Appearance = {
	theme: "stripe",
	variables: {
		colorPrimary: "#ac448d",
		colorBackground: "#ffffff",
		colorText: "#06070b",
		colorTextSecondary: "#53555b",
		colorDanger: "#bd3838",
		borderRadius: "2rem",
		fontFamily: FONT_STACK,
		fontSizeBase: "16px",
		spacingUnit: "4px",
	},
	rules: {
		".Input": {
			border: "1px solid #e2e4eb",
			boxShadow: "none",
			padding: "14px 16px",
		},
		".Input:focus": {
			border: "1px solid #fdb8e4",
			boxShadow: FOCUS_RING.light,
		},
		".Input--invalid": {
			border: "1px solid #bd3838",
			boxShadow: "none",
		},
		".Tab": {
			border: "1px solid #e2e4eb",
			boxShadow: "none",
		},
		".Tab--selected": {
			border: "1px solid #fdb8e4",
			boxShadow: FOCUS_RING.light,
		},
		".Label": {
			fontWeight: "500",
			fontSize: "14px",
			color: "#06070b",
		},
		".Error": {
			fontSize: "13px",
			color: "#bd3838",
		},
	},
};

/**
 * Pendant sombre — sélectionné par `useStripeAppearance` quand le système
 * préfère le sombre. Synclune n'a pas de thème sombre : c'est la SEULE surface
 * de l'application qui bascule réellement, et elle bascule parce que Stripe le
 * fait de toute façon. Le garder cohérent évite un encart clair au milieu d'un
 * navigateur sombre.
 *
 * ⚠️ La bordure des champs valait `#3a3a4e`, soit **1,54:1** sur ce fond — très
 * en dessous du 3:1 exigé des éléments d'interface (WCAG 1.4.11). En sombre, la
 * bordure est la seule chose qui dessine le champ : `#6b6b88` la remonte à
 * 3,32:1. Ne pas la ré-assombrir « pour faire plus discret ».
 */
export const stripeAppearanceDark: Appearance = {
	theme: "night",
	variables: {
		colorPrimary: "#d977b0",
		colorBackground: "#1a1a2e",
		colorText: "#fcfcfd",
		colorTextSecondary: "#a8a8b3",
		colorDanger: "#f2938a",
		borderRadius: "2rem",
		fontFamily: FONT_STACK,
		fontSizeBase: "16px",
		spacingUnit: "4px",
	},
	rules: {
		".Input": {
			border: "1px solid #6b6b88",
			boxShadow: "none",
			padding: "14px 16px",
		},
		".Input:focus": {
			border: "1px solid #d977b0",
			boxShadow: FOCUS_RING.dark,
		},
		".Input--invalid": {
			border: "1px solid #f2938a",
			boxShadow: "none",
		},
		".Tab": {
			border: "1px solid #6b6b88",
			boxShadow: "none",
		},
		".Tab--selected": {
			border: "1px solid #d977b0",
			boxShadow: FOCUS_RING.dark,
		},
		".Label": {
			fontWeight: "500",
			fontSize: "14px",
			color: "#fcfcfd",
		},
		".Error": {
			fontSize: "13px",
			color: "#f2938a",
		},
	},
};
