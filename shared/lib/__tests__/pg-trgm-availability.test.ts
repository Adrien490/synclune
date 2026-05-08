import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockQueryRaw, mockLogger } = vi.hoisted(() => ({
	mockQueryRaw: vi.fn(),
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("server-only", () => ({}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: { $queryRaw: mockQueryRaw },
}));

vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));

import { isPgTrgmAvailable, resetPgTrgmAvailabilityCache } from "../pg-trgm-availability";

describe("isPgTrgmAvailable", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetPgTrgmAvailabilityCache();
	});

	it("returns true when the extension row is present", async () => {
		mockQueryRaw.mockResolvedValue([{ extname: "pg_trgm" }]);

		await expect(isPgTrgmAvailable()).resolves.toBe(true);
		expect(mockLogger.warn).not.toHaveBeenCalled();
	});

	it("returns false and logs a warning when the extension is missing", async () => {
		mockQueryRaw.mockResolvedValue([]);

		await expect(isPgTrgmAvailable()).resolves.toBe(false);
		expect(mockLogger.warn).toHaveBeenCalledWith(
			"Extension pg_trgm non installée - recherche fuzzy désactivée",
			{ service: "pg-trgm-availability" },
		);
	});

	it("returns false and logs an error when the query throws", async () => {
		mockQueryRaw.mockRejectedValue(new Error("connection refused"));

		await expect(isPgTrgmAvailable()).resolves.toBe(false);
		expect(mockLogger.error).toHaveBeenCalledWith(
			"Erreur vérification pg_trgm",
			expect.any(Error),
			{ service: "pg-trgm-availability" },
		);
	});

	it("caches the result across calls", async () => {
		mockQueryRaw.mockResolvedValue([{ extname: "pg_trgm" }]);

		await isPgTrgmAvailable();
		await isPgTrgmAvailable();
		await isPgTrgmAvailable();

		expect(mockQueryRaw).toHaveBeenCalledTimes(1);
	});

	it("re-runs the check after resetPgTrgmAvailabilityCache", async () => {
		mockQueryRaw.mockResolvedValue([{ extname: "pg_trgm" }]);

		await isPgTrgmAvailable();
		expect(mockQueryRaw).toHaveBeenCalledTimes(1);

		resetPgTrgmAvailabilityCache();
		await isPgTrgmAvailable();

		expect(mockQueryRaw).toHaveBeenCalledTimes(2);
	});

	it("returns the same Promise instance for concurrent callers", async () => {
		let resolveQuery: ((value: unknown) => void) | undefined;
		mockQueryRaw.mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveQuery = resolve;
				}),
		);

		const p1 = isPgTrgmAvailable();
		const p2 = isPgTrgmAvailable();

		expect(mockQueryRaw).toHaveBeenCalledTimes(1);

		resolveQuery?.([{ extname: "pg_trgm" }]);
		await expect(p1).resolves.toBe(true);
		await expect(p2).resolves.toBe(true);
	});
});
