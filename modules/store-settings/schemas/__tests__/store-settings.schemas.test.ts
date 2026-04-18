import { describe, it, expect, vi, afterEach } from "vitest";

import {
	closeStoreSchema,
	updateClosureMessageSchema,
	updateReopensAtSchema,
} from "../store-settings.schemas";

// ============================================================================
// closeStoreSchema
// ============================================================================

describe("closeStoreSchema", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("accepts closure with non-empty message and no reopensAt", () => {
		const result = closeStoreSchema.safeParse({
			closureMessage: "Maintenance",
			reopensAt: "",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.reopensAt).toBeNull();
		}
	});

	it("accepts closure with future reopensAt", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-04-01T12:00:00Z"));
		const result = closeStoreSchema.safeParse({
			closureMessage: "Congés",
			reopensAt: "2030-01-01T10:00:00Z",
		});
		expect(result.success).toBe(true);
	});

	it("rejects empty closure message", () => {
		const result = closeStoreSchema.safeParse({
			closureMessage: "",
			reopensAt: "",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.path).toContain("closureMessage");
		}
	});

	it("rejects whitespace-only closure message", () => {
		const result = closeStoreSchema.safeParse({
			closureMessage: "   ",
			reopensAt: "",
		});
		expect(result.success).toBe(false);
	});

	it("rejects reopensAt in the past", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-04-01T12:00:00Z"));
		const result = closeStoreSchema.safeParse({
			closureMessage: "Test",
			reopensAt: "2026-03-01T10:00:00Z",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.path).toContain("reopensAt");
		}
	});

	it("rejects message exceeding 500 characters", () => {
		const result = closeStoreSchema.safeParse({
			closureMessage: "a".repeat(501),
			reopensAt: "",
		});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// updateClosureMessageSchema
// ============================================================================

describe("updateClosureMessageSchema", () => {
	it("accepts a valid message", () => {
		const result = updateClosureMessageSchema.safeParse({
			closureMessage: "Nouveau message",
		});
		expect(result.success).toBe(true);
	});

	it("trims surrounding whitespace", () => {
		const result = updateClosureMessageSchema.safeParse({
			closureMessage: "  Message  ",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.closureMessage).toBe("Message");
		}
	});

	it("rejects empty message", () => {
		const result = updateClosureMessageSchema.safeParse({
			closureMessage: "",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.path).toContain("closureMessage");
		}
	});

	it("rejects whitespace-only message", () => {
		const result = updateClosureMessageSchema.safeParse({
			closureMessage: "    ",
		});
		expect(result.success).toBe(false);
	});

	it("rejects message exceeding 500 characters", () => {
		const result = updateClosureMessageSchema.safeParse({
			closureMessage: "a".repeat(501),
		});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// updateReopensAtSchema
// ============================================================================

describe("updateReopensAtSchema", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("accepts empty string (transforms to null — disables auto-reopen)", () => {
		const result = updateReopensAtSchema.safeParse({ reopensAt: "" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.reopensAt).toBeNull();
		}
	});

	it("accepts future date string", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-04-01T12:00:00Z"));
		const result = updateReopensAtSchema.safeParse({
			reopensAt: "2030-01-01T10:00:00Z",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.reopensAt).toBeInstanceOf(Date);
		}
	});

	it("rejects past date", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-04-01T12:00:00Z"));
		const result = updateReopensAtSchema.safeParse({
			reopensAt: "2026-01-01T10:00:00Z",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.path).toContain("reopensAt");
		}
	});
});
