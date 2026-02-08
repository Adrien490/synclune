"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItemChild } from "@/shared/constants/navigation";
import { NavigationMenuLink } from "@/shared/components/ui/navigation-menu";
import { cn } from "@/shared/utils/cn";
import { ArrowRight } from "lucide-react";

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
	/** Display items in a multi-column grid */
	columns?: 2 | 3;
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
 * - Optional multi-column grid layout
 * - Visual hierarchy: first item styled as primary CTA
 */
export function MegaMenuColumn({ title, items, viewAllLink, columns }: MegaMenuColumnProps) {
	const pathname = usePathname();

	if (items.length === 0) {
		return null;
	}

	// Separate first item (CTA "Toutes les créations" etc.) from rest
	const [primaryItem, ...restItems] = items;

	return (
		<div>
			<h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
				{title}
			</h3>

			{/* Primary CTA link with distinct styling */}
			{primaryItem && (
				<NavigationMenuLink asChild>
					<Link
						href={primaryItem.href}
						aria-current={pathname === primaryItem.href ? "page" : undefined}
						className={cn(
							"flex-row! flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold min-h-11",
							"bg-accent/40 hover:bg-accent",
							"text-foreground",
							"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
							"transition-colors duration-200 mb-2",
							"motion-safe:animate-[menu-item-in_0.25s_ease-out_both]",
							pathname === primaryItem.href && "bg-accent font-semibold"
						)}
					>
						{primaryItem.label}
						<ArrowRight className="size-3.5! text-muted-foreground" aria-hidden="true" />
					</Link>
				</NavigationMenuLink>
			)}

			{/* Rest of items - optional multi-column grid */}
			<ul className={cn(
				"space-y-0.5",
				columns === 2 && "grid grid-cols-2 gap-x-4 gap-y-0.5 space-y-0",
				columns === 3 && "grid grid-cols-3 gap-x-4 gap-y-0.5 space-y-0"
			)}>
				{restItems.map((item, index) => {
					const isActive = pathname === item.href;
					return (
						<li
							key={item.href}
							className="motion-safe:animate-[menu-item-in_0.25s_ease-out_both]"
							style={{ animationDelay: `${(index + 1) * 15}ms` }}
						>
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
				<div className="mt-4 border-t border-border pt-3">
					<NavigationMenuLink asChild>
						<Link
							href={viewAllLink.href}
							aria-current={pathname === viewAllLink.href ? "page" : undefined}
							className={cn(
								"flex-row! inline-flex items-center gap-2 min-h-11 px-3 py-2.5 rounded-sm text-sm font-medium",
								"text-foreground hover:text-foreground",
								"hover:bg-accent/50",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
								"transition-colors"
							)}
						>
							{viewAllLink.label}
							<ArrowRight className="size-3.5! text-muted-foreground" aria-hidden="true" />
						</Link>
					</NavigationMenuLink>
				</div>
			)}
		</div>
	);
}
