"use client";

import { Stagger } from "@/shared/components/animations/stagger";
import { Tap } from "@/shared/components/animations/tap";
import { InstagramIcon } from "@/shared/components/icons/instagram-icon";
import { TikTokIcon } from "@/shared/components/icons/tiktok-icon";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { BRAND } from "@/shared/constants/brand";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/shared/components/ui/sheet";
import type { getMobileNavItems } from "@/shared/constants/navigation";
import { MAX_COLLECTIONS_IN_MENU, MAX_PRODUCT_TYPES_IN_MENU } from "@/shared/constants/navigation";
import { useActiveNavbarItem } from "@/shared/hooks/use-active-navbar-item";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";
import { cn } from "@/shared/utils/cn";
import { ArrowRight, FolderOpen, Heart, Menu, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

/** HREFs de la zone compte */
const ACCOUNT_HREFS = ["/compte", "/connexion", "/favoris"] as const;

/**
 * Header de section pour les catégories du menu
 */
function SectionHeader({ children }: { children: React.ReactNode }) {
	return (
		<h3 className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
			{children}
		</h3>
	);
}

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
		imageUrl?: string | null;
	}>;
	totalProductTypes?: number;
	totalCollections?: number;
}

export function MenuSheet({
	navItems,
	productTypes,
	collections,
	totalProductTypes,
	totalCollections,
}: MenuSheetProps) {
	const { isMenuItemActive } = useActiveNavbarItem();
	const { wishlistCount } = useBadgeCountsStore();
	const [isOpen, setIsOpen] = useState(false);

	// Séparer les items en zones
	const homeItem = navItems.find((item) => item.href === "/");
	const personalizationItem = navItems.find((item) => item.href === "/personnalisation");
	const accountItems = navItems.filter((item) =>
		ACCOUNT_HREFS.includes(item.href as (typeof ACCOUNT_HREFS)[number])
	);

	// Limites d'affichage
	const displayedProductTypes = productTypes?.slice(0, MAX_PRODUCT_TYPES_IN_MENU);
	const displayedCollections = collections?.slice(0, MAX_COLLECTIONS_IN_MENU);
	const hasMoreProductTypes = (totalProductTypes ?? 0) > MAX_PRODUCT_TYPES_IN_MENU;
	const hasMoreCollections = (totalCollections ?? 0) > MAX_COLLECTIONS_IN_MENU;

	// Style commun pour les liens
	const linkClassName = cn(
		"flex items-center text-base/6 font-medium tracking-wide antialiased px-4 py-3 rounded-lg",
		"transition-all duration-300 ease-out",
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
		"text-foreground/80 hover:text-foreground hover:bg-primary/5 hover:pl-5"
	);

	const activeLinkClassName = cn(
		linkClassName,
		"bg-primary/8 text-foreground font-semibold border-l-2 border-primary pl-5"
	);

	const ctaLinkClassName = cn(
		"flex items-center gap-2 px-4 py-3 text-sm font-medium text-foreground/70",
		"hover:text-foreground transition-colors duration-200"
	);

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
				<ScrollArea className="flex-1 min-h-0">
					<nav
						aria-label="Menu principal mobile"
						className={cn(
							"relative z-10 px-6 pt-6 pb-4",
							"motion-safe:transition-opacity motion-safe:duration-200",
							isOpen ? "opacity-100" : "opacity-0"
						)}
					>
						{/* Accueil */}
						{homeItem && (
							<Stagger stagger={0.025} delay={0.05} y={10} className="mb-4">
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
							</Stagger>
						)}

						{/* Section Les créations (productTypes) */}
						{displayedProductTypes && displayedProductTypes.length > 0 && (
							<section aria-labelledby="section-creations" className="mb-4">
								<SectionHeader>Les créations</SectionHeader>
								<Stagger stagger={0.02} delay={0.08} y={8} className="space-y-1">
									{displayedProductTypes.map((type) => (
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
									{hasMoreProductTypes && (
										<SheetClose asChild>
											<Link href="/produits" className={ctaLinkClassName}>
												<ArrowRight className="h-4 w-4" aria-hidden="true" />
												Voir les {totalProductTypes} créations
											</Link>
										</SheetClose>
									)}
								</Stagger>
							</section>
						)}

						{/* Section Dernières collections */}
						{displayedCollections && displayedCollections.length > 0 && (
							<section aria-labelledby="section-collections" className="mb-4">
								<SectionHeader>Dernières collections</SectionHeader>
								<Stagger stagger={0.02} delay={0.12} y={8} className="space-y-1">
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
													{collection.imageUrl ? (
														<Image
															src={collection.imageUrl}
															alt=""
															width={32}
															height={32}
															className="rounded-md object-cover shrink-0"
														/>
													) : (
														<div
															className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0"
															aria-hidden="true"
														>
															<FolderOpen className="h-4 w-4 text-muted-foreground" />
														</div>
													)}
													<span>{collection.label}</span>
												</Link>
											</SheetClose>
										</Tap>
									))}
									<SheetClose asChild>
										<Link href="/collections" className={ctaLinkClassName}>
											<ArrowRight className="h-4 w-4" aria-hidden="true" />
											Voir toutes les collections
										</Link>
									</SheetClose>
								</Stagger>
							</section>
						)}

						{/* Personnalisation */}
						{personalizationItem && (
							<Stagger stagger={0.025} delay={0.16} y={10} className="mb-4">
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
						<section id="account-section" aria-labelledby="section-account">
							<Stagger stagger={0.025} delay={0.2} y={10} className="space-y-1">
								{accountItems.map((item) => {
									const isActive = isMenuItemActive(item.href);
									const showWishlistBadge =
										item.href === "/favoris" && wishlistCount > 0;

									return (
										<Tap key={item.href}>
											<SheetClose asChild>
												<Link
													href={item.href}
													className={
														isActive ? activeLinkClassName : linkClassName
													}
													aria-current={isActive ? "page" : undefined}
												>
													<span className="flex-1">{item.label}</span>
													{showWishlistBadge && (
														<span
															className="ml-2 bg-secondary text-secondary-foreground text-xs font-bold rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center"
															aria-label={`${wishlistCount} article${wishlistCount > 1 ? "s" : ""} dans les favoris`}
														>
															{wishlistCount > 99 ? "99+" : wishlistCount}
														</span>
													)}
												</Link>
											</SheetClose>
										</Tap>
									);
								})}
							</Stagger>
						</section>
					</nav>
				</ScrollArea>

				{/* Footer avec réseaux sociaux et admin */}
				<footer className="relative z-10 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-border/40 shrink-0">
					<div className="flex items-center justify-between">
						{/* Réseaux sociaux à gauche */}
						<div className="flex items-center gap-3">
							<Link
								href={BRAND.social.instagram.url}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center justify-center size-10 rounded-full bg-card/50 hover:bg-primary/10 text-muted-foreground hover:text-foreground transition-colors duration-200"
								aria-label="Suivre Synclune sur Instagram (nouvelle fenêtre)"
							>
								<InstagramIcon decorative size={18} />
							</Link>
							<Link
								href={BRAND.social.tiktok.url}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center justify-center size-10 rounded-full bg-card/50 hover:bg-primary/10 text-muted-foreground hover:text-foreground transition-colors duration-200"
								aria-label="Suivre Synclune sur TikTok (nouvelle fenêtre)"
							>
								<TikTokIcon decorative size={18} />
							</Link>
						</div>

						{/* Icône admin à droite */}
						<SheetClose asChild>
							<Link
								href="/admin"
								className="inline-flex items-center justify-center size-10 rounded-full bg-card/50 hover:bg-primary/10 text-muted-foreground hover:text-foreground transition-colors duration-200"
								aria-label="Tableau de bord"
							>
								<Settings className="h-[18px] w-[18px]" aria-hidden="true" />
							</Link>
						</SheetClose>
					</div>
				</footer>
			</SheetContent>
		</Sheet>
	);
}
