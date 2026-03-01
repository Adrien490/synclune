import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRenderAndSend } = vi.hoisted(() => ({
	mockRenderAndSend: vi.fn(),
}));

vi.mock("../send-email", () => ({
	renderAndSend: mockRenderAndSend,
}));

vi.mock("@/emails/review-request-email", () => ({
	ReviewRequestEmail: vi.fn((props) => ({ type: "ReviewRequestEmail", props })),
}));

vi.mock("@/emails/review-response-email", () => ({
	ReviewResponseEmail: vi.fn((props) => ({ type: "ReviewResponseEmail", props })),
}));

vi.mock("../../constants/email.constants", () => ({
	EMAIL_SUBJECTS: {
		REVIEW_REQUEST: "Votre avis compte ! - Synclune",
		REVIEW_RESPONSE: "Nous avons répondu à votre avis - Synclune",
	},
	EMAIL_CONTACT: "contact@test.com",
}));

import { sendReviewRequestEmail, sendReviewResponseEmail } from "../review-emails";

const mockProducts = [
	{
		title: "Bague en or",
		slug: "bague-en-or",
		imageUrl: "https://test.com/image.jpg",
		skuVariants: "Or jaune / Taille 52",
	},
	{
		title: "Collier argent",
		slug: "collier-argent",
		imageUrl: null,
		skuVariants: null,
	},
];

describe("sendReviewRequestEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "email-1" } });
	});

	it("should call renderAndSend with correct component props", async () => {
		await sendReviewRequestEmail({
			to: "customer@test.com",
			customerName: "Marie Dupont",
			orderNumber: "CMD-001",
			products: mockProducts,
			reviewUrl: "https://test.com/mes-avis?order=CMD-001",
			unsubscribeUrl: "https://test.com/newsletter/desabonnement?token=abc",
		});

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "ReviewRequestEmail",
				props: expect.objectContaining({
					customerName: "Marie Dupont",
					orderNumber: "CMD-001",
					products: mockProducts,
					reviewUrl: "https://test.com/mes-avis?order=CMD-001",
				}),
			}),
			expect.objectContaining({
				to: "customer@test.com",
				subject: "Votre avis compte ! - Synclune",
				replyTo: "contact@test.com",
				tags: [{ name: "category", value: "order" }],
			}),
		);
	});

	it("should include List-Unsubscribe headers", async () => {
		const unsubscribeUrl = "https://test.com/newsletter/desabonnement?token=abc";

		await sendReviewRequestEmail({
			to: "customer@test.com",
			customerName: "Marie Dupont",
			orderNumber: "CMD-001",
			products: mockProducts,
			reviewUrl: "https://test.com/mes-avis?order=CMD-001",
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

	it("should pass unsubscribeUrl to the component props", async () => {
		await sendReviewRequestEmail({
			to: "customer@test.com",
			customerName: "Marie Dupont",
			orderNumber: "CMD-001",
			products: mockProducts,
			reviewUrl: "https://test.com/mes-avis?order=CMD-001",
			unsubscribeUrl: "https://test.com/newsletter/desabonnement?token=abc",
		});

		const componentProps = mockRenderAndSend.mock.calls[0]![0].props;
		expect(componentProps).toHaveProperty(
			"unsubscribeUrl",
			"https://test.com/newsletter/desabonnement?token=abc",
		);
	});

	it("should return the result from renderAndSend", async () => {
		const result = await sendReviewRequestEmail({
			to: "customer@test.com",
			customerName: "Marie Dupont",
			orderNumber: "CMD-001",
			products: mockProducts,
			reviewUrl: "https://test.com/mes-avis?order=CMD-001",
			unsubscribeUrl: "https://test.com/newsletter/desabonnement?token=abc",
		});

		expect(result).toEqual({ success: true, data: { id: "email-1" } });
	});
});

describe("sendReviewResponseEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "email-2" } });
	});

	it("should call renderAndSend with correct component props", async () => {
		await sendReviewResponseEmail({
			to: "customer@test.com",
			customerName: "Marie Dupont",
			productTitle: "Bague en or",
			reviewContent: "Très belle bague, je suis ravie !",
			responseContent: "Merci pour votre avis, Marie !",
			responseAuthorName: "Synclune",
			productUrl: "https://test.com/boutique/bague-en-or",
		});

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "ReviewResponseEmail",
				props: expect.objectContaining({
					customerName: "Marie Dupont",
					productTitle: "Bague en or",
					reviewContent: "Très belle bague, je suis ravie !",
					responseContent: "Merci pour votre avis, Marie !",
					responseAuthorName: "Synclune",
					productUrl: "https://test.com/boutique/bague-en-or",
				}),
			}),
			expect.objectContaining({
				to: "customer@test.com",
				subject: "Nous avons répondu à votre avis - Synclune",
				replyTo: "contact@test.com",
				tags: [{ name: "category", value: "order" }],
			}),
		);
	});

	it("should not include List-Unsubscribe headers", async () => {
		await sendReviewResponseEmail({
			to: "customer@test.com",
			customerName: "Marie Dupont",
			productTitle: "Bague en or",
			reviewContent: "Très belle bague !",
			responseContent: "Merci !",
			responseAuthorName: "Synclune",
			productUrl: "https://test.com/boutique/bague-en-or",
		});

		const callArgs = mockRenderAndSend.mock.calls[0]![1];
		expect(callArgs).not.toHaveProperty("headers");
	});

	it("should return the result from renderAndSend", async () => {
		const result = await sendReviewResponseEmail({
			to: "customer@test.com",
			customerName: "Marie Dupont",
			productTitle: "Bague en or",
			reviewContent: "Très belle bague !",
			responseContent: "Merci !",
			responseAuthorName: "Synclune",
			productUrl: "https://test.com/boutique/bague-en-or",
		});

		expect(result).toEqual({ success: true, data: { id: "email-2" } });
	});
});
