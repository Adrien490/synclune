"use client";

import type { NavbarSessionData } from "@/shared/types/session.types";
import type { CollectionImage } from "@/modules/collections/types/collection.types";
import { Badge } from "@/shared/components/ui/badge";
import { SheetClose } from "@/shared/components/ui/sheet";
import type { getMobileNavItems } from "@/shared/constants/navigation";
import { MAX_COLLECTIONS_IN_MENU } from "@/shared/constants/navigation";
import { ROUTES } from "@/shared/constants/urls";
import { useActiveNavbarItem } from "@/shared/hooks/use-active-navbar-item";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";
import { cn } from "@/shared/utils/cn";
import { Gem, Heart } from "lucide-react";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { CollectionMiniGrid } from "./collection-mini-grid";
import { SectionHeader } from "./section-header";
import { UserHeader } from "./user-header";

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

// Common link styles (module scope - pure values)
const linkClassName = cn(
	"flex items-center text-base/6 font-medium tracking-wide antialiased px-4 py-3.5 rounded-lg",
	"transition-[transform,color,background-color,padding] duration-300 ease-out",
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
	"text-foreground/85 hover:text-foreground hover:bg-primary/5 hover:pl-5",
	"motion-safe:active:scale-[0.97]",
);

const activeLinkClassName = cn(
	linkClassName,
	"bg-primary/12 text-foreground font-semibold border-l-2 border-primary pl-5 shadow-sm",
);

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
	isOpen: boolean;
	onLogoutClick?: () => void;
}

