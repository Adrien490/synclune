import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockRenderAndSend, mockBackInStockEmail } = vi.hoisted(() => ({
	mockRenderAndSend: vi.fn(),
	mockBackInStockEmail: vi.fn(),
}));

vi.mock("@/modules/emails/services/send-email", () => ({
	renderAndSend: mockRenderAndSend,
}));

vi.mock("@/emails/back-in-stock-email", () => ({
	BackInStockEmail: mockBackInStockEmail,
}));

vi.mock("@/shared/lib/email-config", () => ({
	EMAIL_CONTACT: "contact@synclune.fr",
	EMAIL_FROM: "Synclune <contact@synclune.fr>",
	EMAIL_ADMIN: "contact@synclune.fr",
	EMAIL_SUBJECTS: {
		BACK_IN_STOCK: "Bonne nouvelle ! Un article de votre liste est de retour - Synclune",
	},
}));

import { sendBackInStockEmail } from "../wishlist-emails";

// ============================================================================
// FIXTURES
// ============================================================================

const defaultParams = {
	to: "client@example.com",
	customerName: "Sophie",
	productTitle: "Collier Étoile",
	productUrl: "https://synclune.fr/boutique/collier-etoile",
	unsubscribeUrl: "https://synclune.fr/desinscription?token=xyz",
};

// ============================================================================
// TESTS
// ============================================================================

describe("sendBackInStockEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockBackInStockEmail.mockReturnValue({ type: "BackInStockEmail" });
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "email-id-1" } });
	});

	it("calls BackInStockEmail component with the correct props", async () => {
		await sendBackInStockEmail(defaultParams);

		expect(mockBackInStockEmail).toHaveBeenCalledWith({
			customerName: defaultParams.customerName,
			productTitle: defaultParams.productTitle,
			productUrl: defaultParams.productUrl,
			unsubscribeUrl: defaultParams.unsubscribeUrl,
		});
	});

	it("calls renderAndSend with the rendered component", async () => {
		const renderedComponent = { type: "BackInStockEmail", props: {} };
		mockBackInStockEmail.mockReturnValue(renderedComponent);

		await sendBackInStockEmail(defaultParams);

		expect(mockRenderAndSend).toHaveBeenCalledWith(renderedComponent, expect.any(Object));
	});

	it("calls renderAndSend with the correct recipient", async () => {
		await sendBackInStockEmail(defaultParams);

		const options = mockRenderAndSend.mock.calls[0]![1];
		expect(options.to).toBe("client@example.com");
	});

	it("calls renderAndSend with the BACK_IN_STOCK subject", async () => {
		await sendBackInStockEmail(defaultParams);

		const options = mockRenderAndSend.mock.calls[0]![1];
		expect(options.subject).toBe(
			"Bonne nouvelle ! Un article de votre liste est de retour - Synclune",
		);
	});

	it("calls renderAndSend with EMAIL_CONTACT as replyTo", async () => {
		await sendBackInStockEmail(defaultParams);

		const options = mockRenderAndSend.mock.calls[0]![1];
		expect(options.replyTo).toBe("contact@synclune.fr");
	});

	it("calls renderAndSend with List-Unsubscribe header containing the unsubscribe URL", async () => {
		await sendBackInStockEmail(defaultParams);

		const options = mockRenderAndSend.mock.calls[0]![1];
		expect(options.headers["List-Unsubscribe"]).toBe(`<${defaultParams.unsubscribeUrl}>`);
	});

	it("calls renderAndSend with List-Unsubscribe-Post header for one-click", async () => {
		await sendBackInStockEmail(defaultParams);

		const options = mockRenderAndSend.mock.calls[0]![1];
		expect(options.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
	});

	it("calls renderAndSend with marketing category tag", async () => {
		await sendBackInStockEmail(defaultParams);

		const options = mockRenderAndSend.mock.calls[0]![1];
		expect(options.tags).toEqual([{ name: "category", value: "marketing" }]);
	});

	it("returns the result from renderAndSend on success", async () => {
		const expectedResult = { success: true as const, data: { id: "resend-id-99" } };
		mockRenderAndSend.mockResolvedValue(expectedResult);

		const result = await sendBackInStockEmail(defaultParams);

		expect(result).toEqual(expectedResult);
	});

	it("returns the failure result from renderAndSend on error", async () => {
		const expectedResult = { success: false as const, error: "Resend API error" };
		mockRenderAndSend.mockResolvedValue(expectedResult);

		const result = await sendBackInStockEmail(defaultParams);

		expect(result).toEqual(expectedResult);
	});

	it("propagates errors thrown by renderAndSend", async () => {
		mockRenderAndSend.mockRejectedValue(new Error("Circuit breaker open"));

		await expect(sendBackInStockEmail(defaultParams)).rejects.toThrow("Circuit breaker open");
	});
});
