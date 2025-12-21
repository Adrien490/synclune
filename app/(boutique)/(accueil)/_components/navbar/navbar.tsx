import { Logo } from "@/shared/components/logo";
import { getDesktopNavItems, getMobileNavItems } from "@/shared/constants/navigation";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { getCartItemCount } from "@/modules/cart/data/get-cart-item-count";
import { getWishlistItemCount } from "@/modules/wishlist/data/get-wishlist-item-count";
import { getRecentSearches } from "@/shared/data/get-recent-searches";
import { getCollections } from "@/modules/collections/data/get-collections";
import { getProductTypes } from "@/modules/product-types/data/get-product-types";
import { CollectionStatus } from "@/app/generated/prisma/client";
import { LayoutDashboard, User, Heart } from "lucide-react";
import Link from "next/link";
import { CartSheetTrigger } from "@/modules/cart/components/cart-sheet-trigger";
import { WishlistBadge } from "@/modules/wishlist/components/wishlist-badge";
import { BadgeCountsStoreProvider } from "@/shared/stores/badge-counts-store-provider";
import { QuickSearchDialog, QuickSearchTrigger } from "@/shared/components/quick-search-dialog";
import { DesktopNav } from "./desktop-nav";
import { MenuSheet } from "./menu-sheet";
import { NavbarWrapper } from "./navbar-wrapper";

/** Classes communes pour les boutons icônes de la navbar (dimensions fixes pour uniformité) */
const iconButtonClassName = "relative items-center justify-center size-11 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl hover:scale-105 active:scale-95 group";

export async function Navbar() {
	// Paralléliser tous les fetches pour optimiser le TTFB
	const [session, cartCount, wishlistCount, recentSearches, collectionsData, productTypesData] = await Promise.all([
		getSession(),
		getCartItemCount(),
		getWishlistItemCount(),
		getRecentSearches(),
		getCollections({
			perPage: 8,
			sortBy: "name-ascending",
			filters: { hasProducts: true, status: CollectionStatus.PUBLIC },
		}),
		getProductTypes({
			perPage: 12,
			sortBy: "label-ascending",
			filters: { isActive: true },
		}),
	]);

	// Dériver isAdmin depuis la session (évite un appel DB redondant)
	const userIsAdmin = session?.user?.role === "ADMIN";

	// Protection si les fonctions retournent undefined/null
	const safeCartCount = cartCount ?? 0;
	const safeWishlistCount = wishlistCount ?? 0;

	// Collections et types de produits pour le quick search dialog
	const collections = collectionsData.collections.map((c) => ({
		slug: c.slug,
		name: c.name,
	}));

	const productTypes = productTypesData.productTypes.map((t) => ({
		slug: t.slug,
		label: t.label,
	}));

	// Générer les items de navigation mobile en fonction de la session et statut admin
	const mobileNavItems = getMobileNavItems(session, [], [], userIsAdmin);

	// Générer les items de navigation desktop
	const desktopNavItems = getDesktopNavItems();

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
				role="navigation"
				aria-label="Navigation principale"
				className="transition-all duration-300 ease-in-out"
			>
				<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
					<div className="flex h-16 sm:h-20 items-center gap-4">
						{/* Section gauche: Menu burger (mobile) / Logo (desktop) */}
						<div className="flex flex-1 items-center lg:flex-none min-w-0">
							{/* Menu burger (mobile uniquement) */}
							<MenuSheet navItems={mobileNavItems} session={session} />

							{/* Logo desktop (avec texte) */}
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
							{/* Logo mobile centré (icône seule, même taille que les boutons) */}
							<Logo
								href="/"
								size={44}
								className="lg:hidden"
								imageClassName="shadow-md hover:shadow-lg transition-shadow duration-300 ease-out"
								priority
								sizes="44px"
								showText={false}
							/>
							<DesktopNav navItems={desktopNavItems} />
						</div>

						{/* Section droite: Recherche + Tableau de bord (admin) + Favoris + Compte + Panier */}
						<div className="flex flex-1 items-center justify-end min-w-0">
							<div className="flex items-center gap-1 sm:gap-3 shrink-0">
								{/* Recherche globale */}
								<QuickSearchTrigger />
								<QuickSearchDialog
									recentSearches={recentSearches}
									collections={collections}
									productTypes={productTypes}
								/>

								{/* Icône tableau de bord (visible uniquement pour les admins, desktop seulement) */}
								{userIsAdmin && (
									<Link
										href="/admin"
										className={`hidden sm:inline-flex ${iconButtonClassName}`}
										aria-label="Accéder au tableau de bord"
									>
										<LayoutDashboard
											size={20}
											className="transition-transform duration-300 ease-out group-hover:scale-105"
											aria-hidden="true"
										/>
									</Link>
								)}

								{/* Icône favoris (visible sur tous les écrans) */}
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

								{/* Icône compte / Se connecter (visible sur desktop seulement) */}
								<Link
									href={session ? "/compte" : "/connexion"}
									className={`hidden sm:inline-flex ${iconButtonClassName}`}
									aria-label={
										session ? "Accéder à mon compte personnel" : "Se connecter"
									}
								>
									<User
										size={20}
										className="transition-transform duration-300 ease-out group-hover:scale-105"
										aria-hidden="true"
									/>
								</Link>

								{/* Icône panier - Ouvre le cart sheet */}
								<CartSheetTrigger className={`inline-flex ${iconButtonClassName}`} />
							</div>
						</div>
					</div>
				</div>
			</nav>
		</NavbarWrapper>
		</BadgeCountsStoreProvider>
	);
}
