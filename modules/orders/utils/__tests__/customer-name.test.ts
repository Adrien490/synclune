import { describe, it, expect } from "vitest";
import { extractCustomerFirstName } from "../customer-name";

describe("extractCustomerFirstName", () => {
	it("should return first word of customerName when available", () => {
		expect(extractCustomerFirstName("Jean Dupont", null)).toBe("Jean");
	});

	it("should return shippingFirstName when customerName is null", () => {
		expect(extractCustomerFirstName(null, "Marie")).toBe("Marie");
	});

	it("should return shippingFirstName when customerName is empty string", () => {
		expect(extractCustomerFirstName("", "Pierre")).toBe("Pierre");
	});

	it("should return fallback when both customerName and shippingFirstName are null", () => {
		expect(extractCustomerFirstName(null, null)).toBe("Client");
	});

	it("should return custom fallback when provided", () => {
		expect(extractCustomerFirstName(null, null, "Inconnu")).toBe("Inconnu");
	});

	it("should use default fallback of Client", () => {
		const result = extractCustomerFirstName(null, null);
		expect(result).toBe("Client");
	});

	it("should return only the first word when name has multiple spaces", () => {
		expect(extractCustomerFirstName("Anne Marie Claire Durand", null)).toBe("Anne");
	});
});
