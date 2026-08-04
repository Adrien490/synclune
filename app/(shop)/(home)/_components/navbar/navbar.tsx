import { Logo } from "@/shared/components/logo";
import { getDesktopNavItems, getMobileNavItems } from "@/shared/constants/navigation";
import type { NavItemChild } from "@/shared/constants/navigation";
import { ROUTES } from "@/shared/constants/urls";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { getCartItemCount } from "@/modules/cart/data/get-cart-item-count";
import { getWishlistItemCount } from "@/modules/wishlist/data/get-wishlist-item-count";
import { getProducts } from "@/modules/products/data/get-products";
import { pickPrimaryImage } from "@/modules/products/services/product-display.service";
import { BadgeCountsStoreProvider } from "@/shared/providers/badge-counts-store-provider";
import { AppBadgeSync } from "@/shared/components/app-badge-sync";
import { cn } from "@/shared/utils/cn";
import { isRecent } from "@/shared/utils/dates";
import { DesktopNav } from "./desktop-nav";
import { extractCollectionImages, getNavbarMenuData } from "./get-navbar-menu-data";
import { MenuSheet } from "./menu-sheet";
import { NavbarIconButtons } from "./navbar-icon-buttons";
import { NavbarWrapper } from "./navbar-wrapper";

/** "Nouveau" badge eligibility window — published within the last N days. */
const NEW_PRODUCT_BADGE_DAYS = 14;

export async function Navbar() {
	// Paralléliser tous les fetches pour optimiser le TTFB
	// Les données publiques (collections, productTypes, nouveautés) sont servies
	// par les caches des data fns sous-jacentes
	const [session, cartCount, wishlistCount, menuData, newestProducts] = await Promise.all([
		getSession().catch(() => null),
		getCartItemCount(),
		getWishlistItemCount(),
		getNavbarMenuData(),
		// Rail « Nouveautés » du mega menu : les 2 dernières créations PUBLIÉES.
		// Était branché sur les « récemment vus » du cookie — rail vide pour tout
		// primo-visiteur, et des produits anciens déjà consultés étiquetés
		// « Pièces récentes de l'atelier » (audit navbar 2026-08-03).
		getProducts({ perPage: 2, sortBy: "created-descending", filters: { status: "PUBLIC" } }),
	]);

	const { collectionsData, productTypesData } = menuData;

	// Dériver isAdmin depuis la session (évite un appel DB redondant)
	const userIsAdmin = session?.user.role === "ADMIN";

	const productTypes = productTypesData.productTypes.map((t) => ({
		slug: t.slug,
		label: t.label,
	}));

	// Collections avec images[] pour les menus (Bento Grid - jusqu'à 4 images)
	const menuCollections = collectionsData.collections.map((c) => ({
		slug: c.slug,
		label: c.name,
		description: c.description,
		createdAt: c.createdAt,
		images: extractCollectionImages(c.products),
	}));

	// Générer les items de navigation mobile en fonction de la session et statut admin
	const mobileNavItems = getMobileNavItems(productTypes, menuCollections, userIsAdmin);

	// Featured products for the mega menu — the 2 newest published creations.
	// "Nouveau" badge eligibility via shared isRecent() helper (NEW_PRODUCT_BADGE_DAYS window).
	// `skus[0]` est le SKU par défaut (orderBy `isDefault desc` de GET_PRODUCTS_SELECT) ;
	// le choix du média passe par la SSOT pickPrimaryImage — ce select ne filtre pas
	// `mediaType`, réécrire `find(isPrimary) ?? images[0]` mettrait un .mp4 dans <Image src>.
	// Un produit sans image réelle est écarté du rail plutôt que rendu en placeholder.
	const featuredProducts = newestProducts.products
		.map((p) => {
			const sku = p.skus[0];
			const image = pickPrimaryImage(sku?.images);
			return {
				slug: p.slug,
				title: p.title,
				priceInclTax: sku?.priceInclTax ?? 0,
				imageUrl: image?.url ?? "",
				blurDataUrl: image?.blurDataUrl ?? null,
				isNew: isRecent(p.createdAt, NEW_PRODUCT_BADGE_DAYS),
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

	// Collection vedette (1re = plus de produits) — fallback éditorial du panneau Créations
	// quand aucune nouveauté récente n'est disponible (évite un panneau déséquilibré).
	const spotlightSource = menuCollections[0];
	const spotlightCollection: NavItemChild | undefined = spotlightSource
		? {
				href: ROUTES.SHOP.COLLECTION(spotlightSource.slug),
				label: spotlightSource.label,
				description: spotlightSource.description,
				images: spotlightSource.images,
			}
		: undefined;

	return (
		<BadgeCountsStoreProvider initialWishlistCount={wishlistCount} initialCartCount={cartCount}>
			<NavbarWrapper>
				<nav
					aria-label="Navigation principale"
					tabIndex={-1}
					className="outline-none motion-safe:transition-colors motion-safe:duration-[var(--duration-slow)] motion-safe:ease-in-out"
				>
					<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
						<div
							className={cn(
								"flex h-16 items-center gap-4 sm:h-20",
								// Scroll compact: shrink sm:h-20 → sm:h-16 once scrolled past threshold.
								// Snap (no animation) — `height` transition is non-composable and forces
								// layout reflow at 60fps during the 300ms tween. The compaction is set on
								// `data-scrolled` (binary state) so the visual jump is acceptable.
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

								{/* Pas de trigger recherche mobile ici : sous `sm`, l'entrée est
									l'onglet « Rechercher » de la bottom-nav (zone du pouce). En
									garder un second en haut d'écran ferait une double affordance
									pour la même action. À partir de `sm`, c'est
									`QuickSearchTrigger variant="bar"` dans `NavbarIconButtons`.
									Audit recherche 2026-07-26. */}

								<Logo
									href="/"
									size={48}
									className={cn(
										"hidden max-w-full min-w-0 origin-left lg:flex",
										// Scroll compact: subtle scale-down of desktop logo when scrolled
										"motion-safe:transition-transform motion-safe:duration-[var(--duration-slow)] motion-safe:ease-out",
										"group-data-[scrolled=true]:motion-safe:scale-90",
									)}
									shadow
									sizes="64px"
									showText
									textClassName="text-xl lg:text-2xl text-foreground truncate"
								/>
							</div>

							{/* Section centrale: Logo (mobile) / Navigation desktop */}
							<div className="flex items-center justify-center lg:flex-1">
								{/* Logo mobile centré (icône seule) */}
								<Logo href="/" size={44} className="lg:hidden" shadow sizes="44px" />
								<DesktopNav
									navItems={desktopNavItems}
									featuredProducts={featuredProducts}
									spotlightCollection={spotlightCollection}
								/>
							</div>

							{/* Section droite: Favoris + Recherche + Panier (+ menu admin) */}
							<div className="flex min-w-0 flex-1 items-center justify-end">
								<div className="flex shrink-0 items-center gap-2 sm:gap-3">
									<NavbarIconButtons
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
