"use client"

import { useWizardContext } from "../components/wizard-context"
import { useWizardNavigation } from "./use-wizard-navigation"
import { useWizardValidation } from "./use-wizard-validation"
import { useWizardAccessibility } from "./use-wizard-accessibility"
import { useWizardPersistence } from "./use-wizard-persistence"
import { mergeMessages } from "../constants"
import type { FormLike, WizardStep, WizardDirection, WizardMessages } from "../types"

export interface UseFormWizardOptions {
	/** Configuration des étapes */
	steps: WizardStep[]
	/** Interface du formulaire */
	form: FormLike
	/** Callback lors du changement d'étape */
	onStepChange?: (step: number, direction: WizardDirection) => void
	/** Messages personnalisés */
	messages?: WizardMessages
	/** Active la persistence de l'étape (sessionStorage) */
	persist?: boolean | string
}

export interface UseFormWizardReturn {
	// État
	currentStep: number
	totalSteps: number
	currentStepConfig: WizardStep | undefined
	isFirstStep: boolean
	isLastStep: boolean
	isValidating: boolean

	// Navigation
	goToStep: (step: number) => Promise<boolean>
	goNext: () => Promise<boolean>
	goPrevious: () => void
	resetWizard: () => void

	// Validation
	validateCurrentStep: () => Promise<boolean>
	isStepValid: (stepIndex: number) => boolean
	hasStepErrors: (stepIndex: number) => boolean
	getStepErrors: (stepIndex: number) => string[]
	scrollToFirstError: () => void
	markStepIncomplete: (step: number) => void

	// Progress
	completedSteps: Set<number>
	progress: number

	// Mode
	isMobile: boolean
	effectiveMode: "wizard" | "all"

	// Accessibilité
	registerStepRef: (stepIndex: number, element: HTMLElement | null) => void
	announcement: string

	// Étapes visibles
	visibleSteps: WizardStep[]

	// Persistence
	clearPersistence: () => void
}

export function useFormWizard({
	steps,
	form,
	onStepChange,
	messages,
	persist = false,
}: UseFormWizardOptions): UseFormWizardReturn {
	const {
		currentStep,
		setCurrentStep,
		totalSteps,
		completedSteps,
		markStepCompleted,
		markStepIncomplete,
		resetWizard,
		isMobile,
		desktopMode,
	} = useWizardContext()

	// Merge messages
	const mergedMessages = mergeMessages(messages)

	// Validation hook
	const validation = useWizardValidation({
		steps,
		form,
		currentStep,
	})

	// Accessibilité hook
	const accessibility = useWizardAccessibility({
		steps,
		currentStep,
	})

	// Persistence hook
	const persistenceId = typeof persist === "string" ? persist : "default"
	const persistence = useWizardPersistence({
		wizardId: persistenceId,
		enabled: !!persist,
		currentStep,
		onRestore: (step) => {
			if (step < steps.length) {
				setCurrentStep(step)
			}
		},
	})

	// Callback de validation échouée
	const onValidationFailed = () => {
		// Scroll vers la première erreur (pas de toast, l'erreur est déjà visible dans l'UI)
		accessibility.scrollToFirstError()
	}

	// Navigation hook
	const navigation = useWizardNavigation({
		steps,
		currentStep,
		setCurrentStep,
		onStepChange,
		validateBeforeNext: validation.validateCurrentStep,
		onValidationFailed,
		markStepCompleted,
		// Invalide le cache de validation quand on navigue en arrière
		onNavigateBack: validation.clearStepErrorsCache,
	})

	// Progress percentage
	const progress = Math.round((completedSteps.size / totalSteps) * 100)

	// Mode effectif basé sur le device
	const effectiveMode = isMobile ? "wizard" : desktopMode

	return {
		// État
		currentStep,
		totalSteps,
		currentStepConfig: navigation.currentStepConfig,
		isFirstStep: navigation.isFirstStep,
		isLastStep: navigation.isLastStep,
		isValidating: validation.isValidating,

		// Navigation
		goToStep: navigation.goToStep,
		goNext: navigation.nextStep,
		goPrevious: navigation.previousStep,
		resetWizard,

		// Validation
		validateCurrentStep: validation.validateCurrentStep,
		isStepValid: validation.isStepValid,
		hasStepErrors: validation.hasStepErrors,
		getStepErrors: validation.getStepErrors,
		scrollToFirstError: accessibility.scrollToFirstError,
		markStepIncomplete,

		// Progress
		completedSteps,
		progress,

		// Mode
		isMobile,
		effectiveMode,

		// Accessibilité
		registerStepRef: accessibility.registerStepRef,
		announcement: accessibility.announcement,

		// Étapes visibles
		visibleSteps: navigation.visibleSteps,

		// Persistence
		clearPersistence: persistence.clearPersistence,
	}
}
