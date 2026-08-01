import { test as base } from "@playwright/test";
import { AdminPage } from "./pages/admin.page";
import { AuthPage } from "./pages/auth.page";
import { CartPage } from "./pages/cart.page";
import { CheckoutPage } from "./pages/checkout.page";
import { ProductCatalogPage } from "./pages/product-catalog.page";
import { SearchPage } from "./pages/search.page";
import { WishlistPage } from "./pages/wishlist.page";

type Fixtures = {
	adminPage: AdminPage;
	authPage: AuthPage;
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
	authPage: async ({ page }, use) => {
		await use(new AuthPage(page));
	},
	cartPage: async ({ page }, use) => {
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
