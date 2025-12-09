"use client"

import {
	createContext,
	useContext,
	useRef,
	useState,
	type ReactNode,
} from "react"

/**
 * Configuration d'un guard de navigation
 */
export interface NavigationGuard {
	/** Message à afficher dans le modal de confirmation */
	message?: string
	/** Callback appelé quand la navigation est bloquée */
	onBlock?: () => void
}

/**
 * État d'une navigation en attente de confirmation
 */
interface PendingNavigation {
	/** URL de destination */
	destination: string
	/** Fonction à appeler pour procéder à la navigation */
	proceed: () => void
}

/**
 * Valeur du contexte de navigation guard
 */
interface NavigationGuardContextValue {
	/**
	 * Enregistre un guard de navigation
	 * @param id - Identifiant unique du guard
	 * @param guard - Configuration du guard
	 */
	registerGuard: (id: string, guard: NavigationGuard) => void

	/**
	 * Supprime un guard de navigation
	 * @param id - Identifiant du guard à supprimer
	 */
	unregisterGuard: (id: string) => void

	/**
	 * Vérifie si une navigation peut être effectuée
	 * Si des guards sont actifs, affiche le modal de confirmation
	 * @param destination - URL de destination
	 * @param proceed - Fonction à appeler si la navigation est autorisée
	 * @returns true si la navigation peut procéder immédiatement, false si bloquée
	 */
	requestNavigation: (destination: string, proceed: () => void) => boolean

	/**
	 * Vérifie si des guards sont actuellement actifs
	 */
	hasActiveGuards: () => boolean

	/**
	 * Confirme la navigation en attente (utilisé par le modal)
	 */
	confirmNavigation: () => void

	/**
	 * Annule la navigation en attente (utilisé par le modal)
	 */
	cancelNavigation: () => void

	/**
	 * Navigation en attente de confirmation
	 */
	pendingNavigation: PendingNavigation | null

	/**
	 * Message à afficher dans le modal
	 */
	guardMessage: string
}

const DEFAULT_MESSAGE =
	"Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter cette page ?"

const NavigationGuardContext = createContext<NavigationGuardContextValue | null>(null)

interface NavigationGuardProviderProps {
	children: ReactNode
}

export function NavigationGuardProvider({ children }: NavigationGuardProviderProps) {
	// Map des guards actifs (id -> guard)
	const guardsRef = useRef<Map<string, NavigationGuard>>(new Map())

	// Navigation en attente de confirmation
	const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation | null>(null)

	// Message à afficher (du premier guard avec un message personnalisé)
	const [guardMessage, setGuardMessage] = useState(DEFAULT_MESSAGE)

	const registerGuard = (id: string, guard: NavigationGuard) => {
		guardsRef.current.set(id, guard)
	}

	const unregisterGuard = (id: string) => {
		guardsRef.current.delete(id)
	}

	const hasActiveGuards = () => {
		return guardsRef.current.size > 0
	}

	const getGuardMessage = (): string => {
		// Trouve le premier guard avec un message personnalisé
		for (const guard of guardsRef.current.values()) {
			if (guard.message) {
				return guard.message
			}
		}
		return DEFAULT_MESSAGE
	}

	const notifyBlocked = () => {
		// Appelle tous les callbacks onBlock
		for (const guard of guardsRef.current.values()) {
			guard.onBlock?.()
		}
	}

	const requestNavigation = (destination: string, proceed: () => void): boolean => {
		// Pas de guards actifs -> navigation autorisée immédiatement
		if (!hasActiveGuards()) {
			return true
		}

		// Guards actifs -> on stocke la navigation en attente et on affiche le modal
		setGuardMessage(getGuardMessage())
		setPendingNavigation({ destination, proceed })
		notifyBlocked()
		return false
	}

	const confirmNavigation = () => {
		if (pendingNavigation) {
			// Temporairement vider les guards pour permettre la navigation
			const savedGuards = new Map(guardsRef.current)
			guardsRef.current.clear()

			// Procéder à la navigation
			pendingNavigation.proceed()

			// Restaurer les guards (au cas où la navigation échoue)
			guardsRef.current = savedGuards

			// Fermer le modal
			setPendingNavigation(null)
		}
	}

	const cancelNavigation = () => {
		setPendingNavigation(null)
	}

	return (
		<NavigationGuardContext.Provider
			value={{
				registerGuard,
				unregisterGuard,
				requestNavigation,
				hasActiveGuards,
				confirmNavigation,
				cancelNavigation,
				pendingNavigation,
				guardMessage,
			}}
		>
			{children}
		</NavigationGuardContext.Provider>
	)
}

/**
 * Hook pour accéder au contexte de navigation guard
 */
export function useNavigationGuard() {
	const context = useContext(NavigationGuardContext)
	if (!context) {
		throw new Error("useNavigationGuard must be used within NavigationGuardProvider")
	}
	return context
}

/**
 * Hook pour accéder au contexte de navigation guard de manière optionnelle
 * (ne throw pas si le provider n'est pas présent)
 */
export function useNavigationGuardOptional() {
	return useContext(NavigationGuardContext)
}
