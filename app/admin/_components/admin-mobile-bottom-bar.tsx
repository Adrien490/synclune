"use client";

import { createPortal } from "react-dom";
import { useState } from "react";
import {
	BottomBar,
	bottomBarContainerClass,
	bottomBarItemWrapperClass,
	bottomBarItemClass,
	bottomBarActiveItemClass,
	bottomBarIconClass,
	bottomBarLabelClass,
	bottomBarBadgeClass,
} from "@/shared/components/bottom-bar";
import { LoadingIndicator } from "@/shared/components/navigation/loading-indicator";
import { useDialog } from "@/shared/providers/overlay-store-provider";
import { isRouteActive } from "@/shared/lib/navigation";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { useMounted } from "@/shared/hooks/use-mounted";
import { useHasOverlay } from "@/shared/stores/use-overlay-stack-store";
import { usePathname } from "next/navigation";
// GuardedLink : consulte le registre de NavigationGuardProvider avant de naviguer,
// pour ne pas perdre la saisie d'un formulaire admin dirty (cf. audit 2026-07-26).
import { GuardedLink as Link } from "@/shared/components/navigation/guarded-link";
import { ListIcon } from "@phosphor-icons/react/ssr";
import { cn } from "@/shared/utils/cn";
import {
	ADMIN_MENU_SHEET_CONTENT_ID,
	BADGED_ITEM_IDS,
	badgeAriaLabel,
	badgeEmptyLabel,
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
	const isHidden = isMenuOpen || hasOverlay;

	// Toutes les files badgées, pas seulement `orders`. `getAdminNavBadges()`
	// compte aussi `refunds` et le layout passe l'objet entier : ne lire qu'une
	// clé faisait traverser tout le layout au compteur des remboursements pour
	// qu'il soit ignoré — un échec Stripe n'existait pas sur téléphone.
	const counts: Record<string, number> = {};
	for (const id of BADGED_ITEM_IDS) counts[id] = badges?.[id] ?? 0;
	const countsSignature = BADGED_ITEM_IDS.map((id) => `${id}:${counts[id]}`).join("|");

	// Annonce des changements de pastille, dérivée PENDANT LE RENDU (pas dans un
	// effet) : la région ci-dessous est ainsi montée dès le premier rendu avec un
	// contenu vide, la seule forme qu'un lecteur d'écran vocalise ensuite. La
	// pastille portait auparavant elle-même `role="status" aria-live`, mais gatée
	// sur `count > 0` : la région naissait AVEC son texte, donc la transition 0→1 —
	// l'arrivée d'une commande à traiter, la seule qui compte — était muette
	// (audit bottom-bar 2026-07-30, P2-4).
	//
	// On annonce file par file, et seulement celles qui ont BOUGÉ : un compteur de
	// remboursements inchangé n'a pas à être re-vocalisé parce qu'une commande est
	// arrivée.
	//
	// Un SEUL instantané en state : `countsSignature` est une fonction pure de
	// `counts` (ligne ci-dessus), donc la signature du rendu précédent se
	// recalcule au lieu d'être stockée une deuxième fois.
	const [prevCounts, setPrevCounts] = useState<Record<string, number>>(counts);
	const [announcement, setAnnouncement] = useState("");
	const prevSignature = BADGED_ITEM_IDS.map((id) => `${id}:${prevCounts[id] ?? 0}`).join("|");
	if (prevSignature !== countsSignature) {
		setPrevCounts(counts);
		const changed = BADGED_ITEM_IDS.filter((id) => (prevCounts[id] ?? 0) !== counts[id]).map(
			(id) => (counts[id]! > 0 ? badgeAriaLabel(id, counts[id]!) : badgeEmptyLabel(id)),
		);
		setAnnouncement(changed.join(", "));
	}

	function renderTab(tab: NavItem) {
		const isActive = isRouteActive(pathname, tab.url);
		const badgeCount = counts[tab.id] ?? 0;
		const Icon = tab.icon;
		const label = tab.shortTitle ?? tab.title;
		return (
			<li key={tab.id} className={bottomBarItemWrapperClass}>
				<Link
					href={tab.url}
					// « Bottom nav tab change » = `selection` (règle haptique projet), et
					// seulement quand l'onglet change réellement de page.
					onClick={() => !isActive && triggerHaptic("selection")}
					className={cn(bottomBarItemClass, isActive && bottomBarActiveItemClass)}
					aria-current={isActive ? "page" : undefined}
					// Le compte vit dans le nom accessible de l'onglet : le libellé visuel
					// d'un tab est plus discret qu'en menu sheet, où le titre adjacent
					// suffirait. Clamp visuel « 99+ », mais le SR garde le compte exact.
					aria-label={
						badgeCount > 0 ? `${label}, ${badgeAriaLabel(tab.id, badgeCount)}` : undefined
					}
				>
					<span className="relative">
						<Icon
							className={bottomBarIconClass}
							weight={isActive ? "fill" : "regular"}
							aria-hidden="true"
						/>
						{badgeCount > 0 && (
							/* Purement visuel : le compte est déjà dans l'aria-label du lien,
							 * et l'annonce des changements est portée par la région unique
							 * ci-dessous. */
							<span className={bottomBarBadgeClass} aria-hidden="true">
								{badgeCount > 99 ? "99+" : badgeCount}
							</span>
						)}
					</span>
					<span className={bottomBarLabelClass}>{label}</span>
					<LoadingIndicator />
				</Link>
			</li>
		);
	}

	if (!mounted) return null;

	return createPortal(
		<BottomBar as="nav" aria-label="Navigation principale administration" isHidden={isHidden}>
			<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
				{announcement}
			</div>
			{/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- iOS Safari + VO drop implicit list role when list-style:none */}
			<ul role="list" className={bottomBarContainerClass}>
				{QUICK_ACCESS_TABS.map(renderTab)}

				{/* Onglet Menu — ouvre le bottom sheet de navigation.
				 * aria-label reste stable : l'état ouvert/fermé est porté par aria-expanded
				 * (cf. audit menu-sheet storefront 2026-05-14, parité a11y trigger ↔ sheet).
				 * aria-controls reste posé même quand SheetContent est démonté hors open :
				 * forward reference autorisée par W3C ARIA 1.2, invariant testé. */}
				<li className={bottomBarItemWrapperClass}>
					<button
						type="button"
						className={cn(bottomBarItemClass, isMenuOpen && bottomBarActiveItemClass)}
						onClick={() => {
							// `light` et non `selection` : ce n'est pas un changement d'onglet mais
							// l'ouverture d'un drawer (règle haptique projet, « Drawers admin »).
							triggerHaptic("light");
							if (isMenuOpen) closeMenu();
							else openMenu();
						}}
						aria-haspopup="dialog"
						aria-expanded={isMenuOpen}
						aria-controls={ADMIN_MENU_SHEET_CONTENT_ID}
						aria-label="Menu de navigation"
					>
						<ListIcon
							className={bottomBarIconClass}
							weight={isMenuOpen ? "fill" : "regular"}
							aria-hidden="true"
						/>
						<span className={bottomBarLabelClass}>Menu</span>
					</button>
				</li>
			</ul>
		</BottomBar>,
		document.body,
	);
}
