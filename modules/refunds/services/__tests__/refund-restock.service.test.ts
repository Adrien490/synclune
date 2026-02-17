import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/generated/prisma/browser", () => ({
	RefundReason: {
		CUSTOMER_REQUEST: "CUSTOMER_REQUEST",
		WRONG_ITEM: "WRONG_ITEM",
		DEFECTIVE: "DEFECTIVE",
		LOST_IN_TRANSIT: "LOST_IN_TRANSIT",
		FRAUD: "FRAUD",
		OTHER: "OTHER",
	},
}));

import { shouldRestockByDefault } from "../refund-restock.service";
import { RefundReason } from "@/app/generated/prisma/browser";

// ============================================================================
// shouldRestockByDefault
// ============================================================================

describe("shouldRestockByDefault", () => {
	it("should return true for CUSTOMER_REQUEST (item returned by customer)", () => {
		expect(shouldRestockByDefault(RefundReason.CUSTOMER_REQUEST)).toBe(true);
	});

	it("should return true for WRONG_ITEM (item recovered from wrong shipment)", () => {
		expect(shouldRestockByDefault(RefundReason.WRONG_ITEM)).toBe(true);
	});

	it("should return false for DEFECTIVE (broken item cannot be restocked)", () => {
		expect(shouldRestockByDefault(RefundReason.DEFECTIVE)).toBe(false);
	});

	it("should return false for LOST_IN_TRANSIT (item lost, nothing to restock)", () => {
		expect(shouldRestockByDefault(RefundReason.LOST_IN_TRANSIT)).toBe(false);
	});

	it("should return false for FRAUD", () => {
		expect(shouldRestockByDefault(RefundReason.FRAUD)).toBe(false);
	});

	it("should return false for OTHER (precautionary default)", () => {
		expect(shouldRestockByDefault(RefundReason.OTHER)).toBe(false);
	});
});
