"use client";

import { useIsScrolled } from "@/shared/hooks/use-is-scrolled";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";
import { ChevronLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { generateBreadcrumbs } from "./dashboard-breadcrumb";

const DETAIL_ROUTE_PATTERNS = [
	/^\/admin\/ventes\/commandes\/[^/]+$/,
	/^\/admin\/ventes\/remboursements\/[^/]+$/,
	/^\/admin\/catalogue\/produits\/[^/]+$/,
	/^\/admin\/catalogue\/collections\/[^/]+$/,
	/^\/admin\/configuration\/boutique\/fermer$/,
];

function isDetailRoute(pathname: string): boolean {
	return DETAIL_ROUTE_PATTERNS.some((re) => re.test(pathname));
}

/**
 * Mobile header for admin pages.
 * Shows current page title + contextual actions. Hidden on md+.
 * Scroll-aware: transparent at top, glass effect on scroll.
 *
 * Navigation redundancies by design:
 * - Bottom bar covers primary nav (Accueil, Commandes, Produits, Menu + FAB command palette)
 * - Back button (here) appears on detail routes — backup for non-standalone browsers
 *   where SwipeBackProvider is a no-op
 * - Search icon mirrors the FAB command palette for thumb-reach users at the top
 */
export function AdminMobileHeader() {
	const pathname = usePathname();
	const router = useRouter();
	const isScrolled = useIsScrolled(20);
	const breadcrumbs = generateBreadcrumbs(pathname);
	const pageTitle = breadcrumbs[breadcrumbs.length - 1]?.label ?? "Administration";

	const showBack = isDetailRoute(pathname);
	const parentLabel = breadcrumbs.length >= 2 ? breadcrumbs[breadcrumbs.length - 2]?.label : null;
	const showParent = Boolean(showBack && parentLabel);

	return (
		<header
			className={cn(
				"pwa-header fixed inset-x-0 top-0 z-40 flex h-[var(--admin-header-height,3.5rem)] items-center md:hidden",
				"motion-safe:transition-[background-color,border-color,box-shadow,backdrop-filter] motion-safe:duration-300 motion-safe:ease-out",
				"border-b",
				isScrolled
					? "bg-background/80 border-border shadow-lg shadow-black/8 backdrop-blur-xl"
					: "border-transparent bg-transparent",
			)}
			role="banner"
			aria-label="En-tête mobile administration"
		>
			<div className="flex w-full items-center gap-2 px-[var(--admin-main-x,1.5rem)]">
				{showBack && (
					<button
						type="button"
						onClick={() => {
							triggerHaptic("light");
							router.back();
						}}
						aria-label="Retour"
						className={cn(
							"-ml-2.5 flex size-11 shrink-0 items-center justify-center rounded-full",
							"text-muted-foreground hover:text-foreground active:bg-accent",
							"focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none",
							"transition-colors",
						)}
					>
						<ChevronLeft className="size-5" aria-hidden="true" />
					</button>
				)}

				<div className="min-w-0 flex-1">
					{showParent && (
						<p className="text-muted-foreground mb-0.5 truncate text-[10px] leading-none font-medium tracking-wider uppercase">
							{parentLabel}
						</p>
					)}
					<h1
						className={cn(
							"min-w-0 truncate text-left leading-none font-semibold tracking-tight",
							showParent ? "text-sm" : "text-base",
						)}
					>
						{pageTitle}
					</h1>
				</div>

				<span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
					Page actuelle : {pageTitle}
				</span>
			</div>
		</header>
	);
}
