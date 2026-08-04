"use client";

import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
	HeartIcon,
	HouseIcon,
	MagnifyingGlassIcon,
	ShoppingBagIcon,
} from "@phosphor-icons/react/ssr";
import { useEffect, useRef, useState } from "react";

import {
	BottomBar,
	BottomBarActivePill,
	bottomBarContainerClass,
	bottomBarItemWrapperClass,
	bottomBarItemClass,
	bottomBarActiveItemClass,
	bottomBarIconClass,
	bottomBarLabelClass,
} from "@/shared/components/bottom-bar";
import { CountBadge } from "@/shared/components/ui/count-badge";
import { LoadingIndicator } from "@/shared/components/navigation/loading-indicator";
import { QUICK_SEARCH_DIALOG_ID } from "@/modules/products/components/quick-search-dialog/constants";
import { setLastTrigger } from "@/modules/products/components/quick-search-dialog/last-trigger";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";
import { useDialog } from "@/shared/providers/dialog-store-provider";
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
const HIDDEN_ROUTES = [ROUTES.SHOP.CHECKOUT, ROUTES.SHOP.CHECKOUT_RETURN, ROUTES.AUTH.SIGN_IN];

/** Id du sheet panier dans le `sheet-store` (cf. `SheetId`). */
const CART_SHEET_ID = "cart" as const;

// Pas d'`aria-controls` sur ces deux onglets (contrairement au bouton Menu de
// l'admin) : le panier rend DEUX contenus selon le viewport (`Drawer` mobile /
// `Sheet` desktop, `cart-sheet.tsx:298` et `:339`) et le quick-search un dialog
// portalé. Désigner un id absent est plus nuisible que de l'omettre —
// `aria-haspopup` + `aria-expanded` suffisent au pattern disclosure.

/**
 * Compteur → nom accessible, pour que l'onglet annonce son badge.
 *
 * ⚠️ **Exportée pour être testée, pas pour être réutilisée ailleurs.** C'est ce
 * nom accessible — et non la région d'annonce ci-dessous, qui écrit
 * `Panier : 3 articles` avec un deux-points — que ciblent les locators
 * Playwright du panier. Les deux formulations ont divergé une fois, et un
 * correctif E2E dérivé de la mauvaise ne matchait AUCUNE des trois formes
 * réelles. Le test de couture `e2e/pages/__tests__/cart-open-button-label.regression.test.ts`
 * compose désormais les libellés depuis cette fonction plutôt que de les deviner.
 */
export function tabAriaLabel(
	label: string,
	count: number,
	singular: string,
	plural: string,
): string {
	if (count <= 0) return label;
	return `${label}, ${count} ${count > 1 ? plural : singular}`;
}

/**
 * Bottom navigation tabs pour la boutique (mobile/tablet portrait).
 * 4 onglets : Accueil • Recherche • Favoris • Panier.
 *
 * L'onglet « Compte » a disparu avec l'espace client (2026-07-31) : il menait soit
 * à `/commandes`, soit à `/connexion` pour un visiteur — deux destinations qui
 * n'existent plus pour un client. Les favoris restent, portés par le cookie
 * `wishlist_session` et non par une session.
 *
 * - Affiché via createPortal en fin de <body> pour sortir du flux
 * - Masqué sur routes checkout et authentification
 * - Badges dynamiques (wishlist + cart) depuis badge-counts-store
 * - Touch targets 44px min (WCAG 2.5.5)
 * - Respecte `env(safe-area-inset-bottom)` via BottomBar
 */
