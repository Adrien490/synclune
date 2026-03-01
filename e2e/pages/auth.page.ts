import type { Locator, Page } from "@playwright/test";

export class AuthPage {
	readonly emailInput: Locator;
	readonly passwordInput: Locator;
	readonly submitButton: Locator;
	readonly forgotPasswordLink: Locator;
	readonly signUpLink: Locator;
	readonly socialButtons: Locator;

	constructor(private page: Page) {
		this.emailInput = page.getByRole("textbox", { name: /Email/i });
		this.passwordInput = page.locator('input[type="password"]');
		this.submitButton = page.getByRole("button", { name: /Se connecter/i });
		this.forgotPasswordLink = page.getByRole("link", { name: /Mot de passe oublié/i });
		this.signUpLink = page.getByRole("link", { name: /Inscrivez-vous|Créez|S'inscrire/i });
		this.socialButtons = page.getByRole("button", { name: /Google|GitHub|Continuer avec/i });
	}

	async goto() {
		await this.page.goto("/connexion");
		await this.page.waitForLoadState("domcontentloaded");
	}

	async login(email: string, password: string) {
		await this.emailInput.fill(email);
		await this.passwordInput.fill(password);
		await this.submitButton.click();
	}
}
