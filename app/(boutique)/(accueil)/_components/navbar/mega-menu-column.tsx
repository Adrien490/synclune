"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItemChild } from "@/shared/constants/navigation";
import { NavigationMenuLink } from "@/shared/components/ui/navigation-menu";
import { cn } from "@/shared/utils/cn";

interface MegaMenuColumnProps {
	/** Column title displayed as section header */
	title: string;
	/** Navigation items to display in the column */
	items: NavItemChild[];
	/** Optional "View all" link at the bottom */
	viewAllLink?: {
		href: string;
		label: string;
	};
}

/**
 * Reusable mega menu column component for desktop navigation.
 * Displays a list of navigation links with proper accessibility attributes.
 *
 * Features:
 * - WCAG 2.5.5 compliant touch targets (min 44px)
 * - aria-current="page" for active links
 * - Visible focus indicators
 * - Active state styling
 */
export function MegaMenuColumn({ title, items, viewAllLink }: MegaMenuColumnProps) {
	const pathname = usePathname();

	if (items.length === 0) {
		return null;
	}

	return (
		<div>
			<h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
				{title}
			</h3>
			<ul className="space-y-1" role="list">
				{items.map((item) => {
					const isActive = pathname === item.href;
					return (
						<li key={item.href}>
							<NavigationMenuLink asChild>
								<Link
									href={item.href}
									aria-current={isActive ? "page" : undefined}
									className={cn(
										"block rounded-sm px-3 py-2.5 text-sm min-h-11",
										"hover:bg-accent hover:text-accent-foreground",
										"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
										"transition-colors duration-200",
										isActive && "bg-accent/50 font-medium"
									)}
								>
									{item.label}
								</Link>
							</NavigationMenuLink>
						</li>
					);
				})}
			</ul>

			{viewAllLink && (
				<div className="mt-6 border-t border-border pt-4">
					<NavigationMenuLink asChild>
						<Link
							href={viewAllLink.href}
							aria-current={pathname === viewAllLink.href ? "page" : undefined}
							className={cn(
								"inline-flex items-center min-h-11 px-3 py-2.5 rounded-sm text-sm",
								"text-muted-foreground hover:text-foreground",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
								"transition-colors"
							)}
						>
							{viewAllLink.label}
						</Link>
					</NavigationMenuLink>
				</div>
			)}
		</div>
	);
}
