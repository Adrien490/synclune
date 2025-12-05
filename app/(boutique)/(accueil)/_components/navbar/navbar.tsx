import { Logo } from "@/shared/components/logo";
import { getDesktopNavItems, getMobileNavItems } from "@/shared/constants/navigation";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { getCartItemCount } from "@/modules/cart/data/get-cart-item-count";
import { getWishlistItemCount } from "@/modules/wishlist/data/get-wishlist-item-count";
import { Heart, LayoutDashboard, ShoppingCart, User } from "lucide-react";
import Link from "next/link";
import { CartBadge } from "@/modules/cart/components/cart-badge";
import { WishlistBadge } from "@/modules/wishlist/components/wishlist-badge";
import { BadgeCountsStoreProvider } from "@/shared/stores/badge-counts-store-provider";
import { DesktopNav } from "./desktop-nav";
import { MenuSheet } from "./menu-sheet";
import { NavbarWrapper } from "./navbar-wrapper";

/** Classes communes pour les liens icônes de la navbar */
const iconLinkClassName = "relative inline-flex items-center justify-center p-3 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl hover:scale-105 active:scale-95 group";

export async function Navbar() {
	// Paralléliser tous les fetches pour optimiser le TTFB
	const [session, cartCount, wishlistCount] = await Promise.all([
		getSession(),
		getCartItemCount(),
		getWishlistItemCount(),
	]);

	// Dériver isAdmin depuis la session (évite un appel DB redondant)
	const userIsAdmin = session?.user?.role === "ADMIN";

	// Protection si les fonctions retournent undefined/null
	const safeCartCount = cartCount ?? 0;
	const safeWishlistCount = wishlistCount ?? 0;

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
				className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
							<MenuSheet navItems={mobileNavItems} />

							{/* Logo (desktop uniquement) */}
							<Logo
								href="/"
								size={48}
								className="hidden lg:flex min-w-0 max-w-full"
								imageClassName="shadow-md hover:shadow-lg transition-all duration-300 ease-out hover:scale-105"
								priority
								sizes="64px"
								showText
								textClassName="text-xl lg:text-2xl text-foreground truncate"
							/>
						</div>

						{/* Section centrale: Logo (mobile) / Navigation desktop */}
						<div className="flex items-center justify-center lg:flex-1">
							{/* Logo centré (mobile uniquement - icône seule, pas de texte) */}
							<Logo
								href="/"
								size={48}
								className="lg:hidden"
								imageClassName="shadow-md hover:shadow-lg transition-all duration-300 ease-out hover:scale-105"
								priority
								sizes="(max-width: 640px) 48px, 56px"
								showText={false}
							/>

							{/* Navigation desktop (cachée sur mobile) */}
							<DesktopNav navItems={desktopNavItems} />
						</div>

						{/* Section droite: Tableau de bord (admin) + Compte + Panier */}
						<div className="flex flex-1 items-center justify-end min-w-0">
							<div className="flex items-center gap-2 lg:gap-3 shrink-0">
								{/* Icône tableau de bord (visible uniquement pour les admins) */}
								{userIsAdmin && (
									<Link
										href="/admin"
										className={`hidden sm:inline-flex ${iconLinkClassName}`}
										aria-label="Accéder au tableau de bord"
									>
										<LayoutDashboard
											size={20}
											className="transition-transform duration-300 ease-out group-hover:scale-105"
											aria-hidden="true"
										/>
									</Link>
								)}

								{/* Icône compte / Se connecter (visible sur desktop seulement) */}
								<Link
									href={session ? "/compte" : "/connexion"}
									className={`hidden sm:inline-flex ${iconLinkClassName}`}
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

								{/* Icône favoris (toujours visible) */}
								<Link
									href="/favoris"
									className={iconLinkClassName}
									aria-label="Ouvrir mes favoris"
								>
									<Heart
										size={20}
										className="transition-transform duration-300 ease-out group-hover:scale-110"
										aria-hidden="true"
									/>
									<WishlistBadge />
								</Link>

								{/* Icône panier (toujours visible) */}
								<Link
									href="/panier"
									className={iconLinkClassName}
									aria-label="Ouvrir mon panier"
								>
									<ShoppingCart
										size={20}
										className="transition-transform duration-300 ease-out group-hover:rotate-6"
										aria-hidden="true"
									/>
									<CartBadge />
								</Link>
							</div>
						</div>
					</div>
				</div>
			</nav>
		</NavbarWrapper>
		</BadgeCountsStoreProvider>
	);
}
