import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRenderAndSend } = vi.hoisted(() => ({
	mockRenderAndSend: vi.fn(),
}));

vi.mock("../send-email", () => ({
	renderAndSend: mockRenderAndSend,
}));

vi.mock("@/emails/newsletter-confirmation-email", () => ({
	NewsletterConfirmationEmail: vi.fn((props) => ({ type: "NewsletterConfirmationEmail", props })),
}));

vi.mock("@/emails/newsletter-welcome-email", () => ({
	NewsletterWelcomeEmail: vi.fn((props) => ({ type: "NewsletterWelcomeEmail", props })),
}));

vi.mock("../../constants/email.constants", () => ({
	EMAIL_SUBJECTS: {
		NEWSLETTER_CONFIRMATION: "Confirmez votre inscription à la newsletter Synclune ✨",
		NEWSLETTER_WELCOME: "Bienvenue dans notre communauté Synclune ! 🎉",
	},
}));

vi.mock("@/shared/constants/urls", () => ({
	buildUrl: vi.fn((route: string) => `https://test.com${route}`),
	ROUTES: {
		SHOP: {
			PRODUCTS: "/boutique",
		},
	},
}));

import { sendNewsletterConfirmationEmail, sendNewsletterWelcomeEmail } from "../newsletter-emails";

describe("sendNewsletterConfirmationEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "email-1" } });
	});

	it("should call renderAndSend with correct component props", async () => {
		await sendNewsletterConfirmationEmail({
			to: "subscriber@test.com",
			confirmationUrl: "https://test.com/newsletter/confirmer?token=abc",
		});

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "NewsletterConfirmationEmail",
				props: expect.objectContaining({
					confirmationUrl: "https://test.com/newsletter/confirmer?token=abc",
				}),
			}),
			expect.objectContaining({
				to: "subscriber@test.com",
				subject: "Confirmez votre inscription à la newsletter Synclune ✨",
				tags: [{ name: "category", value: "marketing" }],
			}),
		);
	});

	it("should not include replyTo", async () => {
		await sendNewsletterConfirmationEmail({
			to: "subscriber@test.com",
			confirmationUrl: "https://test.com/newsletter/confirmer?token=abc",
		});

		const callArgs = mockRenderAndSend.mock.calls[0]![1];
		expect(callArgs).not.toHaveProperty("replyTo");
	});

	it("should return the result from renderAndSend", async () => {
		const result = await sendNewsletterConfirmationEmail({
			to: "subscriber@test.com",
			confirmationUrl: "https://test.com/newsletter/confirmer?token=abc",
		});

		expect(result).toEqual({ success: true, data: { id: "email-1" } });
	});
});

describe("sendNewsletterWelcomeEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "email-2" } });
	});

	it("should call renderAndSend with correct component props including built shopUrl", async () => {
		await sendNewsletterWelcomeEmail({
			to: "subscriber@test.com",
			unsubscribeUrl: "https://test.com/newsletter/desabonnement?token=xyz",
		});

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "NewsletterWelcomeEmail",
				props: expect.objectContaining({
					email: "subscriber@test.com",
					unsubscribeUrl: "https://test.com/newsletter/desabonnement?token=xyz",
					shopUrl: "https://test.com/boutique",
				}),
			}),
			expect.objectContaining({
				to: "subscriber@test.com",
				subject: "Bienvenue dans notre communauté Synclune ! 🎉",
				tags: [{ name: "category", value: "marketing" }],
			}),
		);
	});

	it("should include List-Unsubscribe headers", async () => {
		const unsubscribeUrl = "https://test.com/newsletter/desabonnement?token=xyz";

		await sendNewsletterWelcomeEmail({
			to: "subscriber@test.com",
			unsubscribeUrl,
		});

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				headers: {
					"List-Unsubscribe": `<${unsubscribeUrl}>`,
					"List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
				},
			}),
		);
	});

	it("should build shopUrl from ROUTES.SHOP.PRODUCTS", async () => {
		const { buildUrl } = await import("@/shared/constants/urls");

		await sendNewsletterWelcomeEmail({
			to: "subscriber@test.com",
			unsubscribeUrl: "https://test.com/newsletter/desabonnement?token=xyz",
		});

		expect(buildUrl).toHaveBeenCalledWith("/boutique");
	});

	it("should return the result from renderAndSend", async () => {
		const result = await sendNewsletterWelcomeEmail({
			to: "subscriber@test.com",
			unsubscribeUrl: "https://test.com/newsletter/desabonnement?token=xyz",
		});

		expect(result).toEqual({ success: true, data: { id: "email-2" } });
	});
});
