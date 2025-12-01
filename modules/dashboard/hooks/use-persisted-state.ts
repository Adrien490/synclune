"use client"

import { useCallback, useEffect, useState } from "react"

/**
 * Hook pour persister un etat dans localStorage
 * Utile pour les preferences utilisateur (sections collapsed, etc.)
 */
export function usePersistedState<T>(
	key: string,
	defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
	// Initialiser avec la valeur par defaut (hydratation SSR safe)
	const [state, setState] = useState<T>(defaultValue)
	const [isHydrated, setIsHydrated] = useState(false)

	// Hydrater depuis localStorage apres le mount
	useEffect(() => {
		try {
			const stored = localStorage.getItem(key)
			if (stored) {
				const parsed = JSON.parse(stored) as T
				setState(parsed)
			}
		} catch {
			// Ignorer les erreurs de parsing
		}
		setIsHydrated(true)
	}, [key])

	// Setter qui persiste dans localStorage
	const setPersistedState = useCallback(
		(value: T | ((prev: T) => T)) => {
			setState((prev) => {
				const newValue = typeof value === "function" ? (value as (prev: T) => T)(prev) : value
				try {
					localStorage.setItem(key, JSON.stringify(newValue))
				} catch {
					// Ignorer les erreurs de stockage (quota exceeded, etc.)
				}
				return newValue
			})
		},
		[key]
	)

	// Retourner la valeur par defaut pendant l'hydratation pour eviter les mismatches
	return [isHydrated ? state : defaultValue, setPersistedState]
}
