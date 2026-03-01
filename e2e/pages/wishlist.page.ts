import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { SELECTORS } from "../constants";

export class WishlistPage {
	readonly heading: Locator;
	readonly emptyHeading: Locator;
	readonly shopLink: Locator;

	constructor(private page: Page) {
		this.heading = page.getByRole("heading", { level: 1 });
		this.emptyHeading = page.getByRole("heading", { name: /wishlist est vide/i });
		this.shopLink = page.getByRole("link", { name: /Découvrir nos créations/i });
	}

	async goto() {
		await this.page.goto("/favoris");
		await this.page.waitForLoadState("domcontentloaded");
	}

	getToggleButton(productTitle?: string) {
		if (productTitle) {
			return this.page.getByLabel(new RegExp(`(Ajouter|Retirer) ${productTitle}`, "i"));
		}
		return this.page.getByRole("button", { name: /wishlist/i });
	}

	async toggleItem(productTitle?: string) {
		const button = this.getToggleButton(productTitle);
		await button.first().click();
		// Wait for server action to complete
		await expect(button.first()).not.toHaveAttribute("aria-busy", "true", { timeout: 5000 });
	}

	async getItems() {
		return this.page.locator(SELECTORS.PRODUCT_LINK);
	}

	async getItemCount() {
		const items = await this.getItems();
		return items.count();
	}

	async isEmpty() {
		return this.emptyHeading.isVisible();
	}
}
