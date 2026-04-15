"use client";

import { useIsScrolled } from "@/shared/hooks/use-is-scrolled";
import { cn } from "@/shared/utils/cn";
import { usePathname } from "next/navigation";
import { generateBreadcrumbs } from "./dashboard-breadcrumb";

/**
 * Mobile header for admin pages.
 * Shows current page title. Hidden on md+.
 * Scroll-aware: transparent at top, glass effect on scroll.
 *
 * No hamburger needed — navigation is always accessible from the bottom bar:
 * - Global nav bar on standard pages
 * - "Menu" tab in the page-specific bottom bar on contextual pages (products, discounts)
 */
export function AdminMobileHeader() {
	const pathname = usePathname();
	const isScrolled = useIsScrolled(20);
	const breadcrumbs = generateBreadcrumbs(pathname);
	const pageTitle = breadcrumbs[breadcrumbs.length - 1]?.label ?? "Administration";

	return (
		<header
			className={cn(
				"pwa-header fixed inset-x-0 top-0 z-40 flex h-14 items-center md:hidden",
				"transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ease-out",
				"border-b",
				isScrolled
					? "bg-background/95 border-border shadow-lg shadow-black/8 backdrop-blur-md"
					: "border-transparent bg-transparent",
			)}
			role="banner"
			aria-label="En-tête mobile administration"
		>
			<div className="flex w-full items-center px-4">
				<h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight">
					{pageTitle}
				</h1>
			</div>
		</header>
	);
}
