import { describe, expect, it } from "vitest";
import { setFabVisibilitySchema } from "../fab-visibility.schema";

describe("setFabVisibilitySchema", () => {
	it("accepts valid key with isHidden=true string", () => {
		const result = setFabVisibilitySchema.safeParse({
			key: "admin-dashboard",
			isHidden: "true",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.isHidden).toBe(true);
		}
	});

	it("accepts valid key with isHidden=false string (preprocess)", () => {
		const result = setFabVisibilitySchema.safeParse({
			key: "admin-dashboard",
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

	// Audit Zod 2026-07-31 : `isHidden` est passé de
	// `z.preprocess((v) => v === "true", z.boolean())` à la SSOT `formBooleanSchema`.
	// L'ancienne forme coercait TOUT ce qui n'était pas exactement `"true"` en
	// `false` — y compris `undefined`, une faute de frappe ou un `File` — ce que
	// `formBooleanSchema` existe précisément pour empêcher (cf. son en-tête, où le
	// même piège avec `z.coerce.boolean()` est documenté).
	it("rejects a garbage value instead of silently coercing it to false", () => {
		const result = setFabVisibilitySchema.safeParse({
			key: "admin-dashboard",
			isHidden: "anything-else",
		});
		expect(result.success).toBe(false);
	});

	it("accepts the string booleans emitted by the form", () => {
		for (const [input, expected] of [
			["true", true],
			["false", false],
			["1", true],
			["0", false],
		] as const) {
			const result = setFabVisibilitySchema.safeParse({ key: "admin-dashboard", isHidden: input });
			expect(result.success).toBe(true);
			if (result.success) expect(result.data.isHidden).toBe(expected);
		}
	});

	it("rejects storefront key (removed)", () => {
		const result = setFabVisibilitySchema.safeParse({
			key: "storefront",
			isHidden: "true",
		});
		expect(result.success).toBe(false);
	});
});
