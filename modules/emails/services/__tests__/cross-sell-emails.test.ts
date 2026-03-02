import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockRenderAndSend, mockCrossSellEmail } = vi.hoisted(() => ({
	mockRenderAndSend: vi.fn(),
	mockCrossSellEmail: vi.fn(),
}));

vi.mock("@/modules/emails/services/send-email", () => ({
	renderAndSend: mockRenderAndSend,
}));

vi.mock("@/emails/cross-sell-email", () => ({
	CrossSellEmail: mockCrossSellEmail,
}));

vi.mock("@/shared/lib/email-config", () => ({
	EMAIL_CONTACT: "contact@synclune.fr",
	EMAIL_FROM: "Synclune <contact@synclune.fr>",
	EMAIL_ADMIN: "contact@synclune.fr",
	EMAIL_SUBJECTS: {
		CROSS_SELL: "Complétez votre collection - Synclune",
	},
}));

import { sendCrossSellEmail } from "../cross-sell-emails";

// ============================================================================
// FIXTURES
// ============================================================================

const defaultParams = {
	to: "client@example.com",
	customerName: "Camille",
	products: [
		{
			title: "Bracelet Soleil",
			imageUrl: "https://cdn.synclune.fr/bracelet-soleil.jpg",
			price: 3500,
			productUrl: "https://synclune.fr/boutique/bracelet-soleil",
		},
		{
			title: "Bague Lune",
			imageUrl: null,
			price: 4200,
			productUrl: "https://synclune.fr/boutique/bague-lune",
		},
	],
	shopUrl: "https://synclune.fr/boutique",
	unsubscribeUrl: "https://synclune.fr/desinscription?token=def",
};

// ============================================================================
// TESTS
// ============================================================================

describe("sendCrossSellEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockCrossSellEmail.mockReturnValue({ type: "CrossSellEmail" });
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "email-id-1" } });
	});

	it("calls CrossSellEmail component with the correct props", async () => {
		await sendCrossSellEmail(defaultParams);

		expect(mockCrossSellEmail).toHaveBeenCalledWith({
			customerName: defaultParams.customerName,
			products: defaultParams.products,
			shopUrl: defaultParams.shopUrl,
			unsubscribeUrl: defaultParams.unsubscribeUrl,
		});
	});

	it("calls renderAndSend with the rendered component", async () => {
		const renderedComponent = { type: "CrossSellEmail", props: {} };
		mockCrossSellEmail.mockReturnValue(renderedComponent);

		await sendCrossSellEmail(defaultParams);

		expect(mockRenderAndSend).toHaveBeenCalledWith(renderedComponent, expect.any(Object));
	});

	it("calls renderAndSend with the correct recipient", async () => {
		await sendCrossSellEmail(defaultParams);

		const options = mockRenderAndSend.mock.calls[0]![1];
		expect(options.to).toBe("client@example.com");
	});

	it("calls renderAndSend with the CROSS_SELL subject", async () => {
		await sendCrossSellEmail(defaultParams);

		const options = mockRenderAndSend.mock.calls[0]![1];
		expect(options.subject).toBe("Complétez votre collection - Synclune");
	});

	it("calls renderAndSend with EMAIL_CONTACT as replyTo", async () => {
		await sendCrossSellEmail(defaultParams);

		const options = mockRenderAndSend.mock.calls[0]![1];
		expect(options.replyTo).toBe("contact@synclune.fr");
	});

	it("calls renderAndSend with List-Unsubscribe header containing the unsubscribe URL", async () => {
		await sendCrossSellEmail(defaultParams);

		const options = mockRenderAndSend.mock.calls[0]![1];
		expect(options.headers["List-Unsubscribe"]).toBe(`<${defaultParams.unsubscribeUrl}>`);
	});

	it("calls renderAndSend with List-Unsubscribe-Post header for one-click", async () => {
		await sendCrossSellEmail(defaultParams);

		const options = mockRenderAndSend.mock.calls[0]![1];
		expect(options.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
	});

	it("calls renderAndSend with marketing category tag", async () => {
		await sendCrossSellEmail(defaultParams);

		const options = mockRenderAndSend.mock.calls[0]![1];
		expect(options.tags).toEqual([{ name: "category", value: "marketing" }]);
	});

	it("returns the result from renderAndSend on success", async () => {
		const expectedResult = { success: true as const, data: { id: "resend-id-77" } };
		mockRenderAndSend.mockResolvedValue(expectedResult);

		const result = await sendCrossSellEmail(defaultParams);

		expect(result).toEqual(expectedResult);
	});

	it("returns the failure result from renderAndSend on error", async () => {
		const expectedResult = { success: false as const, error: "Rate limit exceeded" };
		mockRenderAndSend.mockResolvedValue(expectedResult);

		const result = await sendCrossSellEmail(defaultParams);

		expect(result).toEqual(expectedResult);
	});

	it("propagates errors thrown by renderAndSend", async () => {
		mockRenderAndSend.mockRejectedValue(new Error("Render failed"));

		await expect(sendCrossSellEmail(defaultParams)).rejects.toThrow("Render failed");
	});

	it("passes products with null imageUrl through unchanged", async () => {
		await sendCrossSellEmail(defaultParams);

		expect(mockCrossSellEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				products: expect.arrayContaining([
					expect.objectContaining({
						title: "Bague Lune",
						imageUrl: null,
					}),
				]),
			}),
		);
	});

	it("passes an empty products array when no products are provided", async () => {
		await sendCrossSellEmail({ ...defaultParams, products: [] });

		expect(mockCrossSellEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				products: [],
			}),
		);
	});
});
