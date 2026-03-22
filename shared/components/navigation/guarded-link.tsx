"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { forwardRef, type ComponentProps } from "react";
import { useNavigationGuardOptional } from "@/shared/contexts/navigation-guard-context";

type GuardedLinkProps = ComponentProps<typeof Link>;

/**
 * Composant Link protégé qui vérifie les guards de navigation
 * avant d'effectuer la navigation.
 *
 * Si des guards sont actifs (ex: formulaire avec modifications non sauvegardées),
 * un modal de confirmation sera affiché avant la navigation.
 *
 * Utilise onNavigate au lieu de onClick pour ne bloquer que la navigation
 * client-side (Ctrl+Click pour nouvel onglet et liens externes ne sont pas affectés).
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
export const GuardedLink = forwardRef<HTMLAnchorElement, GuardedLinkProps>(function GuardedLink(
	{ href, onClick, children, ...props },
	ref,
) {
	const router = useRouter();
	const navigationGuard = useNavigationGuardOptional();

	const handleNavigate = (e: { preventDefault: () => void }) => {
		// Si pas de provider ou pas de guards actifs, laisser la navigation se faire
		if (!navigationGuard?.hasActiveGuards()) return;

		// Bloquer la navigation
		e.preventDefault();

		// Demander la navigation via le contexte (affiche le modal de confirmation)
		const destination = typeof href === "string" ? href : (href.pathname ?? "");
		const canProceed = navigationGuard.requestNavigation(destination, () => {
			router.push(destination);
		});

		// Si la navigation est autorisée immédiatement (pas de guards)
		if (canProceed) {
			router.push(destination);
		}
	};

	return (
		<Link ref={ref} href={href} onClick={onClick} onNavigate={handleNavigate} {...props}>
			{children}
		</Link>
	);
});