export function MenuSheetNav({
	navItems,
	productTypes,
	collections,
	session,
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
	const atelierItem = navItems.find((item) => item.href === ROUTES.SHOP.ABOUT);
	const accountItem = navItems.find(
		(item) => item.href === ROUTES.ACCOUNT.ROOT || item.href === ROUTES.AUTH.SIGN_IN,
	);
	const favoritesItem = navItems.find((item) => item.href === ROUTES.ACCOUNT.FAVORITES);
	const isLoggedIn = !!session?.user;

	const navRef = useRef<HTMLElement>(null);
	const displayedCollections = collections?.slice(0, MAX_COLLECTIONS_IN_MENU);

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

	function getLinkClass(href: string, extra?: string) {
		return cn(isMenuItemActive(href) ? activeLinkClassName : linkClassName, extra);
	}

	// Compute stagger delay in seconds (mirrors previous CSS timing)
	function delay(baseMs: number, index: number) {
		return shouldReduceMotion ? 0 : (baseMs + index * 20) / 1000;
	}

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.nav
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
						<motion.div variants={itemVariants} custom={delay(30, 0)}>
							<UserHeader session={session} wishlistCount={wishlistCount} cartCount={cartCount} />
						</motion.div>
					)}

					{/* Section Decouvrir - Home + Best sellers */}
					<section aria-labelledby="section-discover" className="mb-4">
						<SectionHeader id="section-discover">Découvrir</SectionHeader>
						<ul className="space-y-1">
							{homeItem && (
								<motion.li variants={itemVariants} custom={delay(70, 0)}>
									<SheetClose asChild>
										<Link
											href={homeItem.href}
											className={getLinkClass(homeItem.href)}
											aria-current={isMenuItemActive(homeItem.href) ? "page" : undefined}
										>
											{homeItem.label}
										</Link>
									</SheetClose>
								</motion.li>
							)}
							{atelierItem && (
								<motion.li variants={itemVariants} custom={delay(70, 1)}>
									<SheetClose asChild>
										<Link
											href={atelierItem.href}
											className={getLinkClass(atelierItem.href)}
											aria-current={isMenuItemActive(atelierItem.href) ? "page" : undefined}
										>
											{atelierItem.label}
										</Link>
									</SheetClose>
								</motion.li>
							)}
						</ul>
					</section>

					{/* Section Les creations (product types) */}
					{productTypes && productTypes.length > 0 && (
						<section aria-labelledby="section-creations" className="mb-4">
							<SectionHeader id="section-creations">Nos créations</SectionHeader>
							<ul className="space-y-1">
								{/* "All jewelry" link prominent first (Baymard UX) */}
								<motion.li variants={itemVariants} custom={delay(90, 0)}>
									<SheetClose asChild>
										<Link
											href={ROUTES.SHOP.PRODUCTS}
											className={getLinkClass(ROUTES.SHOP.PRODUCTS)}
											aria-current={isMenuItemActive(ROUTES.SHOP.PRODUCTS) ? "page" : undefined}
										>
											Tous les bijoux
										</Link>
									</SheetClose>
								</motion.li>
								{productTypes.map((type, i) => (
									<motion.li key={type.slug} variants={itemVariants} custom={delay(90, i + 1)}>
										<SheetClose asChild>
											<Link
												href={ROUTES.SHOP.PRODUCT_TYPE(type.slug)}
												className={getLinkClass(ROUTES.SHOP.PRODUCT_TYPE(type.slug))}
												aria-current={
													isMenuItemActive(ROUTES.SHOP.PRODUCT_TYPE(type.slug)) ? "page" : undefined
												}
											>
												{type.label}
											</Link>
										</SheetClose>
									</motion.li>
								))}
								{personalizationItem && (
									<motion.li variants={itemVariants} custom={delay(90, productTypes.length + 1)}>
										<SheetClose asChild>
											<Link
												href={personalizationItem.href}
												className={getLinkClass(personalizationItem.href)}
												aria-current={
													isMenuItemActive(personalizationItem.href) ? "page" : undefined
												}
											>
												{personalizationItem.label}
											</Link>
										</SheetClose>
									</motion.li>
								)}
							</ul>
						</section>
					)}

					{/* Section Collections */}
					{displayedCollections && displayedCollections.length > 0 && (
						<section aria-labelledby="section-collections" className="mb-4">
							<SectionHeader id="section-collections">Collections</SectionHeader>
							<ul className="space-y-1">
								{/* "All collections" link prominent first */}
								<motion.li variants={itemVariants} custom={delay(110, 0)}>
									<SheetClose asChild>
										<Link
											href={ROUTES.SHOP.COLLECTIONS}
											className={getLinkClass(ROUTES.SHOP.COLLECTIONS)}
											aria-current={isMenuItemActive(ROUTES.SHOP.COLLECTIONS) ? "page" : undefined}
										>
											Toutes les collections
										</Link>
									</SheetClose>
								</motion.li>
								{displayedCollections.map((collection, i) => (
									<motion.li
										key={collection.slug}
										variants={itemVariants}
										custom={delay(110, i + 1)}
									>
										<SheetClose asChild>
											<Link
												href={ROUTES.SHOP.COLLECTION(collection.slug)}
												className={getLinkClass(ROUTES.SHOP.COLLECTION(collection.slug), "gap-3")}
												aria-current={
													isMenuItemActive(ROUTES.SHOP.COLLECTION(collection.slug))
														? "page"
														: undefined
												}
											>
												{collection.images.length > 0 ? (
													<CollectionMiniGrid
														images={collection.images}
														collectionName={collection.label}
													/>
												) : (
													<div
														className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-lg"
														aria-hidden="true"
													>
														<Gem className="text-primary/40 h-5 w-5" />
													</div>
												)}
												<span className="flex-1">{collection.label}</span>
											</Link>
										</SheetClose>
									</motion.li>
								))}
							</ul>
						</section>
					)}

					{/* Decorative separator */}
					<motion.div
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
					</motion.div>

					{/* Section Account */}
					<section aria-labelledby="section-account">
						<SectionHeader id="section-account">
							{isLoggedIn ? "Mon compte" : "Compte"}
						</SectionHeader>
						<ul className="space-y-1">
							{/* Account link - adapts to session state */}
							{accountItem && (
								<motion.li variants={itemVariants} custom={delay(150, 0)}>
									<SheetClose asChild>
										<Link
											href={accountItem.href}
											className={getLinkClass(accountItem.href)}
											aria-current={isMenuItemActive(accountItem.href) ? "page" : undefined}
										>
											{accountItem.label}
										</Link>
									</SheetClose>
								</motion.li>
							)}

							{/* Favorites with badge count */}
							{favoritesItem && isLoggedIn && (
								<motion.li variants={itemVariants} custom={delay(150, 1)}>
									<SheetClose asChild>
										<Link
											href={favoritesItem.href}
											className={getLinkClass(favoritesItem.href, "justify-between")}
											aria-current={isMenuItemActive(favoritesItem.href) ? "page" : undefined}
											aria-label={
												wishlistCount > 0 ? `${favoritesItem.label} (${wishlistCount})` : undefined
											}
										>
											{favoritesItem.label}
											{wishlistCount > 0 && (
												<Badge variant="secondary" className="px-1.5 py-0 text-xs">
													{wishlistCount}
												</Badge>
											)}
										</Link>
									</SheetClose>
								</motion.li>
							)}

							{/* Orders (logged in only) */}
							{isLoggedIn && (
								<motion.li variants={itemVariants} custom={delay(150, 2)}>
									<SheetClose asChild>
										<Link
											href={ROUTES.ACCOUNT.ORDERS}
											className={getLinkClass(ROUTES.ACCOUNT.ORDERS)}
											aria-current={isMenuItemActive(ROUTES.ACCOUNT.ORDERS) ? "page" : undefined}
										>
											Mes commandes
										</Link>
									</SheetClose>
								</motion.li>
							)}

							{/* Logout (logged in only) — closes menu before opening dialog */}
							{isLoggedIn && (
								<motion.li variants={itemVariants} custom={delay(150, 3)}>
									<button
										type="button"
										className={cn(
											linkClassName,
											"text-muted-foreground hover:text-foreground w-full text-left",
										)}
										onClick={onLogoutClick}
									>
										Déconnexion
									</button>
								</motion.li>
							)}

							{/* Sign up link for non-logged-in users */}
							{!isLoggedIn && (
								<motion.li variants={itemVariants} custom={delay(150, 1)}>
									<SheetClose asChild>
										<Link
											href={ROUTES.AUTH.SIGN_UP}
											className={getLinkClass(
												ROUTES.AUTH.SIGN_UP,
												"text-muted-foreground hover:text-foreground",
											)}
											aria-current={isMenuItemActive(ROUTES.AUTH.SIGN_UP) ? "page" : undefined}
										>
											Créer un compte
										</Link>
									</SheetClose>
								</motion.li>
							)}
						</ul>
					</section>
				</motion.nav>
			)}
		</AnimatePresence>
	);
}
