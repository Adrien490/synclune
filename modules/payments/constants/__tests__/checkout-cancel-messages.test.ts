import { describe, expect, it } from "vitest";
import { CHECKOUT_CANCEL_MESSAGES, getCheckoutCancelMessage } from "../checkout-cancel-messages";

describe("CHECKOUT_CANCEL_MESSAGES", () => {
	it("has entries for the 3 motifs servable post Checkout-Sessions migration", () => {
		const expectedCodes = ["processing_error", "expired", "canceled"];
		for (const code of expectedCodes) {
			expect(CHECKOUT_CANCEL_MESSAGES[code]).toBeDefined();
		}
	});

	it("each entry has title, description, and icon", () => {
		for (const [, entry] of Object.entries(CHECKOUT_CANCEL_MESSAGES)) {
			expect(entry.title).toBeTypeOf("string");
			expect(entry.description).toBeTypeOf("string");
			expect(entry.icon).toBeDefined();
			expect(entry.title.length).toBeGreaterThan(0);
			expect(entry.description.length).toBeGreaterThan(0);
		}
	});
});

describe("getCheckoutCancelMessage", () => {
	it("returns the correct message for a known code", () => {
		const result = getCheckoutCancelMessage("expired");
		expect(result.title).toBe("Session expirée");
	});

	it("returns 'canceled' message for an unknown code", () => {
		const result = getCheckoutCancelMessage("unknown_error_code");
		expect(result.title).toBe("Paiement annulé");
	});

	it("returns 'canceled' message when reason is undefined", () => {
		const result = getCheckoutCancelMessage(undefined);
		expect(result.title).toBe("Paiement annulé");
	});

	it("returns 'canceled' message when reason is empty string", () => {
		const result = getCheckoutCancelMessage("");
		expect(result.title).toBe("Paiement annulé");
	});
});
