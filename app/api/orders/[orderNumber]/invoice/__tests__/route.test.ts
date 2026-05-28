import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockBuildInvoiceData,
	mockRenderInvoicePdf,
	mockPersistInvoiceNumber,
	mockArchiveInvoicePdf,
	mockGetSession,
	mockCheckRateLimit,
	mockGetRateLimitIdentifier,
	mockGetClientIp,
	mockHeaders,
	mockVerifyInvoiceAccessToken,
	mockCreateOrderAudit,
	mockIsAllowedMediaDomain,
	mockPrisma,
	mockSentry,
} = vi.hoisted(() => ({
	mockBuildInvoiceData: vi.fn(),
	mockRenderInvoicePdf: vi.fn(),
	mockPersistInvoiceNumber: vi.fn(),
	mockArchiveInvoicePdf: vi.fn(),
	mockGetSession: vi.fn(),
	mockCheckRateLimit: vi.fn(),
	mockGetRateLimitIdentifier: vi.fn(),
	mockGetClientIp: vi.fn(),
	mockHeaders: vi.fn(),
	mockVerifyInvoiceAccessToken: vi.fn(),
	mockCreateOrderAudit: vi.fn(),
	mockIsAllowedMediaDomain: vi.fn(),
	mockPrisma: {
		order: { findUnique: vi.fn(), findFirst: vi.fn() },
		user: { findUnique: vi.fn() },
	},
	mockSentry: {
		addBreadcrumb: vi.fn(),
		captureMessage: vi.fn(),
		captureException: vi.fn(),
		setTag: vi.fn(),
		setUser: vi.fn(),
		setContext: vi.fn(),
		setExtra: vi.fn(),
		withScope: vi.fn(
			(
				cb: (scope: {
					setTag: () => void;
					setFingerprint: () => void;
					setLevel: () => void;
				}) => void,
			) => cb({ setTag: vi.fn(), setFingerprint: vi.fn(), setLevel: vi.fn() }),
		),
	},
}));

