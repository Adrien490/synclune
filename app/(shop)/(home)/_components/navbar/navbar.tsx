import { Logo } from "@/shared/components/logo";
import { getDesktopNavItems, getMobileNavItems } from "@/shared/constants/navigation";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { getCartItemCount } from "@/modules/cart/data/get-cart-item-count";
import { getWishlistItemCount } from "@/modules/wishlist/data/get-wishlist-item-count";
import { getRecentProducts } from "@/modules/products/data/get-recent-products";
import { BadgeCountsStoreProvider } from "@/shared/providers/badge-counts-store-provider";
import { QuickSearchTrigger } from "@/modules/products/components/quick-search-dialog";
import { AppBadgeSync } from "@/shared/components/app-badge-sync";
import { cn } from "@/shared/utils/cn";
import { DesktopNav } from "./desktop-nav";
import { extractCollectionImages, getNavbarMenuData } from "./get-navbar-menu-data";
import { MenuSheet } from "./menu-sheet";
import { iconButtonClassName } from "./navbar-styles";
import { NavbarIconButtons } from "./navbar-icon-buttons";
import { NavbarWrapper } from "./navbar-wrapper";

const NEW_BADGE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

/** "Nouveau" badge eligibility — published within the last 14 days. */
function isProductNew(createdAt: Date | string | null | undefined): boolean {
	if (!createdAt) return false;
	return Date.now() - new Date(createdAt).getTime() < NEW_BADGE_WINDOW_MS;
}

export async function Navbar() {
	// Paralléliser tous les fetches pour optimiser le TTFB
	// Les données publiques (collections, productTypes) sont cachées via getNavbarMenuData()
	const [session, cartCount, wishlistCount, menuData, recentProducts] = await Promise.all([
		getSession().catch(() => null),
		getCartItemCount(),
		getWishlistItemCount(),
		getNavbarMenuData(),
		getRecentProducts({ limit: 4 }),
	]);

	const { collectionsData, productTypesData } = menuData;

	// Dériver isAdmin depuis la session (évite un appel DB redondant)
	const userIsAdmin = session?.user.role === "ADMIN";

	const safeCartCount = cartCount;
	const safeWishlistCount = wishlistCount;

	const productTypes = productTypesData.productTypes.map((t) => ({
		slug: t.slug,
		label: t.label,
	}));

	// Extract primary image from a product's default SKU
	function extractProductImage(p: (typeof recentProducts)[number]) {
		const sku = p.skus.find((s) => s.isDefault) ?? p.skus[0];
		const image = sku?.images.find((img) => img.isPrimary) ?? sku?.images[0];
		return { sku, image };
	}

	// Collections avec images[] pour les menus (Bento Grid - jusqu'à 4 images)
	const menuCollections = collectionsData.collections.map((c) => ({
		slug: c.slug,
		label: c.name,
		description: c.description,
		createdAt: c.createdAt,
		images: extractCollectionImages(c.products),
	}));

	// Générer les items de navigation mobile en fonction de la session et statut admin
	const mobileNavItems = getMobileNavItems(session, productTypes, menuCollections, userIsAdmin);

	// Featured products for the mega menu (up to 3 recent products with images).
	// "Nouveau" badge eligibility computed via isProductNew helper.
	const featuredProducts = recentProducts
		.slice(0, 3)
		.map((p) => {
			const { sku, image } = extractProductImage(p);
			return {
				slug: p.slug,
				title: p.title,
				priceInclTax: sku?.priceInclTax ?? 0,
				imageUrl: image?.url ?? "",
				blurDataUrl: image?.blurDataUrl ?? null,
				isNew: isProductNew(p.createdAt),
			};
		})
		.filter((p) => p.imageUrl);

	// Restrict session data passed to client components (exclude token, ipAddress, userAgent)
	const sessionData = session
		? {
				user: {
					name: session.user.name,
					email: session.user.email,
					image: session.user.image ?? null,
					role: session.user.role,
				},
			}
		: null;

	// Générer les items de navigation desktop avec mega menus
	const desktopNavItems = getDesktopNavItems({
		productTypes,
		collections: menuCollections,
	});

	return (
		<BadgeCountsStoreProvider
			initialWishlistCount={safeWishlistCount}
			initialCartCount={safeCartCount}
		>
			<NavbarWrapper>
				<nav
					aria-label="Navigation principale"
					data-announcement-focus-fallback
					tabIndex={-1}
					className="transition-all duration-300 ease-in-out outline-none"
				>
					<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
						<div
							className={cn(
								"flex h-16 items-center gap-4 sm:h-20",
								// Scroll compact: shrink sm:h-20 → sm:h-16 when wrapper is scrolled
								"motion-safe:transition-[height] motion-safe:duration-300 motion-safe:ease-out",
								"group-data-[scrolled=true]:sm:h-16",
							)}
						>
							{/* Section gauche: Menu burger (mobile) / Logo (desktop) */}
							<div className="flex min-w-0 flex-1 items-center lg:flex-none">
								{/* Menu burger (mobile uniquement) */}
								<MenuSheet
									navItems={mobileNavItems}
									productTypes={productTypes}
									collections={menuCollections}
									isAdmin={userIsAdmin}
									session={sessionData}
								/>

								{/* Recherche mobile (juste à droite du menu) */}
								<QuickSearchTrigger className={cn("inline-flex sm:hidden", iconButtonClassName)} />

								<Logo
									href="/"
									size={48}
									className={cn(
										"hidden max-w-full min-w-0 origin-left lg:flex",
										// Scroll compact: subtle scale-down of desktop logo when scrolled
										"motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out",
										"group-data-[scrolled=true]:motion-safe:scale-90",
									)}
									shadow
									sizes="64px"
									showText
									textClassName="font-cursive text-xl lg:text-2xl text-foreground truncate"
								/>
							</div>

							{/* Section centrale: Logo (mobile) / Navigation desktop */}
							<div className="flex items-center justify-center lg:flex-1">
								{/* Logo mobile centré (icône seule) */}
								<Logo href="/" size={44} className="lg:hidden" shadow sizes="44px" />
								<DesktopNav navItems={desktopNavItems} featuredProducts={featuredProducts} />
							</div>

							{/* Section droite: Favoris + Recherche + Compte + Panier */}
							<div className="flex min-w-0 flex-1 items-center justify-end">
								<div className="flex shrink-0 items-center gap-2 sm:gap-3">
									<NavbarIconButtons
										isLoggedIn={!!session}
										isAdmin={userIsAdmin}
										userName={session?.user.name ?? null}
										userEmail={session?.user.email ?? null}
									/>
								</div>
							</div>
						</div>
					</div>
				</nav>
			</NavbarWrapper>
			<AppBadgeSync />
		</BadgeCountsStoreProvider>
	);
}
