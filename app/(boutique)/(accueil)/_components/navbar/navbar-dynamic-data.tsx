import { getCartItemCount } from "@/modules/cart/data/get-cart-item-count";
import { getWishlistItemCount } from "@/modules/wishlist/data/get-wishlist-item-count";
import { getRecentSearches } from "@/modules/products/data/get-recent-searches";
import { getCollections } from "@/modules/collections/data/get-collections";
import { getProductTypes } from "@/modules/product-types/data/get-product-types";
import { CollectionStatus } from "@/app/generated/prisma/client";
import { QuickSearchDialog } from "@/shared/components/quick-search-dialog";
import { NavbarCountsLoader } from "./navbar-counts-loader";

/**
 * Composant async qui charge les données dynamiques de la navbar.
 * Rendu dans un Suspense boundary après le shell statique.
 *
 * Responsabilités:
 * - Charger les compteurs (cart, wishlist) et mettre à jour le store Zustand
 * - Charger les données pour le QuickSearchDialog (collections, productTypes, recentSearches)
 */
export async function NavbarDynamicData() {
	// Paralléliser tous les fetches
	const [cartCount, wishlistCount, recentSearches, collectionsData, productTypesData] = await Promise.all([
		getCartItemCount(),
		getWishlistItemCount(),
		getRecentSearches(),
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

	const safeCartCount = cartCount ?? 0;
	const safeWishlistCount = wishlistCount ?? 0;

	// Collections et types de produits pour le quick search dialog
	const collections = collectionsData.collections.map((c) => ({
		slug: c.slug,
		name: c.name,
		productCount: c._count.products,
	}));

	const productTypes = productTypesData.productTypes.map((t) => ({
		slug: t.slug,
		label: t.label,
	}));

	return (
		<>
			{/* Met à jour les compteurs du store Zustand */}
			<NavbarCountsLoader
				cartCount={safeCartCount}
				wishlistCount={safeWishlistCount}
			/>

			{/* Quick Search Dialog avec données streamées */}
			<QuickSearchDialog
				recentSearches={recentSearches}
				collections={collections}
				productTypes={productTypes}
			/>
		</>
	);
}
