"use client";

import Link from "next/link";
import * as React from "react";

import { useNavigationGuardOptional } from "@/shared/contexts/navigation-guard-context";

/**
 * `<Link>` qui consulte le registre de `NavigationGuardProvider` avant de naviguer.
 *
 * Sans ce wrapper, `useUnsavedChanges` ne protège QUE la fermeture d'onglet
 * (`beforeunload`) et le back/forward navigateur (`popstate`) : la navigation
 * client-side d'un `<Link>` ne consulte aucun guard, donc un tap sur le chevron
 * retour ou un onglet de la bottom bar perd la saisie en cours silencieusement.
 *
 * Quand un guard est actif, le clic est annulé et `requestNavigation` ouvre
 * l'`UnsavedChangesDialog` monté dans `app/layout.tsx` ; « Quitter sans
 * sauvegarder » re-dispatche alors le clic avec un drapeau de contournement.
 *
 * On re-dispatche le clic plutôt que d'appeler `router.push` pour deux raisons :
 * la navigation garde toute la sémantique de `next/link` (prefetch, scroll,
 * `replace`, `scroll={false}`…) au lieu d'une réimplémentation partielle, et le
 * composant n'a pas besoin de `useRouter()` — donc il reste montable dans un test
 * qui n'a pas mocké le router de l'App Router.
 *
 * Hors `NavigationGuardProvider`, se comporte exactement comme un `<Link>`.
 */
export function GuardedLink({ href, onClick, ref, ...props }: React.ComponentProps<typeof Link>) {
	const guard = useNavigationGuardOptional();
	const anchorRef = React.useRef<HTMLAnchorElement | null>(null);
	/** Armé par `proceed` : laisse passer le clic re-dispatché sans re-consulter le guard. */
	const bypassRef = React.useRef(false);

	return (
		<Link
			href={href}
			ref={(node) => {
				anchorRef.current = node;
				if (typeof ref === "function") return ref(node);
				if (ref) ref.current = node;
			}}
			onClick={(event) => {
				onClick?.(event);

				// Respecter un consommateur qui a déjà pris la main sur le clic.
				if (event.defaultPrevented) return;

				// Clic re-dispatché après confirmation : laisser passer.
				if (bypassRef.current) {
					bypassRef.current = false;
					return;
				}

				if (!guard) return;

				// Laisser le navigateur gérer les modificateurs (nouvel onglet/fenêtre) :
				// la page courante n'est pas quittée, donc rien à garder.
				if (
					event.metaKey ||
					event.ctrlKey ||
					event.shiftKey ||
					event.altKey ||
					event.button !== 0
				) {
					return;
				}

				const destination = typeof href === "string" ? href : (href.pathname ?? "");
				const canProceed = guard.requestNavigation(destination, () => {
					bypassRef.current = true;
					anchorRef.current?.click();
				});

				// Aucun guard actif : laisser le `<Link>` naviguer normalement.
				if (canProceed) return;

				event.preventDefault();
			}}
			{...props}
		/>
	);
}
