/**
 * @regression credit-note-refund-route — EINV-CREDIT-011
 *
 * Verrouille la route `/api/orders/[orderNumber]/credit-note/[refundId]` qui
 * sert le PDF d'avoir rattaché à un Refund (partiel ou total). Distinct de la
 * route `/api/orders/[orderNumber]/credit-note` (full void historique sur
 * Order.creditNoteNumber).
 *
 * Garde-fous testés :
 *   - Auth obligatoire (admin OU owner — pas de token guest)
 *   - 404 si session ni admin ni owner de l'order (EINV-SEC-003 anti-enumeration)
 *   - 404 si order/refund inexistant
 *   - 400 si refund pas COMPLETED (avoir non émissible)
 *   - 404 si creditNoteNumber non encore généré
 *   - PDF archivé servi en priorité (immuable Art. L102 B LPF)
 *   - Octets archivés re-hashés avant serving (EINV-PDF-006) : mismatch →
 *     fallback régénération, jamais de bytes douteux servis ; legacy sans hash
 *     servi tel quel
 *   - 503 si divergence hash archivé vs regénéré (EINV-PDF-002)
 *   - Régénération + archivage best-effort fallback
 *   - Audit INVOICE_DOWNLOADED avec metadata.artifactType = "credit-note"
 */

import { createHash } from "node:crypto";
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockBuildCreditNoteData,
	mockRenderInvoicePdf,
	mockArchiveCreditNotePdf,
	mockGetSession,
	mockCheckRateLimit,
	mockGetRateLimitIdentifier,
	mockHeaders,
	mockCreateOrderAudit,
	mockIsAllowedMediaDomain,
	mockPrisma,
	mockSentry,
	mockFetch,
} = vi.hoisted(() => ({
	mockBuildCreditNoteData: vi.fn(),
	mockRenderInvoicePdf: vi.fn(),
	mockArchiveCreditNotePdf: vi.fn().mockResolvedValue(null),
	mockGetSession: vi.fn(),
	mockCheckRateLimit: vi.fn().mockResolvedValue({ success: true }),
	mockGetRateLimitIdentifier: vi.fn((id: string) => `user:${id}`),
	mockHeaders: vi.fn().mockResolvedValue(new Map()),
	mockCreateOrderAudit: vi.fn().mockResolvedValue(undefined),
	mockIsAllowedMediaDomain: vi.fn().mockReturnValue(true),
	mockPrisma: {
		order: { findFirst: vi.fn() },
		refund: { findFirst: vi.fn() },
		// EINV-SEC-001 : la route re-vérifie le rôle admin en DB.
		user: { findUnique: vi.fn() },
	},
	mockSentry: {
		addBreadcrumb: vi.fn(),
		captureMessage: vi.fn(),
	},
	mockFetch: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: mockHeaders }));
vi.mock("@sentry/nextjs", () => mockSentry);
vi.mock("@/modules/invoices/services/build-credit-note-data", () => ({
	buildCreditNoteData: mockBuildCreditNoteData,
}));
vi.mock("@/modules/invoices/services/render-invoice-pdf", () => ({
	renderInvoicePdf: mockRenderInvoicePdf,
}));
vi.mock("@/modules/refunds/services/archive-credit-note-pdf.service", () => ({
	archiveCreditNotePdf: mockArchiveCreditNotePdf,
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
	RefundStatus: {
		PENDING: "PENDING",
		APPROVED: "APPROVED",
		COMPLETED: "COMPLETED",
		FAILED: "FAILED",
		CANCELLED: "CANCELLED",
	},
}));

// Override global fetch pour les tests servant l'archived PDF.
vi.stubGlobal("fetch", mockFetch);

import { GET } from "../route";

const ORDER_NUMBER = "SYN-2026-9999";
// Format cuid2 (schéma F4 refundIdParamSchema rejette en 400 tout autre format)
const REFUND_ID = "cm3refund0001qz8v4h2j9d3e";
const ARCHIVED_URL = "https://utfs.io/cn-archived.pdf";

function sha256hex(bytes: Uint8Array): string {
	return createHash("sha256").update(bytes).digest("hex");
}

// Octets archivés « sains » servis par UploadThing + leur empreinte réelle
// (EINV-PDF-006 : la route re-hashe les octets servis contre creditNotePdfHash).
const ARCHIVED_BYTES = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
const ARCHIVED_HASH = sha256hex(ARCHIVED_BYTES);
// Sortie du mock renderInvoicePdf (%PDF) — hash de la régénération.
const REGEN_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
const REGEN_HASH = sha256hex(REGEN_BYTES);

