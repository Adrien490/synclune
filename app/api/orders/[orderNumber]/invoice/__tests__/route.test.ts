import { createHash } from "node:crypto";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockBuildInvoiceData,
	mockRenderInvoicePdf,
	mockPersistInvoiceNumber,
	mockFlagInvoiceFailure,
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
	mockFlagInvoiceFailure: vi.fn(),
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
vi.mock("@/modules/orders/services/ensure-invoice-number.service", () => ({
	flagInvoiceFailureForReconcile: mockFlagInvoiceFailure,
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

// Octets PDF par défaut renvoyés par `mockRenderInvoicePdf` + leur SHA-256. Sert à
// piloter les chemins de vérification d'intégrité (EINV-PDF-006) de façon déterministe.
const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
const PDF_HASH = createHash("sha256").update(PDF_BYTES).digest("hex");

/**
 * Depuis le retrait de `Order.userId` (2026-08-05), le SEUL chemin client est le
 * token HMAC — une commande n'a plus de propriétaire de session. Les requêtes
 * portent donc un token bien formé (32 hex, cf. `invoiceTokenSchema`) ;
 * `mockVerifyInvoiceAccessToken` décide de sa validité.
 * `makeReq({ token: false })` pour exercer un accès sans token.
 */
function makeReq(options: { token?: boolean } = {}) {
	const query = options.token === false ? "" : "?token=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6";
	return new Request(`https://example.com/api/orders/${ORDER_NUMBER}/invoice${query}`);
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
		mockVerifyInvoiceAccessToken.mockReturnValue(true);
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

			const res = await GET(makeReq({ token: false }), makeParams());

			expect(res.status).toBe(401);
		});

		it("returns 401 when session has no user.id", async () => {
			mockGetSession.mockResolvedValue({ user: {} });

			const res = await GET(makeReq({ token: false }), makeParams());

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

		// `Order.userId` est parti le 2026-08-05 : le cas « commande d'un autre
		// client » est devenu « session non-admin sans token valide » — même réponse,
		// même motif d'anti-énumération.
		it("returns 404 for a non-admin session whose token is invalid (EINV-SEC-003)", async () => {
			mockVerifyInvoiceAccessToken.mockReturnValue(false);
			mockPrisma.order.findFirst.mockResolvedValue({ ...PAID_ORDER });

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(404);
		});

		it("returns 400 when order is not paid", async () => {
			mockPrisma.order.findFirst.mockResolvedValue({ ...PAID_ORDER, paymentStatus: "PENDING" });

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(400);
		});
	});

	/**
	 * @regression invoice-available-after-refund — audit « Admin commandes » 2026-08-01 (P1-A)
	 *
	 * La garde `paymentStatus !== "PAID"` rendait la facture archivée inaccessible dès
	 * qu'un remboursement faisait passer la commande en PARTIALLY_REFUNDED/REFUNDED —
	 * et rendait la branche VOIDED (bandeau « FACTURE ANNULÉE », EINV-SEC-007)
	 * inatteignable en production, voidInvoice n'étant appelé que sur des commandes
	 * déjà REFUNDED/FAILED. La facture d'une commande ENCAISSÉE (paidAt non nul)
	 * reste servie (Art. L102 B LPF) ; seule une commande jamais encaissée est
	 * refusée, miroir de la garde interne de persistInvoiceNumber.
	 */
	describe("@regression invoice-available-after-refund", () => {
		it("serves the invoice for a PARTIALLY_REFUNDED order (invoice still valid)", async () => {
			mockPrisma.order.findFirst.mockResolvedValue({
				...PAID_ORDER,
				paymentStatus: "PARTIALLY_REFUNDED",
				paidAt: new Date("2026-03-30"),
			});

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(200);
		});

		it("serves the VOIDED invoice of a REFUNDED order (état réel post-void)", async () => {
			mockPrisma.order.findFirst.mockResolvedValue({
				...PAID_ORDER,
				paymentStatus: "REFUNDED",
				paidAt: new Date("2026-03-30"),
				invoiceStatus: "VOIDED",
				creditNoteGeneratedAt: new Date("2026-05-10"),
				creditNoteNumber: "A-2026-00007",
			});
			mockPrisma.order.findUnique.mockResolvedValue({
				invoicePdfUrl: "https://utfs.io/f/voided.pdf",
				invoicePdfHash: null,
				invoiceDataSnapshot: null,
				invoiceDataHash: null,
				piiPurgedAt: null,
			});
			mockBuildInvoiceData.mockReturnValue({ voidedInfo: null });

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(200);
			expect(mockRenderInvoicePdf).toHaveBeenCalledWith(
				expect.objectContaining({
					voidedInfo: expect.objectContaining({ creditNoteNumber: "A-2026-00007" }),
				}),
			);
		});

		it("still returns 400 for a never-paid order (paidAt null)", async () => {
			mockPrisma.order.findFirst.mockResolvedValue({
				...PAID_ORDER,
				paymentStatus: "PENDING",
				paidAt: null,
			});

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

		it("returns 503 + flags DLQ when lazy invoice generation fails (P2 fail-closed)", async () => {
			// persistInvoiceNumber renvoie null par défaut (beforeEach) ⇒ échec de la
			// génération lazy. On ne sert JAMAIS une facture sans numéro (Art. 242 nonies A) :
			// on pose le flag DLQ `invoiceRetryDeferred` (rattrapage cron reconcile-invoices)
			// et on renvoie un 503 explicite avec Retry-After.
			mockPrisma.order.findFirst.mockResolvedValue({ ...PAID_ORDER, invoiceNumber: null });

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(503);
			expect(res.headers.get("Retry-After")).toBe("60");
			expect(mockFlagInvoiceFailure).toHaveBeenCalledWith(
				PAID_ORDER.id,
				expect.stringContaining("lazy"),
			);
		});

		it("persists a new invoice number on first download (no existing number)", async () => {
			mockPrisma.order.findFirst.mockResolvedValue({ ...PAID_ORDER, invoiceNumber: null });
			mockPersistInvoiceNumber.mockResolvedValue({
				invoiceNumber: "INV-2026-9999",
				invoiceGeneratedAt: new Date("2026-04-17"),
			});

			const res = await GET(makeReq(), makeParams());

			expect(mockPersistInvoiceNumber).toHaveBeenCalledWith("order-1");
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
	 * @regression voided-invoice-banner-from-snapshot — EINV-SEC-007
	 *
	 * Le snapshot comptable figé l'est à l'état GENERATED (voidedInfo=null) et
	 * voidInvoice ne le réécrit jamais. Sans ré-injection, une facture VOIDED
	 * régénérée sortait SANS le bandeau « FACTURE ANNULÉE », laissant un client
	 * télécharger une facture annulée d'apparence valide. La route ré-injecte
	 * voidedInfo depuis les colonnes vivantes (creditNoteNumber/creditNoteGeneratedAt)
	 * SANS toucher au snapshot ni à son hash.
	 */
	describe("@regression voided-invoice-banner-from-snapshot — EINV-SEC-007", () => {
		const VOIDED_ORDER = {
			...PAID_ORDER,
			invoiceStatus: "VOIDED" as const,
			creditNoteGeneratedAt: new Date("2026-05-10"),
			creditNoteNumber: "A-2026-00007",
		};

		beforeEach(() => {
			mockPrisma.order.findFirst.mockResolvedValue(VOIDED_ORDER);
			// archive sans snapshot → le resolver retombe sur buildInvoiceData (mocké),
			// qui simule un snapshot figé à GENERATED (voidedInfo=null).
			mockPrisma.order.findUnique.mockResolvedValue({
				invoicePdfUrl: "https://utfs.io/f/voided.pdf",
				invoicePdfHash: null,
				invoiceDataSnapshot: null,
				invoiceDataHash: null,
				piiPurgedAt: null,
			});
			mockBuildInvoiceData.mockReturnValue({ voidedInfo: null });
		});

		it("ré-injecte voidedInfo (colonnes vivantes) quand le rendu part d'un voidedInfo=null", async () => {
			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(200);
			expect(mockRenderInvoicePdf).toHaveBeenCalledWith(
				expect.objectContaining({
					voidedInfo: {
						creditNoteNumber: "A-2026-00007",
						voidedAt: VOIDED_ORDER.creditNoteGeneratedAt,
					},
				}),
			);
		});

		it("ne sert PAS le PDF archivé pour une facture VOIDED (régénère pour estampiller)", async () => {
			const fetchSpy = vi.spyOn(globalThis, "fetch");

			await GET(makeReq(), makeParams());

			// VOIDED bypass (EINV-SEC-007) : aucune lecture de l'archive UploadThing.
			expect(fetchSpy).not.toHaveBeenCalled();
			expect(mockRenderInvoicePdf).toHaveBeenCalled();

			fetchSpy.mockRestore();
		});
	});

	/**
	 * @regression ORD-COMPLY-005 (audit conformité 2026-05-27)
	 * @regression invoice-serves-archive-first
	 * Verrouille le service archivé du PDF (Art. L102 B LPF — facture immuable) :
	 * archive présente ⇒ servie en priorité, jamais de régénération.
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
			mockPrisma.order.findFirst.mockResolvedValue({ ...PAID_ORDER });

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(200);
		});

		it("non-admin still blocked without a valid token (404 anti-enumeration)", async () => {
			mockVerifyInvoiceAccessToken.mockReturnValue(false);
			mockPrisma.order.findFirst.mockResolvedValue({ ...PAID_ORDER });

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(404);
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

	/**
	 * @regression invoice-archive-hash-mismatch-falls-back
	 *
	 * EINV-PDF-006 — le `invoicePdfHash` doit garder sa valeur de preuve d'intégrité
	 * sur le CHEMIN DE LECTURE réel (octets effectivement servis depuis UploadThing),
	 * pas seulement sur le fallback de régénération (EINV-PDF-002). Si l'artefact
	 * archivé diverge de son empreinte (corruption/altération CDN), on NE le sert
	 * PAS : on bascule sur la régénération depuis le snapshot figé (Art. L102 B LPF)
	 * et on trace (Sentry `invoice-pdf-archive-hash-mismatch`).
	 */
	describe("intégrité de l'archive servie (EINV-PDF-006)", () => {
		it("sert l'octet archivé tel quel si son hash matche le hash stocké (pas de régénération)", async () => {
			mockPrisma.order.findUnique.mockResolvedValue({
				invoicePdfUrl: "https://utfs.io/f/inv-1.pdf",
				invoicePdfHash: PDF_HASH,
			});
			const fetchSpy = vi
				.spyOn(globalThis, "fetch")
				.mockResolvedValue(new Response(PDF_BYTES, { status: 200 }));

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(200);
			expect(mockRenderInvoicePdf).not.toHaveBeenCalled();
			expect(mockSentry.captureMessage).not.toHaveBeenCalledWith(
				"invoice-pdf-archive-hash-mismatch",
				expect.anything(),
			);
			fetchSpy.mockRestore();
		});

		it("bascule sur la régénération + trace Sentry si l'octet servi diverge du hash archivé (self-heal)", async () => {
			// Archive corrompue : le hash stocké est celui du PDF d'origine (PDF_HASH,
			// = ce que la régénération depuis le snapshot reproduit), mais UploadThing
			// renvoie d'autres octets. On doit refuser de servir l'octet douteux.
			mockPrisma.order.findUnique.mockResolvedValue({
				invoicePdfUrl: "https://utfs.io/f/inv-1.pdf",
				invoicePdfHash: PDF_HASH,
			});
			const fetchSpy = vi
				.spyOn(globalThis, "fetch")
				.mockResolvedValue(new Response(new Uint8Array([0xde, 0xad, 0xbe, 0xef]), { status: 200 }));

			const res = await GET(makeReq(), makeParams());

			// L'octet douteux n'est jamais servi : on a basculé sur la régénération...
			expect(mockRenderInvoicePdf).toHaveBeenCalled();
			expect(mockSentry.captureMessage).toHaveBeenCalledWith(
				"invoice-pdf-archive-hash-mismatch",
				expect.objectContaining({ level: "error" }),
			);
			// ...qui reproduit le PDF d'origine (hash == PDF_HASH) → servi 200 (self-heal).
			expect(res.status).toBe(200);
			fetchSpy.mockRestore();
		});
	});

	/**
	 * @regression invoice-410-after-pii-purge
	 *
	 * F6 (RGPD-PII-AUDIT 2026-05-30) : une fois la PII purgée à `paidAt + 10 ans`
	 * (hard-delete-retention pose `piiPurgedAt`, efface snapshot + PDF archivé), la
	 * facture n'est plus reconstituable (base légale expirée, RGPD Art. 5.1.e). La
	 * route renvoie 410 Gone — JAMAIS un PDF régénéré depuis les colonnes scrubées.
	 */
	describe("purge PII 10 ans (F6)", () => {
		it("returns 410 (Gone) when order PII has been purged (piiPurgedAt set)", async () => {
			mockPrisma.order.findUnique.mockResolvedValue({
				invoicePdfUrl: null,
				invoicePdfHash: null,
				invoiceDataSnapshot: null,
				invoiceDataHash: null,
				piiPurgedAt: new Date("2036-05-30"),
			});

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(410);
			expect(mockRenderInvoicePdf).not.toHaveBeenCalled();
			expect(mockArchiveInvoicePdf).not.toHaveBeenCalled();
		});
	});
});