vi.mock("next/headers", () => ({ headers: mockHeaders }));
vi.mock("@sentry/nextjs", () => mockSentry);
vi.mock("@/modules/invoices/services/build-invoice-data", () => ({
	buildInvoiceData: mockBuildInvoiceData,
}));
vi.mock("@/modules/invoices/services/render-invoice-pdf", () => ({
	renderInvoicePdf: mockRenderInvoicePdf,
}));
vi.mock("@/modules/orders/services/persist-invoice-number.service", () => ({
	persistInvoiceNumber: mockPersistInvoiceNumber,
}));
vi.mock("@/modules/orders/services/archive-invoice-pdf.service", () => ({
	archiveInvoicePdf: mockArchiveInvoicePdf,
}));
vi.mock("@/modules/orders/utils/invoice-token", () => ({
	verifyInvoiceAccessToken: mockVerifyInvoiceAccessToken,
}));
vi.mock("@/modules/orders/utils/order-audit", () => ({
	createOrderAudit: mockCreateOrderAudit,
}));
vi.mock("@/modules/orders/constants/order.constants", () => ({
	GET_ORDER_SELECT_CUSTOMER: { id: true },
}));
vi.mock("@/modules/auth/lib/get-current-session", () => ({ getSession: mockGetSession }));
vi.mock("@/shared/lib/rate-limit", () => ({
	checkRateLimit: mockCheckRateLimit,
	getRateLimitIdentifier: mockGetRateLimitIdentifier,
	getClientIp: mockGetClientIp,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ORDER_LIMITS: {
		INVOICE_DOWNLOAD: { limit: 10, windowMs: 60 * 60_000 },
		ADMIN_INVOICE_DOWNLOAD: { limit: 200, windowMs: 60 * 60_000 },
	},
}));
vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));
vi.mock("@/shared/lib/logger", () => ({
	logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/shared/lib/media-validation", () => ({
	isAllowedMediaDomain: mockIsAllowedMediaDomain,
}));
vi.mock("@/app/generated/prisma/client", () => ({
	OrderAction: { INVOICE_DOWNLOADED: "INVOICE_DOWNLOADED" },
	HistorySource: { ADMIN: "ADMIN", CUSTOMER: "CUSTOMER", SYSTEM: "SYSTEM" },
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

const SESSION = { user: { id: "user-1", email: "u@example.com", role: "USER" } };
const ADMIN_SESSION = {
	user: { id: "admin-1", email: "admin@example.com", role: "ADMIN" },
};

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
		mockGetClientIp.mockResolvedValue("127.0.0.1");
		mockHeaders.mockResolvedValue(new Headers());
		mockVerifyInvoiceAccessToken.mockReturnValue(false);
		mockIsAllowedMediaDomain.mockReturnValue(true);
		mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 999 });
		mockPrisma.order.findFirst.mockResolvedValue(PAID_ORDER);
		mockPrisma.order.findUnique.mockResolvedValue({
			invoicePdfUrl: null,
			invoicePdfHash: null,
		});
		mockPrisma.user.findUnique.mockResolvedValue({ role: "ADMIN" });
		mockPersistInvoiceNumber.mockResolvedValue(null);
		mockBuildInvoiceData.mockReturnValue({});
		mockRenderInvoicePdf.mockReturnValue(new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer);
		mockArchiveInvoicePdf.mockResolvedValue({
			invoicePdfUrl: "https://utfs.io/f/inv-1.pdf",
			invoicePdfHash: "a".repeat(64),
		});
		mockCreateOrderAudit.mockResolvedValue(undefined);
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
			mockPrisma.order.findFirst.mockResolvedValue(null);

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(404);
		});

		it("returns 403 when order belongs to a different user", async () => {
			mockPrisma.order.findFirst.mockResolvedValue({ ...PAID_ORDER, userId: "other-user" });

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(403);
		});

		it("returns 400 when order is not paid", async () => {
			mockPrisma.order.findFirst.mockResolvedValue({ ...PAID_ORDER, paymentStatus: "PENDING" });

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
			mockPrisma.order.findFirst.mockResolvedValue({ ...PAID_ORDER, invoiceNumber: null });

			const res = await GET(makeReq(), makeParams());

			expect(res.headers.get("Content-Disposition")).toBe(
				`attachment; filename="facture-${ORDER_NUMBER}.pdf"`,
			);
		});

		it("persists a new invoice number on first download (no existing number)", async () => {
			mockPrisma.order.findFirst.mockResolvedValue({ ...PAID_ORDER, invoiceNumber: null });
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

		it("sets Cache-Control: private, max-age=31536000, immutable (facture figée Art. L102 B)", async () => {
			const res = await GET(makeReq(), makeParams());

			expect(res.headers.get("Cache-Control")).toBe("private, max-age=31536000, immutable");
		});

		it("calls buildInvoiceData with the order and pipes the result to renderInvoicePdf", async () => {
			await GET(makeReq(), makeParams());

			expect(mockBuildInvoiceData).toHaveBeenCalledWith(PAID_ORDER);
			expect(mockRenderInvoicePdf).toHaveBeenCalledWith(
				mockBuildInvoiceData.mock.results[0]?.value,
			);
		});
	});

	/**
	 * @regression ORD-COMPLY-005 (audit conformité 2026-05-27)
	 * Verrouille le service archivé du PDF (Art. L102 B LPF — facture immuable).
	 */
	describe("archived PDF serving", () => {
		it("calls archiveInvoicePdf after regeneration when no archive exists", async () => {
			mockPrisma.order.findUnique.mockResolvedValue({ invoicePdfUrl: null });

			await GET(makeReq(), makeParams());

			expect(mockRenderInvoicePdf).toHaveBeenCalled();
			expect(mockArchiveInvoicePdf).toHaveBeenCalledWith(
				"order-1",
				"INV-2026-0001",
				expect.anything(),
			);
		});

		it("streams archived PDF from UploadThing when invoicePdfUrl is set (no regeneration)", async () => {
			mockPrisma.order.findUnique.mockResolvedValue({
				invoicePdfUrl: "https://ufs.example/archived.pdf",
			});
			const fetchSpy = vi
				.spyOn(globalThis, "fetch")
				.mockResolvedValue(new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), { status: 200 }));

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(200);
			expect(fetchSpy).toHaveBeenCalledWith(
				"https://ufs.example/archived.pdf",
				expect.objectContaining({ cache: "no-store" }),
			);
			expect(mockRenderInvoicePdf).not.toHaveBeenCalled();
			expect(mockArchiveInvoicePdf).not.toHaveBeenCalled();

			fetchSpy.mockRestore();
		});

		it("falls back to regeneration when archive fetch fails (non-blocking)", async () => {
			mockPrisma.order.findUnique.mockResolvedValue({
				invoicePdfUrl: "https://ufs.example/archived.pdf",
			});
			const fetchSpy = vi
				.spyOn(globalThis, "fetch")
				.mockResolvedValue(new Response("not found", { status: 404 }));

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(200);
			expect(mockRenderInvoicePdf).toHaveBeenCalled();

			fetchSpy.mockRestore();
		});
	});

	/**
	 * @regression invoice-admin-bypass-2026-05-27
	 *
	 * Un admin doit pouvoir télécharger n'importe quelle facture pour audit
	 * fiscal/service client. EINV-SEC-004 : depuis 2026-05-28, admin n'est plus
	 * bypassé du rate-limit (quota large ADMIN_INVOICE_DOWNLOAD pour bloquer
	 * exfiltration interne). Ownership check reste bypassée pour l'audit.
	 */
	describe("admin behavior", () => {
		it("enforces rate-limit when session role is ADMIN (cap large, anti-exfiltration)", async () => {
			mockGetSession.mockResolvedValue(ADMIN_SESSION);

			await GET(makeReq(), makeParams());

			expect(mockCheckRateLimit).toHaveBeenCalled();
		});

		it("still enforces rate-limit when session role is USER", async () => {
			await GET(makeReq(), makeParams());

			expect(mockCheckRateLimit).toHaveBeenCalled();
		});

		it("allows admin to download an invoice owned by a different user (audit)", async () => {
			mockGetSession.mockResolvedValue(ADMIN_SESSION);
			mockPrisma.order.findFirst.mockResolvedValue({ ...PAID_ORDER, userId: "other-user" });

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(200);
		});

		it("non-admin still blocked by ownership check", async () => {
			mockPrisma.order.findFirst.mockResolvedValue({ ...PAID_ORDER, userId: "other-user" });

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(403);
		});
	});

	/**
	 * @regression invoice-pdf-hash-divergence-2026-05-28
	 *
	 * EINV-PDF-002 / EINV-PDF-004 / EINV-PDF-005 — audit comptable-tech.
	 * Le service est tenu à la restitution à l'identique (Art. L102 B LPF) :
	 * si une archive existe, on ne sert JAMAIS un PDF régénéré dont le SHA-256
	 * diverge du hash stocké. Plutôt 503 + Retry-After que servir non conforme.
	 */
	describe("intégrité du PDF servi (Art. L102 B LPF)", () => {
		it("retourne 503 si le hash du PDF régénéré diverge de l'archive (EINV-PDF-002)", async () => {
			// Archive existe avec un hash connu, mais le fetch UploadThing échoue
			// → on retombe sur la régénération. Hash regen ne matchera pas → 503.
			mockPrisma.order.findUnique.mockResolvedValue({
				invoicePdfUrl: "https://utfs.io/f/inv-1.pdf",
				invoicePdfHash: "deadbeef".repeat(8),
			});
			const fetchSpy = vi
				.spyOn(globalThis, "fetch")
				.mockResolvedValue(new Response("server error", { status: 500 }));

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(503);
			expect(res.headers.get("Retry-After")).toBe("60");
			fetchSpy.mockRestore();
		});

		it("refuse fetch et retourne 500 si invoicePdfUrl est hors whitelist UploadThing (EINV-PDF-005)", async () => {
			mockPrisma.order.findUnique.mockResolvedValue({
				invoicePdfUrl: "http://169.254.169.254/metadata", // SSRF tentative
				invoicePdfHash: "a".repeat(64),
			});
			mockIsAllowedMediaDomain.mockReturnValueOnce(false);
			const fetchSpy = vi.spyOn(globalThis, "fetch");

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(500);
			expect(fetchSpy).not.toHaveBeenCalled();
			fetchSpy.mockRestore();
		});

		it("applique AbortSignal.timeout sur le fetch UploadThing (EINV-PDF-004)", async () => {
			mockPrisma.order.findUnique.mockResolvedValue({
				invoicePdfUrl: "https://utfs.io/f/inv-1.pdf",
				invoicePdfHash: null,
			});
			const fetchSpy = vi
				.spyOn(globalThis, "fetch")
				.mockResolvedValue(new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), { status: 200 }));

			await GET(makeReq(), makeParams());

			expect(fetchSpy).toHaveBeenCalledWith(
				"https://utfs.io/f/inv-1.pdf",
				expect.objectContaining({
					cache: "no-store",
					signal: expect.any(AbortSignal),
				}),
			);
			fetchSpy.mockRestore();
		});
	});
});
