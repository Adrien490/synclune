"use client"

import {
	createContext,
	useContext,
	useState,
	type ReactNode,
} from "react"
import { useIsMobile } from "@/shared/hooks/use-mobile"

/** Mode d'affichage du wizard sur desktop */
export type WizardDesktopMode = "wizard" | "all"

interface WizardContextValue {
	currentStep: number
	setCurrentStep: (step: number) => void
	totalSteps: number
	completedSteps: Set<number>
	markStepCompleted: (step: number) => void
	markStepIncomplete: (step: number) => void
	resetWizard: () => void
	/** Mode configuré pour desktop */
	desktopMode: WizardDesktopMode
	/** Détection mobile via media query */
	isMobile: boolean
	/** Mode effectif: "wizard" sur mobile, ou selon desktopMode sur desktop */
	effectiveMode: WizardDesktopMode
}

const WizardContext = createContext<WizardContextValue | null>(null)

export function useWizardContext() {
	const context = useContext(WizardContext)
	if (!context) {
		throw new Error("useWizardContext must be used within WizardProvider")
	}
	return context
}

export interface WizardProviderProps {
	children: ReactNode
	totalSteps: number
	initialStep?: number
	/** Mode d'affichage sur desktop: "wizard" (étapes) ou "all" (toutes les sections visibles) */
	desktopMode?: WizardDesktopMode
}

export function WizardProvider({
	children,
	totalSteps,
	initialStep = 0,
	desktopMode = "all",
}: WizardProviderProps) {
	const [currentStep, setCurrentStep] = useState(initialStep)
	const [completedSteps, setCompletedSteps] = useState<Set<number>>(() => new Set())
	const isMobile = useIsMobile()

	// Mode effectif: wizard sur mobile, sinon selon la configuration desktop
	const effectiveMode: WizardDesktopMode = isMobile ? "wizard" : desktopMode

	// Optimisation: évite de créer un nouveau Set si l'étape est déjà complétée
	const markStepCompleted = (step: number) => {
		setCompletedSteps((prev) => {
			if (prev.has(step)) return prev // Même référence si pas de changement
			const next = new Set(prev)
			next.add(step)
			return next
		})
	}

	// Optimisation: évite de créer un nouveau Set si l'étape n'est pas dans le set
	const markStepIncomplete = (step: number) => {
		setCompletedSteps((prev) => {
			if (!prev.has(step)) return prev // Même référence si pas de changement
			const next = new Set(prev)
			next.delete(step)
			return next
		})
	}

	const resetWizard = () => {
		setCurrentStep(initialStep)
		setCompletedSteps(new Set())
	}

	const value = {
		currentStep,
		setCurrentStep,
		totalSteps,
		completedSteps,
		markStepCompleted,
		markStepIncomplete,
		resetWizard,
		desktopMode,
		isMobile,
		effectiveMode,
	}

	return (
		<WizardContext.Provider value={value}>{children}</WizardContext.Provider>
	)
}
