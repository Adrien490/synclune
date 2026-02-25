import { test as base } from "@playwright/test"
import { AddressPage } from "./pages/address.page"
import { AdminPage } from "./pages/admin.page"
import { AuthPage } from "./pages/auth.page"
import { CartPage } from "./pages/cart.page"
import { CheckoutPage } from "./pages/checkout.page"
import { OrderPage } from "./pages/order.page"
import { ProductCatalogPage } from "./pages/product-catalog.page"
import { SearchPage } from "./pages/search.page"
import { WishlistPage } from "./pages/wishlist.page"

type Fixtures = {
	addressPage: AddressPage
	adminPage: AdminPage
	authPage: AuthPage
	cartPage: CartPage
	checkoutPage: CheckoutPage
	orderPage: OrderPage
	productCatalogPage: ProductCatalogPage
	searchPage: SearchPage
	wishlistPage: WishlistPage
}

export const test = base.extend<Fixtures>({
	addressPage: async ({ page }, use) => {
		await use(new AddressPage(page))
	},
	adminPage: async ({ page }, use) => {
		await use(new AdminPage(page))
	},
	authPage: async ({ page }, use) => {
		await use(new AuthPage(page))
	},
	cartPage: async ({ page }, use) => {
		await use(new CartPage(page))
	},
	checkoutPage: async ({ page }, use) => {
		await use(new CheckoutPage(page))
	},
	orderPage: async ({ page }, use) => {
		await use(new OrderPage(page))
	},
	productCatalogPage: async ({ page }, use) => {
		await use(new ProductCatalogPage(page))
	},
	searchPage: async ({ page }, use) => {
		await use(new SearchPage(page))
	},
	wishlistPage: async ({ page }, use) => {
		await use(new WishlistPage(page))
	},
})

export { expect } from "@playwright/test"
