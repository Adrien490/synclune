import { Logo } from "@/shared/components/logo";
import { getDesktopNavItems, getMobileNavItems } from "@/shared/constants/navigation";
import { Heart } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { CartSheetTrigger } from "@/modules/cart/components/cart-sheet-trigger";
import { WishlistBadge } from "@/modules/wishlist/components/wishlist-badge";
import { QuickSearchTrigger } from "@/shared/components/quick-search-dialog";
import { DesktopNav } from "./desktop-nav";
import { NavbarWrapper } from "./navbar-wrapper";
import { NavbarDynamicData } from "./navbar-dynamic-data";
import { BadgeCountsStoreProvider } from "@/shared/stores/badge-counts-store-provider";
import { MenuSheet } from "./menu-sheet";
import { AccountDropdown } from "./account-dropdown";
import { CollectionStatus } from "@/app/generated/prisma/client";
import { getCollections } from "@/modules/collections/data/get-collections";
import { getProductTypes } from "@/modules/product-types/data/get-product-types";
import { getSession } from "@/modules/auth/lib/get-current-session";

/** Classes communes pour les boutons icônes de la navbar */
const iconButtonClassName = "relative items-center justify-center size-11 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl hover:scale-105 active:scale-95 group";

/**
 * Skeleton pour le menu mobile pendant le chargement des données
 */
function MenuButtonSkeleton() {
	return (
		<div className="lg:hidden h-11 w-11 animate-pulse bg-muted/40 rounded-xl" />
	);
}

/**
 * Skeleton pour le bouton compte pendant le chargement
 */
function AccountButtonSkeleton() {
	return (
		<div className="hidden sm:inline-flex h-11 w-11 animate-pulse bg-muted/40 rounded-xl" />
	);
}

/**
 * Navbar optimisée pour le streaming.
 *
 * Architecture:
 * - Shell statique qui s'affiche immédiatement (logo, navigation desktop, boutons icônes)
 * - Données dynamiques streamées via Suspense (session, compteurs, menus avec données)
 *
 * Cette approche permet un FCP rapide car le contenu statique s'affiche
 * sans attendre les requêtes DB (session, cart count, collections, etc.)
 */
export async function Navbar() {
	// Navigation desktop - statique, pas besoin de data fetching
	const desktopNavItems = getDesktopNavItems();

	return (
		<>
			{/* Provider avec valeurs initiales à 0 pour le shell statique */}
			<BadgeCountsStoreProvider initialWishlistCount={0} initialCartCount={0}>
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
									{/* Menu burger - streamé avec Suspense */}
									<Suspense fallback={<MenuButtonSkeleton />}>
										<NavbarMenuSlot />
									</Suspense>

									{/* Recherche mobile (juste à droite du menu) */}
									<QuickSearchTrigger className={`sm:hidden inline-flex ${iconButtonClassName}`} />

									<Logo
										href="/"
										size={48}
										className="hidden lg:flex min-w-0 max-w-full"
										imageClassName="shadow-md hover:shadow-lg transition-shadow duration-300 ease-out"
										priority
										sizes="64px"
										showText
										textClassName="text-xl lg:text-2xl text-foreground truncate"
									/>
								</div>

								{/* Section centrale: Logo (mobile) / Navigation desktop */}
								<div className="flex items-center justify-center lg:flex-1">
									{/* Logo mobile centré */}
									<Logo
										href="/"
										size={44}
										className="lg:hidden"
										imageClassName="shadow-md hover:shadow-lg transition-shadow duration-300 ease-out"
										priority
										sizes="44px"
										showText={false}
									/>
									{/* Navigation desktop - statique */}
									<DesktopNav navItems={desktopNavItems} />
								</div>

								{/* Section droite: Favoris + Recherche + Compte + Panier */}
								<div className="flex flex-1 items-center justify-end min-w-0">
									<div className="flex items-center gap-2 sm:gap-3 shrink-0">
										{/* Icône favoris - statique, badge mis à jour via store */}
										<Link
											href="/favoris"
											className={`inline-flex ${iconButtonClassName}`}
											aria-label="Accéder à mes favoris"
										>
											<Heart
												size={20}
												className="transition-transform duration-300 ease-out group-hover:scale-105"
												aria-hidden="true"
											/>
											<WishlistBadge />
										</Link>

										{/* Recherche globale (desktop) - statique */}
										<QuickSearchTrigger className="hidden sm:inline-flex" />

										{/* Compte - streamé avec Suspense */}
										<Suspense fallback={<AccountButtonSkeleton />}>
											<NavbarAccountSlot />
										</Suspense>

										{/* Panier - statique, badge mis à jour via store */}
										<CartSheetTrigger className={`inline-flex ${iconButtonClassName}`} />
									</div>
								</div>
							</div>
						</div>
					</nav>
				</NavbarWrapper>
			</BadgeCountsStoreProvider>

			{/* Données dynamiques streamées - met à jour le store et rend les composants avec données */}
			<Suspense fallback={null}>
				<NavbarDynamicData />
			</Suspense>
		</>
	);
}

/**
 * Slot pour le menu mobile - extrait pour streaming indépendant
 */
async function NavbarMenuSlot() {
	const [session, collectionsData, productTypesData] = await Promise.all([
		getSession(),
		getCollections({
			perPage: 50,
			sortBy: "products-descending",
			filters: { hasProducts: true, status: CollectionStatus.PUBLIC },
		}),
		getProductTypes({
			perPage: 12,
			sortBy: "label-ascending",
			filters: { isActive: true, hasProducts: true },
		}),
	]);

	const userIsAdmin = session?.user?.role === "ADMIN";

	const productTypes = productTypesData.productTypes.map((t) => ({
		slug: t.slug,
		label: t.label,
	}));

	const menuCollections = collectionsData.collections.map((c) => ({
		slug: c.slug,
		label: c.name,
		imageUrl: c.products[0]?.product?.skus[0]?.images[0]?.url ?? null,
		blurDataUrl: c.products[0]?.product?.skus[0]?.images[0]?.blurDataUrl ?? null,
	}));

	const mobileNavItems = getMobileNavItems(session, productTypes, menuCollections, userIsAdmin);

	return (
		<MenuSheet
			navItems={mobileNavItems}
			productTypes={productTypes}
			collections={menuCollections}
			isAdmin={userIsAdmin}
		/>
	);
}

/**
 * Slot pour le dropdown compte - streamé séparément
 */
async function NavbarAccountSlot() {
	const session = await getSession();
	const userIsAdmin = session?.user?.role === "ADMIN";

	return (
		<AccountDropdown
			session={session}
			isAdmin={userIsAdmin}
			className={`hidden sm:inline-flex ${iconButtonClassName}`}
		/>
	);
}
