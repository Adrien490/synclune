import { test as base } from "@playwright/test"
import { AdminPage } from "./pages/admin.page"
import { AuthPage } from "./pages/auth.page"
import { CartPage } from "./pages/cart.page"
import { ProductCatalogPage } from "./pages/product-catalog.page"

type Fixtures = {
	adminPage: AdminPage
	authPage: AuthPage
	cartPage: CartPage
	productCatalogPage: ProductCatalogPage
}

export const test = base.extend<Fixtures>({
	adminPage: async ({ page }, use) => {
		await use(new AdminPage(page))
	},
	authPage: async ({ page }, use) => {
		await use(new AuthPage(page))
	},
	cartPage: async ({ page }, use) => {
		await use(new CartPage(page))
	},
	productCatalogPage: async ({ page }, use) => {
		await use(new ProductCatalogPage(page))
	},
})

export { expect } from "@playwright/test"
