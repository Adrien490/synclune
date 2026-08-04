/**
 * @regression einv-sec-012-cross-user-idor
 *
 * Invariants d'autorisation de la route GET /api/orders/:orderNumber/invoice :
 *
 * 1. Anonyme sans token ne peut JAMAIS lire une facture → 401.
 * 2. Anonyme avec token invalide ne peut JAMAIS lire une facture → 404.
 * 3. Session non-admin sans token ne peut JAMAIS lire une facture → 404.
 * 4. Token HMAC valide → 200 (seul chemin client).
 * 5. Admin → 200, quel que soit le token (audit fiscal / SAV), mais rate-limité.
 *
 * EINV-SEC-003 : l'accès non autorisé renvoie 404 (indistinct du cas
 * "commande inexistante") et non 403, pour ne pas révéler l'existence d'une
 * commande (anti-énumération).
 *
 * ⚠️ **Ce qui a disparu le 2026-08-05, et pourquoi ce n'est pas un affaiblissement.**
 * `Order.userId` est parti (audit schéma V1, Lot C) : une commande n'a plus de
 * propriétaire. Deux familles de cas sont donc devenues INEXPRIMABLES, pas
 * seulement non testées —
 *   · « propriétaire de session » (l'ancien cas 200) : la seule session possible
 *     est celle de l'administratrice, déjà couverte par le cas admin ;
 *   · EINV-SEC-002, la révocation du token permanent quand le compte propriétaire
 *     était anonymisé (410) : sans compte client, il n'existe aucun compte à
 *     effacer, et `isInvoiceOwnerErased` court-circuitait déjà sur `null` pour
 *     100 % des commandes.
 * Le cas « client B lit la facture de client A » reste couvert : il est devenu le
 * cas 3 (toute session non-admin sans token → 404).
 * **Si un compte client revient, ces deux familles doivent revenir AVEC lui** —
 * cf. invariant 6 de CLAUDE.md.
 *
 * Cf. audit sécurité 2026-05-28 — EINV-SEC-012.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

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
		setFingerprint: vi.fn(),
		setLevel: vi.fn(),
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
const OTHER_USER_ID = "user_other_bbb";

function makeOrderRow(overrides: Record<string, unknown> = {}) {
	return {
		id: "order_test_id",
		orderNumber: "CMD-1700000000000-AAAAAAAAAAAA",
		paymentStatus: "PAID",
		invoiceNumber: "F-2026-00001",
		invoiceStatus: "GENERATED",
		invoiceGeneratedAt: new Date(),
		...overrides,
	};
}

// Tokens au format réel (32 hex) : le schéma F4 rejette en 400 tout token
// malformé AVANT le check HMAC — le 404 anti-énumération ne concerne que les
// tokens bien formés dont la signature ne valide pas.
const VALID_TOKEN = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6";
const TAMPERED_TOKEN = "ffffffffffffffffffffffffffffffff";

async function callRoute(orderNumber: string, token?: string) {
	const url = token
		? `https://example.com/api/orders/${orderNumber}/invoice?token=${token}`
		: `https://example.com/api/orders/${orderNumber}/invoice`;
	const request = new Request(url);
	return GET(request, { params: Promise.resolve({ orderNumber }) });
}

describe("EINV-SEC-012 — Cross-user IDOR regression on invoice route", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockHeaders.mockResolvedValue(new Headers());
		mockGetClientIp.mockResolvedValue("203.0.113.1");
		mockGetRateLimitIdentifier.mockImplementation((id: string) => `user:${id}`);
		mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 99 });
		mockPrisma.order.findFirst.mockResolvedValue(makeOrderRow());
		mockPrisma.order.findUnique.mockResolvedValue({
			invoicePdfUrl: null,
			invoicePdfHash: null,
		});
		mockPrisma.user.findUnique.mockResolvedValue({ role: "ADMIN" });
		mockBuildInvoiceData.mockReturnValue({});
		mockRenderInvoicePdf.mockReturnValue(new ArrayBuffer(8));
		mockArchiveInvoicePdf.mockResolvedValue(null);
		mockCreateOrderAudit.mockResolvedValue(undefined);
		mockVerifyInvoiceAccessToken.mockReturnValue(false);
		mockIsAllowedMediaDomain.mockReturnValue(true);
	});

	it("returns 401 when anonymous request has no session AND no token", async () => {
		mockGetSession.mockResolvedValue(null);

		const response = await callRoute("CMD-1700000000000-AAAAAAAAAAAA");

		expect(response.status).toBe(401);
		expect(mockPrisma.order.findFirst).not.toHaveBeenCalled();
	});

	it("returns 404 for any non-admin session without a valid token", async () => {
		mockGetSession.mockResolvedValue({
			user: { id: OTHER_USER_ID, role: "USER" },
		});

		const response = await callRoute("CMD-1700000000000-AAAAAAAAAAAA");

		expect(response.status).toBe(404);
		expect(mockCreateOrderAudit).not.toHaveBeenCalled();
	});

	it("returns 404 when anonymous request has an invalid token (signature mismatch)", async () => {
		mockGetSession.mockResolvedValue(null);
		mockVerifyInvoiceAccessToken.mockReturnValue(false);

		const response = await callRoute("CMD-1700000000000-AAAAAAAAAAAA", TAMPERED_TOKEN);

		expect(response.status).toBe(404);
		expect(mockCreateOrderAudit).not.toHaveBeenCalled();
	});

	it("returns 200 when a valid HMAC token is passed (seul chemin client)", async () => {
		mockGetSession.mockResolvedValue(null);
		mockVerifyInvoiceAccessToken.mockReturnValue(true);
		mockPrisma.order.findFirst.mockResolvedValue(makeOrderRow({ userId: null }));

		const response = await callRoute("CMD-1700000000000-AAAAAAAAAAAA", VALID_TOKEN);

		expect(response.status).toBe(200);
	});

	it("returns 200 when admin downloads any order regardless of ownership", async () => {
		mockGetSession.mockResolvedValue({
			user: { id: "admin_xyz", role: "ADMIN" },
		});

		const response = await callRoute("CMD-1700000000000-AAAAAAAAAAAA");

		expect(response.status).toBe(200);
	});

	it("returns 404 when order does not exist (no oracle for enumeration)", async () => {
		mockGetSession.mockResolvedValue({
			user: { id: OTHER_USER_ID, role: "USER" },
		});
		mockPrisma.order.findFirst.mockResolvedValue(null);

		const response = await callRoute("CMD-9999999999999-FFFFFFFFFFFF");

		expect(response.status).toBe(404);
	});
});
