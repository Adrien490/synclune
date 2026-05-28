/**
 * @regression invoice-route-token-auth
 *
 * EINV-TEST-024 (revisité) — le plan initial décrivait "lien email non signé"
 * mais la route IMPLÉMENTE un token HMAC (`verifyInvoiceAccessToken` dérivé
 * de BETTER_AUTH_SECRET) pour les commandes guest sans session.
 *
 * Ce test garantit les invariants d'authentification sur la route :
 *   1. Sans session ET sans token → 401
 *   2. Avec token invalide ET sans session → 403 (route trouve l'order
 *      via token query mais refuse parce que la signature ne valide pas)
 *   3. Avec token valide ET sans session → 200 (guest checkout flow)
 *   4. Le rate-limit guest est IP-based (`invoice-token:<ip>`)
 *
 * Complète route.test.ts qui couvre déjà 401 sans session, 403 cross-user,
 * mais ne teste pas explicitement le chemin guest token + no session.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

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
		setContext: vi.fn(),
		setExtra: vi.fn(),
		withScope: vi.fn(
			(
				cb: (scope: {
					setTag: () => void;
					setFingerprint: () => void;
					setLevel: () => void;
					setContext: () => void;
				}) => void,
			) =>
				cb({
					setTag: vi.fn(),
					setFingerprint: vi.fn(),
					setLevel: vi.fn(),
					setContext: vi.fn(),
				}),
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

const ORDER_NUMBER = "SYN-2026-GUEST";

function makeReq(token?: string) {
	const url = token
		? `https://example.com/api/orders/${ORDER_NUMBER}/invoice?token=${token}`
		: `https://example.com/api/orders/${ORDER_NUMBER}/invoice`;
	return new Request(url);
}

function makeParams() {
	return { params: Promise.resolve({ orderNumber: ORDER_NUMBER }) };
}

const GUEST_ORDER = {
	id: "order-guest-1",
	orderNumber: ORDER_NUMBER,
	userId: null, // guest checkout — pas de user
	paymentStatus: "PAID" as const,
	invoiceNumber: "F-2026-00500",
	invoiceStatus: "GENERATED" as const,
	invoiceGeneratedAt: new Date("2026-05-28"),
};

describe("@regression invoice-route-token-auth — EINV-TEST-024", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockGetSession.mockResolvedValue(null); // guest path par défaut
		mockGetRateLimitIdentifier.mockReturnValue("user:none");
		mockGetClientIp.mockResolvedValue("1.2.3.4");
		mockHeaders.mockResolvedValue(new Headers());
		mockIsAllowedMediaDomain.mockReturnValue(true);
		mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 999 });
		mockPrisma.order.findFirst.mockResolvedValue(GUEST_ORDER);
		mockPrisma.order.findUnique.mockResolvedValue({
			invoicePdfUrl: null,
			invoicePdfHash: null,
		});
		mockPrisma.user.findUnique.mockResolvedValue({ role: "ADMIN" });
		mockPersistInvoiceNumber.mockResolvedValue(null);
		mockBuildInvoiceData.mockReturnValue({});
		mockRenderInvoicePdf.mockReturnValue(new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer);
		mockArchiveInvoicePdf.mockResolvedValue({});
		mockCreateOrderAudit.mockResolvedValue(undefined);
	});

	describe("aucune auth → 401", () => {
		it("sans session ET sans token query → 401", async () => {
			mockGetSession.mockResolvedValue(null);

			const res = await GET(makeReq(), makeParams());

			expect(res.status).toBe(401);
		});

		it("sans session ET token query null → 401", async () => {
			mockGetSession.mockResolvedValue(null);

			const res = await GET(makeReq(undefined), makeParams());

			expect(res.status).toBe(401);
		});
	});

	describe("token invalide → 403 (HMAC vérifie pas)", () => {
		it("sans session + token query mais verifyInvoiceAccessToken=false → 403", async () => {
			mockGetSession.mockResolvedValue(null);
			mockVerifyInvoiceAccessToken.mockReturnValue(false);

			const res = await GET(makeReq("tampered-token-xxxxx"), makeParams());

			expect(res.status).toBe(403);
			expect(mockVerifyInvoiceAccessToken).toHaveBeenCalledWith(
				GUEST_ORDER.id,
				GUEST_ORDER.orderNumber,
				"tampered-token-xxxxx",
			);
		});
	});

	describe("token valide guest → 200 (chemin happy path)", () => {
		it("sans session + token query valide → 200 PDF servi", async () => {
			mockGetSession.mockResolvedValue(null);
			mockVerifyInvoiceAccessToken.mockReturnValue(true);

			const res = await GET(makeReq("valid-hmac-signed-token"), makeParams());

			expect(res.status).toBe(200);
			expect(res.headers.get("Content-Type")).toBe("application/pdf");
		});

		it("rate-limit identifier guest = invoice-token:<ip> (anti-DDoS par IP)", async () => {
			mockGetSession.mockResolvedValue(null);
			mockVerifyInvoiceAccessToken.mockReturnValue(true);
			mockGetClientIp.mockResolvedValue("203.0.113.42");

			await GET(makeReq("valid-token"), makeParams());

			expect(mockCheckRateLimit).toHaveBeenCalledWith(
				"invoice-token:203.0.113.42",
				expect.objectContaining({ limit: 10 }),
			);
		});

		it("rate-limit guest fallback ip=unknown si getClientIp retourne null", async () => {
			mockGetSession.mockResolvedValue(null);
			mockVerifyInvoiceAccessToken.mockReturnValue(true);
			mockGetClientIp.mockResolvedValue(null);

			await GET(makeReq("valid-token"), makeParams());

			expect(mockCheckRateLimit).toHaveBeenCalledWith("invoice-token:unknown", expect.any(Object));
		});
	});

	describe("token PRIME sur session — admin avec token reste admin", () => {
		it("admin session + token : admin path identifier (admin-invoice:<id>) prioritaire", async () => {
			mockGetSession.mockResolvedValue({
				user: { id: "admin-1", role: "ADMIN" },
			});
			mockVerifyInvoiceAccessToken.mockReturnValue(true);
			mockPrisma.order.findFirst.mockResolvedValue({ ...GUEST_ORDER, userId: "other-user" });

			const res = await GET(makeReq("any-token"), makeParams());

			expect(res.status).toBe(200);
			expect(mockCheckRateLimit).toHaveBeenCalledWith(
				"admin-invoice:admin-1",
				expect.objectContaining({ limit: 200 }),
			);
		});
	});

	describe("invariant HMAC : verifyInvoiceAccessToken est appelé avec orderId + orderNumber + token", () => {
		it("token query passé exactement comme reçu (pas de manipulation)", async () => {
			mockGetSession.mockResolvedValue(null);
			mockVerifyInvoiceAccessToken.mockReturnValue(true);
			const RAW_TOKEN = "abc.def.signature_base64url_xxx";

			await GET(makeReq(RAW_TOKEN), makeParams());

			// 3e argument = token brut, pas trimé/normalisé
			expect(mockVerifyInvoiceAccessToken).toHaveBeenCalledWith(
				GUEST_ORDER.id,
				GUEST_ORDER.orderNumber,
				RAW_TOKEN,
			);
		});
	});
});
