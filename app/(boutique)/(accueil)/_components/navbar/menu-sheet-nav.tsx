"use client";

import type { NavbarSessionData } from "@/shared/types/session.types";
import type { CollectionImage } from "@/modules/collections/types/collection.types";
import type { getMobileNavItems } from "@/shared/constants/navigation";
import { ROUTES } from "@/shared/constants/urls";
import { SheetClose } from "@/shared/components/ui/sheet";
import { useActiveNavbarItem } from "@/shared/hooks/use-active-navbar-item";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { AnimatePresence, m, useReducedMotion, type Variants } from "motion/react";
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

// Motion variants for staggered menu items (enter + exit)
const itemVariants: Variants = {
	hidden: { opacity: 0, y: 8 },
	visible: (delay: number) => ({
		opacity: 1,
		y: 0,
		transition: { delay, duration: 0.25, ease: MOTION_CONFIG.easing.easeOut },
	}),
	exit: { opacity: 0, y: -4, transition: { duration: 0.1 } },
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
	isOpen: boolean;
	onLogoutClick?: () => void;
}

export function MenuSheetNav({
	navItems,
	productTypes,
	collections,
	session,
	isAdmin = false,
	isOpen,
	onLogoutClick,
}: MenuSheetNavProps) {
	const { isMenuItemActive } = useActiveNavbarItem();
	const wishlistCount = useBadgeCountsStore((s) => s.wishlistCount);
	const cartCount = useBadgeCountsStore((s) => s.cartCount);
	const shouldReduceMotion = useReducedMotion();

	// Separate items into zones
	const homeItem = navItems.find((item) => item.href === ROUTES.SHOP.HOME);
	const personalizationItem = navItems.find((item) => item.href === ROUTES.SHOP.CUSTOMIZATION);
	const accountItem = navItems.find(
		(item) => item.href === ROUTES.ACCOUNT.ROOT || item.href === ROUTES.AUTH.SIGN_IN,
	);
	const favoritesItem = navItems.find((item) => item.href === ROUTES.ACCOUNT.FAVORITES);
	const isLoggedIn = !!session?.user;

	const navRef = useRef<HTMLElement>(null);

	// Scroll-to-active + focus management after open animation
	useEffect(() => {
		if (!isOpen) return;
		const focusDelay = shouldReduceMotion ? 0 : 350;
		const timer = setTimeout(() => {
			const nav = navRef.current;
			if (!nav) return;

			// Scroll to active page link
			const activePage = nav.querySelector<HTMLElement>('[aria-current="page"]');
			activePage?.scrollIntoView({ block: "center", behavior: "smooth" });

			// Always focus first link for WCAG 2.4.3 focus order
			nav.querySelector<HTMLAnchorElement>("a")?.focus();
		}, focusDelay);
		return () => clearTimeout(timer);
	}, [isOpen, shouldReduceMotion]);

	// Compute stagger delay in seconds (mirrors previous CSS timing)
	function delay(baseMs: number, index: number) {
		return shouldReduceMotion ? 0 : (baseMs + index * 20) / 1000;
	}

	const sectionProps = { isMenuItemActive, itemVariants, delay };

	return (
		<AnimatePresence mode="wait">
			{isOpen && (
				<m.nav
					ref={navRef}
					key="menu-nav"
					aria-label="Menu principal mobile"
					className="relative z-10 px-6 pt-[max(3.5rem,calc(env(safe-area-inset-top)+2.5rem))] pb-4"
					initial="hidden"
					animate="visible"
					exit="exit"
				>
					{/* User header (if logged in) */}
					{session?.user && (
						<m.div variants={itemVariants} custom={delay(30, 0)}>
							<UserHeader session={session} wishlistCount={wishlistCount} cartCount={cartCount} />
						</m.div>
					)}

					<DiscoverSection homeItem={homeItem} {...sectionProps} />

					<CreationsSection
						productTypes={productTypes}
						personalizationItem={personalizationItem}
						{...sectionProps}
					/>

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
							<Heart className="text-muted-foreground fill-muted-foreground/20 h-4 w-4" />
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
									className={cn(
										"flex items-center rounded-lg px-4 py-3.5 text-base/6 font-medium tracking-wide antialiased",
										"transition-[transform,color,background-color] duration-300 ease-out",
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
			)}
		</AnimatePresence>
	);
}
