"use client"

import { useEffect, useRef } from "react"
import { WIZARD_STORAGE_KEY_PREFIX } from "@/shared/constants/form-wizard"

interface UseWizardPersistenceOptions {
	/** Identifiant unique du wizard */
	wizardId: string
	/** Active la persistence */
	enabled?: boolean
	/** Étape courante (pour synchronisation) */
	currentStep?: number
	/** Callback pour restaurer l'étape */
	onRestore?: (step: number) => void
}

interface UseWizardPersistenceReturn {
	/** Sauvegarde l'étape courante */
	persistStep: (step: number) => void
	/** Restaure l'étape sauvegardée */
	restoreStep: () => number | null
	/** Efface la persistence */
	clearPersistence: () => void
	/** Vérifie si une étape est sauvegardée */
	hasSavedStep: () => boolean
}

export function useWizardPersistence({
	wizardId,
	enabled = false,
	currentStep,
	onRestore,
}: UseWizardPersistenceOptions): UseWizardPersistenceReturn {
	const key = `${WIZARD_STORAGE_KEY_PREFIX}${wizardId}`
	const hasRestored = useRef(false)

	// Sauvegarde l'étape courante
	const persistStep = (step: number) => {
		if (!enabled) return
		try {
			sessionStorage.setItem(key, String(step))
		} catch {
			// sessionStorage peut être indisponible (mode privé, etc.)
		}
	}

	// Restaure l'étape sauvegardée
	const restoreStep = (): number | null => {
		if (!enabled) return null
		try {
			const saved = sessionStorage.getItem(key)
			if (saved !== null) {
				const step = parseInt(saved, 10)
				if (!isNaN(step) && step >= 0) {
					return step
				}
			}
		} catch {
			// sessionStorage peut être indisponible
		}
		return null
	}

	// Efface la persistence
	const clearPersistence = () => {
		try {
			sessionStorage.removeItem(key)
		} catch {
			// sessionStorage peut être indisponible
		}
	}

	// Vérifie si une étape est sauvegardée
	const hasSavedStep = (): boolean => {
		if (!enabled) return false
		try {
			return sessionStorage.getItem(key) !== null
		} catch {
			return false
		}
	}

	// Restauration automatique au montage
	useEffect(() => {
		if (!enabled || hasRestored.current) return

		const savedStep = restoreStep()
		if (savedStep !== null && onRestore) {
			hasRestored.current = true
			onRestore(savedStep)
		}
	}, [enabled, restoreStep, onRestore])

	// Persistence automatique lors du changement d'étape
	useEffect(() => {
		if (!enabled || currentStep === undefined) return
		persistStep(currentStep)
	}, [enabled, currentStep, persistStep])

	return {
		persistStep,
		restoreStep,
		clearPersistence,
		hasSavedStep,
	}
}
