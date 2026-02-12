import { describe, expect, it } from "vitest";
import { setFabVisibilitySchema } from "./fab-visibility.schema";

describe("setFabVisibilitySchema", () => {
	it("accepts valid storefront key with isHidden=true string", () => {
		const result = setFabVisibilitySchema.safeParse({
			key: "storefront",
			isHidden: "true",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.isHidden).toBe(true);
		}
	});

	it("accepts valid key with isHidden=false string (preprocess)", () => {
		const result = setFabVisibilitySchema.safeParse({
			key: "admin-speed-dial",
			isHidden: "false",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.isHidden).toBe(false);
		}
	});

	it("accepts admin-dashboard key", () => {
		const result = setFabVisibilitySchema.safeParse({
			key: "admin-dashboard",
			isHidden: "true",
		});
		expect(result.success).toBe(true);
	});

	it("rejects invalid key", () => {
		const result = setFabVisibilitySchema.safeParse({
			key: "invalid-key",
			isHidden: "true",
		});
		expect(result.success).toBe(false);
	});

	it("rejects missing key", () => {
		const result = setFabVisibilitySchema.safeParse({
			isHidden: "true",
		});
		expect(result.success).toBe(false);
	});

	it("treats non-true string as false via preprocess", () => {
		const result = setFabVisibilitySchema.safeParse({
			key: "storefront",
			isHidden: "anything-else",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.isHidden).toBe(false);
		}
	});
});
