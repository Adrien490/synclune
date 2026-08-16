import type { Locator, Page } from "@playwright/test";
import { SELECTORS } from "../constants";

export class WishlistPage {
	readonly heading: Locator;
	readonly emptyHeading: Locator;
	readonly shopLink: Locator;

	constructor(private page: Page) {
		this.heading = page.getByRole("heading", { level: 1 });
		// « Ta liste de favoris est vide » (wishlist-empty-state.tsx) — un motif
		// « wishlist » ne matche RIEN : tout le DOM rendu est en français
		this.emptyHeading = page.getByRole("heading", { name: /liste de favoris est vide/i });
		this.shopLink = page.getByRole("link", { name: /Découvrir nos créations/i });
	}

	async goto() {
		// Un goto() lancé pendant qu'une navigation cliente du router est encore
		// en vol est avorté (« interrupted by another navigation », constaté sous
		// la charge d'un run complet) — on retente une fois.
		await this.page.goto("/favoris").catch(() => this.page.goto("/favoris"));
		await this.page.waitForLoadState("domcontentloaded");
	}

	getToggleButton(productTitle?: string) {
		if (productTitle) {
			return this.page.getByLabel(new RegExp(`(Ajouter|Retirer) ${productTitle}`, "i"));
		}
		// aria-labels réels : « Ajouter (…) aux favoris » / « Retirer (…) des favoris »
		return this.page.getByRole("button", { name: /(Ajouter|Retirer).*favoris/i });
	}

	// `toggleItem` supprimée (audit 2026-08-16) : morte (aucun spec ne
	// l'appelait — wishlist.spec.ts clique les boutons directement) et fausse :
	// elle attendait la fin d'un `aria-busy` alors que sur /favoris l'item — et
	// son bouton — DISPARAÎT du DOM au retrait optimiste ; l'attente ne prouvait
	// rien. L'oracle correct est le cookie `wishlist` (cf. wishlist.spec.ts) ou
	// la baisse de `getItemCount()`.

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
