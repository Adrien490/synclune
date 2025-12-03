"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { FOCUS_DELAY_MS, FOCUSABLE_SELECTOR, ERROR_FIELD_SELECTOR } from "../constants"
import type { WizardStep } from "../types"

interface UseWizardAccessibilityOptions {
	steps: WizardStep[]
	currentStep: number
	enabled?: boolean
}

interface UseWizardAccessibilityReturn {
	/** Enregistre une ref pour une étape */
	registerStepRef: (stepIndex: number, element: HTMLElement | null) => void
	/** Focus le premier élément de l'étape */
	focusStep: (stepIndex: number) => void
	/** Focus le premier champ en erreur */
	focusFirstError: () => void
	/** Scroll vers le premier champ en erreur */
	scrollToFirstError: () => void
	/** Annonce un message pour les lecteurs d'écran */
	announce: (message: string) => void
	/** Message actuellement annoncé */
	announcement: string
	/** Récupère la ref d'une étape */
	getStepRef: (stepIndex: number) => HTMLElement | null
}

export function useWizardAccessibility({
	steps,
	currentStep,
	enabled = true,
}: UseWizardAccessibilityOptions): UseWizardAccessibilityReturn {
	const stepRefs = useRef<Map<number, HTMLElement>>(new Map())
	const previousStep = useRef(currentStep)
	const [announcement, setAnnouncement] = useState("")

	// Enregistre une ref pour une étape
	const registerStepRef = useCallback((stepIndex: number, element: HTMLElement | null) => {
		if (element) {
			stepRefs.current.set(stepIndex, element)
		} else {
			stepRefs.current.delete(stepIndex)
		}
	}, [])

	// Récupère la ref d'une étape
	const getStepRef = useCallback((stepIndex: number): HTMLElement | null => {
		return stepRefs.current.get(stepIndex) ?? null
	}, [])

	// Focus le premier élément focusable d'une étape
	const focusStep = useCallback((stepIndex: number) => {
		const stepEl = stepRefs.current.get(stepIndex)
		if (!stepEl) return

		const firstFocusable = stepEl.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
		if (firstFocusable) {
			firstFocusable.focus()
		}
	}, [])

	// Focus le premier champ en erreur
	const focusFirstError = useCallback(() => {
		const firstErrorField = document.querySelector<HTMLElement>(ERROR_FIELD_SELECTOR)
		if (firstErrorField) {
			firstErrorField.focus()
		}
	}, [])

	// Scroll vers le premier champ en erreur
	const scrollToFirstError = useCallback(() => {
		requestAnimationFrame(() => {
			const firstErrorField = document.querySelector<HTMLElement>(ERROR_FIELD_SELECTOR)
			if (firstErrorField) {
				firstErrorField.scrollIntoView({ behavior: "smooth", block: "center" })
				firstErrorField.focus()
			}
		})
	}, [])

	// Annonce un message pour les lecteurs d'écran
	const announce = useCallback((message: string) => {
		setAnnouncement(message)
		// Efface l'annonce après un délai pour permettre une nouvelle annonce
		setTimeout(() => setAnnouncement(""), 1000)
	}, [])

	// Auto-focus lors du changement d'étape
	useEffect(() => {
		if (!enabled) return

		if (previousStep.current !== currentStep) {
			const previousStepValue = previousStep.current
			previousStep.current = currentStep

			// Annonce le changement d'étape
			const stepConfig = steps[currentStep]
			if (stepConfig) {
				announce(`Étape ${currentStep + 1} sur ${steps.length}: ${stepConfig.label}`)
			}

			// Focus avec délai pour laisser le DOM se mettre à jour
			const timer = setTimeout(() => {
				focusStep(currentStep)
			}, FOCUS_DELAY_MS)

			return () => clearTimeout(timer)
		}
	}, [currentStep, steps, enabled, announce, focusStep])

	return {
		registerStepRef,
		getStepRef,
		focusStep,
		focusFirstError,
		scrollToFirstError,
		announce,
		announcement,
	}
}
