import { Logo } from "@/shared/components/logo";
import { getDesktopNavItems, getMobileNavItems } from "@/shared/constants/navigation";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { getCartItemCount } from "@/modules/cart/data/get-cart-item-count";
import { getWishlistItemCount } from "@/modules/wishlist/data/get-wishlist-item-count";
import { getRecentSearches } from "@/modules/products/data/get-recent-searches";
import { getRecentProducts } from "@/modules/products/data/get-recent-products";
import { Heart } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import Link from "next/link";
import { CartSheetTrigger } from "@/modules/cart/components/cart-sheet-trigger";
import { WishlistBadge } from "@/modules/wishlist/components/wishlist-badge";
import { BadgeCountsStoreProvider } from "@/shared/stores/badge-counts-store-provider";
import { QuickSearchDialog, QuickSearchTrigger } from "@/modules/products/components/quick-search-dialog";
import { ROUTES } from "@/shared/constants/urls";
import { cn } from "@/shared/utils/cn";
import { AccountDropdown } from "./account-dropdown";
import { DesktopNav } from "./desktop-nav";
import { getNavbarMenuData } from "./get-navbar-menu-data";
import { MenuSheet } from "./menu-sheet";
import { NavbarWrapper } from "./navbar-wrapper";

/** Classes communes pour les boutons icônes de la navbar */
const iconButtonClassName = cn(
	"relative items-center justify-center size-11 rounded-xl group",
	"text-muted-foreground hover:bg-accent hover:text-accent-foreground",
	"transition-all duration-300 ease-out",
	"hover:scale-105 active:scale-95",
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
);

