"use client";

import type { NavItemWithChildren } from "@/shared/constants/navigation";
import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
	navigationMenuTriggerStyle,
} from "@/shared/components/ui/navigation-menu";
import { useActiveNavbarItem } from "@/shared/hooks/use-active-navbar-item";
import { cn } from "@/shared/utils/cn";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MegaMenuProduct } from "@/shared/constants/navigation";
import { LoadingIndicator } from "@/shared/components/navigation";
import { MegaMenuCreations } from "./mega-menu-creations";
import { MegaMenuCollections } from "./mega-menu-collections";

interface DesktopNavProps {
	navItems: NavItemWithChildren[];
	featuredProducts?: MegaMenuProduct[];
}

const linkClasses = cn(
	"relative h-auto px-3 py-2 rounded-sm text-sm font-medium tracking-[0.02em]",
	"text-foreground/85 hover:text-foreground",
	"data-[active=true]:text-foreground",
	"motion-safe:transition-[color,background-color] motion-safe:duration-[var(--duration-normal)]",
	// Subtle rose accent halo on hover (premium brand touch, stays under underline)
	"motion-safe:hover:bg-primary/8 data-[state=open]:bg-primary/8",
	"focus-ring",
	// Underline animé au hover — spring easing premium
	"after:absolute after:bottom-0 after:left-1 after:right-1",
	"after:h-0.5 after:bg-primary after:rounded-full",
	"after:origin-center after:scale-x-0",
	"motion-safe:after:transition-transform motion-safe:after:duration-[220ms] motion-safe:after:[transition-timing-function:var(--ease-spring)]",
	"hover:after:scale-x-100 data-[state=open]:after:scale-x-100",
	"data-[active=true]:after:scale-x-100",
	"motion-reduce:hover:after:scale-x-100 motion-reduce:data-[state=open]:after:scale-x-100",
);

export function DesktopNav({ navItems, featuredProducts }: DesktopNavProps) {
	const { isMenuItemActive } = useActiveNavbarItem();
	const router = useRouter();

	return (
		<NavigationMenu
			className="hidden lg:flex"
			// viewport={false} disables Radix's auto-positioned viewport so the
			// mega-menu content can break out to full-width via the !important
			// overrides applied on NavigationMenuContent below (top/left/right/w-screen).
			viewport={false}
			delayDuration={120}
			skipDelayDuration={300}
		>
			<NavigationMenuList className="gap-1">
				{navItems.map((item) => {
					const itemIsActive = isMenuItemActive(item.href);

					// Item sans dropdown = lien simple
					if (!item.hasDropdown) {
						return (
							<NavigationMenuItem key={item.href}>
								<NavigationMenuLink asChild>
									<Link
										href={item.href}
										className={cn(navigationMenuTriggerStyle, linkClasses)}
										data-active={itemIsActive}
										aria-current={itemIsActive ? "page" : undefined}
									>
										{item.label}
										<LoadingIndicator />
									</Link>
								</NavigationMenuLink>
							</NavigationMenuItem>
						);
					}

					// Item avec dropdown = mega menu
					return (
						<NavigationMenuItem key={item.href}>
							<NavigationMenuTrigger
								showChevron
								className={linkClasses}
								data-active={itemIsActive}
								aria-current={itemIsActive ? "page" : undefined}
								onClick={(e) => {
									// Pointer click (detail >= 1) navigates to the section page; hover
									// (pointerMove) still opens the mega menu via Radix. Keyboard
									// activation (Enter/Space) synthesizes a click with detail === 0 —
									// let it fall through to Radix's toggle so the mega-menu panel opens,
									// keeping its links reachable for keyboard / screen-reader users.
									if (e.detail === 0) return;
									e.preventDefault();
									router.push(item.href);
								}}
							>
								{item.label}
							</NavigationMenuTrigger>
							{/* !important overrides needed to break out of Radix NavigationMenu's
						   absolute positioning and render a full-width mega menu anchored
						   below the navbar. Without these, the dropdown renders relative to
						   its trigger with default padding/border/rounding. */}
							<NavigationMenuContent
								className={cn(
									"fixed! right-0! left-0! w-screen!",
									"top-(--navbar-height)!",
									"mt-0! rounded-none! p-0!",
									// Subtle rose hairline at the top — atelier signature, brand identity touch
									"bg-background border-b-border border-x-0! border-t border-b border-t-[var(--color-glow-pink)] shadow-md",
									"data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1 data-[state=open]:duration-[var(--duration-normal)]",
									"data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-[var(--duration-fast)]",
									"motion-reduce:animate-none",
								)}
							>
								<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
									{item.dropdownType === "creations" && (
										<MegaMenuCreations
											productTypes={item.children}
											featuredProducts={featuredProducts}
										/>
									)}
									{item.dropdownType === "collections" && (
										<MegaMenuCollections collections={item.children} />
									)}
								</div>
							</NavigationMenuContent>
						</NavigationMenuItem>
					);
				})}
			</NavigationMenuList>
		</NavigationMenu>
	);
}
