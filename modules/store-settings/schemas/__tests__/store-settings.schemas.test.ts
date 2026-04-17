import { describe, it, expect, vi, afterEach } from "vitest";

import {
	toggleStoreClosureSchema,
	closeStoreSchema,
	updateClosureMessageSchema,
	updateReopensAtSchema,
	scheduleClosureSchema,
} from "../store-settings.schemas";

describe("toggleStoreClosureSchema", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	// ─── Valid inputs ─────────────────────────────────────────────────────

	it("accepts reopening without message", () => {
		const result = toggleStoreClosureSchema.safeParse({
			isClosed: false,
			closureMessage: "",
			reopensAt: "",
		});
		expect(result.success).toBe(true);
	});

	it("accepts closure with message and no reopensAt", () => {
		const result = toggleStoreClosureSchema.safeParse({
			isClosed: true,
			closureMessage: "Maintenance en cours",
			reopensAt: "",
		});
		expect(result.success).toBe(true);
	});

	it("accepts closure with message and future reopensAt", () => {
		const future = new Date(Date.now() + 86_400_000).toISOString();
		const result = toggleStoreClosureSchema.safeParse({
			isClosed: true,
			closureMessage: "Vacances",
			reopensAt: future,
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.reopensAt).toBeInstanceOf(Date);
		}
	});

	it("transforms empty reopensAt to null", () => {
		const result = toggleStoreClosureSchema.safeParse({
			isClosed: true,
			closureMessage: "Maintenance",
			reopensAt: "",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.reopensAt).toBeNull();
		}
	});

	// ─── Closure message required ─────────────────────────────────────────

	it("rejects closure without message", () => {
		const result = toggleStoreClosureSchema.safeParse({
			isClosed: true,
			closureMessage: "",
			reopensAt: "",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.path).toContain("closureMessage");
			expect(result.error.issues[0]?.message).toBe("Un message de fermeture est requis");
		}
	});

	// ─── Past date validation ─────────────────────────────────────────────

	it("rejects closure with past reopensAt date", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-03-14T12:00:00Z"));

		const pastDate = "2026-03-13T10:00:00Z";
		const result = toggleStoreClosureSchema.safeParse({
			isClosed: true,
			closureMessage: "Maintenance",
			reopensAt: pastDate,
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.path).toContain("reopensAt");
			expect(result.error.issues[0]?.message).toBe(
				"La date de réouverture doit être dans le futur",
			);
		}
	});

	it("allows past reopensAt when reopening (isClosed: false)", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-03-14T12:00:00Z"));

		const pastDate = "2026-03-13T10:00:00Z";
		const result = toggleStoreClosureSchema.safeParse({
			isClosed: false,
			closureMessage: "",
			reopensAt: pastDate,
		});

		expect(result.success).toBe(true);
	});

	// ─── Message length ───────────────────────────────────────────────────

	it("rejects message exceeding 500 characters", () => {
		const result = toggleStoreClosureSchema.safeParse({
			isClosed: true,
			closureMessage: "a".repeat(501),
			reopensAt: "",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.path).toContain("closureMessage");
		}
	});
});

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

// ============================================================================
// scheduleClosureSchema
// ============================================================================

describe("scheduleClosureSchema", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("accepts future scheduledCloseAt with valid message and later reopensAt", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-04-01T12:00:00Z"));
		const result = scheduleClosureSchema.safeParse({
			scheduledCloseAt: "2026-07-01T10:00:00Z",
			closureMessage: "Vacances",
			reopensAt: "2026-08-01T10:00:00Z",
		});
		expect(result.success).toBe(true);
	});

	it("accepts scheduledCloseAt without reopensAt (indefinite closure)", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-04-01T12:00:00Z"));
		const result = scheduleClosureSchema.safeParse({
			scheduledCloseAt: "2026-07-01T10:00:00Z",
			closureMessage: "Vacances",
			reopensAt: "",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.reopensAt).toBeNull();
		}
	});

	it("rejects missing scheduledCloseAt", () => {
		const result = scheduleClosureSchema.safeParse({
			scheduledCloseAt: "",
			closureMessage: "Test",
			reopensAt: "",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.path).toContain("scheduledCloseAt");
		}
	});

	it("rejects scheduledCloseAt in the past", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-04-01T12:00:00Z"));
		const result = scheduleClosureSchema.safeParse({
			scheduledCloseAt: "2026-01-01T10:00:00Z",
			closureMessage: "Test",
			reopensAt: "",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.path).toContain("scheduledCloseAt");
		}
	});

	it("rejects reopensAt equal to scheduledCloseAt", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-04-01T12:00:00Z"));
		const sameDate = "2026-07-01T10:00:00Z";
		const result = scheduleClosureSchema.safeParse({
			scheduledCloseAt: sameDate,
			closureMessage: "Test",
			reopensAt: sameDate,
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.path).toContain("reopensAt");
		}
	});

	it("rejects reopensAt before scheduledCloseAt", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-04-01T12:00:00Z"));
		const result = scheduleClosureSchema.safeParse({
			scheduledCloseAt: "2026-08-01T10:00:00Z",
			closureMessage: "Test",
			reopensAt: "2026-07-01T10:00:00Z",
		});
		expect(result.success).toBe(false);
	});

	it("rejects empty closure message", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-04-01T12:00:00Z"));
		const result = scheduleClosureSchema.safeParse({
			scheduledCloseAt: "2026-07-01T10:00:00Z",
			closureMessage: "",
			reopensAt: "",
		});
		expect(result.success).toBe(false);
	});

	it("rejects message exceeding 500 characters", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-04-01T12:00:00Z"));
		const result = scheduleClosureSchema.safeParse({
			scheduledCloseAt: "2026-07-01T10:00:00Z",
			closureMessage: "a".repeat(501),
			reopensAt: "",
		});
		expect(result.success).toBe(false);
	});
});
