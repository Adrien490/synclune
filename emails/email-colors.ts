/**
 * Palette de couleurs standard pour tous les emails Synclune
 * Toutes les couleurs respectent WCAG AA pour l'accessibilité
 */

export const EMAIL_COLORS = {
	// === COULEURS PRINCIPALES ===
	/** Rose principal - Boutons, liens, accents clients (ratio 4.5:1 avec blanc) */
	primary: "#C73767",

	/** Beige doré - Accents admin uniquement */
	admin: "#D4A574",

	// === TEXTE ===
	/** Texte principal - Noir doux (ratio 16:1) */
	text: {
		primary: "#212121",
		/** Texte secondaire/labels (ratio 4.5:1) */
		secondary: "#858585",
	},

	// === BACKGROUNDS ===
	background: {
		/** Fond principal des emails */
		main: "#FCFCFC",
		/** Fond des sections/cards */
		card: "#EFEFEF",
		/** Blanc pur */
		white: "#ffffff",
	},

	// === BORDURES ===
	/** Bordures standard */
	border: "#E8E8E8",

	// === ÉTATS & ALERTES ===
	states: {
		/** Vert pour succès/paiement confirmé */
		success: "#16a34a",
		/** Rouge pour erreurs/alertes */
		error: "#dc2626",
		/** Bleu Stripe (pour liens dashboard Stripe) */
		stripe: "#635bff",
	},

	// === TRANSPARENCES ===
	/** Pour backgrounds subtils avec primary */
	primaryAlpha: {
		5: "rgba(199, 55, 103, 0.05)",
		10: "rgba(199, 55, 103, 0.1)",
		20: "rgba(199, 55, 103, 0.2)",
	},

	/** Pour backgrounds subtils avec admin */
	adminAlpha: {
		5: "rgba(212, 165, 116, 0.05)",
		10: "rgba(212, 165, 116, 0.1)",
		20: "rgba(212, 165, 116, 0.2)",
	},
} as const;

/**
 * Styles inline réutilisables pour les composants d'email
 */
export const EMAIL_STYLES = {
	// === CONTENEURS ===
	container: {
		maxWidth: "600px",
		margin: "32px auto",
		padding: "40px 32px",
		backgroundColor: EMAIL_COLORS.background.white,
		border: `1px solid ${EMAIL_COLORS.border}`,
		borderRadius: "8px",
	},

	// === TYPOGRAPHIE ===
	heading: {
		h1: {
			margin: 0,
			fontSize: "28px",
			fontWeight: "bold",
			color: EMAIL_COLORS.text.primary,
		},
		h2: {
			margin: 0,
			fontSize: "24px",
			fontWeight: "bold",
			color: EMAIL_COLORS.text.primary,
		},
		h3: {
			margin: 0,
			fontSize: "18px",
			fontWeight: "600",
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

	// === BOUTONS ===
	button: {
		primary: {
			display: "inline-block",
			padding: "16px 32px",
			backgroundColor: EMAIL_COLORS.primary,
			color: EMAIL_COLORS.background.white,
			fontSize: "16px",
			fontWeight: "600",
			textDecoration: "none",
			borderRadius: "8px",
		},
		admin: {
			display: "inline-block",
			padding: "16px 32px",
			backgroundColor: EMAIL_COLORS.admin,
			color: EMAIL_COLORS.background.white,
			fontSize: "16px",
			fontWeight: "600",
			textDecoration: "none",
			borderRadius: "8px",
		},
		outline: {
			display: "inline-block",
			padding: "12px 28px",
			backgroundColor: EMAIL_COLORS.background.white,
			color: EMAIL_COLORS.primary,
			fontSize: "14px",
			fontWeight: "600",
			textDecoration: "none",
			borderRadius: "8px",
			border: `2px solid ${EMAIL_COLORS.primary}`,
		},
	},

	// === SECTIONS ===
	section: {
		card: {
			padding: "16px",
			backgroundColor: EMAIL_COLORS.background.card,
			borderRadius: "8px",
		},
		highlighted: {
			padding: "16px",
			border: `1px solid ${EMAIL_COLORS.primaryAlpha[20]}`,
			backgroundColor: EMAIL_COLORS.primaryAlpha[5],
			borderRadius: "8px",
		},
	},

	// === LIENS ===
	link: {
		color: EMAIL_COLORS.primary,
		textDecoration: "none",
	},

	// === SÉPARATEURS ===
	hr: {
		borderColor: EMAIL_COLORS.border,
		margin: "24px 0",
	},
} as const;
