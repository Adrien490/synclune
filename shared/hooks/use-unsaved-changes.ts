"use client"

import { useEffect, useId, useRef } from "react"
import { useNavigationGuardOptional } from "@/shared/contexts/navigation-guard-context"

const DEFAULT_MESSAGE =
	"Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter cette page ?"

interface UseUnsavedChangesOptions {
	/**
	 * Message à afficher dans le modal de confirmation
	 * (note : les navigateurs modernes ignorent les messages personnalisés pour beforeunload)
	 */
	message?: string
	/**
	 * Callback appelé quand la navigation est bloquée
	 * (utile pour afficher des indicateurs visuels ou logs)
	 */
	onBlock?: () => void
	/**
	 * Intercepter la navigation back/forward du navigateur
	 * @default true
	 */
	interceptHistoryNavigation?: boolean
}

interface UseUnsavedChangesReturn {
	/**
	 * Indique si le hook bloque actuellement la navigation
	 */
	isBlocking: boolean
	/**
	 * Permet temporairement la navigation (pour la prochaine navigation uniquement)
	 * Utile après une sauvegarde réussie pour rediriger
	 */
	allowNavigation: () => void
}

/**
 * Hook pour avertir les utilisateurs des modifications non sauvegardées
 * avant de quitter la page.
 *
 * Protège contre :
 * - Fermeture/rafraîchissement de l'onglet (beforeunload)
 * - Boutons back/forward du navigateur (popstate)
 * - Navigation via Link et router.push (si NavigationGuardProvider est présent)
 *
 * @param isDirty - Indique si le formulaire a des modifications non sauvegardées
 * @param enabled - Activer/désactiver la protection (default: true)
 * @param options - Options de configuration
 *
 * @example
 * ```tsx
 * // Usage simple
 * useUnsavedChanges(form.state.isDirty)
 *
 * // Avec options
 * const { allowNavigation } = useUnsavedChanges(form.state.isDirty, true, {
 *   message: "Formulaire non enregistré !",
 *   onBlock: () => console.log("Navigation bloquée"),
 * })
 *
 * // Après sauvegarde, permettre la redirection
 * const handleSubmit = async () => {
 *   await saveData()
 *   allowNavigation()
 *   router.push("/success")
 * }
 *
 * // Conditionnel
 * useUnsavedChanges(form.state.isDirty && !isSubmitting)
 * ```
 */
export function useUnsavedChanges(
	isDirty: boolean,
	enabled = true,
	options: UseUnsavedChangesOptions = {}
): UseUnsavedChangesReturn {
	const {
		message = DEFAULT_MESSAGE,
		onBlock,
		interceptHistoryNavigation = true,
	} = options

	const id = useId()
	const navigationGuard = useNavigationGuardOptional()

	// Ref pour permettre temporairement la navigation
	const allowNavigationRef = useRef(false)

	// Ref pour éviter les appels récursifs dans popstate
	const isBlockingPopstateRef = useRef(false)

	// Calculer si on bloque actuellement
	const isBlocking = enabled && isDirty && !allowNavigationRef.current

	// Enregistrer/désenregistrer le guard dans le contexte
	useEffect(() => {
		if (!navigationGuard) return
		if (!isBlocking) {
			navigationGuard.unregisterGuard(id)
			return
		}

		navigationGuard.registerGuard(id, { message, onBlock })

		return () => {
			navigationGuard.unregisterGuard(id)
		}
	}, [navigationGuard, id, isBlocking, message, onBlock])

	// Handler pour beforeunload (fermeture/refresh navigateur)
	useEffect(() => {
		if (!isBlocking) return

		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			e.preventDefault()
			// Pour les navigateurs plus anciens
			e.returnValue = message
			return message
		}

		window.addEventListener("beforeunload", handleBeforeUnload)

		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload)
		}
	}, [isBlocking, message])

	// Handler pour popstate (back/forward navigateur)
	useEffect(() => {
		if (!isBlocking || !interceptHistoryNavigation) return

		// Ajouter un état pour pouvoir intercepter le retour
		window.history.pushState({ guardId: id }, "", window.location.href)

		const handlePopState = () => {
			if (isBlockingPopstateRef.current) return

			// Afficher la confirmation native pour popstate
			// (le modal du contexte ne fonctionne pas bien avec popstate car
			// l'URL a déjà changé quand popstate est déclenché)
			// eslint-disable-next-line no-alert
			const shouldLeave = window.confirm(message)

			if (shouldLeave) {
				// Permettre la navigation
				allowNavigationRef.current = true
				window.history.back()
				return
			}

			// Annuler la navigation - remettre l'URL
			isBlockingPopstateRef.current = true
			window.history.pushState({ guardId: id }, "", window.location.href)
			isBlockingPopstateRef.current = false

			onBlock?.()
		}

		window.addEventListener("popstate", handlePopState)

		return () => {
			window.removeEventListener("popstate", handlePopState)
		}
	}, [isBlocking, interceptHistoryNavigation, id, message, onBlock])

	const allowNavigation = () => {
		allowNavigationRef.current = true
		// Réinitialiser après un tick pour permettre la navigation
		setTimeout(() => {
			allowNavigationRef.current = false
		}, 100)
	}

	return {
		isBlocking,
		allowNavigation,
	}
}

/**
 * Variante du hook qui accepte un objet pour une configuration plus explicite
 */
export function useUnsavedChangesWithOptions(options: {
	isDirty: boolean
	enabled?: boolean
	message?: string
	onBlock?: () => void
	interceptHistoryNavigation?: boolean
}): UseUnsavedChangesReturn {
	const { isDirty, enabled = true, ...rest } = options
	return useUnsavedChanges(isDirty, enabled, rest)
}
