"use client";

import type { getMobileNavItems } from "@/shared/constants/navigation";
import { ROUTES } from "@/shared/constants/urls";
import { useActiveNavbarItem } from "@/shared/hooks/use-active-navbar-item";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { m, useReducedMotion, type Variants } from "motion/react";
import { cn } from "@/shared/utils/cn";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { MenuProductTypeItem } from "./menu-sheet-nav-sections";
import { CreationsGrid, MenuSheetHeadNote, ShortcutsBand } from "./menu-sheet-nav-sections";
import { useMenuSheetNavigate } from "./menu-sheet-navigate-context";
import { VAUL_TRANSITION_DURATION_MS } from "./navbar-styles";

// Motion variants for staggered menu items (enter + exit)
const itemVariants: Variants = {
	hidden: { opacity: 0, y: 8 },
	visible: (delay: number) => ({
		opacity: 1,
		y: 0,
		transition: { delay, duration: 0.25, ease: MOTION_CONFIG.easing.easeOut },
	}),
};

/** Classe partagée des entrées pleine largeur du bloc admin. */
const adminRowClassName = cn(
	"flex items-center rounded-lg px-4 py-3.5 text-base/6 font-medium tracking-wide antialiased",
	"ease-out motion-safe:transition-[transform,color,background-color] motion-safe:duration-[var(--duration-slow)]",
	"focus-ring",
	"text-foreground/80 can-hover:hover:bg-accent can-hover:hover:text-foreground",
	"motion-safe:active:scale-[0.97]",
);

interface MenuSheetNavProps {
	navItems: ReturnType<typeof getMobileNavItems>;
	productTypes?: MenuProductTypeItem[];
	isAdmin?: boolean;
	onLogoutClick?: () => void;
	/** Ferme le menu puis ouvre le cart sheet (différé `transitionend`) — cf. `MenuSheet`. */
	onCartClick?: () => void;
}

/**
 * « L'étal de poche » — composition du volet, dans l'ordre :
 * tête éditoriale · bande de raccourcis · grille des
 * familles (ou encart « atelier en pause ») · rangée « Les collections » · bloc
 * admin (Tableau de bord + Déconnexion).
 *
 * L'état « boutique fermée » n'est volontairement PAS traité ici :
 * `app/(shop)/layout.tsx` remplace la boutique entière (navbar comprise) par
 * `StoreClosurePage` pour un non-admin — ce composant n'est alors jamais monté.
 */
