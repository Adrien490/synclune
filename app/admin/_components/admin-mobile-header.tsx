"use client";

import { useIsScrolled } from "@/shared/hooks/use-is-scrolled";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { cn } from "@/shared/utils/cn";
import { ChevronLeft, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { generateBreadcrumbs } from "./dashboard-breadcrumb";

const DETAIL_ROUTE_PATTERNS = [
	/^\/admin\/ventes\/commandes\/[^/]+$/,
	/^\/admin\/ventes\/remboursements\/[^/]+$/,
	/^\/admin\/catalogue\/produits\/[^/]+$/,
	/^\/admin\/catalogue\/collections\/[^/]+$/,
	/^\/admin\/clients\/[^/]+$/,
	/^\/admin\/marketing\/personnalisations\/[^/]+$/,
	/^\/admin\/marketing\/discounts\/[^/]+$/,
	/^\/admin\/marketing\/avis\/[^/]+$/,
	/^\/admin\/contenu\/annonces\/[^/]+$/,
	/^\/admin\/contenu\/faq\/[^/]+$/,
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
	const { open: openCommandPalette } = useDialog("command-palette");

	const showBack = isDetailRoute(pathname);

	return (
		<header
			className={cn(
				"pwa-header fixed inset-x-0 top-0 z-40 flex h-14 items-center md:hidden",
				"motion-safe:transition-[background-color,border-color,box-shadow,backdrop-filter] motion-safe:duration-300 motion-safe:ease-out",
				"border-b",
				isScrolled
					? "bg-background/95 border-border shadow-lg shadow-black/8 backdrop-blur-md"
					: "border-transparent bg-transparent",
			)}
			role="banner"
			aria-label="En-tête mobile administration"
		>
			<div className="flex w-full items-center gap-2 px-2">
				{showBack ? (
					<button
						type="button"
						onClick={() => {
							triggerHaptic("light");
							router.back();
						}}
						aria-label="Retour"
						className={cn(
							"flex size-11 items-center justify-center rounded-full",
							"text-muted-foreground hover:text-foreground active:bg-accent",
							"focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none",
							"transition-colors",
						)}
					>
						<ChevronLeft className="size-5" aria-hidden="true" />
					</button>
				) : (
					<span className="size-11 shrink-0" aria-hidden="true" />
				)}

				<h1 className="min-w-0 flex-1 truncate text-left text-base leading-none font-semibold tracking-tight">
					{pageTitle}
				</h1>

				<button
					type="button"
					onClick={() => {
						triggerHaptic("light");
						openCommandPalette();
					}}
					aria-label="Rechercher"
					aria-haspopup="dialog"
					className={cn(
						"flex size-11 items-center justify-center rounded-full",
						"text-muted-foreground hover:text-foreground active:bg-accent",
						"focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none",
						"transition-colors",
					)}
				>
					<Search className="size-5" aria-hidden="true" />
				</button>
			</div>
		</header>
	);
}