export function ShopMobileBottomNav() {
	const pathname = usePathname();
	const cartCount = useBadgeCountsStore((state) => state.cartCount);
	const wishlistCount = useBadgeCountsStore((state) => state.wishlistCount);
	const cartBump = useBadgeCountsStore((state) => state.cartBump);
	const openSheet = useSheetStore((state) => state.open);
	// L'état réel du panier, et non `false` en dur : l'onglet expose
	// `aria-haspopup="dialog"`, donc son `aria-expanded` doit suivre l'ouverture du
	// sheet (WCAG 4.1.2). Figé à `false`, il annonçait « replié » panier ouvert.
	const isCartOpen = useSheetStore((state) => state.openSheet === CART_SHEET_ID);
	const { open: openQuickSearch, isOpen: isQuickSearchOpen } = useDialog(QUICK_SEARCH_DIALOG_ID);

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

	const handleSearchClick = (e: React.MouseEvent<HTMLButtonElement>) => {
		// Handoff obligatoire : le dialog blur son déclencheur, donc
		// `document.activeElement` n'est plus fiable quand `onCloseAutoFocus`
		// cherche où rendre le focus.
		setLastTrigger(e.currentTarget);
		e.currentTarget.blur();
		openQuickSearch();
	};

	const isHidden = HIDDEN_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));

	const tabs = [
		{
			id: "home",
			label: "Accueil",
			href: ROUTES.SHOP.HOME,
			icon: HouseIcon,
			isActive: pathname === ROUTES.SHOP.HOME,
			type: "link" as const,
		},
		{
			// Une loupe dans la zone du pouce DOIT ouvrir la recherche. Cet onglet
			// était un lien vers /produits : la seule affordance « recherche » de la
			// zone du pouce n'ouvrait pas la recherche, et la vraie entrée était une
			// icône nue sans libellé en haut de la navbar (audit recherche 2026-07-26).
			// L'accès au catalogue est repris par le CTA permanent « Voir tous les
			// produits » du panneau idle du dialog.
			id: "search",
			label: "Rechercher",
			icon: MagnifyingGlassIcon,
			isActive: isQuickSearchOpen,
			type: "button" as const,
			onClick: handleSearchClick,
		},
		{
			id: "wishlist",
			label: "Favoris",
			href: ROUTES.SHOP.FAVORITES,
			icon: HeartIcon,
			isActive: isRouteActive(pathname, ROUTES.SHOP.FAVORITES),
			type: "link" as const,
			// `type: "dot"` n'affiche AUCUN chiffre : sans ce libellé, le nombre de
			// favoris n'était exposé nulle part — ni à l'œil, ni au lecteur d'écran.
			ariaLabel: tabAriaLabel("Favoris", wishlistCount, "favori", "favoris"),
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
			icon: ShoppingBagIcon,
			isActive: isCartOpen,
			type: "button" as const,
			ariaLabel: tabAriaLabel("Panier", cartCount, "article", "articles"),
			badge: {
				count: cartCount,
				type: "count" as const,
				singular: "article dans le panier",
				plural: "articles dans le panier",
				bumpKey: cartBump?.key,
				bumpDelta: cartBump?.delta,
			},
			onClick: () => openSheet(CART_SHEET_ID),
		},
	];

	if (!mounted) return null;

	return createPortal(
		// `lg` et non `md` : la nav desktop (`DesktopNav`, `hidden lg:flex`) ne prend
		// le relais qu'à 64rem. Avec un seuil `md`, la plage 48–64rem — où tombe
		// l'iPad portrait 768×1024 — perdait la bottom-nav sans rien gagner en
		// échange : plus de panier ni de favoris à un tap, seulement le burger
		// (audit responsive 2026-07-26).
		<BottomBar
			as="nav"
			breakpoint="lg"
			aria-label="Navigation principale de la boutique"
			isHidden={isHidden}
		>
			<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
				{announcement}
			</div>
			{/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- iOS Safari + VO drop implicit list role when list-style:none */}
			<ul role="list" className={bottomBarContainerClass}>
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
							<li key={tab.id} className={bottomBarItemWrapperClass}>
								<button
									type="button"
									onClick={(e) => {
										triggerHaptic("selection");
										tab.onClick(e);
									}}
									className={cn(
										bottomBarItemClass,
										"can-hover:hover:bg-primary/5",
										tab.isActive && bottomBarActiveItemClass,
									)}
									aria-haspopup="dialog"
									aria-expanded={tab.isActive}
									aria-label={"ariaLabel" in tab ? tab.ariaLabel : tab.label}
								>
									{tab.isActive && <BottomBarActivePill groupId="shop-nav" />}
									{iconEl}
									<span className={bottomBarLabelClass}>{tab.label}</span>
								</button>
							</li>
						);
					}

					return (
						<li key={tab.id} className={bottomBarItemWrapperClass}>
							<Link
								href={tab.href}
								// Les onglets-liens n'émettaient AUCUN haptique là où les
								// onglets-boutons en émettaient : un tap sur Accueil/Favoris/Compte
								// était muet, un tap sur Recherche/Panier non. « Bottom nav tab
								// change » = `selection` (règle haptique projet), et seulement quand
								// l'onglet change réellement de page.
								onClick={() => !tab.isActive && triggerHaptic("selection")}
								className={cn(
									bottomBarItemClass,
									"can-hover:hover:bg-primary/5",
									tab.isActive && bottomBarActiveItemClass,
								)}
								aria-current={tab.isActive ? "page" : undefined}
								aria-label={"ariaLabel" in tab ? tab.ariaLabel : undefined}
							>
								{tab.isActive && <BottomBarActivePill groupId="shop-nav" />}
								{iconEl}
								<span className={bottomBarLabelClass}>{tab.label}</span>
								<LoadingIndicator />
							</Link>
						</li>
					);
				})}
			</ul>
		</BottomBar>,
		document.body,
	);
}
