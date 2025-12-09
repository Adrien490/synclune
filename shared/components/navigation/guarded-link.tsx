"use client"

import Link, { type LinkProps } from "next/link"
import { useRouter } from "next/navigation"
import { forwardRef, type AnchorHTMLAttributes, type MouseEvent } from "react"
import { useNavigationGuardOptional } from "@/shared/contexts/navigation-guard-context"

type GuardedLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> &
	LinkProps & {
		children?: React.ReactNode
	}

/**
 * Composant Link protégé qui vérifie les guards de navigation
 * avant d'effectuer la navigation.
 *
 * Si des guards sont actifs (ex: formulaire avec modifications non sauvegardées),
 * un modal de confirmation sera affiché avant la navigation.
 *
 * @example
 * ```tsx
 * // Utilisation identique à next/link
 * <GuardedLink href="/products">Voir les produits</GuardedLink>
 *
 * // Avec des props additionnelles
 * <GuardedLink href="/admin" className="btn">Admin</GuardedLink>
 * ```
 */
export const GuardedLink = forwardRef<HTMLAnchorElement, GuardedLinkProps>(
	function GuardedLink({ href, onClick, children, ...props }, ref) {
		const router = useRouter()
		const navigationGuard = useNavigationGuardOptional()

		const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
			// Si pas de provider, comportement normal
			if (!navigationGuard) {
				onClick?.(e)
				return
			}

			// Si pas de guards actifs, comportement normal
			if (!navigationGuard.hasActiveGuards()) {
				onClick?.(e)
				return
			}

			// Bloquer la navigation native
			e.preventDefault()

			// Appeler le onClick original s'il existe
			onClick?.(e)

			// Demander la navigation via le contexte
			const destination = typeof href === "string" ? href : href.pathname || ""
			const canProceed = navigationGuard.requestNavigation(destination, () => {
				router.push(destination)
			})

			// Si la navigation est autorisée immédiatement (pas de guards)
			if (canProceed) {
				router.push(destination)
			}
		}

		return (
			<Link ref={ref} href={href} onClick={handleClick} {...props}>
				{children}
			</Link>
		)
	}
)
