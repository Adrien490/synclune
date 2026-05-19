"use client";

import { createPortal } from "react-dom";
import {
	BottomBar,
	BottomBarActivePill,
	bottomBarContainerClass,
	bottomBarItemClass,
	bottomBarActiveItemClass,
	bottomBarIconClass,
	bottomBarLabelClass,
	bottomBarBadgeClass,
} from "@/shared/components/bottom-bar";
import { LoadingIndicator } from "@/shared/components/navigation/loading-indicator";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { isRouteActive } from "@/shared/lib/navigation";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { useMounted } from "@/shared/hooks/use-mounted";
import { useAdminListSelectionStore } from "@/shared/stores/use-admin-list-selection-store";
import { useHasOverlay } from "@/shared/stores/use-overlay-stack-store";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import {
	ADMIN_MENU_SHEET_CONTENT_ID,
	getQuickAccessItems,
	type NavItem,
} from "./navigation-config";

interface AdminMobileBottomBarProps {
	badges?: Record<string, number>;
}

export function AdminMobileBottomBar({ badges }: AdminMobileBottomBarProps) {
	const mounted = useMounted();
	const pathname = usePathname();
	const { isOpen: isMenuOpen, open: openMenu, close: closeMenu } = useDialog("admin-menu-sheet");
	const hasOverlay = useHasOverlay();
	// Le mode sélection est désormais déclenché uniquement par les triggers de
	// liste (long-press cards, bulk-actions desktop). La bottom-bar admin
	// globale doit néanmoins se cacher quand il s'active, pour laisser
	// MobileSelectionBottomBar prendre le relais sans empilement.
	const inSelectionMode = useAdminListSelectionStore((s) => s.control?.selectionMode) === true;

	const isHidden = isMenuOpen || hasOverlay || inSelectionMode;
	const tabs = getQuickAccessItems();

	function renderTab(tab: NavItem) {
		const isActive = isRouteActive(pathname, tab.url);
		const badgeCount = tab.id === "orders" ? badges?.["orders"] : undefined;
		const Icon = tab.icon;
		const label = tab.shortTitle ?? tab.title;
		return (
			<Link
				key={tab.id}
				href={tab.url}
				onClick={() => !isActive && triggerHaptic("light")}
				className={cn(bottomBarItemClass, isActive && bottomBarActiveItemClass)}
				aria-current={isActive ? "page" : undefined}
			>
				{isActive && <BottomBarActivePill groupId="admin-nav" />}
				<span className="relative">
					<Icon className={bottomBarIconClass} aria-hidden="true" />
					{badgeCount != null && badgeCount > 0 && (
						<span
							className={bottomBarBadgeClass}
							role="status"
							aria-live="polite"
							aria-label={`${badgeCount} commande${badgeCount > 1 ? "s" : ""} en attente`}
						>
							{badgeCount > 99 ? "99+" : badgeCount}
						</span>
					)}
				</span>
				<span className={bottomBarLabelClass}>{label}</span>
				<LoadingIndicator />
			</Link>
		);
	}

	if (!mounted) return null;

	return createPortal(
		<BottomBar as="nav" aria-label="Navigation principale administration" isHidden={isHidden}>
			<div className={bottomBarContainerClass}>
				{tabs.map(renderTab)}

				{/* Onglet Menu — ouvre le bottom sheet de navigation.
				 * aria-label reste stable : l'état ouvert/fermé est porté par aria-expanded
				 * (cf. audit menu-sheet storefront 2026-05-14, parité a11y trigger ↔ sheet). */}
				<button
					type="button"
					className={cn(bottomBarItemClass, isMenuOpen && bottomBarActiveItemClass)}
					onClick={() => {
						triggerHaptic("light");
						if (isMenuOpen) closeMenu();
						else openMenu();
					}}
					aria-haspopup="dialog"
					aria-expanded={isMenuOpen}
					aria-controls={ADMIN_MENU_SHEET_CONTENT_ID}
					aria-label="Menu de navigation"
				>
					{isMenuOpen && <BottomBarActivePill groupId="admin-nav" />}
					<Menu className={bottomBarIconClass} aria-hidden="true" />
					<span className={bottomBarLabelClass}>Menu</span>
				</button>
			</div>
		</BottomBar>,
		document.body,
	);
}
