"use client";

import {
	BottomBar,
	ActiveDot,
	bottomBarContainerClass,
	bottomBarItemClass,
	bottomBarActiveItemClass,
	bottomBarIconClass,
	bottomBarLabelClass,
} from "@/shared/components/bottom-bar";
import { isRouteActive } from "@/shared/lib/navigation";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { cn } from "@/shared/utils/cn";
import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBottomBarActions } from "./admin-bottom-bar-context";
import { getBottomNavPrimaryItems } from "./navigation-config";

const defaultItems = getBottomNavPrimaryItems();

/**
 * Admin bottom bar — shows contextual actions (or defaults) + Menu button.
 * Visible only on mobile (< md).
 */
export function AdminBottomBar() {
	const pathname = usePathname();
	const contextualActions = useBottomBarActions();
	const { isOpen: isMenuOpen, open: openMenu } = useDialog("admin-menu-sheet");

	// Use contextual actions if registered, otherwise default nav items
	const hasContextual = contextualActions.length > 0;

	return (
		<BottomBar as="nav" aria-label="Navigation mobile administration">
			<div className={bottomBarContainerClass}>
				{hasContextual
					? // Contextual actions from the current page
						contextualActions.map((action) => {
							const Icon = action.icon;
							if (action.href) {
								const isActive = isRouteActive(pathname, action.href);
								return (
									<Link
										key={action.id}
										href={action.href}
										className={cn(bottomBarItemClass, isActive && bottomBarActiveItemClass)}
										aria-current={isActive ? "page" : undefined}
									>
										{isActive && <ActiveDot />}
										<Icon className={bottomBarIconClass} aria-hidden="true" />
										<span className={bottomBarLabelClass}>{action.label}</span>
									</Link>
								);
							}
							return (
								<button
									key={action.id}
									type="button"
									onClick={action.onClick}
									className={cn(bottomBarItemClass, "cursor-pointer")}
								>
									<Icon className={bottomBarIconClass} aria-hidden="true" />
									<span className={bottomBarLabelClass}>{action.label}</span>
								</button>
							);
						})
					: // Default nav items
						defaultItems.map((item) => {
							const Icon = item.icon;
							const isActive = isRouteActive(pathname, item.url);
							return (
								<Link
									key={item.id}
									href={item.url}
									className={cn(bottomBarItemClass, isActive && bottomBarActiveItemClass)}
									aria-current={isActive ? "page" : undefined}
								>
									{isActive && <ActiveDot />}
									<Icon className={bottomBarIconClass} aria-hidden="true" />
									<span className={bottomBarLabelClass}>{item.shortTitle ?? item.title}</span>
								</Link>
							);
						})}

				{/* Menu button — always present */}
				<button
					type="button"
					onClick={() => openMenu()}
					className={cn(
						bottomBarItemClass,
						"cursor-pointer",
						isMenuOpen && bottomBarActiveItemClass,
					)}
					aria-label="Ouvrir le menu"
					aria-expanded={isMenuOpen}
					aria-haspopup="dialog"
				>
					{isMenuOpen && <ActiveDot />}
					<Menu className={bottomBarIconClass} aria-hidden="true" />
					<span className={bottomBarLabelClass}>Menu</span>
				</button>
			</div>
		</BottomBar>
	);
}
