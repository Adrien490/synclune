"use client";

import { LogoutAlertDialog } from "@/modules/auth/components/logout-alert-dialog";
import type { Session } from "@/modules/auth/lib/auth";
import type { CollectionImage } from "@/modules/collections/types/collection.types";
import { InstagramIcon } from "@/shared/components/icons/instagram-icon";
import { TikTokIcon } from "@/shared/components/icons/tiktok-icon";
import ScrollFade from "@/shared/components/scroll-fade";
import { Badge } from "@/shared/components/ui/badge";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/shared/components/ui/sheet";
import { BRAND } from "@/shared/constants/brand";
import type { getMobileNavItems } from "@/shared/constants/navigation";
import { MAX_COLLECTIONS_IN_MENU } from "@/shared/constants/navigation";
import { ROUTES } from "@/shared/constants/urls";
import { useActiveNavbarItem } from "@/shared/hooks/use-active-navbar-item";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";
import { cn } from "@/shared/utils/cn";
import { Gem, Heart, LogIn, Menu, Settings } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CollectionMiniGrid } from "./collection-mini-grid";
import { SectionHeader } from "./section-header";
import { UserHeader } from "./user-header";

// CSS stagger animation style for menu items
const staggerItemClassName =
	"motion-safe:animate-[menu-item-in_0.3s_ease-out_both]";

// Inline style to set animation-delay for stagger effect
function staggerDelay(index: number, baseDelay = 0): React.CSSProperties {
	return { animationDelay: `${baseDelay + index * 20}ms` };
}

interface MenuSheetProps {
	navItems: ReturnType<typeof getMobileNavItems>;
	productTypes?: Array<{ slug: string; label: string }>;
	collections?: Array<{
		slug: string;
		label: string;
		images: CollectionImage[];
		createdAt?: Date;
	}>;
	isAdmin?: boolean;
	session?: Session | null;
}

