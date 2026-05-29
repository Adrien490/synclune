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
	badgeAriaLabel,
	getQuickAccessItems,
	type NavItem,
} from "./navigation-config";

interface AdminMobileBottomBarProps {
	badges?: Record<string, number>;
}

// Hoist hors composant — items statiques, parité avec admin-menu-sheet.tsx:40.
const QUICK_ACCESS_TABS = getQuickAccessItems();

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
						/* aria-label explicite ("X commande(s)") car le label visuel tab est
						 * plus discret qu'en menu sheet où le titre adjacent ("Commandes")
						 * suffirait seul ; clamp visuel "99+" mais SR garde le compte exact. */
						<span
							className={bottomBarBadgeClass}
							role="status"
							aria-live="polite"
							aria-label={badgeAriaLabel("orders", badgeCount)}
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
				{QUICK_ACCESS_TABS.map(renderTab)}

				{/* Onglet Menu — ouvre le bottom sheet de navigation.
				 * aria-label reste stable : l'état ouvert/fermé est porté par aria-expanded
				 * (cf. audit menu-sheet storefront 2026-05-14, parité a11y trigger ↔ sheet).
				 * aria-controls reste posé même quand SheetContent est démonté hors open :
				 * forward reference autorisée par W3C ARIA 1.2, invariant testé. */}
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
