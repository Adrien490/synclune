"use client";

import { useId } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItemChild } from "@/shared/constants/navigation";
import { NavigationMenuLink } from "@/shared/components/ui/navigation-menu";
import { LoadingIndicator } from "@/shared/components/navigation";
import { cn } from "@/shared/utils/cn";
import {
	ArrowRight,
	Circle,
	CircleDot,
	Gem,
	Link2,
	type LucideIcon,
	Pin,
	Sparkles,
	Watch,
} from "lucide-react";

/**
 * Mapping iconKey (slug catégorie produit) → icône lucide.
 * Fallback `Gem` pour tout slug non listé (cohérent avec le branding bijoux).
 */
const ITEM_ICON_MAP: Record<string, LucideIcon> = {
	bagues: Circle,
	colliers: Link2,
	bracelets: CircleDot,
	"boucles-d-oreilles": Sparkles,
	pendentifs: Gem,
	broches: Pin,
	montres: Watch,
};

interface MegaMenuColumnProps {
	/** Column title displayed as section header */
	title: string;
	/** Optional subtitle rendered under the title (italic, atelier microcopy) */
	subtitle?: string;
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
export function MegaMenuColumn({
	title,
	subtitle,
	items,
	viewAllLink,
	columns,
}: MegaMenuColumnProps) {
	const headingId = useId();
	const pathname = usePathname();

	if (items.length === 0) {
		return null;
	}

	// Separate first item (CTA "Toutes les créations" etc.) from rest
	const [primaryItem, ...restItems] = items;

	return (
		<div role="region" aria-labelledby={headingId}>
			<h3
				id={headingId}
				className={cn(
					"text-foreground font-display text-sm leading-tight font-medium",
					subtitle ? "mb-1" : "mb-3",
				)}
			>
				{title}
			</h3>
			{subtitle && (
				<p className="text-muted-foreground font-display mb-3 text-xs italic">{subtitle}</p>
			)}

			{/* Primary CTA link with distinct styling */}
			{primaryItem && (
				<NavigationMenuLink asChild>
					{/* flex-row! requis : NavigationMenuLink applique flex-col par défaut (shared/components/ui/navigation-menu.tsx). */}
					<Link
						href={primaryItem.href}
						aria-current={pathname === primaryItem.href ? "page" : undefined}
						className={cn(
							"relative flex min-h-11 flex-row! items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium",
							"bg-accent/40 hover:bg-accent",
							"text-foreground",
							"focus-ring",
							"mb-2 motion-safe:transition-colors motion-safe:duration-[var(--duration-normal)]",
							pathname === primaryItem.href && "bg-accent font-medium",
						)}
					>
						{primaryItem.label}
						<ArrowRight className="text-muted-foreground size-3.5" aria-hidden="true" />
						<LoadingIndicator />
					</Link>
				</NavigationMenuLink>
			)}

			{/* Rest of items - optional multi-column grid */}
			<ul
				className={cn(
					"space-y-0.5",
					columns === 2 && "grid grid-cols-2 space-y-0 gap-x-4 gap-y-0.5",
					columns === 3 && "grid grid-cols-3 space-y-0 gap-x-4 gap-y-0.5",
				)}
			>
				{restItems.map((item) => {
					const isActive = pathname === item.href;
					const Icon = item.iconKey ? (ITEM_ICON_MAP[item.iconKey] ?? Gem) : null;
					return (
						<li key={item.href}>
							<NavigationMenuLink asChild>
								<Link
									href={item.href}
									aria-current={isActive ? "page" : undefined}
									className={cn(
										"relative flex min-h-11 items-center gap-2.5 rounded-sm px-3 py-2.5 text-sm",
										"hover:bg-accent hover:text-accent-foreground",
										"focus-ring",
										"motion-safe:transition-colors motion-safe:duration-[var(--duration-normal)]",
										isActive && "bg-accent/50 font-medium",
									)}
								>
									{Icon && (
										<Icon
											className={cn(
												"text-foreground/40 size-4 shrink-0 motion-safe:transition-colors motion-safe:duration-[var(--duration-normal)]",
												"group-hover:text-foreground/60",
												isActive && "text-primary/80",
											)}
											aria-hidden="true"
										/>
									)}
									<span className="truncate">{item.label}</span>
									<LoadingIndicator />
								</Link>
							</NavigationMenuLink>
						</li>
					);
				})}
			</ul>

			{viewAllLink && (
				<div className="border-border mt-4 border-t pt-3">
					<NavigationMenuLink asChild>
						<Link
							href={viewAllLink.href}
							aria-current={pathname === viewAllLink.href ? "page" : undefined}
							className={cn(
								"relative inline-flex min-h-11 flex-row! items-center gap-2 rounded-sm px-3 py-2.5 text-sm font-medium",
								"text-foreground hover:text-foreground",
								"hover:bg-accent/50",
								"focus-ring",
								"motion-safe:transition-colors",
							)}
						>
							{viewAllLink.label}
							<ArrowRight className="text-muted-foreground size-3.5" aria-hidden="true" />
							<LoadingIndicator />
						</Link>
					</NavigationMenuLink>
				</div>
			)}
		</div>
	);
}