export async function Navbar({ quickSearchSlot }: { quickSearchSlot?: React.ReactNode }) {
	// Paralléliser tous les fetches pour optimiser le TTFB
	// Les données publiques (collections, productTypes) sont cachées via getNavbarMenuData()
	const [session, cartCount, wishlistCount, recentSearches, menuData, recentProducts] = await Promise.all([
		getSession(),
		getCartItemCount(),
		getWishlistItemCount(),
		getRecentSearches(),
		getNavbarMenuData(),
		getRecentProducts({ limit: 4 }),
	]);

	const { collectionsData, productTypesData } = menuData;

	// Dériver isAdmin depuis la session (évite un appel DB redondant)
	const userIsAdmin = session?.user?.role === "ADMIN";

	// Protection si les fonctions retournent undefined/null
	const safeCartCount = cartCount ?? 0;
	const safeWishlistCount = wishlistCount ?? 0;

	// Collections et types de produits pour le quick search dialog
	const collections = collectionsData.collections.map((c) => {
		const firstImage = c.products[0]?.product?.skus[0]?.images[0];
		return {
			slug: c.slug,
			name: c.name,
			productCount: c._count.products,
			image: firstImage ? { url: firstImage.url, blurDataUrl: firstImage.blurDataUrl } : null,
			images: c.products
				.slice(0, 4)
				.map((p) => {
					const image = p.product?.skus[0]?.images[0];
					return image ? { url: image.url, blurDataUrl: image.blurDataUrl, alt: image.altText } : null;
				})
				.filter((img): img is { url: string; blurDataUrl: string | null; alt: string | null } => img !== null),
		};
	});

	const productTypes = productTypesData.productTypes.map((t) => ({
		slug: t.slug,
		label: t.label,
	}));

	// Lightweight recently viewed products for the quick search dialog
	const recentlyViewed = recentProducts.map((p) => {
		const defaultSku = p.skus.find((s) => s.isDefault) ?? p.skus[0];
		const image = defaultSku?.images?.find((img) => img.isPrimary) ?? defaultSku?.images?.[0];
		return {
			slug: p.slug,
			title: p.title,
			price: defaultSku?.priceInclTax ?? 0,
			image: image ? { url: image.url, blurDataUrl: image.blurDataUrl } : null,
		};
	});

	// Collections avec images[] pour les menus (Bento Grid - jusqu'à 4 images)
	const menuCollections = collectionsData.collections.map((c) => ({
		slug: c.slug,
		label: c.name,
		description: c.description,
		createdAt: c.createdAt,
		images: c.products
			.slice(0, 4)
			.map((p) => {
				const image = p.product?.skus[0]?.images[0];
				return image ? { url: image.url, blurDataUrl: image.blurDataUrl, alt: image.altText } : null;
			})
			.filter((img): img is { url: string; blurDataUrl: string | null; alt: string | null } => img !== null),
	}));

	// Générer les items de navigation mobile en fonction de la session et statut admin
	const mobileNavItems = getMobileNavItems(session, productTypes, menuCollections, userIsAdmin);

	// Générer les items de navigation desktop avec mega menus
	const desktopNavItems = getDesktopNavItems({ productTypes, collections: menuCollections });

	return (
		<BadgeCountsStoreProvider
			initialWishlistCount={safeWishlistCount}
			initialCartCount={safeCartCount}
		>
		<NavbarWrapper>
			{/* Skip navigation link pour accessibilité */}
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2"
			>
				Aller au contenu principal
			</a>

			<nav
				aria-label="Navigation principale"
				className="transition-all duration-300 ease-in-out"
			>
				<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
					<div className="flex h-16 sm:h-20 items-center gap-4">
						{/* Section gauche: Menu burger (mobile) / Logo (desktop) */}
						<div className="flex flex-1 items-center lg:flex-none min-w-0">
							{/* Menu burger (mobile uniquement) */}
							<MenuSheet
								navItems={mobileNavItems}
								productTypes={productTypes}
								collections={menuCollections}
								isAdmin={userIsAdmin}
								session={session}
							/>

							{/* Recherche mobile (juste à droite du menu) */}
							<QuickSearchTrigger className={cn("sm:hidden inline-flex", iconButtonClassName)} />

							<Logo
								href="/"
								size={48}
								className="hidden lg:flex min-w-0 max-w-full"
								shadow
								sizes="64px"
								showText
								textClassName="text-xl lg:text-2xl text-foreground truncate"
							/>
						</div>

						{/* Section centrale: Logo (mobile) / Navigation desktop */}
						<div className="flex items-center justify-center lg:flex-1">
							{/* Logo mobile centré (icône seule, shrink au scroll) */}
							<Logo
								href="/"
								size={44}
								className="lg:hidden"
								shadow
								sizes="44px"
							/>
							<DesktopNav navItems={desktopNavItems} />
						</div>

						{/* Section droite: Favoris + Recherche + Compte (dropdown) + Panier */}
						<div className="flex flex-1 items-center justify-end min-w-0">
							<div className="flex items-center gap-2 sm:gap-3 shrink-0">
								{/* Icône favoris (visible sur mobile et desktop) */}
								<Tooltip>
									<TooltipTrigger asChild>
										<Link
											href={ROUTES.ACCOUNT.FAVORITES}
											className={cn("inline-flex", iconButtonClassName)}
											aria-label="Accéder à mes favoris"
										>
											<Heart
												size={20}
												className="transition-transform duration-300 ease-out group-hover:scale-105"
												aria-hidden="true"
											/>
											<WishlistBadge />
										</Link>
									</TooltipTrigger>
									<TooltipContent className="hidden sm:block">Favoris</TooltipContent>
								</Tooltip>

								{/* Recherche globale (visible sur desktop seulement) */}
								<QuickSearchTrigger className="hidden sm:inline-flex" />
								<QuickSearchDialog
									recentSearches={recentSearches}
									collections={collections}
									productTypes={productTypes}
									recentlyViewed={recentlyViewed}
									quickSearchSlot={quickSearchSlot}
								/>

								{/* Dropdown compte (visible sur desktop seulement) */}
								<AccountDropdown
									session={session}
									isAdmin={userIsAdmin}
									className={cn("hidden sm:inline-flex", iconButtonClassName)}
								/>

								{/* Icône panier - Ouvre le cart sheet */}
								<CartSheetTrigger className={cn("inline-flex", iconButtonClassName)} />
							</div>
						</div>
					</div>
				</div>
			</nav>
		</NavbarWrapper>
		</BadgeCountsStoreProvider>
	);
}
