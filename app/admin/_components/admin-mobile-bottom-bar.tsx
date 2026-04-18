"use client";

import { createPortal } from "react-dom";
import {
	BottomBar,
	ActiveDot,
	bottomBarContainerClass,
	bottomBarItemClass,
	bottomBarActiveItemClass,
	bottomBarIconClass,
	bottomBarLabelClass,
	bottomBarBadgeClass,
} from "@/shared/components/bottom-bar";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { isRouteActive } from "@/shared/lib/navigation";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { useMounted } from "@/shared/hooks/use-mounted";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, ShoppingBag, Package, Menu, Search } from "lucide-react";
import { cn } from "@/shared/utils/cn";

interface AdminMobileBottomBarProps {
	badges?: Record<string, number>;
}

export function AdminMobileBottomBar({ badges }: AdminMobileBottomBarProps) {
	const mounted = useMounted();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { isOpen: isMenuOpen, open: openMenu, close: closeMenu } = useDialog("admin-menu-sheet");
	const { open: openCommandPalette } = useDialog("command-palette");

	// Masquer la nav globale quand une bulk-selection admin est active : le
	// SelectionBottomSheet prend le relais en bas d'écran.
	const hasSelection = searchParams.getAll("selected").length > 0;
	const isHidden = isMenuOpen || hasSelection;

	const leftTabs = [
		{
			id: "dashboard",
			label: "Accueil",
			href: "/admin",
			icon: LayoutDashboard,
			isActive: isRouteActive(pathname, "/admin"),
		},
		{
			id: "orders",
			label: "Commandes",
			href: "/admin/ventes/commandes",
			icon: ShoppingBag,
			isActive: isRouteActive(pathname, "/admin/ventes/commandes"),
		},
	] as const;

	const rightTabs = [
		{
			id: "products",
			label: "Produits",
			href: "/admin/catalogue/produits",
			icon: Package,
			isActive: isRouteActive(pathname, "/admin/catalogue/produits"),
		},
	] as const;

	function renderTab(tab: (typeof leftTabs)[number] | (typeof rightTabs)[number]) {
		const badgeCount = tab.id === "orders" ? badges?.["orders"] : undefined;
		return (
			<Link
				key={tab.id}
				href={tab.href}
				onClick={() => !tab.isActive && triggerHaptic("light")}
				className={cn(bottomBarItemClass, tab.isActive && bottomBarActiveItemClass)}
				aria-current={tab.isActive ? "page" : undefined}
			>
				{tab.isActive && <ActiveDot />}
				<span className="relative">
					<tab.icon className={bottomBarIconClass} aria-hidden="true" />
					{badgeCount != null && badgeCount > 0 && (
						<span
							className={bottomBarBadgeClass}
							aria-label={`${badgeCount} commande${badgeCount > 1 ? "s" : ""} en attente`}
						>
							{badgeCount > 99 ? "99+" : badgeCount}
						</span>
					)}
				</span>
				<span className={bottomBarLabelClass}>{tab.label}</span>
			</Link>
		);
	}

	if (!mounted) return null;

	return createPortal(
		<BottomBar as="nav" aria-label="Navigation principale administration" isHidden={isHidden}>
			<div className={bottomBarContainerClass}>
				{leftTabs.map(renderTab)}

				{/* Onglet Recherche — ouvre la command palette (recherche + actions rapides) */}
				<button
					type="button"
					onClick={() => {
						triggerHaptic("medium");
						openCommandPalette();
					}}
					aria-label="Ouvrir la recherche"
					aria-haspopup="dialog"
					className={bottomBarItemClass}
				>
					<Search className={bottomBarIconClass} aria-hidden="true" />
					<span className={bottomBarLabelClass}>Recherche</span>
				</button>

				{rightTabs.map(renderTab)}

				{/* Onglet Menu — ouvre le bottom sheet de navigation */}
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
					aria-label={isMenuOpen ? "Fermer le menu de navigation" : "Ouvrir le menu de navigation"}
				>
					{isMenuOpen && <ActiveDot />}
					<Menu className={bottomBarIconClass} aria-hidden="true" />
					<span className={bottomBarLabelClass}>Menu</span>
				</button>
			</div>
		</BottomBar>,
		document.body,
	);
}
