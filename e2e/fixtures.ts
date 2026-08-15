import { test as base } from "@playwright/test";
import { AdminPage } from "./pages/admin.page";
import { CartPage } from "./pages/cart.page";
import { CheckoutPage } from "./pages/checkout.page";
import { ProductCatalogPage } from "./pages/product-catalog.page";
import { SearchPage } from "./pages/search.page";
import { WishlistPage } from "./pages/wishlist.page";
import { preseedCookieConsent } from "./helpers/consent";

type Fixtures = {
	adminPage: AdminPage;
	cartPage: CartPage;
	checkoutPage: CheckoutPage;
	productCatalogPage: ProductCatalogPage;
	searchPage: SearchPage;
	wishlistPage: WishlistPage;
};

export const test = base.extend<Fixtures>({
	adminPage: async ({ page }, use) => {
		await use(new AdminPage(page));
	},
	cartPage: async ({ page }, use) => {
		// Tout consommateur de cette fixture PILOTE le panier — sur mobile,
		// l'onglet Panier vit dans la bottom-nav, que le bandeau cookies (lazy)
		// recouvre : les taps expiraient en 15-30s. Aucun spec qui teste le
		// bandeau lui-même n'utilise cartPage, le pré-seed est donc sans angle
		// mort (cf. helpers/consent.ts).
		await preseedCookieConsent(page);
		await use(new CartPage(page));
	},
	checkoutPage: async ({ page }, use) => {
		await use(new CheckoutPage(page));
	},
	productCatalogPage: async ({ page }, use) => {
		await use(new ProductCatalogPage(page));
	},
	searchPage: async ({ page }, use) => {
		await use(new SearchPage(page));
	},
	wishlistPage: async ({ page }, use) => {
		await use(new WishlistPage(page));
	},
});

export { expect } from "@playwright/test";
