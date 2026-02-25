import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockQueryRawUnsafe } = vi.hoisted(() => ({
	mockQueryRawUnsafe: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		$queryRawUnsafe: mockQueryRawUnsafe,
	},
}));

import { GET } from "../route";

// ============================================================================
// Tests: GET /api/health
// ============================================================================

describe("GET /api/health", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("healthy database", () => {
		it("returns 200 with status ok when database is reachable", async () => {
			mockQueryRawUnsafe.mockResolvedValue([{ "?column?": 1 }]);

			const response = await GET();

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body).toEqual({ status: "ok" });
		});

		it("executes SELECT 1 to verify connectivity", async () => {
			mockQueryRawUnsafe.mockResolvedValue([{ "?column?": 1 }]);

			await GET();

			expect(mockQueryRawUnsafe).toHaveBeenCalledWith("SELECT 1");
		});

		it("calls the database exactly once", async () => {
			mockQueryRawUnsafe.mockResolvedValue([{ "?column?": 1 }]);

			await GET();

			expect(mockQueryRawUnsafe).toHaveBeenCalledOnce();
		});
	});

	describe("unreachable database", () => {
		it("returns 503 when database throws", async () => {
			mockQueryRawUnsafe.mockRejectedValue(new Error("Connection refused"));

			const response = await GET();

			expect(response.status).toBe(503);
		});

		it("returns error status and message when database is down", async () => {
			mockQueryRawUnsafe.mockRejectedValue(new Error("Connection refused"));

			const response = await GET();

			const body = await response.json();
			expect(body).toEqual({
				status: "error",
				message: "Database unreachable",
			});
		});

		it("handles non-Error exceptions", async () => {
			mockQueryRawUnsafe.mockRejectedValue("unexpected failure");

			const response = await GET();

			expect(response.status).toBe(503);
			const body = await response.json();
			expect(body.status).toBe("error");
		});

		it("handles timeout errors", async () => {
			mockQueryRawUnsafe.mockRejectedValue(new Error("Query timed out"));

			const response = await GET();

			expect(response.status).toBe(503);
		});
	});
});
