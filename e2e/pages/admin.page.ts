import type { Locator, Page } from "@playwright/test";

export class AdminPage {
	readonly heading: Locator;
	readonly ordersLink: Locator;
	readonly productsLink: Locator;
	readonly collectionsLink: Locator;
	readonly colorsLink: Locator;
	readonly materialsLink: Locator;
	readonly discountsLink: Locator;
	readonly reviewsLink: Locator;
	readonly newsletterLink: Locator;
	readonly customizationsLink: Locator;
	readonly refundsLink: Locator;
	readonly searchInput: Locator;
	readonly viewSiteLink: Locator;

	constructor(readonly page: Page) {
		this.heading = page.getByRole("heading", { name: /Tableau de bord/i });
		this.ordersLink = page.getByRole("link", { name: /Commandes/i }).first();
		this.productsLink = page.getByRole("link", { name: /Produits/i }).first();
		this.collectionsLink = page.getByRole("link", { name: /Collections/i }).first();
		this.colorsLink = page.getByRole("link", { name: /Couleurs/i }).first();
		this.materialsLink = page.getByRole("link", { name: /Matériaux/i }).first();
		this.discountsLink = page.getByRole("link", { name: /Codes promo/i }).first();
		this.reviewsLink = page.getByRole("link", { name: /Avis clients/i }).first();
		this.newsletterLink = page.getByRole("link", { name: /Newsletter/i }).first();
		this.customizationsLink = page.getByRole("link", { name: /Personnalisations/i }).first();
		this.refundsLink = page.getByRole("link", { name: /Remboursements/i }).first();
		this.searchInput = page.getByPlaceholder(/Rechercher/i);
		this.viewSiteLink = page.getByRole("link", { name: /Voir le site/i });
	}

	async goto() {
		await this.page.goto("/admin");
		await this.page.waitForLoadState("domcontentloaded");
	}

	async gotoOrders() {
		await this.page.goto("/admin/ventes/commandes");
		await this.page.waitForLoadState("domcontentloaded");
	}

	async gotoProducts() {
		await this.page.goto("/admin/catalogue/produits");
		await this.page.waitForLoadState("domcontentloaded");
	}

	async gotoCollections() {
		await this.page.goto("/admin/catalogue/collections");
		await this.page.waitForLoadState("domcontentloaded");
	}

	async gotoColors() {
		await this.page.goto("/admin/catalogue/couleurs");
		await this.page.waitForLoadState("domcontentloaded");
	}

	async gotoMaterials() {
		await this.page.goto("/admin/catalogue/materiaux");
		await this.page.waitForLoadState("domcontentloaded");
	}

	async gotoDiscounts() {
		await this.page.goto("/admin/marketing/discounts");
		await this.page.waitForLoadState("domcontentloaded");
	}

	async gotoReviews() {
		await this.page.goto("/admin/marketing/avis");
		await this.page.waitForLoadState("domcontentloaded");
	}

	async gotoNewsletter() {
		await this.page.goto("/admin/marketing/newsletter");
		await this.page.waitForLoadState("domcontentloaded");
	}

	async gotoCustomizations() {
		await this.page.goto("/admin/marketing/personnalisations");
		await this.page.waitForLoadState("domcontentloaded");
	}

	async gotoRefunds() {
		await this.page.goto("/admin/ventes/remboursements");
		await this.page.waitForLoadState("domcontentloaded");
	}
}
