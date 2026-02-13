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
import { MegaMenuCreations } from "./mega-menu-creations";
import { MegaMenuCollections } from "./mega-menu-collections";

interface DesktopNavProps {
	navItems: NavItemWithChildren[];
	featuredProducts?: MegaMenuProduct[];
}

const linkClasses = cn(
	"relative h-auto px-3 py-2 rounded-sm text-sm font-medium",
	"text-foreground/80 hover:text-foreground",
	"data-[active=true]:text-foreground",
	"transition-colors duration-200",
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
	// Underline animé au hover
	"after:absolute after:bottom-0 after:left-1 after:right-1",
	"after:h-0.5 after:bg-primary after:rounded-full",
	"after:origin-center after:scale-x-0",
	"motion-safe:after:transition-transform motion-safe:after:duration-200",
	"hover:after:scale-x-100 data-[state=open]:after:scale-x-100",
	"data-[active=true]:after:scale-x-100",
	"motion-reduce:hover:after:scale-x-100 motion-reduce:data-[state=open]:after:scale-x-100",
);

export function DesktopNav({ navItems, featuredProducts }: DesktopNavProps) {
	const { isMenuItemActive } = useActiveNavbarItem();
	const router = useRouter();

	return (
		<NavigationMenu className="hidden lg:flex" viewport={false}>
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
										className={cn(navigationMenuTriggerStyle(), linkClasses)}
										data-active={itemIsActive}
										aria-current={itemIsActive ? "page" : undefined}
									>
										{item.label}
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
									// Only navigate on mouse click, not keyboard activation
									if (e.detail > 0 && !e.defaultPrevented) {
										router.push(item.href);
									}
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
									"fixed! left-0! right-0! w-screen!",
									"top-[var(--navbar-height)]!",
									"mt-0! p-0! rounded-none! border-0!",
									"bg-background border-b border-border shadow-md",
								)}
							>
								<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
									{item.dropdownType === "creations" && (
										<MegaMenuCreations productTypes={item.children} featuredProducts={featuredProducts} />
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
