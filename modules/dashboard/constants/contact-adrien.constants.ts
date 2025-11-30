/**
 * Constantes pour le composant ContactAdrien
 * Centralise les types et labels pour éviter les duplications
 */

export const CONTACT_TYPES = {
	bug: { uiLabel: "Signaler un bug", emailLabel: "Bug" },
	feature: {
		uiLabel: "Demander une fonctionnalité",
		emailLabel: "Nouvelle fonctionnalité",
	},
	improvement: {
		uiLabel: "Amélioration de l'existant",
		emailLabel: "Amélioration",
	},
	question: { uiLabel: "Poser une question", emailLabel: "Question" },
	other: { uiLabel: "Autre", emailLabel: "Autre" },
} as const;

export type FeedbackType = keyof typeof CONTACT_TYPES;

/**
 * Options pour le SelectField du formulaire
 */
export const CONTACT_TYPE_OPTIONS = Object.entries(CONTACT_TYPES).map(
	([value, { uiLabel }]) => ({
		value: value as FeedbackType,
		label: uiLabel,
	})
);