export function MenuSheet({
	navItems,
	productTypes,
	collections,
	isAdmin = false,
	session,
}: MenuSheetProps) {
	const { isMenuItemActive } = useActiveNavbarItem();
	const wishlistCount = useBadgeCountsStore((s) => s.wishlistCount);
	const cartCount = useBadgeCountsStore((s) => s.cartCount);
	const [isOpen, setIsOpen] = useState(false);

	// Séparer les items en zones
	const homeItem = navItems.find((item) => item.href === ROUTES.SHOP.HOME);
	const personalizationItem = navItems.find((item) => item.href === ROUTES.SHOP.CUSTOMIZATION);
	const accountItem = navItems.find((item) => item.href === ROUTES.ACCOUNT.ROOT || item.href === ROUTES.AUTH.SIGN_IN);
	const favoritesItem = navItems.find((item) => item.href === ROUTES.ACCOUNT.FAVORITES);
	const isLoggedIn = !!session?.user;

	// Limites d'affichage
	const displayedCollections = collections?.slice(0, MAX_COLLECTIONS_IN_MENU);

	// Style commun pour les liens
	const linkClassName = cn(
		"flex items-center text-base/6 font-medium tracking-wide antialiased px-4 py-3 rounded-lg",
		"transition-all duration-300 ease-out",
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
		"text-foreground/80 hover:text-foreground hover:bg-primary/5 hover:pl-5",
		"active:scale-[0.97]"
	);

	const activeLinkClassName = cn(
		linkClassName,
		"bg-primary/12 text-foreground font-semibold border-l-2 border-primary pl-5 shadow-sm"
	);

	function getLinkClass(href: string, extra?: string) {
		return cn(isMenuItemActive(href) ? activeLinkClassName : linkClassName, extra);
	}

	return (
		<Sheet direction="left" open={isOpen} onOpenChange={setIsOpen} preventScrollRestoration>
			<SheetTrigger asChild>
				<button
					type="button"
					className="relative -ml-3 inline-flex items-center justify-center size-11 rounded-xl lg:hidden bg-transparent hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-all duration-300 ease-out hover:scale-105 active:scale-95 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
					aria-label="Ouvrir le menu de navigation"
					aria-controls="mobile-menu-synclune"
				>
					<Menu
						size={20}
						className="transition-all duration-300 group-hover:rotate-6"
						aria-hidden="true"
					/>
				</button>
			</SheetTrigger>

			<SheetContent
				className="w-[min(88vw,340px)] sm:w-80 sm:max-w-md border-r bg-background/95 p-0! flex flex-col"
				id="mobile-menu-synclune"
			>

				{/* Header sr-only */}
				<SheetHeader className="p-0! sr-only">
					<SheetTitle>Menu de navigation</SheetTitle>
					<SheetDescription>
						Menu de navigation de Synclune - Découvrez nos bijoux et collections
					</SheetDescription>
				</SheetHeader>

				{/* Contenu scrollable */}
				<div className="flex-1 min-h-0">
					<ScrollFade axis="vertical" className="h-full" hideScrollbar={false}>
						<nav
							aria-label="Menu principal mobile"
							className={cn(
								"relative z-10 px-6 pt-14 pb-4",
								"motion-safe:transition-opacity motion-safe:duration-200",
								isOpen ? "opacity-100" : "opacity-0"
							)}
						>
						{/* Header utilisateur (si connecté) */}
						{session?.user && (
							<UserHeader
								session={session}
								wishlistCount={wishlistCount}
								cartCount={cartCount}
							/>
						)}

						{/* Section Découvrir - Accueil + Meilleures ventes */}
						<section aria-labelledby="section-discover" className="mb-4">
							<SectionHeader id="section-discover">Découvrir</SectionHeader>
							<ul className="space-y-1">
								{homeItem && (
									<li className={staggerItemClassName} style={staggerDelay(0, 70)}>
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
									</li>
								)}
							</ul>
						</section>

						{/* Section Les créations (productTypes) */}
						{productTypes && productTypes.length > 0 && (
							<section aria-labelledby="section-creations" className="mb-4">
								<SectionHeader id="section-creations">Nos créations</SectionHeader>
								<ul className="space-y-1">
									{/* Lien "Tous les bijoux" proéminent en premier (Baymard UX) */}
									<li className={staggerItemClassName} style={staggerDelay(0, 90)}>
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
									</li>
									{productTypes.map((type, i) => (
										<li key={type.slug} className={staggerItemClassName} style={staggerDelay(i + 1, 90)}>
											<SheetClose asChild>
												<Link
													href={`/produits/${type.slug}`}
													className={getLinkClass(`/produits/${type.slug}`)}
													aria-current={
														isMenuItemActive(`/produits/${type.slug}`)
															? "page"
															: undefined
													}
												>
														{type.label}
												</Link>
											</SheetClose>
										</li>
									))}
								</ul>
							</section>
						)}

						{/* Section Collections */}
						{displayedCollections && displayedCollections.length > 0 && (
							<section aria-labelledby="section-collections" className="mb-4">
								<SectionHeader id="section-collections">Collections</SectionHeader>
								<ul className="space-y-1">
									{/* Lien "Toutes les collections" proéminent en premier */}
									<li className={staggerItemClassName} style={staggerDelay(0, 110)}>
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
									</li>
									{displayedCollections.map((collection, i) => (
										<li key={collection.slug} className={staggerItemClassName} style={staggerDelay(i + 1, 110)}>
											<SheetClose asChild>
												<Link
													href={`/collections/${collection.slug}`}
													className={getLinkClass(
														`/collections/${collection.slug}`,
														"gap-3"
													)}
													aria-current={
														isMenuItemActive(
															`/collections/${collection.slug}`
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
										</li>
									))}
								</ul>
							</section>
						)}

						{/* Section Sur mesure */}
						{personalizationItem && (
							<section aria-labelledby="section-custom" className="mb-4">
								<SectionHeader id="section-custom">Sur mesure</SectionHeader>
								<ul>
									<li className={staggerItemClassName} style={staggerDelay(0, 130)}>
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
									</li>
								</ul>
							</section>
						)}

						{/* Séparateur décoratif */}
						<div
							className="relative my-6 flex items-center justify-center"
							aria-hidden="true"
						>
							<div className="absolute inset-0 flex items-center">
								<div className="w-full border-t border-border/80" />
							</div>
							<div className="relative bg-background/95 px-3 rounded-full">
								<Heart className="h-4 w-4 text-muted-foreground fill-muted-foreground/20" />
							</div>
						</div>

						{/* Zone compte */}
						<section aria-labelledby="section-account">
							<SectionHeader id="section-account">{isLoggedIn ? "Mon compte" : "Compte"}</SectionHeader>
							<ul className="space-y-1">
								{/* Account link - adapts to session state */}
								{accountItem && (
									<li className={staggerItemClassName} style={staggerDelay(0, 150)}>
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
									</li>
								)}

								{/* Favorites with badge count */}
								{favoritesItem && isLoggedIn && (
									<li className={staggerItemClassName} style={staggerDelay(1, 150)}>
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
									</li>
								)}

								{/* Orders (logged in only) */}
								{isLoggedIn && (
									<li className={staggerItemClassName} style={staggerDelay(2, 150)}>
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
									</li>
								)}

								{/* Logout (logged in only) */}
								{isLoggedIn && (
									<li className={staggerItemClassName} style={staggerDelay(3, 150)}>
										<LogoutAlertDialog>
											<button
												type="button"
												className={cn(linkClassName, "w-full text-left text-muted-foreground hover:text-foreground")}
											>
												Déconnexion
											</button>
										</LogoutAlertDialog>
									</li>
								)}

								{/* Sign up link for non-logged-in users */}
								{!isLoggedIn && (
									<li className={staggerItemClassName} style={staggerDelay(1, 150)}>
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
									</li>
								)}
							</ul>
						</section>
						</nav>
					</ScrollFade>
				</div>

				{/* Footer */}
				<footer className="relative z-10 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] shrink-0 border-t border-border/40">
					{/* Réseaux sociaux et admin */}
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<a
								href={BRAND.social.instagram.url}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center justify-center size-11 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent active:scale-95 transition-all duration-150"
								aria-label="Suivre Synclune sur Instagram (nouvelle fenêtre)"
							>
								<InstagramIcon decorative size={18} />
							</a>
							<a
								href={BRAND.social.tiktok.url}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center justify-center size-11 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent active:scale-95 transition-all duration-150"
								aria-label="Suivre Synclune sur TikTok (nouvelle fenêtre)"
							>
								<TikTokIcon decorative size={18} />
							</a>
						</div>
						<div className="flex items-center gap-2">
							{isAdmin && (
								<SheetClose asChild>
									<Link
										href={ROUTES.ADMIN.ROOT}
										className="inline-flex items-center justify-center size-11 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent active:scale-95 transition-all duration-150"
										aria-label="Tableau de bord"
									>
										<Settings size={18} aria-hidden="true" />
									</Link>
								</SheetClose>
							)}
						</div>
					</div>

					{/* Copyright */}
					<p className="text-center text-xs text-muted-foreground mt-3">
						© {new Date().getFullYear()} {BRAND.name}
					</p>
				</footer>
			</SheetContent>
		</Sheet>
	);
}
