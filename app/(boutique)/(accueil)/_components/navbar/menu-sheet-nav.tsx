"use client";

import { LogoutAlertDialog } from "@/modules/auth/components/logout-alert-dialog";
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
import { Gem, Heart, LogIn } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import Link from "next/link";
import { CollectionMiniGrid } from "./collection-mini-grid";
import { SectionHeader } from "./section-header";
import { UserHeader } from "./user-header";

// Motion variants for staggered menu items (enter + exit)
const itemVariants: Variants = {
	hidden: { opacity: 0, y: 8 },
	visible: (delay: number) => ({
		opacity: 1,
		y: 0,
		transition: { delay, duration: 0.25, ease: [0, 0, 0.2, 1] as const },
	}),
	exit: { opacity: 0, y: -4, transition: { duration: 0.1 } },
};

// Common link styles (module scope - pure values)
const linkClassName = cn(
	"flex items-center text-base/6 font-medium tracking-wide antialiased px-4 py-3 rounded-lg",
	"transition-[transform,color,background-color] duration-300 ease-out",
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
	"text-foreground/85 hover:text-foreground hover:bg-primary/5 hover:pl-5",
	"motion-safe:active:scale-[0.97]"
);

const activeLinkClassName = cn(
	linkClassName,
	"bg-primary/12 text-foreground font-semibold border-l-2 border-primary pl-5 shadow-sm"
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
}

export function MenuSheetNav({
	navItems,
	productTypes,
	collections,
	session,
	isOpen,
}: MenuSheetNavProps) {
	const { isMenuItemActive } = useActiveNavbarItem();
	const wishlistCount = useBadgeCountsStore((s) => s.wishlistCount);
	const cartCount = useBadgeCountsStore((s) => s.cartCount);
	const shouldReduceMotion = useReducedMotion();

	// Separate items into zones
	const homeItem = navItems.find((item) => item.href === ROUTES.SHOP.HOME);
	const personalizationItem = navItems.find((item) => item.href === ROUTES.SHOP.CUSTOMIZATION);
	const accountItem = navItems.find((item) => item.href === ROUTES.ACCOUNT.ROOT || item.href === ROUTES.AUTH.SIGN_IN);
	const favoritesItem = navItems.find((item) => item.href === ROUTES.ACCOUNT.FAVORITES);
	const isLoggedIn = !!session?.user;

	const displayedCollections = collections?.slice(0, MAX_COLLECTIONS_IN_MENU);

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
					key="menu-nav"
					aria-label="Menu principal mobile"
					className="relative z-10 px-6 pt-14 pb-4"
					initial="hidden"
					animate="visible"
					exit="exit"
				>
					{/* User header (if logged in) */}
					{session?.user && (
						<motion.div variants={itemVariants} custom={delay(30, 0)}>
							<UserHeader
								session={session}
								wishlistCount={wishlistCount}
								cartCount={cartCount}
							/>
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
											aria-current={
												isMenuItemActive(homeItem.href) ? "page" : undefined
											}
										>
											{homeItem.label}
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
											aria-current={
												isMenuItemActive(ROUTES.SHOP.PRODUCTS)
													? "page"
													: undefined
											}
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
													isMenuItemActive(ROUTES.SHOP.PRODUCT_TYPE(type.slug))
														? "page"
														: undefined
												}
											>
												{type.label}
											</Link>
										</SheetClose>
									</motion.li>
								))}
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
											aria-current={
												isMenuItemActive(ROUTES.SHOP.COLLECTIONS)
													? "page"
													: undefined
											}
										>
											Toutes les collections
										</Link>
									</SheetClose>
								</motion.li>
								{displayedCollections.map((collection, i) => (
									<motion.li key={collection.slug} variants={itemVariants} custom={delay(110, i + 1)}>
										<SheetClose asChild>
											<Link
												href={ROUTES.SHOP.COLLECTION(collection.slug)}
												className={getLinkClass(
													ROUTES.SHOP.COLLECTION(collection.slug),
													"gap-3"
												)}
												aria-current={
													isMenuItemActive(
														ROUTES.SHOP.COLLECTION(collection.slug)
													)
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
														className="size-12 rounded-lg bg-muted flex items-center justify-center shrink-0"
														aria-hidden="true"
													>
														<Gem className="h-5 w-5 text-primary/40" />
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

					{/* Section Sur mesure */}
					{personalizationItem && (
						<section aria-labelledby="section-custom" className="mb-4">
							<SectionHeader id="section-custom">Sur mesure</SectionHeader>
							<ul>
								<motion.li variants={itemVariants} custom={delay(130, 0)}>
									<SheetClose asChild>
										<Link
											href={personalizationItem.href}
											className={getLinkClass(personalizationItem.href)}
											aria-current={
												isMenuItemActive(personalizationItem.href)
													? "page"
													: undefined
											}
										>
											{personalizationItem.label}
										</Link>
									</SheetClose>
								</motion.li>
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
							<div className="w-full border-t border-border/80" />
						</div>
						<div className="relative bg-background/95 px-3 rounded-full">
							<Heart className="h-4 w-4 text-muted-foreground fill-muted-foreground/20" />
						</div>
					</motion.div>

					{/* Section Account */}
					<section aria-labelledby="section-account">
						<SectionHeader id="section-account">{isLoggedIn ? "Mon compte" : "Compte"}</SectionHeader>
						<ul className="space-y-1">
							{/* Account link - adapts to session state */}
							{accountItem && (
								<motion.li variants={itemVariants} custom={delay(150, 0)}>
									<SheetClose asChild>
										<Link
											href={accountItem.href}
											className={getLinkClass(
												accountItem.href,
												!isLoggedIn ? "gap-2" : undefined
											)}
											aria-current={
												isMenuItemActive(accountItem.href) ? "page" : undefined
											}
										>
											{!isLoggedIn && <LogIn className="size-4" aria-hidden="true" />}
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
											className={getLinkClass(
												favoritesItem.href,
												"justify-between"
											)}
											aria-current={
												isMenuItemActive(favoritesItem.href) ? "page" : undefined
											}
											aria-label={wishlistCount > 0 ? `Favoris (${wishlistCount})` : undefined}
										>
											{favoritesItem.label}
											{wishlistCount > 0 && (
												<Badge variant="secondary" className="text-[10px] px-1.5 py-0">
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
											aria-current={
												isMenuItemActive(ROUTES.ACCOUNT.ORDERS) ? "page" : undefined
											}
										>
											Mes commandes
										</Link>
									</SheetClose>
								</motion.li>
							)}

							{/* Logout (logged in only) */}
							{isLoggedIn && (
								<motion.li variants={itemVariants} custom={delay(150, 3)}>
									<LogoutAlertDialog>
										<button
											type="button"
											className={cn(linkClassName, "w-full text-left text-muted-foreground hover:text-foreground")}
										>
											Déconnexion
										</button>
									</LogoutAlertDialog>
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
												"text-muted-foreground hover:text-foreground"
											)}
											aria-current={
												isMenuItemActive(ROUTES.AUTH.SIGN_UP) ? "page" : undefined
											}
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
