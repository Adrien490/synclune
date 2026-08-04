"use client";

import { useIsScrolled } from "@/shared/hooks/use-is-scrolled";
import { cn } from "@/shared/utils/cn";

interface NavbarWrapperProps {
	children: React.ReactNode;
}

/**
 * Wrapper client de la Navbar avec effet de scroll (glass effect).
 *
 * Architecture compositor-friendly :
 * - Le header est collé en `top-0` sans offset : la barre d'annonce, seule chose
 *   qui pouvait le décaler, a été retirée (2026-08-04). Plus de `transform` ni de
 *   transition associée — un header dont l'offset est constant n'a rien à animer.
 * - Le glass effect (backdrop, shadow, border) vit sur un calque absolu dédié
 *   dont seule l'opacité est animée — pas de transitions sur
 *   `background-color/border-color/box-shadow/backdrop-filter`.
 * - `data-scrolled` reste exposé pour les animations enfants (Logo scale).
 */
export function NavbarWrapper({ children }: NavbarWrapperProps) {
	const isScrolled = useIsScrolled(20);

	return (
		<header
			data-scrolled={isScrolled}
			data-home-navbar
			style={{ viewTransitionName: "shop-navbar" }}
			className={cn("pwa-header", "group fixed inset-x-0 top-0 z-(--z-header)")}
		>
			{/* Glass effect layer — only opacity transitions (compositor-friendly). */}
			<div
				aria-hidden="true"
				className={cn(
					"pointer-events-none absolute inset-0 -z-10",
					// `polaroid-paper` : le grain de papier mat des cartes Atelier, en
					// pseudo-élément. Il ne coûte aucune propriété animée de plus — la
					// couche entière ne transitionne toujours que son opacité.
					"polaroid-paper",
					"bg-background/95 border-border shadow-header border-b backdrop-blur-md",
					"opacity-0 motion-safe:transition-opacity motion-safe:duration-[var(--duration-slow)] motion-safe:ease-out",
					"group-data-[scrolled=true]:opacity-100",
				)}
			/>
			{children}
		</header>
	);
}
