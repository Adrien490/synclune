"use client";

import type { NavItemWithChildren, MegaMenuProduct } from "@/shared/constants/navigation";
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
import { MegaMenuCreations } from "./mega-menu-creations";
import { MegaMenuCollections } from "./mega-menu-collections";

interface DesktopNavProps {
	navItems: NavItemWithChildren[];
	newProducts: MegaMenuProduct[];
}

const linkClasses = cn(
	"relative h-auto px-3 py-2 rounded-sm text-sm font-medium",
	"text-foreground/80 hover:text-foreground",
	"transition-colors duration-150",
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
	// Underline animé au hover
	"after:absolute after:bottom-0 after:left-2 after:right-2",
	"after:h-0.5 after:bg-primary after:rounded-full",
	"after:origin-center after:scale-x-0",
	"after:transition-transform after:duration-200",
	"hover:after:scale-x-100 data-[state=open]:after:scale-x-100"
);

export function DesktopNav({ navItems, newProducts }: DesktopNavProps) {
	const { isMenuItemActive } = useActiveNavbarItem();

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
										className={cn(
											navigationMenuTriggerStyle(),
											linkClasses
										)}
										data-active={itemIsActive}
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
								showChevron={false}
								className={linkClasses}
								data-active={itemIsActive}
							>
								<Link href={item.href} className="contents">
									{item.label}
								</Link>
							</NavigationMenuTrigger>
							<NavigationMenuContent
								className={cn(
									"!fixed !left-0 !right-0 !w-screen",
									"!top-16 sm:!top-20",
									"!mt-0 !p-0 !rounded-none !border-0",
									"bg-background border-b border-border shadow-md"
								)}
							>
								<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
									{item.dropdownType === "creations" && (
										<MegaMenuCreations
											productTypes={item.children}
											newProducts={newProducts}
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