export function MenuSheetNav({
	navItems,
	productTypes,
	isAdmin = false,
	onLogoutClick,
	onCartClick,
}: MenuSheetNavProps) {
	const { isMenuItemActive } = useActiveNavbarItem();
	const wishlistCount = useBadgeCountsStore((s) => s.wishlistCount);
	const cartCount = useBadgeCountsStore((s) => s.cartCount);
	const shouldReduceMotion = useReducedMotion();
	const onNavigate = useMenuSheetNavigate();

	// Destinations de premier niveau résolues depuis la SSOT `getMobileNavItems`.
	// `aboutItem` est un point d'extension documenté (retrait refusé 2026-07-26) :
	// aujourd'hui `ROUTES.SHOP.ABOUT` ne sort pas de la SSOT, la ligne ne rend rien.
	const homeItem = navItems.find((item) => item.href === ROUTES.SHOP.HOME);
	const aboutItem = navItems.find((item) => item.href === ROUTES.SHOP.ABOUT);
	// Quatrième `find` depuis le 2026-08-08 : la bande de cartes Collections a été
	// supprimée, sa destination remonte donc dans la SSOT comme les trois autres.
	const collectionsItem = navItems.find((item) => item.href === ROUTES.SHOP.COLLECTIONS);

	const navRef = useRef<HTMLElement>(null);

	// Scroll-to-active + focus management after open animation (WCAG 2.4.3).
	// Component mounts via the sheet portal when it opens. We listen for the
	// content's transform transition to end instead of using a fixed
	// setTimeout — aligns with the real animation duration and respects
	// prefers-reduced-motion.
	useEffect(() => {
		const nav = navRef.current;
		if (!nav) return;

		function applyFocus() {
			const n = navRef.current;
			if (!n) return;
			const activePage = n.querySelector<HTMLElement>('[aria-current="page"]');
			// La garde shouldReduceMotion plus bas ne couvre que le TIMING (skip de
			// l'attente transitionend) — le scroll lui-même doit aussi être instantané.
			activePage?.scrollIntoView({
				block: "center",
				behavior: shouldReduceMotion ? "auto" : "smooth",
			});
			// Focus l'entrée ACTIVE elle-même, pas le premier lien : entrée active sous
			// le pli, le focus vivait hors-écran et le premier Tab re-défilait vers le
			// haut — le scroll-to-active ne bénéficiait qu'aux pointeurs. preventScroll :
			// le scrollIntoView ci-dessus a déjà positionné, un focus() par défaut le
			// referait à sa manière (alignement nearest, pas center).
			(activePage ?? n.querySelector<HTMLAnchorElement>("a"))?.focus({ preventScroll: true });
		}

		if (shouldReduceMotion) {
			applyFocus();
			return;
		}

		const sheetContent = nav.closest<HTMLElement>('[data-slot="sheet-content"]');
		if (!sheetContent) {
			applyFocus();
			return;
		}

		function onTransitionEnd(event: TransitionEvent) {
			if (event.propertyName !== "transform" || event.target !== sheetContent) return;
			applyFocus();
			sheetContent?.removeEventListener("transitionend", onTransitionEnd);
		}

		sheetContent.addEventListener("transitionend", onTransitionEnd);
		// Safety fallback: if transitionend never fires (interrupted by reflow),
		// focus once the ENTER animation should have completed. Same duration as
		// the exit slide — d'où le nom neutre de la constante.
		const fallback = setTimeout(applyFocus, VAUL_TRANSITION_DURATION_MS);
		return () => {
			sheetContent.removeEventListener("transitionend", onTransitionEnd);
			clearTimeout(fallback);
		};
	}, [shouldReduceMotion]);

	// Cascade MONOTONE : un SEUL compteur traverse tout le menu, dans l'ordre du
	// DOM.
	//
	// Chaque section calculait auparavant son délai depuis SA propre base (30, 70,
	// 90, 110, 140, 150, 170) — trois sections s'animaient simultanément : ce qui
	// se lisait n'était pas une cascade mais du scintillement.
	//
	// ⚠️ Le compteur est recréé à CHAQUE rendu (closure locale), et il n'est
	// consommé que par des composants enfants rendus dans l'ordre du DOM. Un
	// double rendu StrictMode repart donc de zéro, et un enfant ne peut pas se
	// re-rendre seul : `wishlistCount` / `cartCount` sont lus ICI, donc toute
	// mise à jour du store re-rend ce composant et régénère la suite complète.
	let step = 0;
	function nextDelay() {
		return shouldReduceMotion ? 0 : (30 + step++ * 20) / 1000;
	}

	const sectionProps = { isMenuItemActive, itemVariants, nextDelay };

	return (
		<m.nav
			ref={navRef}
			aria-label="Menu principal mobile"
			// Plus de gouttière globale : chaque section porte la sienne (16 px),
			// pour que les bandes puissent gérer leurs propres pleins-bords.
			className="relative z-10 pt-2 pb-4"
			initial="hidden"
			animate="visible"
		>
			{/* Tête éditoriale — greffe de la direction C sur l'étal de poche. */}
			<MenuSheetHeadNote itemVariants={itemVariants} customDelay={nextDelay()} />

			<ShortcutsBand
				homeItem={homeItem}
				wishlistCount={wishlistCount}
				cartCount={cartCount}
				onCartClick={onCartClick}
				{...sectionProps}
			/>

			{/* Point d'extension `aboutItem` — rendu pleine largeur sous la bande si
			    la SSOT expose un jour la destination (cf. le JSDoc plus haut). */}
			{aboutItem && (
				<m.div variants={itemVariants} custom={nextDelay()} className="mb-4 px-4">
					<Link
						href={aboutItem.href}
						replace
						prefetch={null}
						onClick={onNavigate}
						aria-current={isMenuItemActive(aboutItem.href) ? "page" : undefined}
						className={adminRowClassName}
					>
						{aboutItem.label}
					</Link>
				</m.div>
			)}

			<CreationsGrid productTypes={productTypes} {...sectionProps} />

			{/* « Les collections » en rangée pleine largeur, pas en bande de cartes :
			    `CollectionsBand` (trois tirages photo) a été supprimée le 2026-08-08
			    avec toutes les surfaces à cartes de collection, à refaire.
			    ⚠️ Ce n'est PAS un choix de design mais un plancher de navigation :
			    la bande portait le seul lien vers `/collections` sous `lg`, et la
			    retirer nue rendait la salle injoignable au doigt. La destination
			    vient de la SSOT `getMobileNavItems`, comme `aboutItem` ci-dessus. */}
			{collectionsItem && (
				<m.div variants={itemVariants} custom={nextDelay()} className="mb-4 px-4">
					<Link
						href={collectionsItem.href}
						replace
						prefetch={null}
						onClick={onNavigate}
						aria-current={isMenuItemActive(collectionsItem.href) ? "page" : undefined}
						className={adminRowClassName}
					>
						{collectionsItem.label}
					</Link>
				</m.div>
			)}

			{/* Admin (cookie de session unique de l'administratrice) : Tableau de
			    bord + Déconnexion. « Déconnexion » vivait dans l'ancienne section
			    Favoris — elle n'a jamais concerné que cette session-ci, elle vit ICI. */}
			{isAdmin && (
				<div className="border-border/60 mx-4 mt-2 border-t pt-4">
					<m.div variants={itemVariants} custom={nextDelay()}>
						{/* Pas de `<SheetClose>` autour — cf. `menu-sheet-navigate-context`. */}
						<Link
							href={ROUTES.ADMIN.ROOT}
							replace
							prefetch={null}
							onClick={onNavigate}
							className={adminRowClassName}
						>
							Tableau de bord
						</Link>
					</m.div>
					<m.div variants={itemVariants} custom={nextDelay()}>
						<button
							type="button"
							className={cn(adminRowClassName, "text-muted-foreground w-full text-left")}
							onClick={onLogoutClick}
						>
							Déconnexion
						</button>
					</m.div>
				</div>
			)}
		</m.nav>
	);
}
