import type { WizardMessages } from "../types"

/**
 * Messages par défaut du wizard (français)
 */
export const WIZARD_MESSAGES = {
	validation: {
		errorsBeforeContinue: "Veuillez corriger les erreurs avant de continuer",
		stepInvalid: "Cette étape contient des erreurs",
	},
	navigation: {
		previous: "Précédent",
		next: "Suivant",
		submit: "Enregistrer",
	},
	accessibility: {
		stepOf: (current: number, total: number) => `Étape ${current} sur ${total}`,
		stepHasErrors: "contient des erreurs",
		goToStep: (label: string) => `Aller à ${label}`,
	},
} as const

/** Type des messages fusionnés */
export type MergedWizardMessages = {
	validation: {
		errorsBeforeContinue: string
		stepInvalid: string
	}
	navigation: {
		previous: string
		next: string
		submit: string
	}
	accessibility: {
		stepOf: (current: number, total: number) => string
		stepHasErrors: string
		goToStep: (label: string) => string
	}
}

/**
 * Fusionne les messages par défaut avec les messages personnalisés
 */
export function mergeMessages(custom?: WizardMessages): MergedWizardMessages {
	if (!custom) return WIZARD_MESSAGES

	return {
		validation: {
			...WIZARD_MESSAGES.validation,
			...custom.validation,
		},
		navigation: {
			...WIZARD_MESSAGES.navigation,
			...custom.navigation,
		},
		accessibility: {
			...WIZARD_MESSAGES.accessibility,
			...custom.accessibility,
		},
	}
}

/**
 * Clé de stockage pour la persistence des étapes
 */
export const WIZARD_STORAGE_KEY_PREFIX = "wizard-step-"

/**
 * Délai de focus après changement d'étape (ms)
 */
export const FOCUS_DELAY_MS = 50

/**
 * Sélecteur CSS pour les éléments focusables
 */
export const FOCUSABLE_SELECTOR =
	'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex="0"]'

/**
 * Sélecteur CSS pour les éléments en erreur
 */
export const ERROR_FIELD_SELECTOR = '[aria-invalid="true"], [data-invalid="true"]'
