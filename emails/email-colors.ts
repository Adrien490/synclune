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

	/** Stripe brand color for dashboard links */
	stripe: "#635bff",
} as const;

/**
 * Styles inline réutilisables pour les composants d'email
 */
export const EMAIL_STYLES = {
	body: {
		fontFamily:
			"system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
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
 * Refund delay text shared between refund and cancellation templates
 */
export const REFUND_DELAY_TEXT = "3 à 10 jours ouvrés";

/**
 * Refund reason labels shared between refund-approved and refund-confirmation emails
 */
export const REFUND_REASON_LABELS: Record<string, string> = {
	CUSTOMER_REQUEST: "Demande client",
	DEFECTIVE: "Produit défectueux",
	WRONG_ITEM: "Erreur de commande",
	LOST_IN_TRANSIT: "Colis perdu",
	FRAUD: "Transaction contestée",
	OTHER: "Autre raison",
};
