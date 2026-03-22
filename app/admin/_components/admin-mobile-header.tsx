"use client";

import { useDialog } from "@/shared/providers/dialog-store-provider";
import { cn } from "@/shared/utils/cn";
import { Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { AdminMenuSheetTrigger } from "./admin-menu-sheet";
import { generateBreadcrumbs } from "./dashboard-breadcrumb";

/**
 * Mobile header for admin pages.
 * Shows hamburger + current page title + search button. Hidden on md+.
 */
export function AdminMobileHeader() {
	const pathname = usePathname();
	const { open: openSearch } = useDialog("command-palette");
	const breadcrumbs = generateBreadcrumbs(pathname);
	// Use the last breadcrumb segment as the page title
	const pageTitle = breadcrumbs[breadcrumbs.length - 1]?.label ?? "Administration";

	return (
		<header
			className="pwa-header bg-background/80 supports-backdrop-filter:bg-background/60 fixed inset-x-0 top-0 z-40 flex h-14 items-center border-b backdrop-blur-lg md:hidden"
			role="banner"
			aria-label="En-tête mobile administration"
		>
			<div className="flex w-full items-center px-4">
				{/* Hamburger */}
				<AdminMenuSheetTrigger className="mr-3 -ml-1 size-10 cursor-pointer rounded-lg" />

				{/* Page title */}
				<h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight">
					{pageTitle}
				</h1>

				{/* Search */}
				<button
					type="button"
					onClick={() => openSearch()}
					className={cn(
						"-mr-1 ml-2 inline-flex size-10 cursor-pointer items-center justify-center rounded-lg",
						"text-muted-foreground hover:text-foreground transition-colors",
						"focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none",
					)}
					aria-label="Recherche rapide"
				>
					<Search className="size-5" aria-hidden="true" />
				</button>
			</div>
		</header>
	);
}
