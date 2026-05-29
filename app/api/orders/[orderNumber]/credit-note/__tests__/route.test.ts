import { createHash } from "node:crypto";
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockBuildInvoiceData,
	mockRenderInvoicePdf,
	mockArchiveCreditNotePdf,
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
	mockArchiveCreditNotePdf: vi.fn(),
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
		orderHistory: { findFirst: vi.fn() },
		// EINV-SEC-001 : la route re-vérifie le rôle admin en DB.
		user: { findUnique: vi.fn() },
	},
	mockSentry: {
		addBreadcrumb: vi.fn(),
		captureMessage: vi.fn(),
		captureException: vi.fn(),
		setTag: vi.fn(),
		withScope: vi.fn(),
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
vi.mock("@/modules/orders/services/archive-credit-note-pdf.service", () => ({
	archiveCreditNotePdf: mockArchiveCreditNotePdf,
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
	OrderAction: {
		INVOICE_DOWNLOADED: "INVOICE_DOWNLOADED",
		INVOICE_VOIDED: "INVOICE_VOIDED",
	},
	HistorySource: { ADMIN: "ADMIN", CUSTOMER: "CUSTOMER", SYSTEM: "SYSTEM" },
}));

import { GET } from "../route";

const ORDER_NUMBER = "SYN-2026-0001";

// Octets PDF par défaut renvoyés par `mockRenderInvoicePdf` + leur SHA-256, pour
// piloter les chemins de vérification d'intégrité (EINV-PDF-006) de façon déterministe.
const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
const PDF_HASH = createHash("sha256").update(PDF_BYTES).digest("hex");

function makeReq() {
	return new Request(`https://example.com/api/orders/${ORDER_NUMBER}/credit-note`);
}

function makeParams() {
	return { params: Promise.resolve({ orderNumber: ORDER_NUMBER }) };
}

const SESSION = { user: { id: "user-1", email: "u@example.com", role: "USER" } };
const ADMIN_SESSION = {
	user: { id: "admin-1", email: "admin@example.com", role: "ADMIN" },
};

const VOIDED_ORDER = {
	id: "order-1",
	orderNumber: ORDER_NUMBER,
	userId: "user-1",
	paymentStatus: "PAID" as const,
	invoiceNumber: "F-2026-00042",
	invoiceStatus: "VOIDED" as const,
	invoiceGeneratedAt: new Date("2026-04-01"),
	invoiceVoidedAt: new Date("2026-04-15"),
	creditNoteNumber: "A-2026-00007",
	creditNoteGeneratedAt: new Date("2026-04-15"),
};

/**
 * @regression credit-note-route-2026-05-28
 *
 * Verrouille le téléchargement sécurisé du PDF avoir (Art. 272-I CGI / L102 B LPF) :
 *  - 401 si ni session ni token ; 404 indistinct si non autorisé (EINV-SEC-003)
 *  - 404 si `creditNoteNumber` ou `invoiceNumber` absent (pas de lazy émission)
 *  - rate-limit partagé avec /invoice (même profil CPU)
 *  - intégrité SHA-256 sur archive (refuse 503 si divergence)
 *  - archive UploadThing best-effort lazy au 1er download
 */
describe("GET /api/orders/[orderNumber]/credit-note", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockGetSession.mockResolvedValue(SESSION);
		mockGetRateLimitIdentifier.mockReturnValue("user:user-1");
		mockGetClientIp.mockResolvedValue("127.0.0.1");
		mockHeaders.mockResolvedValue(new Headers());
		mockVerifyInvoiceAccessToken.mockReturnValue(false);
		mockIsAllowedMediaDomain.mockReturnValue(true);
		mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 999 });
		mockPrisma.order.findFirst.mockResolvedValue(VOIDED_ORDER);
		mockPrisma.order.findUnique.mockResolvedValue({
			creditNotePdfUrl: null,
			creditNotePdfHash: null,
		});
		mockPrisma.orderHistory.findFirst.mockResolvedValue({ note: "Remboursement total" });
		// EINV-SEC-001 : par défaut la DB confirme le rôle (les tests ADMIN_SESSION
		// passent par cette re-vérification).
		mockPrisma.user.findUnique.mockResolvedValue({ role: "ADMIN" });
		mockBuildInvoiceData.mockReturnValue({});
		mockRenderInvoicePdf.mockReturnValue(new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer);
		mockArchiveCreditNotePdf.mockResolvedValue({
			creditNotePdfUrl: "https://utfs.io/f/cn-1.pdf",
			creditNotePdfHash: "a".repeat(64),
		});
		mockCreateOrderAudit.mockResolvedValue(undefined);
	});

	describe("authentication", () => {
		it("returns 401 when no session and no token", async () => {
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

		it("returns 404 when order belongs to a different user (EINV-SEC-003 anti-enumeration)", async () => {
			mockPrisma.order.findFirst.mockResolvedValue({ ...VOIDED_ORDER, userId: "other-user" });

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(404);
		});

		it("returns 404 when creditNoteNumber is null (no credit note issued yet)", async () => {
			mockPrisma.order.findFirst.mockResolvedValue({
				...VOIDED_ORDER,
				creditNoteNumber: null,
			});

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(404);
			expect(mockRenderInvoicePdf).not.toHaveBeenCalled();
		});

		it("returns 404 when invoiceNumber is null (cannot reference a preceding invoice)", async () => {
			mockPrisma.order.findFirst.mockResolvedValue({
				...VOIDED_ORDER,
				invoiceNumber: null,
			});

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(404);
		});
	});

	describe("credit note generation", () => {
		it("returns PDF with correct Content-Type and Content-Disposition", async () => {
			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(200);
			expect(res.headers.get("Content-Type")).toBe("application/pdf");
			expect(res.headers.get("Content-Disposition")).toBe(
				`attachment; filename="avoir-A-2026-00007.pdf"`,
			);
		});

		it("sets Cache-Control: private, max-age=31536000, immutable (avoir figé Art. L102 B)", async () => {
			const res = await GET(makeReq(), makeParams());

			expect(res.headers.get("Cache-Control")).toBe("private, max-age=31536000, immutable");
		});

		it("calls buildInvoiceData with order rewired (invoiceNumber=creditNoteNumber) + precedingInvoice", async () => {
			await GET(makeReq(), makeParams());

			expect(mockBuildInvoiceData).toHaveBeenCalledWith(
				expect.objectContaining({
					invoiceNumber: "A-2026-00007",
					invoiceGeneratedAt: VOIDED_ORDER.creditNoteGeneratedAt,
				}),
				expect.objectContaining({
					precedingInvoice: expect.objectContaining({
						invoiceNumber: "F-2026-00042",
						reason: "Remboursement total",
					}),
				}),
			);
			expect(mockRenderInvoicePdf).toHaveBeenCalled();
		});

		it("falls back to 'Avoir comptable' when no OrderHistory INVOICE_VOIDED note is found", async () => {
			mockPrisma.orderHistory.findFirst.mockResolvedValue(null);

			await GET(makeReq(), makeParams());

			expect(mockBuildInvoiceData).toHaveBeenCalledWith(
				expect.any(Object),
				expect.objectContaining({
					precedingInvoice: expect.objectContaining({ reason: "Avoir comptable" }),
				}),
			);
		});

		it("calls archiveCreditNotePdf after regeneration when no archive exists", async () => {
			await GET(makeReq(), makeParams());

			expect(mockArchiveCreditNotePdf).toHaveBeenCalledWith(
				"order-1",
				"A-2026-00007",
				expect.anything(),
			);
		});
	});

	/**
	 * @regression credit-note-serves-archive-first
	 * Archive présente ⇒ servie en priorité (Art. L102 B LPF), jamais de régénération.
	 */
	describe("archived PDF serving", () => {
		it("streams archived PDF from UploadThing when creditNotePdfUrl is set (no regeneration)", async () => {
			mockPrisma.order.findUnique.mockResolvedValue({
				creditNotePdfUrl: "https://ufs.example/archived-cn.pdf",
				// Hash concordant avec les octets servis : la vérification d'intégrité
				// EINV-PDF-006 passe et l'archive est servie sans régénération.
				creditNotePdfHash: PDF_HASH,
			});
			const fetchSpy = vi
				.spyOn(globalThis, "fetch")
				.mockResolvedValue(new Response(PDF_BYTES, { status: 200 }));

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(200);
			expect(fetchSpy).toHaveBeenCalledWith(
				"https://ufs.example/archived-cn.pdf",
				expect.objectContaining({ cache: "no-store" }),
			);
			expect(mockRenderInvoicePdf).not.toHaveBeenCalled();
			expect(mockArchiveCreditNotePdf).not.toHaveBeenCalled();

			fetchSpy.mockRestore();
		});

		it("falls back to regeneration when archive fetch fails (non-blocking)", async () => {
			mockPrisma.order.findUnique.mockResolvedValue({
				creditNotePdfUrl: "https://ufs.example/archived-cn.pdf",
				creditNotePdfHash: null,
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

	describe("integrity check (Art. L102 B LPF)", () => {
		it("returns 503 if regenerated PDF hash diverges from archived hash", async () => {
			mockPrisma.order.findUnique.mockResolvedValue({
				creditNotePdfUrl: "https://utfs.io/f/cn-1.pdf",
				creditNotePdfHash: "deadbeef".repeat(8),
			});
			const fetchSpy = vi
				.spyOn(globalThis, "fetch")
				.mockResolvedValue(new Response("server error", { status: 500 }));

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(503);
			expect(res.headers.get("Retry-After")).toBe("60");

			fetchSpy.mockRestore();
		});

		it("returns 500 if creditNotePdfUrl is off the UploadThing whitelist (anti-SSRF)", async () => {
			mockPrisma.order.findUnique.mockResolvedValue({
				creditNotePdfUrl: "http://169.254.169.254/metadata",
				creditNotePdfHash: "a".repeat(64),
			});
			mockIsAllowedMediaDomain.mockReturnValueOnce(false);
			const fetchSpy = vi.spyOn(globalThis, "fetch");

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(500);
			expect(fetchSpy).not.toHaveBeenCalled();

			fetchSpy.mockRestore();
		});
	});

	/**
	 * @regression credit-note-archive-hash-mismatch-falls-back
	 *
	 * EINV-PDF-006 — symétrique de la facture : le `creditNotePdfHash` protège le
	 * chemin de lecture réel (octets servis depuis UploadThing). Archive divergente
	 * ⇒ on NE sert PAS l'octet douteux, on bascule sur la régénération (Art. L102 B
	 * LPF) et on trace (Sentry `credit-note-pdf-archive-hash-mismatch`).
	 */
	describe("intégrité de l'archive servie (EINV-PDF-006)", () => {
		it("bascule sur la régénération + trace Sentry si l'octet servi diverge du hash archivé", async () => {
			mockPrisma.order.findUnique.mockResolvedValue({
				creditNotePdfUrl: "https://utfs.io/f/cn-1.pdf",
				creditNotePdfHash: PDF_HASH,
			});
			const fetchSpy = vi
				.spyOn(globalThis, "fetch")
				.mockResolvedValue(new Response(new Uint8Array([0xde, 0xad, 0xbe, 0xef]), { status: 200 }));

			const res = await GET(makeReq(), makeParams());

			expect(mockRenderInvoicePdf).toHaveBeenCalled();
			expect(mockSentry.captureMessage).toHaveBeenCalledWith(
				"credit-note-pdf-archive-hash-mismatch",
				expect.objectContaining({ level: "error" }),
			);
			// La régénération reproduit l'avoir d'origine (hash == PDF_HASH) → 200.
			expect(res.status).toBe(200);

			fetchSpy.mockRestore();
		});
	});

	describe("admin behavior", () => {
		it("allows admin to download a credit note owned by a different user (audit)", async () => {
			mockGetSession.mockResolvedValue(ADMIN_SESSION);
			mockPrisma.order.findFirst.mockResolvedValue({ ...VOIDED_ORDER, userId: "other-user" });

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(200);
		});

		it("enforces rate-limit for admin (anti-exfiltration quota)", async () => {
			mockGetSession.mockResolvedValue(ADMIN_SESSION);

			await GET(makeReq(), makeParams());

			expect(mockCheckRateLimit).toHaveBeenCalled();
		});
	});

	describe("audit trail", () => {
		it("records INVOICE_DOWNLOADED with documentType=CREDIT_NOTE metadata", async () => {
			await GET(makeReq(), makeParams());

			expect(mockCreateOrderAudit).toHaveBeenCalledWith(
				expect.objectContaining({
					orderId: "order-1",
					action: "INVOICE_DOWNLOADED",
					metadata: expect.objectContaining({
						documentType: "CREDIT_NOTE",
						creditNoteNumber: "A-2026-00007",
					}),
				}),
			);
		});
	});
});
