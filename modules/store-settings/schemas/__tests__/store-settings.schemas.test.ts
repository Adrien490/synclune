import { describe, it, expect, vi, afterEach } from "vitest";

import { toggleStoreClosureSchema } from "../store-settings.schemas";

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
