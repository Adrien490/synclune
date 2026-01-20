"use client";

import { LogoutAlertDialog } from "@/modules/auth/components/logout-alert-dialog";
import type { Session } from "@/modules/auth/lib/auth";
import { QUICK_SEARCH_DIALOG_ID } from "@/modules/products/components/quick-search-dialog/constants";
import { Stagger } from "@/shared/components/animations/stagger";
import { Tap } from "@/shared/components/animations/tap";
import { InstagramIcon } from "@/shared/components/icons/instagram-icon";
import { TikTokIcon } from "@/shared/components/icons/tiktok-icon";
import ScrollFade from "@/shared/components/scroll-fade";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
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
import { MAX_COLLECTIONS_IN_MENU } from "@/shared/constants/navigation";
import { COLLECTION_IMAGE_QUALITY } from "@/modules/collections/constants/image-sizes.constants";
import type { CollectionImage } from "@/modules/collections/types/collection.types";
import { useActiveNavbarItem } from "@/shared/hooks/use-active-navbar-item";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { cn } from "@/shared/utils/cn";
import { Flame, Gem, HelpCircle, Heart, Mail, Menu, Palette, Search, Settings, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/** HREFs de la zone compte */
const ACCOUNT_HREFS = ["/compte", "/commandes", "/connexion", "/favoris"] as const;

/**
 * Header de section pour les catégories du menu
 */
function SectionHeader({ children, id }: { children: React.ReactNode; id?: string }) {
	return (
		<h3
			id={id}
			className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
		>
			{children}
		</h3>
	);
}

/**
 * Helper pour extraire les initiales d'un nom
 */
function getInitials(name: string): string {
	return name
		.split(" ")
		.map((part) => part[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

/**
 * Header personnalisé pour l'utilisateur connecté
 * Affiche un message de bienvenue avec avatar et compteurs rapides
 */
function UserHeader({
	session,
	wishlistCount,
	cartCount,
	onClose,
}: {
	session: Session;
	wishlistCount: number;
	cartCount: number;
	onClose: () => void;
}) {
	const firstName = session.user.name?.split(" ")[0] || "vous";

	return (
		<div className="px-4 py-4 bg-primary/5 rounded-xl mb-4">
			<SheetClose asChild>
				<Link
					href="/compte"
					className="flex items-center gap-3 group"
					onClick={onClose}
				>
					<Avatar className="size-11 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
						{session.user.image && (
							<AvatarImage src={session.user.image} alt={session.user.name || "Avatar"} />
						)}
						<AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
							{session.user.name ? getInitials(session.user.name) : "U"}
						</AvatarFallback>
					</Avatar>
					<div className="flex-1 min-w-0">
						<p className="text-base font-semibold text-foreground truncate">
							Bonjour {firstName}
						</p>
						<p className="text-sm text-muted-foreground">
							{wishlistCount > 0 && (
								<span>{wishlistCount} favori{wishlistCount > 1 ? "s" : ""}</span>
							)}
							{wishlistCount > 0 && cartCount > 0 && <span> • </span>}
							{cartCount > 0 && (
								<span>{cartCount} article{cartCount > 1 ? "s" : ""}</span>
							)}
							{wishlistCount === 0 && cartCount === 0 && (
								<span>Mon espace personnel</span>
							)}
						</p>
					</div>
				</Link>
			</SheetClose>
		</div>
	);
}

/**
 * Barre de recherche simplifiée qui ouvre le dialog de recherche
 */
function SearchBar({ onOpenSearch }: { onOpenSearch: () => void }) {
	return (
		<button
			type="button"
			onClick={onOpenSearch}
			className="w-full flex items-center gap-3 px-4 py-3 mb-4 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
			aria-label="Ouvrir la recherche"
		>
			<Search className="size-5 shrink-0" aria-hidden="true" />
			<span className="text-base">Que cherchez-vous ?</span>
		</button>
	);
}

/**
 * Mini-grid pour afficher les images de collection dans le menu mobile
 * Adapté à la taille 48x48 (size-12) avec layout similaire à CollectionImagesGrid
 */
function CollectionMiniGrid({
	images,
	collectionName,
}: {
	images: CollectionImage[];
	collectionName: string;
}) {
	const count = images.length;

	// 1 image: pleine taille
	if (count === 1) {
		return (
			<div className="size-12 rounded-lg overflow-hidden bg-muted shrink-0">
				<Image
					src={images[0].url}
					alt={images[0].alt || `Image de la collection ${collectionName}`}
					width={48}
					height={48}
					className="size-full object-cover"
					sizes="48px"
					quality={COLLECTION_IMAGE_QUALITY}
					placeholder={images[0].blurDataUrl ? "blur" : "empty"}
					blurDataURL={images[0].blurDataUrl ?? undefined}
				/>
			</div>
		);
	}

	// 2 images: 2 colonnes
	if (count === 2) {
		return (
			<div className="size-12 rounded-lg overflow-hidden bg-muted shrink-0 grid grid-cols-2 gap-px">
				{images.slice(0, 2).map((image, i) => (
					<Image
						key={i}
						src={image.url}
						alt={image.alt || `Image ${i + 1} de la collection ${collectionName}`}
						width={24}
						height={48}
						className="w-full h-12 object-cover"
						sizes="24px"
						quality={COLLECTION_IMAGE_QUALITY}
						placeholder={image.blurDataUrl ? "blur" : "empty"}
						blurDataURL={image.blurDataUrl ?? undefined}
					/>
				))}
			</div>
		);
	}

	// 3-4 images: grille 2x2
	return (
		<div className="size-12 rounded-lg overflow-hidden bg-muted shrink-0 grid grid-cols-2 grid-rows-2 gap-px">
			{images.slice(0, 4).map((image, i) => (
				<Image
					key={i}
					src={image.url}
					alt={image.alt || `Image ${i + 1} de la collection ${collectionName}`}
					width={24}
					height={24}
					className="size-full object-cover"
					sizes="24px"
					quality={COLLECTION_IMAGE_QUALITY}
					placeholder={image.blurDataUrl ? "blur" : "empty"}
					blurDataURL={image.blurDataUrl ?? undefined}
				/>
			))}
		</div>
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
/** Nombre de jours pour considérer une collection comme "nouvelle" */
const NEW_COLLECTION_DAYS = 30;

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

/**
 * Vérifie si une collection est "nouvelle" (créée il y a moins de 30 jours)
 */
function isNewCollection(createdAt?: Date): boolean {
	if (!createdAt) return false;
	const now = new Date();
	const diffMs = now.getTime() - new Date(createdAt).getTime();
	const diffDays = diffMs / (1000 * 60 * 60 * 24);
	return diffDays <= NEW_COLLECTION_DAYS;
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
	const { open: openSearch } = useDialog(QUICK_SEARCH_DIALOG_ID);

	// Séparer les items en zones
	const homeItem = navItems.find((item) => item.href === "/");
	const bestsellerItem = navItems.find((item) => item.href.startsWith("/produits?sortBy=best-selling"));
	const personalizationItem = navItems.find((item) => item.href === "/personnalisation");
	const accountItems = navItems.filter((item) =>
		ACCOUNT_HREFS.includes(item.href as (typeof ACCOUNT_HREFS)[number])
	);

	// Handler pour ouvrir la recherche et fermer le menu
	const handleOpenSearch = () => {
		setIsOpen(false);
		// Petit délai pour laisser l'animation de fermeture du menu commencer
		setTimeout(() => openSearch(), 150);
	};

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
						{/* Header utilisateur personnalisé (si connecté) */}
						{session?.user ? (
							<Stagger stagger={0.025} delay={0.03} y={10}>
								<UserHeader
									session={session}
									wishlistCount={wishlistCount}
									cartCount={cartCount}
									onClose={() => setIsOpen(false)}
								/>
							</Stagger>
						) : (
							<Stagger stagger={0.025} delay={0.03} y={10} className="mb-4">
								<Tap>
									<SheetClose asChild>
										<Link
											href="/connexion"
											className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
										>
											Se connecter
										</Link>
									</SheetClose>
								</Tap>
							</Stagger>
						)}

						{/* Barre de recherche */}
						<Stagger stagger={0.025} delay={0.05} y={10}>
							<SearchBar onOpenSearch={handleOpenSearch} />
						</Stagger>

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
									{displayedCollections.map((collection) => {
										const isNew = isNewCollection(collection.createdAt);
										return (
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
														{isNew && (
															<Badge variant="success" className="text-[10px] px-1.5 py-0">
																Nouveau
															</Badge>
														)}
													</Link>
												</SheetClose>
											</Tap>
										);
									})}
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
												className={cn(
													isMenuItemActive(personalizationItem.href)
														? "bg-primary/12 border-l-2 border-primary shadow-sm"
														: "hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent",
													"flex items-start gap-3 px-4 py-3 rounded-lg transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 group"
												)}
												aria-current={
													isMenuItemActive(personalizationItem.href)
														? "page"
														: undefined
												}
											>
												<div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
													<Palette className="size-5 text-primary" aria-hidden="true" />
												</div>
												<div className="flex-1 min-w-0">
													<p className="text-base font-medium text-foreground">
														{personalizationItem.label}
													</p>
													<p className="text-sm text-muted-foreground mt-0.5">
														Créez votre bijou unique
													</p>
												</div>
												<Sparkles className="size-4 text-primary/60 shrink-0 mt-1" aria-hidden="true" />
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
								{/* Filtrer les items: exclure connexion (affiché en haut) */}
								{accountItems
									.filter((item) => item.href !== "/connexion")
									.map((item) => {
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
					{/* Liens rapides */}
					<div className="flex items-center justify-center gap-4 mb-3">
						<SheetClose asChild>
							<Link
								href="/contact"
								className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
							>
								<Mail className="size-4" aria-hidden="true" />
								Contact
							</Link>
						</SheetClose>
						<span className="text-border">•</span>
						<SheetClose asChild>
							<Link
								href="/faq"
								className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
							>
								<HelpCircle className="size-4" aria-hidden="true" />
								Aide
							</Link>
						</SheetClose>
					</div>

					{/* Réseaux sociaux et admin */}
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<Link
								href={BRAND.social.instagram.url}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center justify-center size-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent active:scale-95 transition-all duration-150"
								aria-label="Suivre Synclune sur Instagram (nouvelle fenêtre)"
							>
								<InstagramIcon decorative size={18} />
							</Link>
							<Link
								href={BRAND.social.tiktok.url}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center justify-center size-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent active:scale-95 transition-all duration-150"
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
										className="inline-flex items-center justify-center size-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent active:scale-95 transition-all duration-150"
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
