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
import { NavbarRoomLabel } from "./navbar-room-label";
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

	// Destinations de premier niveau du menu mobile. Plus d'arguments : la
	// hiérarchie (types, collections) descend directement dans `MenuSheet` via ses
	// propres props, et l'entrée admin est rendue par `MenuSheetNav` — cf. le
	// JSDoc de `getMobileNavItems`, qui portait un arbre entier jeté à l'arrivée.
	const mobileNavItems = getMobileNavItems();

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
				{/* Plus de `tabIndex={-1}` ni d'`outline-none`. Le premier rendait ce
				    landmark focusable par programme, mais il n'a pas d'`id` : rien ne
				    pouvait le viser — le `SkipLink` de `app/layout.tsx` pointe
				    `#main-content`. Le second neutralisait donc un anneau de focus qui
				    ne pouvait pas apparaître. Reliquat des deux côtés. */}
				<nav
					aria-label="Navigation principale"
					className="motion-safe:transition-colors motion-safe:duration-[var(--duration-slow)] motion-safe:ease-in-out"
				>
					<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
						<div
							className={cn(
								"flex h-16 items-center gap-4 sm:h-20",
								// ⚠️ PLUS de grille `1fr auto 1fr` à partir de `lg` (2026-08-04). Elle
								// centrait la nav sur la page ; la nav suit désormais le logo, collée à
								// lui. C'est le flex qui produit les DEUX régimes, sans variante :
								//
								//   sous `lg` — gauche et droite sont `flex-1` à base 0, le centre est
								//     `flex: 0 1 auto`. Les deux colonnes latérales se partagent le
								//     reste à parts égales, donc le logo mobile est centré sur la page.
								//     Corollaire utile : leur largeur ne dépend pas de leur contenu, donc
								//     l'apparition du nom de salle au scroll ne décale pas la marque.
								//   à partir de `lg` — la gauche passe `lg:flex-none` (largeur du logo),
								//     le centre reste à sa largeur de contenu, et seule la droite
								//     grandit : logo · nav · [espace] · actions.
								//
								// Ne pas « rétablir le centrage » d'un côté sans l'autre : le seul
								// levier est `lg:flex-none` sur la colonne gauche.
								// ⚠️ PLUS de compaction au scroll (« La devanture », 2026-08-04). Elle
								// valait `group-data-[scrolled=true]:sm:h-16` : un snap de 16px assumé
								// (une transition sur `height` est non composable), pendant que le logo
								// glissait sur 300ms — un seul état, deux horloges. Et surtout elle
								// faisait varier `--navbar-height`, donc sautait la barre de tri de
								// `/produits` et la CTA collante de la PDP au PREMIER pixel scrollé.
								// Le scroll porte désormais de l'information (ombre + nom de la salle)
								// au lieu de contracter la barre.
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

								{/* ⚠️ Le seuil est porté par ce conteneur, PAS par la prop `className`
								    du `Logo` — elle s'applique au CONTENU, à l'intérieur du `<Link>`.
								    Un `hidden lg:flex` posé là laissait donc le lien lui-même rendu :
								    un `<a>` de 0 × 0 px, invisible mais toujours dans l'ordre de
								    tabulation. Les deux logos (desktop et mobile) coexistant, il y
								    avait à chaque largeur un arrêt de focus sans aucun indicateur
								    visible — exactement ce que WCAG 2.4.7 interdit. `display: none`
								    sur l'ancêtre le retire de l'ordre de tabulation pour de bon.

								    Plus de `scale-90` au scroll non plus : c'était le compagnon de la
								    compaction de hauteur, retirée ci-dessus. Seul, il devenait une
								    micro-animation sans fonction. */}
								<div className="hidden min-w-0 lg:flex">
									<Logo
										href="/"
										size={48}
										className="max-w-full min-w-0"
										shadow
										sizes="64px"
										showText
										textClassName="text-xl lg:text-2xl text-foreground truncate"
									/>
								</div>
							</div>

							{/* Section centrale: Logo (mobile) / Navigation desktop */}
							<div className="flex min-w-0 items-center justify-center">
								{/* Logo mobile centré — AVEC le nom depuis la déduplication du
								    header (2026-08-04) : le cluster d'actions ayant quitté la
								    droite sous `lg`, la place existe enfin pour la marque, là où
								    il n'y avait qu'une pastille de 44px.
								    Seuil sur le conteneur, cf. le logo desktop ci-dessus. */}
								<div className="min-w-0 lg:hidden">
									<Logo
										href="/"
										size={40}
										className="min-w-0"
										shadow
										sizes="40px"
										showText
										textClassName="text-foreground truncate text-xl"
									/>
								</div>
								<DesktopNav
									navItems={desktopNavItems}
									featuredProducts={featuredProducts}
									spotlightCollection={spotlightCollection}
								/>
							</div>

							{/* Section droite: Favoris + Recherche + Panier (+ menu admin) —
							    desktop uniquement depuis la déduplication (cf. NavbarIconButtons).
							    Sous `lg`, cette colonne était entièrement VIDE : c'est le nom de la
							    salle courante qui l'occupe désormais, une fois la page scrollée. */}
							<div className="flex min-w-0 flex-1 items-center justify-end">
								<NavbarRoomLabel />
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
