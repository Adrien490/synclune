"use client"

import { useRef } from "react"
import type { WizardStep, WizardDirection } from "../types"

interface UseWizardNavigationOptions {
	steps: WizardStep[]
	currentStep: number
	setCurrentStep: (step: number) => void
	onStepChange?: (step: number, direction: WizardDirection) => void
	validateBeforeNext?: () => Promise<boolean>
	onValidationFailed?: () => void
	markStepCompleted?: (step: number) => void
	/** Callback lors de la navigation arrière (pour invalider le cache de validation) */
	onNavigateBack?: (targetStep: number) => void
}

interface UseWizardNavigationReturn {
	/** Aller à une étape spécifique */
	goToStep: (targetStep: number) => Promise<boolean>
	/** Aller à l'étape suivante */
	nextStep: () => Promise<boolean>
	/** Aller à l'étape précédente */
	previousStep: () => void
	/** Peut-on aller à l'étape suivante */
	canGoNext: boolean
	/** Peut-on aller à l'étape précédente */
	canGoPrevious: boolean
	/** Est-ce la première étape */
	isFirstStep: boolean
	/** Est-ce la dernière étape */
	isLastStep: boolean
	/** Configuration de l'étape courante */
	currentStepConfig: WizardStep | undefined
	/** Étapes visibles (filtrées par condition) */
	visibleSteps: WizardStep[]
	/** Index de l'étape courante parmi les étapes visibles */
	visibleCurrentIndex: number
}

export function useWizardNavigation({
	steps,
	currentStep,
	setCurrentStep,
	onStepChange,
	validateBeforeNext,
	onValidationFailed,
	markStepCompleted,
	onNavigateBack,
}: UseWizardNavigationOptions): UseWizardNavigationReturn {
	// Protection contre les doubles clics / navigation rapide
	const isNavigating = useRef(false)

	// Filtrer les étapes selon leurs conditions
	const visibleSteps = steps.filter((step) => !step.condition || step.condition())

	// Trouver l'index visible correspondant
	const visibleCurrentIndex = (() => {
		const currentStepConfig = steps[currentStep]
		if (!currentStepConfig) return 0
		return visibleSteps.findIndex((s) => s.id === currentStepConfig.id)
	})()

	const currentStepConfig = steps[currentStep]
	const isFirstStep = currentStep === 0
	const isLastStep = currentStep === steps.length - 1

	// Vérifier si l'étape cible est navigable
	const isStepNavigable = (stepIndex: number): boolean => {
		const step = steps[stepIndex]
		if (!step) return false
		if (step.disabled) return false
		if (step.condition && !step.condition()) return false
		return true
	}

	const canGoNext = !isLastStep && isStepNavigable(currentStep + 1)
	const canGoPrevious = !isFirstStep && isStepNavigable(currentStep - 1)

	// Navigation vers une étape spécifique
	const goToStep = async (targetStep: number): Promise<boolean> => {
		// Protection contre les doubles clics
		if (isNavigating.current) return false

		if (targetStep < 0 || targetStep >= steps.length) return false
		if (!isStepNavigable(targetStep)) return false

		// Navigation arrière: toujours permise
		if (targetStep < currentStep) {
			// Invalide le cache de validation pour l'étape cible (l'utilisateur peut avoir modifié des champs)
			onNavigateBack?.(targetStep)
			setCurrentStep(targetStep)
			onStepChange?.(targetStep, "backward")
			return true
		}

		// Navigation avant: nécessite validation
		if (targetStep > currentStep) {
			isNavigating.current = true
			try {
				if (validateBeforeNext) {
					const isValid = await validateBeforeNext()
					if (!isValid) {
						onValidationFailed?.()
						return false
					}
				}

				markStepCompleted?.(currentStep)
				setCurrentStep(targetStep)
				onStepChange?.(targetStep, "forward")
				return true
			} finally {
				isNavigating.current = false
			}
		}

		return true
	}

	// Aller à l'étape suivante
	const nextStep = async (): Promise<boolean> => {
		if (isLastStep) return false
		return goToStep(currentStep + 1)
	}

	// Aller à l'étape précédente
	const previousStep = () => {
		if (isFirstStep) return
		const targetStep = currentStep - 1
		// Invalide le cache de validation pour l'étape cible
		onNavigateBack?.(targetStep)
		setCurrentStep(targetStep)
		onStepChange?.(targetStep, "backward")
	}

	return {
		goToStep,
		nextStep,
		previousStep,
		canGoNext,
		canGoPrevious,
		isFirstStep,
		isLastStep,
		currentStepConfig,
		visibleSteps,
		visibleCurrentIndex,
	}
}
