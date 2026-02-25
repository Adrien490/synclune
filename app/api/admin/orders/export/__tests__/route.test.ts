import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockGetSession,
	mockPrisma,
	mockBuildExportWhereClause,
	mockGenerateOrdersCsv,
} = vi.hoisted(() => ({
	mockGetSession: vi.fn(),
	mockPrisma: {
		order: {
			findMany: vi.fn(),
		},
	},
	mockBuildExportWhereClause: vi.fn(),
	mockGenerateOrdersCsv: vi.fn(),
}));

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/modules/orders/services/export-orders-csv.service", () => ({
	buildExportWhereClause: mockBuildExportWhereClause,
	generateOrdersCsv: mockGenerateOrdersCsv,
}));

import { GET } from "../route";

// ============================================================================
// Helpers
// ============================================================================

function makeAdminSession() {
	return {
		user: { id: "admin-1", role: "ADMIN", email: "admin@synclune.fr" },
	};
}

function makeUserSession() {
	return {
		user: { id: "user-1", role: "USER", email: "user@synclune.fr" },
	};
}

function makeRequest(params: Record<string, string> = {}) {
	const url = new URL("http://localhost:3000/api/admin/orders/export");
	for (const [key, value] of Object.entries(params)) {
		url.searchParams.set(key, value);
	}
	return new Request(url.toString());
}

const SAMPLE_ORDERS = [
	{
		orderNumber: "SYN-001",
		invoiceNumber: "INV-001",
		createdAt: new Date("2026-01-15"),
		paidAt: new Date("2026-01-15"),
		customerName: "Marie Dupont",
		customerEmail: "marie@example.com",
		subtotal: 5000,
		discountAmount: 0,
		shippingCost: 500,
		total: 5500,
		paymentMethod: "card",
		paymentStatus: "PAID",
		status: "DELIVERED",
	},
];

// ============================================================================
// Tests: GET /api/admin/orders/export
// ============================================================================

describe("GET /api/admin/orders/export", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetSession.mockResolvedValue(makeAdminSession());
		mockBuildExportWhereClause.mockReturnValue({ paymentStatus: "PAID" });
		mockPrisma.order.findMany.mockResolvedValue(SAMPLE_ORDERS);
		mockGenerateOrdersCsv.mockReturnValue("CSV_CONTENT");
	});

	// ========================================================================
	// Authorization
	// ========================================================================

	describe("authorization", () => {
		it("returns 403 when no session exists", async () => {
			mockGetSession.mockResolvedValue(null);

			const response = await GET(makeRequest({ periodType: "all" }));

			expect(response.status).toBe(403);
		});

		it("returns 403 for non-admin user", async () => {
			mockGetSession.mockResolvedValue(makeUserSession());

			const response = await GET(makeRequest({ periodType: "all" }));

			expect(response.status).toBe(403);
		});

		it("returns 403 when session user has no id", async () => {
			mockGetSession.mockResolvedValue({ user: { role: "ADMIN" } });

			const response = await GET(makeRequest({ periodType: "all" }));

			expect(response.status).toBe(403);
		});

		it("does not query database when unauthorized", async () => {
			mockGetSession.mockResolvedValue(null);

			await GET(makeRequest({ periodType: "all" }));

			expect(mockPrisma.order.findMany).not.toHaveBeenCalled();
		});
	});

	// ========================================================================
	// Validation
	// ========================================================================

	describe("validation", () => {
		it("defaults to periodType 'all' when omitted", async () => {
			const response = await GET(makeRequest());

			expect(response.status).toBe(200);
		});

		it("returns 400 for year period without year param", async () => {
			const response = await GET(makeRequest({ periodType: "year" }));

			expect(response.status).toBe(400);
		});

		it("returns 400 for month period without year/month params", async () => {
			const response = await GET(makeRequest({ periodType: "month" }));

			expect(response.status).toBe(400);
		});

		it("returns 400 for custom period without dates", async () => {
			const response = await GET(makeRequest({ periodType: "custom" }));

			expect(response.status).toBe(400);
		});
	});

	// ========================================================================
	// Successful export
	// ========================================================================

	describe("successful export", () => {
		it("returns CSV content with correct content-type", async () => {
			const response = await GET(makeRequest({ periodType: "all" }));

			expect(response.status).toBe(200);
			expect(response.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
		});

		it("returns CSV with attachment disposition and dated filename", async () => {
			const response = await GET(makeRequest({ periodType: "all" }));

			const disposition = response.headers.get("Content-Disposition");
			expect(disposition).toMatch(/attachment; filename="livre-recettes-\d{4}-\d{2}-\d{2}\.csv"/);
		});

		it("returns the CSV generated by generateOrdersCsv", async () => {
			mockGenerateOrdersCsv.mockReturnValue("col1;col2\nval1;val2");

			const response = await GET(makeRequest({ periodType: "all" }));

			const body = await response.text();
			expect(body).toBe("col1;col2\nval1;val2");
		});

		it("calls buildExportWhereClause with parsed input", async () => {
			await GET(makeRequest({ periodType: "all" }));

			expect(mockBuildExportWhereClause).toHaveBeenCalledWith(
				expect.objectContaining({ periodType: "all" })
			);
		});

		it("queries orders sorted by paidAt ascending", async () => {
			await GET(makeRequest({ periodType: "all" }));

			expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					orderBy: { paidAt: "asc" },
				})
			);
		});

		it("passes orders to generateOrdersCsv", async () => {
			await GET(makeRequest({ periodType: "all" }));

			expect(mockGenerateOrdersCsv).toHaveBeenCalledWith(SAMPLE_ORDERS);
		});

		it("works with year period type", async () => {
			const response = await GET(makeRequest({ periodType: "year", year: "2026" }));

			expect(response.status).toBe(200);
		});

		it("works with month period type", async () => {
			const response = await GET(
				makeRequest({ periodType: "month", year: "2026", month: "1" })
			);

			expect(response.status).toBe(200);
		});

		it("works with custom period type", async () => {
			const response = await GET(
				makeRequest({
					periodType: "custom",
					dateFrom: "2026-01-01",
					dateTo: "2026-01-31",
				})
			);

			expect(response.status).toBe(200);
		});
	});

	// ========================================================================
	// Error handling
	// ========================================================================

	describe("error handling", () => {
		it("returns 500 when database query fails", async () => {
			mockPrisma.order.findMany.mockRejectedValue(new Error("DB timeout"));

			const response = await GET(makeRequest({ periodType: "all" }));

			expect(response.status).toBe(500);
		});

		it("returns error JSON when database fails", async () => {
			mockPrisma.order.findMany.mockRejectedValue(new Error("DB error"));

			const response = await GET(makeRequest({ periodType: "all" }));

			const body = await response.json();
			expect(body).toEqual({ error: "Erreur lors de l'export" });
		});

		it("returns 500 when CSV generation throws", async () => {
			mockGenerateOrdersCsv.mockImplementation(() => {
				throw new Error("CSV generation failed");
			});

			const response = await GET(makeRequest({ periodType: "all" }));

			expect(response.status).toBe(500);
		});
	});
});
