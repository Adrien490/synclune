/**
 * @regression einv-sec-001-credit-note-stale-admin
 *
 * Garde EINV-SEC-001 : la route avoir DOIT re-vérifier le rôle admin en DB
 * (via `resolveInvoiceActorIsAdmin`) et ne JAMAIS faire confiance au seul
 * `session.user.role` du cookie-cache Better Auth (stale jusqu'à ~5 min).
 *
 * Un admin récemment démoté (cookie dit "ADMIN", DB dit "USER") ne doit PAS :
 *  1. bypasser l'ownership check sur l'avoir d'un autre client → 404 attendu
 *     (EINV-SEC-003 : réponse indistincte du cas "commande inexistante") ;
 *  2. obtenir le quota élargi admin (200/h) → identifiant rate-limit non-admin.
 *
 * Le durcissement existait déjà sur /invoice (EINV-SEC-008) mais pas sur les
 * routes avoir avant cet audit. NE PAS mocker `resolveInvoiceActorIsAdmin` —
 * on teste précisément son intégration avec la query DB.
 *
 * Cf. audit sécurité facturation 2026-05-28 — EINV-SEC-001.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

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
		user: { findUnique: vi.fn() },
	},
	mockSentry: {
		addBreadcrumb: vi.fn(),
		captureMessage: vi.fn(),
		setTag: vi.fn(),
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
vi.mock("@/shared/lib/media-validation", () => ({
	isAllowedMediaDomain: mockIsAllowedMediaDomain,
}));
vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));
vi.mock("@/shared/lib/logger", () => ({
	logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET } from "../route";

const OWNER_USER_ID = "user_owner_aaa";
const STALE_ADMIN_ID = "user_demoted_ccc";
const REAL_ADMIN_ID = "user_admin_xyz";

function makeOrderRow(overrides: Record<string, unknown> = {}) {
	return {
		id: "order_test_id",
		userId: OWNER_USER_ID,
		orderNumber: "CMD-1700000000000-AAAAAAAAAAAA",
		paymentStatus: "PAID",
		invoiceNumber: "F-2026-00001",
		invoiceGeneratedAt: new Date(),
		creditNoteNumber: "A-2026-00001",
		creditNoteGeneratedAt: new Date(),
		...overrides,
	};
}

async function callRoute(orderNumber: string, token?: string) {
	const url = token
		? `https://example.com/api/orders/${orderNumber}/credit-note?token=${token}`
		: `https://example.com/api/orders/${orderNumber}/credit-note`;
	return GET(new Request(url), { params: Promise.resolve({ orderNumber }) });
}

describe("EINV-SEC-001 — credit-note route re-checks admin role from DB", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockHeaders.mockResolvedValue(new Headers());
		mockGetClientIp.mockResolvedValue("203.0.113.1");
		mockGetRateLimitIdentifier.mockImplementation((id: string) => `user:${id}`);
		mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 99 });
		mockPrisma.order.findFirst.mockResolvedValue(makeOrderRow());
		// Regenerate path : pas d'archive uploadée → buildInvoiceData + renderInvoicePdf.
		mockPrisma.order.findUnique.mockResolvedValue({
			creditNotePdfUrl: null,
			creditNotePdfHash: null,
		});
		mockPrisma.orderHistory.findFirst.mockResolvedValue(null);
		mockBuildInvoiceData.mockReturnValue({});
		mockRenderInvoicePdf.mockReturnValue(new ArrayBuffer(8));
		mockArchiveCreditNotePdf.mockResolvedValue(null);
		mockCreateOrderAudit.mockResolvedValue(undefined);
		mockVerifyInvoiceAccessToken.mockReturnValue(false);
		mockIsAllowedMediaDomain.mockReturnValue(true);
	});

	it("returns 404 when a stale-admin cookie claims ADMIN but DB says USER (other user's credit note)", async () => {
		mockGetSession.mockResolvedValue({
			user: { id: STALE_ADMIN_ID, role: "ADMIN" },
		});
		// DB re-check : l'utilisateur a été démoté.
		mockPrisma.user.findUnique.mockResolvedValue({ role: "USER" });

		const response = await callRoute("CMD-1700000000000-AAAAAAAAAAAA");

		expect(response.status).toBe(404);
		expect(mockCreateOrderAudit).not.toHaveBeenCalled();
		// La re-vérification DB a bien eu lieu.
		expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
			where: { id: STALE_ADMIN_ID, deletedAt: null },
			select: { role: true },
		});
	});

	it("uses the NON-admin rate-limit identifier for a stale-admin (no 200/h quota)", async () => {
		mockGetSession.mockResolvedValue({
			user: { id: STALE_ADMIN_ID, role: "ADMIN" },
		});
		mockPrisma.user.findUnique.mockResolvedValue({ role: "USER" });

		await callRoute("CMD-1700000000000-AAAAAAAAAAAA");

		// Identifiant non-admin (`user:<id>`) + config 10/h — PAS `admin-invoice:`.
		expect(mockCheckRateLimit).toHaveBeenCalledWith(`user:${STALE_ADMIN_ID}`, {
			limit: 10,
			windowMs: 60 * 60_000,
		});
	});

	it("returns 200 for a genuine admin (DB confirms ADMIN) on another user's credit note", async () => {
		mockGetSession.mockResolvedValue({
			user: { id: REAL_ADMIN_ID, role: "ADMIN" },
		});
		mockPrisma.user.findUnique.mockResolvedValue({ role: "ADMIN" });

		const response = await callRoute("CMD-1700000000000-AAAAAAAAAAAA");

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("application/pdf");
		// Quota admin appliqué (200/h) une fois le rôle confirmé. La route avoir
		// partage l'identifiant `admin-invoice:` avec /invoice (cap effectif commun).
		expect(mockCheckRateLimit).toHaveBeenCalledWith(`admin-invoice:${REAL_ADMIN_ID}`, {
			limit: 200,
			windowMs: 60 * 60_000,
		});
	});

	it("returns 200 for the owner (USER role, matching userId)", async () => {
		mockGetSession.mockResolvedValue({
			user: { id: OWNER_USER_ID, role: "USER" },
		});

		const response = await callRoute("CMD-1700000000000-AAAAAAAAAAAA");

		expect(response.status).toBe(200);
		// USER role → pas de re-check DB du rôle admin.
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});
});
