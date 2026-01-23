"use client";

import { LogoutAlertDialog } from "@/modules/auth/components/logout-alert-dialog";
import type { Session } from "@/modules/auth/lib/auth";
import type { CollectionImage } from "@/modules/collections/types/collection.types";
import { Stagger } from "@/shared/components/animations/stagger";
import { Tap } from "@/shared/components/animations/tap";
import { InstagramIcon } from "@/shared/components/icons/instagram-icon";
import { TikTokIcon } from "@/shared/components/icons/tiktok-icon";
import ScrollFade from "@/shared/components/scroll-fade";
import { Badge } from "@/shared/components/ui/badge";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/shared/components/ui/sheet";
import { BRAND } from "@/shared/constants/brand";
import type { getMobileNavItems } from "@/shared/constants/navigation";
import { MAX_COLLECTIONS_IN_MENU } from "@/shared/constants/navigation";
import { useActiveNavbarItem } from "@/shared/hooks/use-active-navbar-item";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";
import { cn } from "@/shared/utils/cn";
import { Flame, Gem, Heart, Menu, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CollectionMiniGrid } from "./collection-mini-grid";
import { SectionHeader } from "./section-header";
import { UserHeader } from "./user-header";

/**
 * Composant Menu Sheet pour la navigation mobile
 *
 * Architecture:
 * - Menu plat scrollable avec ScrollArea
 * - Sections visuelles pour productTypes et collections
 * - CTAs "Voir plus" avec limites d'affichage
 * - Images pour les collections (produit vedette)
 *
 * Performance:
 * - Animation stagger pour meilleure perception UX
 * - Limites d'affichage (6 productTypes, 3 collections)
 *
 * Accessibilité:
 * - Labels ARIA descriptifs
 * - Navigation au clavier
 * - Focus visible
 */
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
	const pathname = usePathname();
	const { wishlistCount, cartCount } = useBadgeCountsStore();
	const [isOpen, setIsOpen] = useState(false);

	// Séparer les items en zones
	const homeItem = navItems.find((item) => item.href === "/");
	const bestsellerItem = navItems.find((item) => item.href.startsWith("/produits?sortBy=best-selling"));
	const personalizationItem = navItems.find((item) => item.href === "/personnalisation");

	// Limites d'affichage
	const displayedCollections = collections?.slice(0, MAX_COLLECTIONS_IN_MENU);

	// Style commun pour les liens
	const linkClassName = cn(
		"flex items-center text-base/6 font-medium tracking-wide antialiased px-4 py-3 rounded-lg",
		"transition-all duration-300 ease-out",
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
		"text-foreground/80 hover:text-foreground hover:bg-primary/5 hover:pl-5"
	);

	const activeLinkClassName = cn(
		linkClassName,
		"bg-primary/12 text-foreground font-semibold border-l-2 border-primary pl-5 shadow-sm"
	);

	return (
		<Sheet direction="left" open={isOpen} onOpenChange={setIsOpen} preventScrollRestoration>
			<SheetTrigger asChild>
				<button
					type="button"
					className="relative -ml-3 inline-flex items-center justify-center size-11 rounded-xl lg:hidden bg-transparent hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-all duration-300 ease-out hover:scale-105 active:scale-95 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
					aria-label="Ouvrir le menu de navigation"
					aria-controls="mobile-menu-synclune"
					onFocus={(e) => {
						// Blur when sheet is open to avoid aria-hidden conflict
						if (isOpen) e.currentTarget.blur();
					}}
				>
					<Menu
						size={20}
						className="transition-all duration-300 group-hover:rotate-6"
						aria-hidden="true"
					/>
				</button>
			</SheetTrigger>

			{/* Aria-live region pour annoncer l'état du menu aux lecteurs d'écran */}
			<div aria-live="polite" aria-atomic="true" className="sr-only">
				{isOpen ? "Menu de navigation ouvert" : "Menu de navigation fermé"}
			</div>

			<SheetContent
				className="w-[min(85vw,320px)] sm:w-80 sm:max-w-md border-r bg-background/95 !p-0 flex flex-col"
				id="mobile-menu-synclune"
				aria-describedby="mobile-menu-synclune-description"
			>


				{/* Header sr-only */}
				<SheetHeader className="!p-0 sr-only">
					<SheetTitle>Menu de navigation</SheetTitle>
					<p id="mobile-menu-synclune-description">
						Menu de navigation de Synclune - Découvrez nos bijoux et collections
					</p>
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
								onClose={() => setIsOpen(false)}
							/>
						)}

						{/* Section Découvrir - Accueil + Meilleures ventes */}
						<section aria-labelledby="section-discover" className="mb-4">
							<SectionHeader id="section-discover">Découvrir</SectionHeader>
							<Stagger stagger={0.02} delay={0.07} y={8} className="space-y-1">
								{homeItem && (
									<Tap>
										<SheetClose asChild>
											<Link
												href={homeItem.href}
												className={
													isMenuItemActive(homeItem.href)
														? activeLinkClassName
														: linkClassName
												}
												aria-current={
													isMenuItemActive(homeItem.href) ? "page" : undefined
												}
											>
												{homeItem.label}
											</Link>
										</SheetClose>
									</Tap>
								)}
								{bestsellerItem && (
									<Tap>
										<SheetClose asChild>
											<Link
												href={bestsellerItem.href}
												className={cn(
													isMenuItemActive(bestsellerItem.href)
														? activeLinkClassName
														: linkClassName,
													"justify-between"
												)}
												aria-current={
													isMenuItemActive(bestsellerItem.href) ? "page" : undefined
												}
											>
												<span className="flex items-center gap-2">
													<Flame className="size-4 text-orange-500" aria-hidden="true" />
													{bestsellerItem.label}
												</span>
												<Badge variant="warning" className="text-[10px] px-1.5 py-0">
													Top
												</Badge>
											</Link>
										</SheetClose>
									</Tap>
								)}
							</Stagger>
						</section>

						{/* Section Les créations (productTypes) */}
						{productTypes && productTypes.length > 0 && (
							<section aria-labelledby="section-creations" className="mb-4">
								<SectionHeader id="section-creations">Nos créations</SectionHeader>
								<Stagger stagger={0.02} delay={0.09} y={8} className="space-y-1">
									{/* Lien "Tous les bijoux" proéminent en premier (Baymard UX) */}
									<Tap>
										<SheetClose asChild>
											<Link
												href="/produits"
												className={
													pathname === "/produits"
														? activeLinkClassName
														: linkClassName
												}
												aria-current={
													pathname === "/produits"
														? "page"
														: undefined
												}
											>
												Tous les bijoux
											</Link>
										</SheetClose>
									</Tap>
									{productTypes.map((type) => (
										<Tap key={type.slug}>
											<SheetClose asChild>
												<Link
													href={`/produits/${type.slug}`}
													className={
														isMenuItemActive(`/produits/${type.slug}`)
															? activeLinkClassName
															: linkClassName
													}
													aria-current={
														isMenuItemActive(`/produits/${type.slug}`)
															? "page"
															: undefined
													}
												>
													{type.label}
												</Link>
											</SheetClose>
										</Tap>
									))}
								</Stagger>
							</section>
						)}

						{/* Section Collections */}
						{displayedCollections && displayedCollections.length > 0 && (
							<section aria-labelledby="section-collections" className="mb-4">
								<SectionHeader id="section-collections">Collections</SectionHeader>
								<Stagger stagger={0.02} delay={0.11} y={8} className="space-y-1">
									{/* Lien "Toutes les collections" proéminent en premier */}
									<Tap>
										<SheetClose asChild>
											<Link
												href="/collections"
												className={
													isMenuItemActive("/collections")
														? activeLinkClassName
														: linkClassName
												}
												aria-current={
													isMenuItemActive("/collections")
														? "page"
														: undefined
												}
											>
												Toutes les collections
											</Link>
										</SheetClose>
									</Tap>
									{displayedCollections.map((collection) => (
											<Tap key={collection.slug}>
												<SheetClose asChild>
													<Link
														href={`/collections/${collection.slug}`}
														className={cn(
															isMenuItemActive(
																`/collections/${collection.slug}`
															)
																? activeLinkClassName
																: linkClassName,
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
											</Tap>
									))}
								</Stagger>
							</section>
						)}

						{/* Section Sur mesure */}
						{personalizationItem && (
							<section aria-labelledby="section-custom" className="mb-4">
								<SectionHeader id="section-custom">Sur mesure</SectionHeader>
								<Stagger stagger={0.02} delay={0.13} y={8}>
									<Tap>
										<SheetClose asChild>
											<Link
												href={personalizationItem.href}
												className={
													isMenuItemActive(personalizationItem.href)
														? activeLinkClassName
														: linkClassName
												}
												aria-current={
													isMenuItemActive(personalizationItem.href)
														? "page"
														: undefined
												}
											>
												{personalizationItem.label}
											</Link>
										</SheetClose>
									</Tap>
								</Stagger>
							</section>
						)}

						{/* Séparateur décoratif */}
						<div
							className="relative my-6 flex items-center justify-center"
							role="separator"
							aria-hidden="true"
						>
							<div className="absolute inset-0 flex items-center">
								<div className="w-full border-t border-border/60" />
							</div>
							<div className="relative bg-background/95 px-3 rounded-full">
								<Heart className="h-4 w-4 text-muted-foreground/40 fill-muted-foreground/10" />
							</div>
						</div>

						{/* Zone compte */}
						<section aria-labelledby="section-account">
							<SectionHeader id="section-account">Mon compte</SectionHeader>
							<Stagger stagger={0.025} delay={0.15} y={10} className="space-y-1">
								{/* Lien Mon compte */}
								<Tap>
									<SheetClose asChild>
										<Link
											href="/compte"
											className={
												isMenuItemActive("/compte")
													? activeLinkClassName
													: linkClassName
											}
											aria-current={
												isMenuItemActive("/compte") ? "page" : undefined
											}
										>
											Mon compte
										</Link>
									</SheetClose>
								</Tap>

								{/* Lien Mes commandes (si connecté) */}
								{session?.user && (
									<Tap>
										<SheetClose asChild>
											<Link
												href="/commandes"
												className={
													isMenuItemActive("/commandes")
														? activeLinkClassName
														: linkClassName
												}
												aria-current={
													isMenuItemActive("/commandes") ? "page" : undefined
												}
											>
												Mes commandes
											</Link>
										</SheetClose>
									</Tap>
								)}

								{/* Bouton Déconnexion (si connecté) */}
								{session?.user && (
									<Tap>
										<LogoutAlertDialog>
											<button
												type="button"
												className={cn(linkClassName, "w-full text-left text-muted-foreground hover:text-foreground")}
											>
												Déconnexion
											</button>
										</LogoutAlertDialog>
									</Tap>
								)}
							</Stagger>
						</section>
						</nav>
					</ScrollFade>
				</div>

				{/* Footer amélioré */}
				<footer className="relative z-10 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] shrink-0 border-t border-border/40">
					{/* Réseaux sociaux et admin */}
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<Link
								href={BRAND.social.instagram.url}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center justify-center size-11 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent active:scale-95 transition-all duration-150"
								aria-label="Suivre Synclune sur Instagram (nouvelle fenêtre)"
							>
								<InstagramIcon decorative size={18} />
							</Link>
							<Link
								href={BRAND.social.tiktok.url}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center justify-center size-11 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent active:scale-95 transition-all duration-150"
								aria-label="Suivre Synclune sur TikTok (nouvelle fenêtre)"
							>
								<TikTokIcon decorative size={18} />
							</Link>
						</div>
						<div className="flex items-center gap-2">
							{isAdmin && (
								<SheetClose asChild>
									<Link
										href="/admin"
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
					<p className="text-center text-xs text-muted-foreground/60 mt-3">
						© {new Date().getFullYear()} {BRAND.name}
					</p>
				</footer>
			</SheetContent>
		</Sheet>
	);
}
