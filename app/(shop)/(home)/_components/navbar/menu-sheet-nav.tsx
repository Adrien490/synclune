"use client";

import type { NavbarSessionData } from "@/shared/types/session.types";
import type { CollectionImage } from "@/modules/collections/types/collection.types";
import type { getMobileNavItems } from "@/shared/constants/navigation";
import { ROUTES } from "@/shared/constants/urls";
import { useActiveNavbarItem } from "@/shared/hooks/use-active-navbar-item";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { m, useReducedMotion, type Variants } from "motion/react";
import { HeartIcon } from "@phosphor-icons/react/ssr";
import { cn } from "@/shared/utils/cn";
import Link from "next/link";
import { useEffect, useRef } from "react";
import {
	AccountSection,
	CollectionsSection,
	CreationsSection,
	DiscoverSection,
	UserHeader,
} from "./menu-sheet-nav-sections";
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

interface MenuSheetNavProps {
	navItems: ReturnType<typeof getMobileNavItems>;
	productTypes?: Array<{ slug: string; label: string }>;
	collections?: Array<{
		slug: string;
		label: string;
		images: CollectionImage[];
	}>;
	session?: NavbarSessionData | null;
	isAdmin?: boolean;
	onLogoutClick?: () => void;
}

export function MenuSheetNav({
	navItems,
	productTypes,
	collections,
	session,
	isAdmin = false,
	onLogoutClick,
}: MenuSheetNavProps) {
	const { isMenuItemActive } = useActiveNavbarItem();
	const wishlistCount = useBadgeCountsStore((s) => s.wishlistCount);
	const cartCount = useBadgeCountsStore((s) => s.cartCount);
	const shouldReduceMotion = useReducedMotion();
	const onNavigate = useMenuSheetNavigate();

	// Separate items into zones
	const homeItem = navItems.find((item) => item.href === ROUTES.SHOP.HOME);
	const aboutItem = navItems.find((item) => item.href === ROUTES.SHOP.ABOUT);
	const favoritesItem = navItems.find((item) => item.href === ROUTES.SHOP.FAVORITES);
	const isLoggedIn = !!session?.user;

	const navRef = useRef<HTMLElement>(null);

	// Scroll-to-active + focus management after open animation (WCAG 2.4.3).
	// Component mounts via Vaul portal when the sheet opens. We listen for the
	// Vaul content's transform transition to end instead of using a fixed
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
			// preventScroll: focusing the first link must not undo the scroll-to-active
			// above (default focus() scrolls the target into view → jumps back to top).
			n.querySelector<HTMLAnchorElement>("a")?.focus({ preventScroll: true });
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
		// focus once Vaul's ENTER animation should have completed. Same duration as
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
	// 90, 110, 140, 150, 170). Avec les 7 familles du catalogue, « Nos créations »
	// courait jusqu'à 230 ms pendant que « Collections » repartait à 110 et que le
	// séparateur décoratif tombait à 140 — au milieu des catégories qu'il est
	// censé suivre. Trois sections s'animaient simultanément : ce qui se lisait
	// n'était pas une cascade mais du scintillement.
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
			className="relative z-10 px-6 pt-2 pb-4"
			initial="hidden"
			animate="visible"
		>
			{/* User header (if logged in) */}
			{session?.user && (
				<m.div variants={itemVariants} custom={nextDelay()}>
					<UserHeader session={session} wishlistCount={wishlistCount} cartCount={cartCount} />
				</m.div>
			)}

			<DiscoverSection homeItem={homeItem} aboutItem={aboutItem} {...sectionProps} />

			<CreationsSection productTypes={productTypes} {...sectionProps} />

			<CollectionsSection collections={collections} {...sectionProps} />

			{/* Decorative separator */}
			<m.div
				className="relative my-6 flex items-center justify-center"
				aria-hidden="true"
				variants={itemVariants}
				custom={nextDelay()}
			>
				<div className="absolute inset-0 flex items-center">
					<div className="border-border/80 w-full border-t" />
				</div>
				<div className="bg-background/95 relative rounded-full px-3">
					<HeartIcon className="text-muted-foreground fill-muted-foreground/20 size-4" />
				</div>
			</m.div>

			<AccountSection
				favoritesItem={favoritesItem}
				isLoggedIn={isLoggedIn}
				wishlistCount={wishlistCount}
				onLogoutClick={onLogoutClick}
				{...sectionProps}
			/>

			{/* Admin dashboard link (admin users only) */}
			{isAdmin && (
				<m.div
					className="border-border/60 mt-4 border-t pt-4"
					variants={itemVariants}
					custom={nextDelay()}
				>
					{/* Pas de `<SheetClose asChild>` — cf. `menu-sheet-navigate-context`. */}
					<Link
						href={ROUTES.ADMIN.ROOT}
						replace
						prefetch={null}
						onClick={onNavigate}
						className={cn(
							"flex items-center rounded-lg px-4 py-3.5 text-base/6 font-medium tracking-wide antialiased",
							"ease-out motion-safe:transition-[transform,color,background-color] motion-safe:duration-[var(--duration-slow)]",
							"focus-ring",
							"text-foreground/80 can-hover:hover:bg-accent can-hover:hover:text-foreground",
							"motion-safe:active:scale-[0.97]",
						)}
					>
						Tableau de bord
					</Link>
				</m.div>
			)}
		</m.nav>
	);
}
