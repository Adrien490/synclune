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
 * - Le header est positionné via `transform: translateY(--announcement-bar-height)`
 *   au lieu de `top: var(...)`. La prop `transform` est composable (GPU thread)
 *   alors que `top` déclenche un layout reflow à chaque variation.
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
			style={{
				viewTransitionName: "shop-navbar",
				transform: "translateY(var(--announcement-bar-height, 0px))",
			}}
			className={cn(
				"pwa-header",
				"group fixed inset-x-0 top-0 z-40",
				"ease-out motion-safe:transition-transform motion-safe:duration-[var(--duration-slow)]",
			)}
		>
			{/* Glass effect layer — only opacity transitions (compositor-friendly). */}
			<div
				aria-hidden="true"
				className={cn(
					"pointer-events-none absolute inset-0 -z-10",
					"bg-background/95 border-border border-b shadow-lg shadow-black/8 backdrop-blur-md",
					"opacity-0 motion-safe:transition-opacity motion-safe:duration-[var(--duration-slow)] motion-safe:ease-out",
					"group-data-[scrolled=true]:opacity-100",
				)}
			/>
			{children}
		</header>
	);
}
