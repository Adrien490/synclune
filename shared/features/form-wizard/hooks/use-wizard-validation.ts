"use client"

import { useRef, useState } from "react"
import type { FormLike, WizardStep } from "../types"

interface UseWizardValidationOptions {
	steps: WizardStep[]
	form: FormLike
	currentStep: number
}

interface UseWizardValidationReturn {
	/** Valide l'étape courante */
	validateCurrentStep: () => Promise<boolean>
	/** Valide une étape spécifique */
	validateStep: (stepIndex: number) => Promise<boolean>
	/** Vérifie si une étape est valide (sans revalidation) */
	isStepValid: (stepIndex: number) => boolean
	/** Vérifie si une étape a des erreurs */
	hasStepErrors: (stepIndex: number) => boolean
	/** Récupère les erreurs d'une étape */
	getStepErrors: (stepIndex: number) => string[]
	/** Efface le cache des erreurs d'une étape */
	clearStepErrorsCache: (stepIndex?: number) => void
	/** État de validation en cours */
	isValidating: boolean
}

export function useWizardValidation({
	steps,
	form,
	currentStep,
}: UseWizardValidationOptions): UseWizardValidationReturn {
	const [isValidating, setIsValidating] = useState(false)

	// Cache des erreurs par étape pour éviter les recalculs
	const errorsCache = useRef<Map<number, string[]>>(new Map())

	// Efface le cache d'une étape ou de toutes
	const clearStepErrorsCache = (stepIndex?: number) => {
		if (stepIndex !== undefined) {
			errorsCache.current.delete(stepIndex)
		} else {
			errorsCache.current.clear()
		}
	}

	// Valide une étape spécifique
	const validateStep = async (stepIndex: number): Promise<boolean> => {
		const stepConfig = steps[stepIndex]
		if (!stepConfig) return false

		setIsValidating(true)
		// Efface le cache pour cette étape avant revalidation
		errorsCache.current.delete(stepIndex)

		try {
			// Valide chaque champ de l'étape
			for (const fieldName of stepConfig.fields) {
				try {
					await form.validateField(fieldName, { cause: "change" })
				} catch (error) {
					// Log l'erreur pour faciliter le debug (champ inexistant, erreur adaptateur, etc.)
					console.warn(
						`[FormWizard] Erreur validation champ "${fieldName}":`,
						error instanceof Error ? error.message : String(error)
					)
				}
			}

			// Vérifie si des champs ont des erreurs
			const hasErrors = stepConfig.fields.some((fieldName) => {
				const meta = form.getFieldMeta(fieldName)
				return meta && meta.errors.length > 0
			})

			return !hasErrors
		} catch (error) {
			console.error("[WizardValidation] Erreur de validation:", error)
			return false
		} finally {
			setIsValidating(false)
		}
	}

	// Valide l'étape courante
	const validateCurrentStep = async (): Promise<boolean> => {
		return validateStep(currentStep)
	}

	// Vérifie si une étape est valide sans revalidation
	const isStepValid = (stepIndex: number): boolean => {
		const stepConfig = steps[stepIndex]
		if (!stepConfig) return false

		return stepConfig.fields.every((fieldName) => {
			const meta = form.getFieldMeta(fieldName)
			return !meta || meta.errors.length === 0
		})
	}

	// Vérifie si une étape a des erreurs (avec cache)
	const hasStepErrors = (stepIndex: number): boolean => {
		return !isStepValid(stepIndex)
	}

	// Récupère les erreurs d'une étape (avec cache)
	const getStepErrors = (stepIndex: number): string[] => {
		// Vérifie le cache d'abord
		const cached = errorsCache.current.get(stepIndex)
		if (cached !== undefined) {
			return cached
		}

		const stepConfig = steps[stepIndex]
		if (!stepConfig) {
			errorsCache.current.set(stepIndex, [])
			return []
		}

		const errors: string[] = []

		for (const fieldName of stepConfig.fields) {
			const meta = form.getFieldMeta(fieldName)
			if (meta && meta.errors.length > 0) {
				errors.push(...meta.errors)
			}
		}

		// Met en cache
		errorsCache.current.set(stepIndex, errors)
		return errors
	}

	return {
		validateCurrentStep,
		validateStep,
		isStepValid,
		hasStepErrors,
		getStepErrors,
		clearStepErrorsCache,
		isValidating,
	}
}
