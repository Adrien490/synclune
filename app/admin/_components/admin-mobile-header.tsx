"use client";

import { usePathname } from "next/navigation";
import { AdminMenuSheetTrigger } from "./admin-menu-sheet";
import { generateBreadcrumbs } from "./dashboard-breadcrumb";

/**
 * Mobile header for admin pages.
 * Shows hamburger + current page title. Hidden on md+.
 */
export function AdminMobileHeader() {
	const pathname = usePathname();
	const breadcrumbs = generateBreadcrumbs(pathname);
	// Use the last breadcrumb segment as the page title
	const pageTitle = breadcrumbs[breadcrumbs.length - 1]?.label ?? "Administration";

	return (
		<header
			className="bg-background/80 supports-backdrop-filter:bg-background/60 fixed inset-x-0 top-0 z-40 flex h-14 items-center border-b backdrop-blur-lg md:hidden"
			role="banner"
			aria-label="En-tête mobile administration"
		>
			<div className="flex w-full items-center px-4">
				{/* Hamburger */}
				<AdminMenuSheetTrigger className="mr-3 -ml-1 size-10 cursor-pointer rounded-lg" />

				{/* Page title */}
				<h1 className="min-w-0 flex-1 truncate text-sm font-semibold">{pageTitle}</h1>
			</div>
		</header>
	);
}
