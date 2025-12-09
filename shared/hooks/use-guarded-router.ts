"use client"

import { useRouter } from "next/navigation"
import { useNavigationGuardOptional } from "@/shared/contexts/navigation-guard-context"

type NavigateOptions = {
	scroll?: boolean
}

/**
 * Hook qui retourne un router protégé par les guards de navigation.
 *
 * Utilise les mêmes méthodes que `useRouter()` de Next.js,
 * mais vérifie les guards avant d'effectuer la navigation.
 *
 * @example
 * ```tsx
 * const router = useGuardedRouter()
 *
 * // Navigation protégée
 * router.push("/products")
 *
 * // Navigation forcée (ignore les guards)
 * router.pushForce("/products")
 * ```
 */
export function useGuardedRouter() {
	const router = useRouter()
	const navigationGuard = useNavigationGuardOptional()

	/**
	 * Navigation protégée vers une URL
	 */
	const push = (href: string, options?: NavigateOptions) => {
		// Si pas de provider ou pas de guards, navigation directe
		if (!navigationGuard || !navigationGuard.hasActiveGuards()) {
			router.push(href, options)
			return
		}

		// Demander la navigation via le contexte
		const canProceed = navigationGuard.requestNavigation(href, () => {
			router.push(href, options)
		})

		// Si autorisée immédiatement
		if (canProceed) {
			router.push(href, options)
		}
	}

	/**
	 * Navigation protégée avec remplacement de l'historique
	 */
	const replace = (href: string, options?: NavigateOptions) => {
		// Si pas de provider ou pas de guards, navigation directe
		if (!navigationGuard || !navigationGuard.hasActiveGuards()) {
			router.replace(href, options)
			return
		}

		// Demander la navigation via le contexte
		const canProceed = navigationGuard.requestNavigation(href, () => {
			router.replace(href, options)
		})

		// Si autorisée immédiatement
		if (canProceed) {
			router.replace(href, options)
		}
	}

	/**
	 * Navigation forcée (ignore les guards)
	 */
	const pushForce = (href: string, options?: NavigateOptions) => {
		router.push(href, options)
	}

	/**
	 * Navigation forcée avec remplacement (ignore les guards)
	 */
	const replaceForce = (href: string, options?: NavigateOptions) => {
		router.replace(href, options)
	}

	return {
		push,
		replace,
		pushForce,
		replaceForce,
		// Méthodes non-protégées (pas de navigation)
		back: router.back,
		forward: router.forward,
		refresh: router.refresh,
		prefetch: router.prefetch,
	}
}
