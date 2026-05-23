"use client";

import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Search, Heart, ShoppingBag, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
	BottomBar,
	BottomBarActivePill,
	bottomBarContainerClass,
	bottomBarItemClass,
	bottomBarActiveItemClass,
	bottomBarIconClass,
	bottomBarLabelClass,
} from "@/shared/components/bottom-bar";
import { CountBadge } from "@/shared/components/ui/count-badge";
import { LoadingIndicator } from "@/shared/components/navigation/loading-indicator";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";
import { useSheetStore } from "@/shared/providers/sheet-store-provider";
import { ROUTES } from "@/shared/constants/urls";
import { useMounted } from "@/shared/hooks/use-mounted";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { isRouteActive } from "@/shared/lib/navigation";
import { cn } from "@/shared/utils/cn";

/**
 * Routes où la bottom nav shop se masque pour éviter la superposition
 * avec une CTA sticky ou un flow focus (checkout).
 */
const HIDDEN_ROUTES = [
	ROUTES.SHOP.CHECKOUT,
	ROUTES.SHOP.CHECKOUT_RETURN,
	ROUTES.AUTH.SIGN_IN,
	ROUTES.AUTH.SIGN_UP,
];

interface ShopMobileBottomNavProps {
	isAuthenticated: boolean;
}

/**
 * Bottom navigation tabs pour la boutique (mobile/tablet portrait).
 * 5 onglets : Accueil • Recherche • Favoris • Panier • Compte.
 *
 * - Affiché via createPortal en fin de <body> pour sortir du flux
 * - Masqué sur routes checkout et authentification
 * - Badges dynamiques (wishlist + cart) depuis badge-counts-store
 * - Touch targets 44px min (WCAG 2.5.5)
 * - Respecte `env(safe-area-inset-bottom)` via BottomBar
 */
export function ShopMobileBottomNav({ isAuthenticated }: ShopMobileBottomNavProps) {
	const pathname = usePathname();
	const cartCount = useBadgeCountsStore((state) => state.cartCount);
	const wishlistCount = useBadgeCountsStore((state) => state.wishlistCount);
	const cartBump = useBadgeCountsStore((state) => state.cartBump);
	const openSheet = useSheetStore((state) => state.open);

	// Delay mount until after hydration to avoid createPortal SSR mismatch.
	const mounted = useMounted();

	// Announce badge count changes to assistive tech (skip first render).
	const prevCountsRef = useRef<{ cart: number; wishlist: number } | null>(null);
	const [announcement, setAnnouncement] = useState<string>("");
	useEffect(() => {
		const prev = prevCountsRef.current;
		if (prev === null) {
			prevCountsRef.current = { cart: cartCount, wishlist: wishlistCount };
			return;
		}
		const messages: string[] = [];
		if (cartCount !== prev.cart) {
			messages.push(
				cartCount === 0
					? "Panier vide"
					: `Panier : ${cartCount} article${cartCount > 1 ? "s" : ""}`,
			);
		}
		if (wishlistCount !== prev.wishlist) {
			messages.push(
				wishlistCount === 0
					? "Favoris vides"
					: `Favoris : ${wishlistCount} article${wishlistCount > 1 ? "s" : ""}`,
			);
		}
		if (messages.length > 0) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setAnnouncement(messages.join(", "));
		}
		prevCountsRef.current = { cart: cartCount, wishlist: wishlistCount };
	}, [cartCount, wishlistCount]);

	const isHidden = HIDDEN_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));

	const accountHref = isAuthenticated ? ROUTES.ACCOUNT.ROOT : ROUTES.AUTH.SIGN_IN;

	const tabs = [
		{
			id: "home",
			label: "Accueil",
			href: ROUTES.SHOP.HOME,
			icon: Home,
			isActive: pathname === ROUTES.SHOP.HOME,
			type: "link" as const,
		},
		{
			id: "products",
			label: "Produits",
			href: ROUTES.SHOP.PRODUCTS,
			icon: Search,
			isActive:
				isRouteActive(pathname, ROUTES.SHOP.PRODUCTS) ||
				pathname.startsWith(ROUTES.SHOP.PRODUCT_DETAIL_PREFIX) ||
				pathname.startsWith(ROUTES.SHOP.COLLECTIONS),
			type: "link" as const,
		},
		{
			id: "wishlist",
			label: "Favoris",
			href: ROUTES.ACCOUNT.FAVORITES,
			icon: Heart,
			isActive: isRouteActive(pathname, ROUTES.ACCOUNT.FAVORITES),
			type: "link" as const,
			badge: {
				count: wishlistCount,
				type: "dot" as const,
				singular: "favori",
				plural: "favoris",
			},
		},
		{
			id: "cart",
			label: "Panier",
			icon: ShoppingBag,
			isActive: false,
			type: "button" as const,
			badge: {
				count: cartCount,
				type: "count" as const,
				singular: "article dans le panier",
				plural: "articles dans le panier",
				bumpKey: cartBump?.key,
				bumpDelta: cartBump?.delta,
			},
			onClick: () => openSheet("cart"),
		},
		{
			id: "account",
			label: "Compte",
			href: accountHref,
			icon: User,
			isActive: isRouteActive(pathname, "/commandes") || isRouteActive(pathname, "/parametres"),
			type: "link" as const,
		},
	];

	if (!mounted) return null;

	return createPortal(
		<BottomBar as="nav" aria-label="Navigation principale de la boutique" isHidden={isHidden}>
			<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
				{announcement}
			</div>
			<div className={bottomBarContainerClass}>
				{tabs.map((tab) => {
					const iconEl = (
						<span className="relative">
							<tab.icon className={bottomBarIconClass} aria-hidden="true" />
							{"badge" in tab && tab.badge && (
								<CountBadge
									count={tab.badge.count}
									size="sm"
									type={tab.badge.type}
									singularLabel={tab.badge.singular}
									pluralLabel={tab.badge.plural}
									bumpKey={"bumpKey" in tab.badge ? tab.badge.bumpKey : undefined}
									bumpDelta={"bumpDelta" in tab.badge ? tab.badge.bumpDelta : undefined}
									silentLiveRegion
								/>
							)}
						</span>
					);

					if (tab.type === "button") {
						return (
							<button
								key={tab.id}
								type="button"
								onClick={() => {
									triggerHaptic("selection");
									tab.onClick();
								}}
								className={cn(bottomBarItemClass, tab.isActive && bottomBarActiveItemClass)}
								aria-haspopup="dialog"
								aria-label={tab.label}
							>
								{tab.isActive && <BottomBarActivePill groupId="shop-nav" />}
								{iconEl}
								<span className={bottomBarLabelClass}>{tab.label}</span>
							</button>
						);
					}

					return (
						<Link
							key={tab.id}
							href={tab.href}
							className={cn(bottomBarItemClass, tab.isActive && bottomBarActiveItemClass)}
							aria-current={tab.isActive ? "page" : undefined}
						>
							{tab.isActive && <BottomBarActivePill groupId="shop-nav" />}
							{iconEl}
							<span className={bottomBarLabelClass}>{tab.label}</span>
							<LoadingIndicator />
						</Link>
					);
				})}
			</div>
		</BottomBar>,
		document.body,
	);
}
