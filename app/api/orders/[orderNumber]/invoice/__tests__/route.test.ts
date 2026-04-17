import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockGetOrder,
	mockGenerateInvoicePdf,
	mockPersistInvoiceNumber,
	mockGetSession,
	mockCheckRateLimit,
	mockGetRateLimitIdentifier,
} = vi.hoisted(() => ({
	mockGetOrder: vi.fn(),
	mockGenerateInvoicePdf: vi.fn(),
	mockPersistInvoiceNumber: vi.fn(),
	mockGetSession: vi.fn(),
	mockCheckRateLimit: vi.fn(),
	mockGetRateLimitIdentifier: vi.fn(),
}));

vi.mock("@/modules/orders/data/get-order", () => ({ getOrder: mockGetOrder }));
vi.mock("@/modules/orders/services/generate-invoice-pdf", () => ({
	generateInvoicePdf: mockGenerateInvoicePdf,
}));
vi.mock("@/modules/orders/services/persist-invoice-number.service", () => ({
	persistInvoiceNumber: mockPersistInvoiceNumber,
}));
vi.mock("@/modules/auth/lib/get-current-session", () => ({ getSession: mockGetSession }));
vi.mock("@/shared/lib/rate-limit", () => ({
	checkRateLimit: mockCheckRateLimit,
	getRateLimitIdentifier: mockGetRateLimitIdentifier,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ORDER_LIMITS: { INVOICE_DOWNLOAD: { limit: 5, windowMs: 60_000 } },
}));

import { GET } from "../route";

// ============================================================================
// Helpers
// ============================================================================

const ORDER_NUMBER = "SYN-2026-0001";

function makeReq() {
	return new Request(`https://example.com/api/orders/${ORDER_NUMBER}/invoice`);
}

function makeParams() {
	return { params: Promise.resolve({ orderNumber: ORDER_NUMBER }) };
}

const SESSION = { user: { id: "user-1", email: "u@example.com" } };

const PAID_ORDER = {
	id: "order-1",
	orderNumber: ORDER_NUMBER,
	userId: "user-1",
	paymentStatus: "PAID" as const,
	invoiceNumber: "INV-2026-0001",
	invoiceStatus: "GENERATED" as const,
	invoiceGeneratedAt: new Date("2026-04-01"),
};

// ============================================================================
// Tests
// ============================================================================

describe("GET /api/orders/[orderNumber]/invoice", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockGetSession.mockResolvedValue(SESSION);
		mockGetRateLimitIdentifier.mockReturnValue("user:user-1");
		mockCheckRateLimit.mockResolvedValue({ success: true });
		mockGetOrder.mockResolvedValue(PAID_ORDER);
		mockPersistInvoiceNumber.mockResolvedValue(null);
		mockGenerateInvoicePdf.mockReturnValue(Buffer.from("PDF-BYTES"));
	});

	describe("authentication", () => {
		it("returns 401 when no session", async () => {
			mockGetSession.mockResolvedValue(null);

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(401);
		});

		it("returns 401 when session has no user.id", async () => {
			mockGetSession.mockResolvedValue({ user: {} });

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(401);
		});
	});

	describe("rate limiting", () => {
		it("returns 429 when rate limit exceeded", async () => {
			mockCheckRateLimit.mockResolvedValue({ success: false, retryAfter: 42 });

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(429);
			expect(res.headers.get("Retry-After")).toBe("42");
		});

		it("falls back to Retry-After: 60 when retryAfter not provided", async () => {
			mockCheckRateLimit.mockResolvedValue({ success: false });

			const res = await GET(makeReq(), makeParams());

			expect(res.headers.get("Retry-After")).toBe("60");
		});

		it("uses session user id for rate-limit identifier", async () => {
			await GET(makeReq(), makeParams());

			expect(mockGetRateLimitIdentifier).toHaveBeenCalledWith("user-1");
		});
	});

	describe("order resolution", () => {
		it("returns 404 when order not found", async () => {
			mockGetOrder.mockResolvedValue(null);

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(404);
		});

		it("returns 403 when order belongs to a different user", async () => {
			mockGetOrder.mockResolvedValue({ ...PAID_ORDER, userId: "other-user" });

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(403);
		});

		it("returns 400 when order is not paid", async () => {
			mockGetOrder.mockResolvedValue({ ...PAID_ORDER, paymentStatus: "PENDING" });

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(400);
		});
	});

	describe("invoice generation", () => {
		it("returns PDF with correct Content-Type and Content-Disposition", async () => {
			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(200);
			expect(res.headers.get("Content-Type")).toBe("application/pdf");
			expect(res.headers.get("Content-Disposition")).toBe(
				`attachment; filename="facture-INV-2026-0001.pdf"`,
			);
		});

		it("falls back to orderNumber when no invoice number is set", async () => {
			mockGetOrder.mockResolvedValue({ ...PAID_ORDER, invoiceNumber: null });

			const res = await GET(makeReq(), makeParams());

			expect(res.headers.get("Content-Disposition")).toBe(
				`attachment; filename="facture-${ORDER_NUMBER}.pdf"`,
			);
		});

		it("persists a new invoice number on first download (no existing number)", async () => {
			mockGetOrder.mockResolvedValue({ ...PAID_ORDER, invoiceNumber: null });
			mockPersistInvoiceNumber.mockResolvedValue({
				invoiceNumber: "INV-2026-9999",
				invoiceGeneratedAt: new Date("2026-04-17"),
			});

			const res = await GET(makeReq(), makeParams());

			expect(mockPersistInvoiceNumber).toHaveBeenCalledWith("order-1", "user-1");
			expect(res.headers.get("Content-Disposition")).toBe(
				`attachment; filename="facture-INV-2026-9999.pdf"`,
			);
		});

		it("does NOT call persistInvoiceNumber if order already has one", async () => {
			await GET(makeReq(), makeParams());

			expect(mockPersistInvoiceNumber).not.toHaveBeenCalled();
		});

		it("sets Cache-Control: private, max-age=3600", async () => {
			const res = await GET(makeReq(), makeParams());

			expect(res.headers.get("Cache-Control")).toBe("private, max-age=3600");
		});

		it("calls generateInvoicePdf with the order", async () => {
			await GET(makeReq(), makeParams());

			expect(mockGenerateInvoicePdf).toHaveBeenCalledWith(PAID_ORDER);
		});
	});
});
