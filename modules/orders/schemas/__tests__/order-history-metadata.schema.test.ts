import { describe, expect, it } from "vitest";
import { orderHistoryMetadataSchema } from "../order-history-metadata.schema";

/**
 * @regression ORD-COMPLY-006 (audit conformité 2026-05-27)
 *
 * `OrderHistory.metadata` est exposée côté client via GET_ORDER_SELECT_CUSTOMER.
 * Le schéma bloque les clés PII pour éviter une fuite à l'ajout futur d'une
 * action admin.
 */
describe("orderHistoryMetadataSchema", () => {
	it("accepts metadata without PII keys", () => {
		expect(
			orderHistoryMetadataSchema.safeParse({
				updateType: "customerInfo",
				changedFields: ["name", "contactIdentity"],
				stockRestored: true,
				itemsCount: 3,
			}).success,
		).toBe(true);
	});

	it("accepts undefined and null", () => {
		expect(orderHistoryMetadataSchema.safeParse(undefined).success).toBe(true);
		expect(orderHistoryMetadataSchema.safeParse(null).success).toBe(true);
	});

	it.each([
		"email",
		"customerEmail",
		"customerName",
		"customerPhone",
		"shippingPhone",
		"billingPhone",
		"address1",
		"firstName",
		"lastName",
		"previousEmail",
		"iban",
		"vatNumber",
		"password",
		"apiKey",
	])("rejects PII-like top-level key %s", (key) => {
		const result = orderHistoryMetadataSchema.safeParse({ [key]: "value" });
		expect(result.success).toBe(false);
	});

	it("rejects PII keys nested in objects", () => {
		const result = orderHistoryMetadataSchema.safeParse({
			updateType: "customerInfo",
			previous: { email: "leak@example.com" },
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.path).toContain("email");
		}
	});

	it("rejects PII keys nested in arrays", () => {
		const result = orderHistoryMetadataSchema.safeParse({
			snapshots: [{ email: "leak@example.com" }],
		});
		expect(result.success).toBe(false);
	});

	it("accepts purposeful non-PII keys that happen to contain a similar substring", () => {
		// "stripeCustomerId" contains "Customer" but no "customerEmail"/"customerName" exact match
		// Our regex matches "customerName" precisely, so "stripeCustomerId" must pass.
		const result = orderHistoryMetadataSchema.safeParse({
			stripeRefundId: "re_test_123",
		});
		expect(result.success).toBe(true);
	});
});
