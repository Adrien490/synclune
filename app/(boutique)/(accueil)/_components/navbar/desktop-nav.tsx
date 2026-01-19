"use client";

import type { NavItemWithChildren } from "@/shared/constants/navigation";
import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	navigationMenuTriggerStyle,
} from "@/shared/components/ui/navigation-menu";
import { useActiveNavbarItem } from "@/shared/hooks/use-active-navbar-item";
import { cn } from "@/shared/utils/cn";
import Link from "next/link";

/**
 * Navigation Desktop - Liens simples
 */
interface DesktopNavProps {
	navItems: NavItemWithChildren[];
}

/** Classes de base pour les triggers */
const triggerBaseClasses = cn(
	"h-auto px-3 py-2 rounded-md text-sm font-medium relative",
	"text-gray-700 hover:text-gray-900",
	"transition-colors duration-150",
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
);

/** Bordure animée sous le trigger actif */
const triggerUnderlineClasses = cn(
	"after:content-[''] after:absolute after:bottom-0 after:left-2 after:right-2",
	"after:h-0.5 after:bg-primary after:rounded-full",
	"after:origin-center after:scale-x-0",
	"after:transition-transform after:duration-200",
	"hover:after:scale-x-100 data-[state=open]:after:scale-x-100 data-[active=true]:after:scale-x-100"
);

export function DesktopNav({ navItems }: DesktopNavProps) {
	const { isMenuItemActive } = useActiveNavbarItem();

	return (
		<NavigationMenu
			className="hidden lg:flex"
			viewport={false}
		>
			<NavigationMenuList className="gap-1">
				{navItems.map((item) => {
					const itemIsActive = isMenuItemActive(item.href);

					return (
						<NavigationMenuItem key={item.href}>
							<NavigationMenuLink
								asChild
								active={itemIsActive}
								className={cn(
									navigationMenuTriggerStyle(),
									triggerBaseClasses,
									triggerUnderlineClasses
								)}
							>
								<Link
									href={item.href}
									data-active={itemIsActive}
									aria-current={itemIsActive ? "page" : undefined}
								>
									{item.label}
								</Link>
							</NavigationMenuLink>
						</NavigationMenuItem>
					);
				})}
			</NavigationMenuList>
		</NavigationMenu>
	);
}
