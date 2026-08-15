/**
 * Palette de couleurs pour les emails Synclune
 * Alignée sur le thème principal (globals.css)
 * Couleurs HEX pour compatibilité email
 */

export const EMAIL_COLORS = {
	/** Rose primary - Boutons, liens, accents (~4.1:1 contrast with white, WCAG AA) */
	primary: "#C4788E",

	/** Texte */
	text: {
		/** Texte principal - Noir doux */
		primary: "#212121",
		/** Texte secondaire/labels (~4.6:1 contrast with #FCFCFC, WCAG AA) */
		secondary: "#6B6B6B",
	},

	/** Backgrounds */
	background: {
		/** Fond principal des emails */
		main: "#FCFCFC",
		/** Fond des sections/cards */
		card: "#EFEFEF",
		/** Blanc pur */
		white: "#ffffff",
	},

	/** Bordures */
	border: "#E8E8E8",

	/** Error/danger red */
	error: "#dc2626",

	/** Stripe brand color for dashboard links */
	stripe: "#635bff",
} as const;

/**
 * Dark mode color overrides
 * Used in @media (prefers-color-scheme: dark) styles injected in EmailLayout <Head>
 */
export const EMAIL_COLORS_DARK = {
	primary: "#D4929E",
	text: {
		primary: "#E8E8E8",
		secondary: "#A0A0A0",
	},
	background: {
		main: "#1A1A1A",
		card: "#2A2A2A",
		white: "#222222",
	},
	border: "#3A3A3A",
} as const;

/**
 * Font families pour les emails — alignées sur la marque storefront (Winky Sans en
 * display, corps en pile système — migration S5 « Encre et papier » 2026-08-05).
 * La web font display est chargée via @import Google Fonts dans EMAIL_HEAD_STYLES.
 * Outlook Desktop ignore @import et tombe sur le fallback — d'où une pile fallback
 * SANS-SERIF (Winky Sans est une sans : un fallback Georgia changerait de catégorie,
 * pas seulement de dessin). Pas d'entrée `cursive` : elle n'avait aucun consommateur
 * (constat de l'audit — l'@import chargeait Sacramento pour rien).
 */
const EMAIL_FONT_FAMILY = {
	body: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
	display: "'Winky Sans', 'Trebuchet MS', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
} as const;

/**
 * Styles inline réutilisables pour les composants d'email
 */
export const EMAIL_STYLES = {
	body: {
		fontFamily: EMAIL_FONT_FAMILY.body,
	},

	container: {
		maxWidth: "600px",
		margin: "32px auto",
		padding: "40px 32px",
		backgroundColor: EMAIL_COLORS.background.white,
		border: `1px solid ${EMAIL_COLORS.border}`,
		borderRadius: "8px",
	},

	heading: {
		/**
		 * Premier titre de contenu — Winky Sans (display « trait d'encre »),
		 * porte la signature typographique de la marque en email.
		 * Fallback pile sans-serif pour clients sans web fonts (Outlook Desktop).
		 */
		h1: {
			margin: 0,
			fontFamily: EMAIL_FONT_FAMILY.display,
			fontSize: "28px",
			fontWeight: "normal" as const,
			letterSpacing: "-0.01em",
			lineHeight: "1.2",
			color: EMAIL_COLORS.text.primary,
		},
		h2: {
			margin: 0,
			fontFamily: EMAIL_FONT_FAMILY.display,
			fontSize: "22px",
			fontWeight: "normal" as const,
			letterSpacing: "-0.01em",
			lineHeight: "1.3",
			color: EMAIL_COLORS.text.primary,
		},
		h3: {
			margin: 0,
			fontSize: "18px",
			fontWeight: "600" as const,
			color: EMAIL_COLORS.text.primary,
		},
	},

	text: {
		body: {
			margin: 0,
			fontSize: "16px",
			lineHeight: "1.6",
			color: EMAIL_COLORS.text.primary,
		},
		small: {
			margin: 0,
			fontSize: "14px",
			color: EMAIL_COLORS.text.secondary,
		},
		tiny: {
			margin: 0,
			fontSize: "12px",
			color: EMAIL_COLORS.text.secondary,
		},
	},

	button: {
		primary: {
			display: "inline-block",
			padding: "16px 32px",
			backgroundColor: EMAIL_COLORS.primary,
			color: "#ffffff",
			fontSize: "16px",
			fontWeight: "600" as const,
			textDecoration: "none",
			borderRadius: "8px",
		},
		outline: {
			display: "inline-block",
			padding: "16px 28px",
			backgroundColor: EMAIL_COLORS.background.white,
			color: EMAIL_COLORS.primary,
			fontSize: "14px",
			fontWeight: "600" as const,
			textDecoration: "none",
			borderRadius: "8px",
			border: `2px solid ${EMAIL_COLORS.primary}`,
		},
	},

	section: {
		card: {
			padding: "16px",
			backgroundColor: EMAIL_COLORS.background.card,
			borderRadius: "8px",
		},
	},

	link: {
		color: EMAIL_COLORS.primary,
		textDecoration: "none",
	},

	hr: {
		borderColor: EMAIL_COLORS.border,
		margin: "24px 0",
	},

	codeBlock: {
		container: {
			padding: "12px",
			backgroundColor: EMAIL_COLORS.text.primary,
			borderRadius: "8px",
		},
		code: {
			fontFamily: "monospace",
			fontSize: "12px",
			color: "#ffffff",
			wordBreak: "break-all" as const,
		},
	},
} as const;

/**
 * Classes CSS appliquées via className sur les éléments d'emails.
 * Utilisées par les media queries injectées dans EmailLayout <Head>
 * pour responsive mobile (@media max-width: 480px) et dark mode
 * (@media prefers-color-scheme: dark).
 *
 * Inline styles ne répondent pas aux media queries email — ces classes
 * servent de hooks pour les overrides CSS globaux.
 */
export const EMAIL_CLASSES = {
	container: "email-container",
	card: "email-card",
	footer: "email-footer",
	header: "email-header",
	heading: {
		h1: "email-h1",
		h2: "email-h2",
		h3: "email-h3",
	},
	text: {
		body: "email-text-primary",
		secondary: "email-text-secondary",
	},
	button: {
		primary: "email-button-primary",
		outline: "email-button-outline",
	},
	codeBlock: "email-code-block",
} as const;
