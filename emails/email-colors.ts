/**
 * Palette de couleurs pour les emails Synclune
 * Alignée sur le thème principal (globals.css)
 * Couleurs HEX pour compatibilité email
 */

export const EMAIL_COLORS = {
	/** Rose primary - Boutons, liens, accents */
	primary: "#E8A4B8",

	/** Texte */
	text: {
		/** Texte principal - Noir doux */
		primary: "#212121",
		/** Texte secondaire/labels */
		secondary: "#858585",
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

	/** Primary avec transparence */
	primaryAlpha: {
		5: "rgba(232, 164, 184, 0.05)",
		10: "rgba(232, 164, 184, 0.1)",
		20: "rgba(232, 164, 184, 0.2)",
	},
} as const;

/**
 * Styles inline réutilisables pour les composants d'email
 */
export const EMAIL_STYLES = {
	container: {
		maxWidth: "600px",
		margin: "32px auto",
		padding: "40px 32px",
		backgroundColor: EMAIL_COLORS.background.white,
		border: `1px solid ${EMAIL_COLORS.border}`,
		borderRadius: "8px",
	},

	heading: {
		h1: {
			margin: 0,
			fontSize: "28px",
			fontWeight: "bold" as const,
			color: EMAIL_COLORS.text.primary,
		},
		h2: {
			margin: 0,
			fontSize: "24px",
			fontWeight: "bold" as const,
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
			color: EMAIL_COLORS.text.primary,
			fontSize: "16px",
			fontWeight: "600" as const,
			textDecoration: "none",
			borderRadius: "8px",
		},
		outline: {
			display: "inline-block",
			padding: "12px 28px",
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
} as const;
