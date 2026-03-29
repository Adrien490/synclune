import { describe, expect, it } from "vitest";

import { noopStorage } from "../noop-storage";

// ============================================================================
// noopStorage
// ============================================================================

describe("noopStorage", () => {
	describe("getItem", () => {
		it("returns null for any key", () => {
			expect(noopStorage.getItem("some-key")).toBeNull();
		});

		it("returns null regardless of the key provided", () => {
			expect(noopStorage.getItem("cookie-consent")).toBeNull();
			expect(noopStorage.getItem("")).toBeNull();
			expect(noopStorage.getItem("__zustand_persist__")).toBeNull();
		});
	});

	describe("setItem", () => {
		it("does not throw when called with a key and value", () => {
			expect(() => noopStorage.setItem("some-key", "some-value")).not.toThrow();
		});

		it("does not throw when called with an empty value", () => {
			expect(() => noopStorage.setItem("some-key", "")).not.toThrow();
		});
	});

	describe("removeItem", () => {
		it("does not throw when called with any key", () => {
			expect(() => noopStorage.removeItem("some-key")).not.toThrow();
		});

		it("does not throw when called with an empty key", () => {
			expect(() => noopStorage.removeItem("")).not.toThrow();
		});
	});
});
