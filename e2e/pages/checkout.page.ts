import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import type { CartPage } from "./cart.page";
import type { ProductCatalogPage } from "./product-catalog.page";

type SeedCartResult = { skipped: false } | { skipped: true; reason: string; seedData: boolean };

export class CheckoutPage {
	readonly emailInput: Locator;
	readonly fullNameInput: Locator;
	readonly addressInput: Locator;
	readonly postalCodeInput: Locator;
	readonly cityInput: Locator;
	readonly phoneInput: Locator;
	readonly continueButton: Locator;
	readonly payButton: Locator;
	readonly emptyCartMessage: Locator;

	constructor(readonly page: Page) {
		this.emailInput = page.getByLabel(/Adresse email/i);
		this.fullNameInput = page.getByLabel(/Nom complet|Prénom et nom/i);
		this.addressInput = page.getByLabel(/^Adresse$|Adresse ligne 1/i);
		this.postalCodeInput = page.getByLabel(/Code postal/i);
		this.cityInput = page.getByLabel(/Ville/i);
		this.phoneInput = page.getByLabel(/Téléphone/i);
		this.continueButton = page.getByRole("button", { name: /Continuer|Valider|Payer/i });
		this.payButton = page.getByRole("button", { name: /Commander et payer/i });
		this.emptyCartMessage = page.getByText(/Ton panier est vide/i);
	}

	/**
	 * Amène sur `/paiement` avec le VRAI formulaire rendu (panier semé).
	 *
	 * ⚠️ **`/paiement` ne redirige PAS sur panier vide** — `app/paiement/page.tsx`
	 * rend un état « Ton panier est vide » en RESTANT sur l'URL (commentaire
	 * explicite : « instead of a silent redirect »). Toute garde de la forme
	 * `if (!page.url().includes("paiement")) test.skip(…)` est donc **toujours
	 * fausse**, et l'audit qui la suit porte sur une page à deux boutons : zéro
	 * champ, zéro bouton payer. C'est ainsi que les deux audits axe du checkout
	 * (clair et sombre) sont restés verts sans jamais voir le formulaire.
	 *
	 * D'où l'**assertion positive** ci-dessous : elle est le garde-fou. Sans elle,
	 * le test redeviendrait silencieusement vert sur l'état vide au premier
	 * changement du parcours d'ajout au panier.
	 */
	async gotoWithSeededCart(
		productCatalogPage: ProductCatalogPage,
		cartPage: CartPage,
	): Promise<SeedCartResult> {
		const seeded = await productCatalogPage.addFirstProductToCart(cartPage);
		if (seeded.skipped) return seeded;

		await this.page.goto("/paiement");
		await this.page.waitForLoadState("domcontentloaded");

		// Le formulaire existe vraiment — pas l'état « panier vide ».
		await expect(this.emailInput).toBeVisible({ timeout: 15000 });
		await expect(this.emptyCartMessage).toHaveCount(0);

		// La barre CTA n'est montée qu'après le `onReady` de Stripe
		// (`checkout-stripe-section.tsx` la garde derrière `hidden`). L'attendre
		// fait entrer la section Paiement dans le périmètre auditté.
		await expect(this.payButton).toBeVisible({ timeout: 30000 });

		return { skipped: false };
	}

	async fillAddress(data?: {
		fullName?: string;
		address?: string;
		postalCode?: string;
		city?: string;
		phone?: string;
	}) {
		const defaults = {
			fullName: "Marie Dupont",
			address: "12 rue de la Paix",
			postalCode: "75002",
			city: "Paris",
			phone: "0612345678",
		};
		const d = { ...defaults, ...data };

		await this.fullNameInput.fill(d.fullName);
		await this.addressInput.fill(d.address);
		await this.postalCodeInput.fill(d.postalCode);
		await this.cityInput.fill(d.city);
		await this.phoneInput.fill(d.phone);

		// Pas de case CGV à cocher : l'acceptation est implicite dans ce tunnel
		// (« En commandant, tu acceptes… » + lien). Le locator qui la cherchait
		// retombait sur le LIEN CGV.
	}

	async submitAddress() {
		await expect(this.continueButton).toBeEnabled();
		await this.continueButton.click();
	}

	async waitForStripeFrame() {
		await expect(async () => {
			const frameCount = await this.page.locator('iframe[src*="stripe"]').count();
			expect(frameCount).toBeGreaterThan(0);
		}).toPass({ timeout: 15000 });

		return this.page.frameLocator('iframe[src*="stripe"]').first();
	}

	async fillStripeCard(stripeFrame: ReturnType<Page["frameLocator"]>, card = "4242424242424242") {
		const cardInput = stripeFrame
			.getByPlaceholder(/numéro de carte|card number/i)
			.or(stripeFrame.locator('[name="cardNumber"]'))
			.or(stripeFrame.locator("#cardNumber"));
		await cardInput.fill(card);

		const expiryInput = stripeFrame
			.getByPlaceholder(/MM \/ AA|expiry/i)
			.or(stripeFrame.locator('[name="cardExpiry"]'))
			.or(stripeFrame.locator("#cardExpiry"));
		await expiryInput.fill("12/30");

		const cvcInput = stripeFrame
			.getByPlaceholder(/CVC|CVV/i)
			.or(stripeFrame.locator('[name="cardCvc"]'))
			.or(stripeFrame.locator("#cardCvc"));
		await cvcInput.fill("123");
	}

	async submitPayment(stripeFrame: ReturnType<Page["frameLocator"]>) {
		const payButton = stripeFrame.getByRole("button", { name: /Payer|Pay/i });
		await payButton.click();
	}

	/*
	 * Plus de méthodes de code promo : le modèle `Discount`, l'enum `DiscountType`
	 * et les colonnes `discountCode`/`discountId`/`discountAmount` ont été retirés
	 * le 2026-08-05 (cf. prisma/schema.prisma). Les 5 locators et les 3 méthodes qui
	 * les pilotaient ciblaient une surface qui n'existe plus — aucune spec ne les
	 * appelait, donc rien ne le signalait.
	 */
}