function okFetchResponse(bytes: Uint8Array = ARCHIVED_BYTES) {
	return {
		ok: true,
		arrayBuffer: () => Promise.resolve(bytes.slice().buffer),
	};
}

function makeReq() {
	return new Request(`https://example.com/api/orders/${ORDER_NUMBER}/credit-note/${REFUND_ID}`);
}

function makeParams() {
	return { params: Promise.resolve({ orderNumber: ORDER_NUMBER, refundId: REFUND_ID }) };
}

function makeOrder(overrides: Record<string, unknown> = {}) {
	return {
		id: "order-cuid-1",
		orderNumber: ORDER_NUMBER,
		userId: "user-1",
		customerEmail: "client@example.com",
		...overrides,
	};
}

function makeRefund(overrides: Record<string, unknown> = {}) {
	return {
		id: REFUND_ID,
		amount: 3000,
		reason: "CUSTOMER_REQUEST",
		status: "COMPLETED",
		creditNoteNumber: "A-2026-00042",
		creditNoteGeneratedAt: new Date("2026-05-28"),
		creditNotePdfUrl: null,
		creditNotePdfHash: null,
		items: [],
		...overrides,
	};
}

describe("@regression credit-note-refund-route — EINV-CREDIT-011", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCheckRateLimit.mockResolvedValue({ success: true });
		mockHeaders.mockResolvedValue(new Map());
		mockIsAllowedMediaDomain.mockReturnValue(true);
		mockGetRateLimitIdentifier.mockImplementation((id: string) => `user:${id}`);
		mockArchiveCreditNotePdf.mockResolvedValue(null);
		mockRenderInvoicePdf.mockReturnValue(new Uint8Array([0x25, 0x50, 0x44, 0x46])); // %PDF
		mockBuildCreditNoteData.mockReturnValue({});
		// EINV-SEC-001 : par défaut la DB confirme le rôle pour les tests ADMIN.
		mockPrisma.user.findUnique.mockResolvedValue({ role: "ADMIN" });
	});

	describe("Auth obligatoire — pas de token guest sur cette route", () => {
		it("401 quand pas de session", async () => {
			mockGetSession.mockResolvedValue(null);

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(401);
		});

		it("401 même si session.user.id manquant", async () => {
			mockGetSession.mockResolvedValue({ user: {} });

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(401);
		});
	});

	describe("Lookup order — 404 (introuvable ou non autorisé)", () => {
		it("404 quand order introuvable", async () => {
			mockGetSession.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
			mockPrisma.order.findFirst.mockResolvedValue(null);

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(404);
		});

		it("404 quand session ni admin ni owner (EINV-SEC-003 anti-enumeration)", async () => {
			mockGetSession.mockResolvedValue({ user: { id: "user-INTRUDER", role: "USER" } });
			mockPrisma.order.findFirst.mockResolvedValue(makeOrder({ userId: "user-1" }));

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(404);
		});

		it("200-path pour admin (audit access)", async () => {
			mockGetSession.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
			mockPrisma.order.findFirst.mockResolvedValue(makeOrder({ userId: "user-1" }));
			mockPrisma.refund.findFirst.mockResolvedValue(
				makeRefund({ creditNotePdfUrl: ARCHIVED_URL, creditNotePdfHash: ARCHIVED_HASH }),
			);
			mockFetch.mockResolvedValue(okFetchResponse());

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(200);
			expect(mockCreateOrderAudit).toHaveBeenCalledWith(
				expect.objectContaining({
					action: "INVOICE_DOWNLOADED",
					source: "ADMIN",
					metadata: expect.objectContaining({
						artifactType: "credit-note",
						creditNoteNumber: "A-2026-00042",
						refundId: REFUND_ID,
						isAdminContext: true,
					}),
				}),
			);
		});
	});

	describe("Lookup refund — 404 / 400", () => {
		beforeEach(() => {
			mockGetSession.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
			mockPrisma.order.findFirst.mockResolvedValue(makeOrder());
		});

		it("404 quand refund introuvable", async () => {
			mockPrisma.refund.findFirst.mockResolvedValue(null);

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(404);
		});

		it("400 quand refund.status !== COMPLETED (avoir non émissible)", async () => {
			mockPrisma.refund.findFirst.mockResolvedValue(makeRefund({ status: "APPROVED" }));

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(400);
		});

		it("404 quand creditNoteNumber est null (avoir non encore émis)", async () => {
			mockPrisma.refund.findFirst.mockResolvedValue(
				makeRefund({ creditNoteNumber: null, creditNoteGeneratedAt: null }),
			);

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(404);
		});
	});

	describe("PDF archivé servi en priorité (Art. L102 B LPF immuable)", () => {
		beforeEach(() => {
			mockGetSession.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
			mockPrisma.order.findFirst.mockResolvedValue(makeOrder());
		});

		it("sert le PDF archivé sans régénération si creditNotePdfUrl présent (hash conforme)", async () => {
			mockPrisma.refund.findFirst.mockResolvedValue(
				makeRefund({ creditNotePdfUrl: ARCHIVED_URL, creditNotePdfHash: ARCHIVED_HASH }),
			);
			mockFetch.mockResolvedValue(okFetchResponse());

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(200);
			expect(res.headers.get("Content-Type")).toBe("application/pdf");
			expect(res.headers.get("Content-Disposition")).toContain("avoir-A-2026-00042.pdf");
			expect(mockFetch).toHaveBeenCalledWith(
				ARCHIVED_URL,
				expect.objectContaining({ cache: "no-store" }),
			);
			expect(mockRenderInvoicePdf).not.toHaveBeenCalled(); // pas de régénération
		});

		it("refuse 500 si creditNotePdfUrl hors whitelist UploadThing", async () => {
			mockPrisma.refund.findFirst.mockResolvedValue(
				makeRefund({ creditNotePdfUrl: "https://evil.com/cn.pdf", creditNotePdfHash: "h" }),
			);
			mockIsAllowedMediaDomain.mockReturnValue(false);

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(500);
		});

		it("fallback régénération si fetch UploadThing échoue (network down)", async () => {
			mockPrisma.refund.findFirst.mockResolvedValue(
				makeRefund({ creditNotePdfUrl: ARCHIVED_URL, creditNotePdfHash: null }),
			);
			mockFetch.mockRejectedValue(new Error("network unreachable"));

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(200);
			expect(mockRenderInvoicePdf).toHaveBeenCalled();
			expect(mockArchiveCreditNotePdf).toHaveBeenCalledWith(
				REFUND_ID,
				"A-2026-00042",
				expect.any(Uint8Array),
			);
		});
	});

	describe("Intégrité des octets archivés servis (EINV-PDF-006)", () => {
		beforeEach(() => {
			mockGetSession.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
			mockPrisma.order.findFirst.mockResolvedValue(makeOrder());
		});

		it("hash mismatch → Sentry + fallback régénération (les octets corrompus ne sont jamais servis)", async () => {
			// Archive corrompue côté UploadThing : le hash DB correspond à la
			// régénération bit-identique (REGEN_HASH), pas aux octets servis.
			mockPrisma.refund.findFirst.mockResolvedValue(
				makeRefund({ creditNotePdfUrl: ARCHIVED_URL, creditNotePdfHash: REGEN_HASH }),
			);
			mockFetch.mockResolvedValue(okFetchResponse(ARCHIVED_BYTES));

			const res = await GET(makeReq(), makeParams());

			expect(mockSentry.captureMessage).toHaveBeenCalledWith(
				"credit-note-pdf-archive-hash-mismatch",
				expect.objectContaining({ level: "error" }),
			);
			// Fallback : régénération SSOT, re-vérifiée EINV-PDF-002 (match → 200).
			expect(mockRenderInvoicePdf).toHaveBeenCalled();
			expect(res.status).toBe(200);
			const served = new Uint8Array(await res.arrayBuffer());
			expect(sha256hex(served)).toBe(REGEN_HASH);
		});

		it("hash mismatch ET régénération divergente → 503 (aucun byte douteux servi)", async () => {
			// Hash DB ne correspond ni aux octets archivés ni à la régénération :
			// la route doit refuser de servir quoi que ce soit (fail-closed).
			const foreignHash = sha256hex(new Uint8Array([9, 9, 9]));
			mockPrisma.refund.findFirst.mockResolvedValue(
				makeRefund({ creditNotePdfUrl: ARCHIVED_URL, creditNotePdfHash: foreignHash }),
			);
			mockFetch.mockResolvedValue(okFetchResponse(ARCHIVED_BYTES));

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(503);
			expect(mockSentry.captureMessage).toHaveBeenCalledWith(
				"credit-note-pdf-archive-hash-mismatch",
				expect.objectContaining({ level: "error" }),
			);
			expect(mockSentry.captureMessage).toHaveBeenCalledWith(
				"credit-note-pdf-hash-divergence",
				expect.objectContaining({ level: "error" }),
			);
		});

		it("archive legacy sans hash → servie telle quelle (pas de régénération, pas de Sentry)", async () => {
			mockPrisma.refund.findFirst.mockResolvedValue(
				makeRefund({ creditNotePdfUrl: ARCHIVED_URL, creditNotePdfHash: null }),
			);
			mockFetch.mockResolvedValue(okFetchResponse(ARCHIVED_BYTES));

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(200);
			expect(mockRenderInvoicePdf).not.toHaveBeenCalled();
			expect(mockSentry.captureMessage).not.toHaveBeenCalled();
			const served = new Uint8Array(await res.arrayBuffer());
			expect(sha256hex(served)).toBe(ARCHIVED_HASH);
		});
	});

	describe("Hash divergence (EINV-PDF-002) — 503 anti-corruption", () => {
		it("retourne 503 si regénération produit un hash != archivé (refuse de servir)", async () => {
			mockGetSession.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
			mockPrisma.order.findFirst.mockResolvedValue(makeOrder());
			mockPrisma.refund.findFirst.mockResolvedValue(
				makeRefund({
					creditNotePdfUrl: ARCHIVED_URL,
					creditNotePdfHash: "different-hash",
				}),
			);
			// fetch fail → fallback regen path
			mockFetch.mockRejectedValue(new Error("fetch failed"));
			// Le mock renderInvoicePdf retourne `%PDF` (4 bytes), dont le SHA-256
			// ne correspond pas à "different-hash" → divergence détectée.

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(503);
			expect(res.headers.get("Retry-After")).toBe("60");
			expect(mockSentry.captureMessage).toHaveBeenCalledWith(
				"credit-note-pdf-hash-divergence",
				expect.objectContaining({ level: "error" }),
			);
			// L'archivage post-rendu NE DOIT PAS être appelé sur divergence (anti-corruption).
			expect(mockArchiveCreditNotePdf).not.toHaveBeenCalled();
		});
	});

	describe("Régénération happy-path quand aucun PDF archivé", () => {
		it("renderInvoicePdf + archiveCreditNotePdf appelés + audit posé", async () => {
			mockGetSession.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
			mockPrisma.order.findFirst.mockResolvedValue(makeOrder());
			mockPrisma.refund.findFirst.mockResolvedValue(makeRefund()); // creditNotePdfUrl=null

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(200);
			expect(mockBuildCreditNoteData).toHaveBeenCalledWith(
				expect.any(Object),
				expect.objectContaining({
					id: REFUND_ID,
					creditNoteNumber: "A-2026-00042",
				}),
			);
			expect(mockRenderInvoicePdf).toHaveBeenCalled();
			expect(mockArchiveCreditNotePdf).toHaveBeenCalledWith(
				REFUND_ID,
				"A-2026-00042",
				expect.any(Uint8Array),
			);
			expect(mockCreateOrderAudit).toHaveBeenCalledWith(
				expect.objectContaining({
					action: "INVOICE_DOWNLOADED",
					source: "CUSTOMER",
					metadata: expect.objectContaining({ artifactType: "credit-note" }),
				}),
			);
		});
	});

	describe("Rate limit — 429 sur dépassement", () => {
		it("429 quand checkRateLimit retourne success=false", async () => {
			mockGetSession.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
			mockCheckRateLimit.mockResolvedValue({ success: false, retryAfter: 42 });

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(429);
			expect(res.headers.get("Retry-After")).toBe("42");
		});
	});

	describe("F4 (audit Zod) : params malformés coupés en 400 avant session/Prisma", () => {
		it("refundId non-cuid → 400 sans getSession ni lookup", async () => {
			const res = await GET(makeReq(), {
				params: Promise.resolve({ orderNumber: ORDER_NUMBER, refundId: "refund-1'; DROP" }),
			});

			expect(res.status).toBe(400);
			expect(mockGetSession).not.toHaveBeenCalled();
			expect(mockPrisma.order.findFirst).not.toHaveBeenCalled();
		});

		it("orderNumber 65+ chars → 400", async () => {
			const res = await GET(makeReq(), {
				params: Promise.resolve({ orderNumber: "X".repeat(65), refundId: REFUND_ID }),
			});

			expect(res.status).toBe(400);
			expect(mockPrisma.order.findFirst).not.toHaveBeenCalled();
		});
	});
});
