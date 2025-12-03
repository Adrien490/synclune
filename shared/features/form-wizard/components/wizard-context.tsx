"use client"

import {
	createContext,
	useContext,
	useState,
	useCallback,
	useMemo,
	type ReactNode,
} from "react"
import { useIsMobile } from "@/shared/hooks/use-mobile"
import type { WizardMode } from "../types"

interface WizardContextValue {
	currentStep: number
	setCurrentStep: (step: number) => void
	totalSteps: number
	completedSteps: Set<number>
	markStepCompleted: (step: number) => void
	markStepIncomplete: (step: number) => void
	resetWizard: () => void
	isMobile: boolean
	desktopMode: WizardMode
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
	desktopMode?: WizardMode
	initialStep?: number
}

export function WizardProvider({
	children,
	totalSteps,
	desktopMode = "all",
	initialStep = 0,
}: WizardProviderProps) {
	const [currentStep, setCurrentStep] = useState(initialStep)
	const [completedSteps, setCompletedSteps] = useState<Set<number>>(() => new Set())
	const isMobile = useIsMobile()

	// Optimisation: évite de créer un nouveau Set si l'étape est déjà complétée
	const markStepCompleted = useCallback((step: number) => {
		setCompletedSteps((prev) => {
			if (prev.has(step)) return prev // Même référence si pas de changement
			const next = new Set(prev)
			next.add(step)
			return next
		})
	}, [])

	// Optimisation: évite de créer un nouveau Set si l'étape n'est pas dans le set
	const markStepIncomplete = useCallback((step: number) => {
		setCompletedSteps((prev) => {
			if (!prev.has(step)) return prev // Même référence si pas de changement
			const next = new Set(prev)
			next.delete(step)
			return next
		})
	}, [])

	const resetWizard = useCallback(() => {
		setCurrentStep(initialStep)
		setCompletedSteps(new Set())
	}, [initialStep])

	const value = useMemo(
		() => ({
			currentStep,
			setCurrentStep,
			totalSteps,
			completedSteps,
			markStepCompleted,
			markStepIncomplete,
			resetWizard,
			isMobile,
			desktopMode,
		}),
		[
			currentStep,
			totalSteps,
			completedSteps,
			markStepCompleted,
			markStepIncomplete,
			resetWizard,
			isMobile,
			desktopMode,
		]
	)

	return (
		<WizardContext.Provider value={value}>{children}</WizardContext.Provider>
	)
}
