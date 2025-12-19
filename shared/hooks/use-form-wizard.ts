"use client"

import { useWizardContext, type WizardDesktopMode } from "@/shared/components/form-wizard/wizard-context"
import { useWizardNavigation } from "./use-wizard-navigation"
import { useWizardValidation } from "./use-wizard-validation"
import { useWizardAccessibility } from "./use-wizard-accessibility"
import { useWizardPersistence } from "./use-wizard-persistence"
import { mergeMessages } from "@/shared/constants/form-wizard"
import type { FormLike, WizardStep, WizardDirection, WizardMessages } from "@/shared/types/form-wizard"

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

	// Accessibilité
	registerStepRef: (stepIndex: number, element: HTMLElement | null) => void
	announcement: string

	// Étapes visibles
	visibleSteps: WizardStep[]

	// Persistence
	clearPersistence: () => void

	// Mode responsive
	/** Détection mobile via media query */
	isMobile: boolean
	/** Mode effectif: "wizard" sur mobile, ou selon desktopMode sur desktop */
	effectiveMode: WizardDesktopMode
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
		effectiveMode,
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

		// Accessibilité
		registerStepRef: accessibility.registerStepRef,
		announcement: accessibility.announcement,

		// Étapes visibles
		visibleSteps: navigation.visibleSteps,

		// Persistence
		clearPersistence: persistence.clearPersistence,

		// Mode responsive
		isMobile,
		effectiveMode,
	}
}
