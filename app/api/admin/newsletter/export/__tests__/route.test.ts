import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockRequireAdminApiRoute, mockFindMany, mockLoggerError } = vi.hoisted(() => ({
	mockRequireAdminApiRoute: vi.fn(),
	mockFindMany: vi.fn(),
	mockLoggerError: vi.fn(),
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminApiRoute: mockRequireAdminApiRoute,
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		newsletterSubscriber: { findMany: mockFindMany },
	},
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: { error: mockLoggerError },
}));

import { GET } from "../route";

// ============================================================================
// Helpers
// ============================================================================

const SUBSCRIBERS = [
	{
		email: "alice@example.com",
		status: "CONFIRMED",
		subscribedAt: new Date("2026-01-10T10:00:00Z"),
		updatedAt: new Date("2026-02-10T10:00:00Z"),
	},
	{
		email: "bob+test@example.com",
		status: "PENDING",
		subscribedAt: new Date("2026-03-01T09:00:00Z"),
		updatedAt: new Date("2026-03-01T09:00:00Z"),
	},
];

// ============================================================================
// Tests
// ============================================================================

describe("GET /api/admin/newsletter/export", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRequireAdminApiRoute.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
		mockFindMany.mockResolvedValue(SUBSCRIBERS);
	});

	describe("authentication", () => {
		it("returns the unauthorized response when admin guard rejects", async () => {
			const unauthorized = new Response("Unauthorized", { status: 401 });
			mockRequireAdminApiRoute.mockResolvedValue({ response: unauthorized });

			const res = await GET();

			expect(res).toBe(unauthorized);
			expect(mockFindMany).not.toHaveBeenCalled();
		});
	});

	describe("query", () => {
		it("queries subscribers ordered by subscribedAt desc", async () => {
			await GET();

			expect(mockFindMany).toHaveBeenCalledWith(
				expect.objectContaining({
					orderBy: { subscribedAt: "desc" },
				}),
			);
		});

		it("selects only the 4 export fields", async () => {
			await GET();

			expect(mockFindMany).toHaveBeenCalledWith(
				expect.objectContaining({
					select: { email: true, status: true, subscribedAt: true, updatedAt: true },
				}),
			);
		});
	});

	describe("CSV response", () => {
		it("returns 200 with text/csv content type", async () => {
			const res = await GET();

			expect(res.status).toBe(200);
			expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
		});

		it("sets Content-Disposition with date-stamped filename", async () => {
			const res = await GET();

			expect(res.headers.get("Content-Disposition")).toMatch(
				/^attachment; filename="newsletter-abonnes-\d{4}-\d{2}-\d{2}\.csv"$/,
			);
		});

		it("starts CSV with UTF-8 BOM for Excel compatibility", async () => {
			const res = await GET();

			const buffer = await res.arrayBuffer();
			const bytes = new Uint8Array(buffer);
			// UTF-8 BOM is EF BB BF
			expect(bytes[0]).toBe(0xef);
			expect(bytes[1]).toBe(0xbb);
			expect(bytes[2]).toBe(0xbf);
		});

		it("includes header row", async () => {
			const res = await GET();
			const body = await res.text();

			expect(body).toContain("Email,Statut,Date inscription,Dernière mise à jour");
		});

		it("includes one row per subscriber, all fields quoted", async () => {
			const res = await GET();
			const body = await res.text();

			expect(body).toContain('"alice@example.com"');
			expect(body).toContain('"bob+test@example.com"');
			expect(body).toContain('"CONFIRMED"');
			expect(body).toContain('"PENDING"');
		});

		it("renders dates as ISO strings", async () => {
			const res = await GET();
			const body = await res.text();

			expect(body).toContain("2026-01-10T10:00:00.000Z");
			expect(body).toContain("2026-02-10T10:00:00.000Z");
		});

		it("escapes embedded double-quotes by doubling them", async () => {
			mockFindMany.mockResolvedValue([
				{
					email: 'with"quote@example.com',
					status: "CONFIRMED",
					subscribedAt: new Date("2026-01-01T00:00:00Z"),
					updatedAt: new Date("2026-01-01T00:00:00Z"),
				},
			]);

			const res = await GET();
			const body = await res.text();

			expect(body).toContain('"with""quote@example.com"');
		});

		it("returns header-only CSV when no subscribers", async () => {
			mockFindMany.mockResolvedValue([]);

			const res = await GET();
			const body = await res.text();

			expect(res.status).toBe(200);
			// Only BOM + header line
			expect(body.split("\n")).toHaveLength(1);
		});
	});

	describe("error handling", () => {
		it("returns 500 JSON when Prisma throws", async () => {
			mockFindMany.mockRejectedValue(new Error("DB down"));

			const res = await GET();

			expect(res.status).toBe(500);
			expect(res.headers.get("Content-Type")).toBe("application/json");
			const body = await res.json();
			expect(body.error).toMatch(/export/i);
		});

		it("logs the error with route context", async () => {
			mockFindMany.mockRejectedValue(new Error("DB down"));

			await GET();

			expect(mockLoggerError).toHaveBeenCalledWith(
				expect.stringContaining("Failed to export"),
				expect.any(Error),
				expect.objectContaining({ route: "admin-newsletter-export" }),
			);
		});
	});
});
