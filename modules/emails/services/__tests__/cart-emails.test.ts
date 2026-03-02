import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockRenderAndSend, mockAbandonedCartEmail } = vi.hoisted(() => ({
	mockRenderAndSend: vi.fn(),
	mockAbandonedCartEmail: vi.fn(),
}));

vi.mock("@/modules/emails/services/send-email", () => ({
	renderAndSend: mockRenderAndSend,
}));

vi.mock("@/emails/abandoned-cart-email", () => ({
	AbandonedCartEmail: mockAbandonedCartEmail,
}));

vi.mock("@/shared/lib/email-config", () => ({
	EMAIL_CONTACT: "contact@synclune.fr",
	EMAIL_FROM: "Synclune <contact@synclune.fr>",
	EMAIL_ADMIN: "contact@synclune.fr",
	EMAIL_SUBJECTS: {
		ABANDONED_CART: "Vous avez oublié quelque chose... - Synclune",
	},
}));

import { sendAbandonedCartEmail } from "../cart-emails";

// ============================================================================
// FIXTURES
// ============================================================================

const defaultParams = {
	to: "client@example.com",
	customerName: "Marie",
	items: [
		{
			productTitle: "Bracelet Lune",
			skuColor: "Or",
			skuMaterial: "Argent 925",
			quantity: 2,
			price: 4999,
		},
	],
	total: 9998,
	cartUrl: "https://synclune.fr/panier",
	unsubscribeUrl: "https://synclune.fr/desinscription?token=abc",
};

// ============================================================================
// TESTS
// ============================================================================

describe("sendAbandonedCartEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockAbandonedCartEmail.mockReturnValue({ type: "AbandonedCartEmail" });
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "email-id-1" } });
	});

	it("calls AbandonedCartEmail component with the correct props", async () => {
		await sendAbandonedCartEmail(defaultParams);

		expect(mockAbandonedCartEmail).toHaveBeenCalledWith({
			customerName: defaultParams.customerName,
			items: defaultParams.items,
			total: defaultParams.total,
			cartUrl: defaultParams.cartUrl,
			unsubscribeUrl: defaultParams.unsubscribeUrl,
		});
	});

	it("calls renderAndSend with the rendered component", async () => {
		const renderedComponent = { type: "AbandonedCartEmail", props: {} };
		mockAbandonedCartEmail.mockReturnValue(renderedComponent);

		await sendAbandonedCartEmail(defaultParams);

		expect(mockRenderAndSend).toHaveBeenCalledWith(renderedComponent, expect.any(Object));
	});

	it("calls renderAndSend with the correct recipient", async () => {
		await sendAbandonedCartEmail(defaultParams);

		const options = mockRenderAndSend.mock.calls[0]![1];
		expect(options.to).toBe("client@example.com");
	});

	it("calls renderAndSend with the ABANDONED_CART subject", async () => {
		await sendAbandonedCartEmail(defaultParams);

		const options = mockRenderAndSend.mock.calls[0]![1];
		expect(options.subject).toBe("Vous avez oublié quelque chose... - Synclune");
	});

	it("calls renderAndSend with EMAIL_CONTACT as replyTo", async () => {
		await sendAbandonedCartEmail(defaultParams);

		const options = mockRenderAndSend.mock.calls[0]![1];
		expect(options.replyTo).toBe("contact@synclune.fr");
	});

	it("calls renderAndSend with List-Unsubscribe header containing the unsubscribe URL", async () => {
		await sendAbandonedCartEmail(defaultParams);

		const options = mockRenderAndSend.mock.calls[0]![1];
		expect(options.headers["List-Unsubscribe"]).toBe(`<${defaultParams.unsubscribeUrl}>`);
	});

	it("calls renderAndSend with List-Unsubscribe-Post header for one-click", async () => {
		await sendAbandonedCartEmail(defaultParams);

		const options = mockRenderAndSend.mock.calls[0]![1];
		expect(options.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
	});

	it("calls renderAndSend with marketing category tag", async () => {
		await sendAbandonedCartEmail(defaultParams);

		const options = mockRenderAndSend.mock.calls[0]![1];
		expect(options.tags).toEqual([{ name: "category", value: "marketing" }]);
	});

	it("returns the result from renderAndSend on success", async () => {
		const expectedResult = { success: true as const, data: { id: "resend-id-42" } };
		mockRenderAndSend.mockResolvedValue(expectedResult);

		const result = await sendAbandonedCartEmail(defaultParams);

		expect(result).toEqual(expectedResult);
	});

	it("returns the failure result from renderAndSend on error", async () => {
		const expectedResult = { success: false as const, error: "Send failed" };
		mockRenderAndSend.mockResolvedValue(expectedResult);

		const result = await sendAbandonedCartEmail(defaultParams);

		expect(result).toEqual(expectedResult);
	});

	it("propagates errors thrown by renderAndSend", async () => {
		mockRenderAndSend.mockRejectedValue(new Error("Network error"));

		await expect(sendAbandonedCartEmail(defaultParams)).rejects.toThrow("Network error");
	});

	it("passes items with null skuColor and skuMaterial through unchanged", async () => {
		const paramsWithNulls = {
			...defaultParams,
			items: [
				{
					productTitle: "Bague Simple",
					skuColor: null,
					skuMaterial: null,
					quantity: 1,
					price: 2500,
				},
			],
		};

		await sendAbandonedCartEmail(paramsWithNulls);

		expect(mockAbandonedCartEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				items: [
					expect.objectContaining({
						skuColor: null,
						skuMaterial: null,
					}),
				],
			}),
		);
	});
});
