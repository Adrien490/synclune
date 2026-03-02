import { describe, it, expect } from "vitest";

import { getOrderItemSchema } from "../order-item.schemas";

// ============================================================================
// getOrderItemSchema
// ============================================================================

describe("getOrderItemSchema", () => {
	it("should accept a valid id", () => {
		const result = getOrderItemSchema.safeParse({ id: "order-item-abc-123" });

		expect(result.success).toBe(true);
	});

	it("should trim whitespace from id", () => {
		const result = getOrderItemSchema.safeParse({ id: "  order-item-abc-123  " });

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.id).toBe("order-item-abc-123");
		}
	});

	it("should accept a single-character id", () => {
		const result = getOrderItemSchema.safeParse({ id: "x" });

		expect(result.success).toBe(true);
	});

	it("should accept a long id string", () => {
		const result = getOrderItemSchema.safeParse({ id: "a".repeat(100) });

		expect(result.success).toBe(true);
	});

	it("should reject an empty id string", () => {
		const result = getOrderItemSchema.safeParse({ id: "" });

		expect(result.success).toBe(false);
	});

	it("should reject a whitespace-only id string", () => {
		const result = getOrderItemSchema.safeParse({ id: "   " });

		expect(result.success).toBe(false);
	});

	it("should reject when id is missing", () => {
		const result = getOrderItemSchema.safeParse({});

		expect(result.success).toBe(false);
	});

	it("should reject when id is null", () => {
		const result = getOrderItemSchema.safeParse({ id: null });

		expect(result.success).toBe(false);
	});

	it("should reject when id is a number", () => {
		const result = getOrderItemSchema.safeParse({ id: 42 });

		expect(result.success).toBe(false);
	});
});
