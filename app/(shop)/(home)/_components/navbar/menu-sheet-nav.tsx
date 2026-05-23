"use client";

import type { NavbarSessionData } from "@/shared/types/session.types";
import type { CollectionImage } from "@/modules/collections/types/collection.types";
import type { getMobileNavItems } from "@/shared/constants/navigation";
import { ROUTES } from "@/shared/constants/urls";
import { SheetClose } from "@/shared/components/ui/sheet";
import { useActiveNavbarItem } from "@/shared/hooks/use-active-navbar-item";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { m, useReducedMotion, type Variants } from "motion/react";
import { Heart } from "lucide-react";
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
import { VAUL_EXIT_DURATION_MS } from "./navbar-styles";

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
		createdAt?: Date;
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

	// Separate items into zones
	const homeItem = navItems.find((item) => item.href === ROUTES.SHOP.HOME);
	const accountItem = navItems.find(
		(item) => item.href === ROUTES.ACCOUNT.ROOT || item.href === ROUTES.AUTH.SIGN_IN,
	);
	const favoritesItem = navItems.find((item) => item.href === ROUTES.ACCOUNT.FAVORITES);
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
			activePage?.scrollIntoView({ block: "center", behavior: "smooth" });
			n.querySelector<HTMLAnchorElement>("a")?.focus();
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
		// focus once Vaul's exit animation should have completed.
		const fallback = setTimeout(applyFocus, VAUL_EXIT_DURATION_MS);
		return () => {
			sheetContent.removeEventListener("transitionend", onTransitionEnd);
			clearTimeout(fallback);
		};
	}, [shouldReduceMotion]);

	// Compute stagger delay in seconds (mirrors previous CSS timing)
	function delay(baseMs: number, index: number) {
		return shouldReduceMotion ? 0 : (baseMs + index * 20) / 1000;
	}

	const sectionProps = { isMenuItemActive, itemVariants, delay };

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
				<m.div variants={itemVariants} custom={delay(30, 0)}>
					<UserHeader session={session} wishlistCount={wishlistCount} cartCount={cartCount} />
				</m.div>
			)}

			<DiscoverSection homeItem={homeItem} {...sectionProps} />

			<CreationsSection productTypes={productTypes} {...sectionProps} />

			<CollectionsSection collections={collections} {...sectionProps} />

			{/* Decorative separator */}
			<m.div
				className="relative my-6 flex items-center justify-center"
				aria-hidden="true"
				variants={itemVariants}
				custom={delay(140, 0)}
			>
				<div className="absolute inset-0 flex items-center">
					<div className="border-border/80 w-full border-t" />
				</div>
				<div className="bg-background/95 relative rounded-full px-3">
					<Heart className="text-muted-foreground fill-muted-foreground/20 size-4" />
				</div>
			</m.div>

			<AccountSection
				accountItem={accountItem}
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
					custom={delay(170, 0)}
				>
					<SheetClose asChild>
						<Link
							href={ROUTES.ADMIN.ROOT}
							prefetch={null}
							className={cn(
								"flex items-center rounded-lg px-4 py-3.5 text-base/6 font-medium tracking-wide antialiased",
								"ease-out motion-safe:transition-[transform,color,background-color] motion-safe:duration-[var(--duration-slow)]",
								"focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
								"text-foreground/80 hover:bg-accent hover:text-foreground",
								"motion-safe:active:scale-[0.97]",
							)}
						>
							Tableau de bord
						</Link>
					</SheetClose>
				</m.div>
			)}
		</m.nav>
	);
}
