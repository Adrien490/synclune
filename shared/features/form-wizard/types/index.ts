import type { ReactNode } from "react"

/**
 * Configuration d'une étape du wizard
 */
export interface WizardStep {
	/** Identifiant unique de l'étape */
	id: string
	/** Label affiché dans la navigation */
	label: string
	/** Description optionnelle */
	description?: string
	/** Icône optionnelle */
	icon?: ReactNode
	/** Noms des champs à valider pour cette étape */
	fields: string[]
	/** Si true, l'étape peut être sautée */
	optional?: boolean
	/** Si défini, l'étape n'est visible que si la fonction retourne true */
	condition?: () => boolean
	/** Si true, l'étape est grisée et non navigable */
	disabled?: boolean
}

/**
 * Interface générique pour l'intégration avec les librairies de formulaires
 * Compatible avec TanStack Form, React Hook Form, Formik, etc.
 */
export interface FormLike {
	/** Valide un champ par son nom */
	validateField: (name: string, opts?: { cause: string }) => Promise<void>
	/** Récupère les métadonnées d'un champ (erreurs) */
	getFieldMeta: (name: string) => { errors: string[] } | undefined
	/** Récupère la valeur d'un champ (optionnel) */
	getFieldValue?: (name: string) => unknown
	/** Retourne true si le formulaire a des changements non sauvegardés (optionnel) */
	isDirty?: () => boolean
}

/**
 * Messages personnalisables du wizard
 */
export interface WizardMessages {
	validation?: {
		errorsBeforeContinue?: string
		stepInvalid?: string
	}
	navigation?: {
		previous?: string
		next?: string
		submit?: string
	}
	accessibility?: {
		stepOf?: (current: number, total: number) => string
		stepHasErrors?: string
		goToStep?: (label: string) => string
	}
}

/**
 * Direction de navigation dans le wizard
 */
export type WizardDirection = "forward" | "backward"

/**
 * Variante d'affichage du progress (mobile-only)
 * - "progress-bar": Barre de progression linéaire
 * - "dots": Points cliquables compacts
 */
export type WizardProgressVariant = "progress-bar" | "dots"

/**
 * État d'une étape
 */
export type StepStatus = "pending" | "active" | "completed" | "error"
