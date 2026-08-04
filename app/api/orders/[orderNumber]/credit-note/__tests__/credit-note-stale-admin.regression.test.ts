/**
 * @regression einv-sec-001-credit-note-stale-admin
 *
 * Garde EINV-SEC-001 : la route avoir DOIT re-vérifier l'acteur en DB (via
 * `isVerifiedAdmin`) et ne JAMAIS faire confiance au seul `session.user.role` du
 * cookie-cache Better Auth (stale jusqu'à `AUTH_SESSION_CONFIG.cookieCache.maxAge`).
 *
 * Un admin dont le compte a été révoqué ne doit PAS :
 *  1. bypasser l'ownership check sur l'avoir d'un autre client → 404 attendu
 *     (EINV-SEC-003 : réponse indistincte du cas "commande inexistante") ;
 *  2. obtenir le quota élargi admin (200/h) → identifiant rate-limit non-admin.
 *
 * DEUX formes de révocation, et il faut les deux :
 *  - **rétrogradation** (cookie "ADMIN", DB "USER") — couverte depuis 2026-05-28 ;
 *  - **suspension** (`suspendedAt` / `accountStatus ≠ ACTIVE`, rôle toujours ADMIN)
 *    — ajoutée le 2026-07-31. L'ancienne query locale de `resolve-invoice-admin.ts`
 *    ne filtrait QUE `deletedAt` + `role` : elle laissait donc passer un admin
 *    suspendu, et c'est aujourd'hui la seule surface de révocation qui reste
 *    (l'UI de gestion des comptes a été retirée avec l'espace client).
 *
 * NE PAS mocker `isVerifiedAdmin` — on teste précisément son intégration avec la
 * query DB.
 *
 * Cf. audit sécurité facturation 2026-05-28 — EINV-SEC-001, et audit
 * « Admin role & re-check DB » 2026-07-31.
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
const SUSPENDED_ADMIN_ID = "user_suspended_bbb";
const REAL_ADMIN_ID = "user_admin_xyz";

/**
 * Lignes `User` telles qu'elles existent en base, AVANT filtrage.
 *
 * Le mock ci-dessous rejoue le `where` reçu comme le ferait Postgres, au lieu de
 * renvoyer une valeur figée. C'est ce qui rend ce test capable d'attraper une
 * régression : si quelqu'un retire `suspendedAt: null` ou `accountStatus` de la
 * query de confirmation, la ligne suspendue REMONTE avec `role: "ADMIN"` et les
 * assertions de refus tombent. Un `mockResolvedValue(null)` codé en dur, lui,
 * resterait vert quel que soit le `where`.
 */
const USER_ROWS: Record<
	string,
	{ role: string; deletedAt: Date | null; suspendedAt: Date | null; accountStatus: string }
> = {
	[REAL_ADMIN_ID]: { role: "ADMIN", deletedAt: null, suspendedAt: null, accountStatus: "ACTIVE" },
	[STALE_ADMIN_ID]: { role: "USER", deletedAt: null, suspendedAt: null, accountStatus: "ACTIVE" },
	[SUSPENDED_ADMIN_ID]: {
		role: "ADMIN",
		deletedAt: null,
		suspendedAt: new Date("2026-07-31T08:00:00Z"),
		accountStatus: "ACTIVE",
	},
};

type UserWhere = {
	id: string;
	deletedAt?: Date | null;
	suspendedAt?: Date | null;
	accountStatus?: { in: string[] };
};

function queryUser({ where }: { where: UserWhere }) {
	const row = USER_ROWS[where.id];
	if (!row) return null;
	if (where.deletedAt === null && row.deletedAt !== null) return null;
	if (where.suspendedAt === null && row.suspendedAt !== null) return null;
	if (where.accountStatus?.in && !where.accountStatus.in.includes(row.accountStatus)) return null;
	return row;
}

function makeOrderRow(overrides: Record<string, unknown> = {}) {
	return {
		id: "order_test_id",
		orderNumber: "CMD-1700000000000-AAAAAAAAAAAA",
		paymentStatus: "PAID",
		invoiceNumber: "F-2026-00001",
		invoiceGeneratedAt: new Date(),
		creditNoteNumber: "A-2026-00001",
		creditNoteGeneratedAt: new Date(),
		...overrides,
	};
}

/**
 * Assert sur l'identifiant et le quota SEULS, en lisant les arguments un à un
 * plutôt qu'avec `toHaveBeenCalledWith` : ce test porte sur « quel seau de rate
 * limit reçoit cet acteur », pas sur la signature de `checkRateLimit` (dont le
 * 3ᵉ paramètre `clientIp` a été ajouté par l'audit rate limiting 2026-07-31).
 * Une assertion sur l'arité exacte rendrait rouge un test de sécurité pour une
 * raison sans rapport avec la sécurité qu'il garde.
 */
function expectRateLimitBucket(identifier: string, limit: number) {
	const [calledIdentifier, calledConfig] = mockCheckRateLimit.mock.calls[0] ?? [];
	expect(calledIdentifier).toBe(identifier);
	expect(calledConfig).toEqual({ limit, windowMs: 60 * 60_000 });
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
		mockPrisma.user.findUnique.mockImplementation(async (args: { where: UserWhere }) =>
			queryUser(args),
		);
	});

	it("re-checks the actor against deletedAt AND suspendedAt AND accountStatus", async () => {
		// Cadrage de l'oracle : c'est ce `where` qui distingue la garde correcte de
		// celle qui a laissé passer un admin suspendu.
		mockGetSession.mockResolvedValue({ user: { id: REAL_ADMIN_ID, role: "ADMIN" } });

		await callRoute("CMD-1700000000000-AAAAAAAAAAAA");

		expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					id: REAL_ADMIN_ID,
					deletedAt: null,
					suspendedAt: null,
					accountStatus: { in: ["ACTIVE"] },
				}),
			}),
		);
	});

	it("returns 404 when a stale-admin cookie claims ADMIN but DB says USER (other user's credit note)", async () => {
		mockGetSession.mockResolvedValue({
			user: { id: STALE_ADMIN_ID, role: "ADMIN" },
		});

		const response = await callRoute("CMD-1700000000000-AAAAAAAAAAAA");

		expect(response.status).toBe(404);
		expect(mockCreateOrderAudit).not.toHaveBeenCalled();
		// La re-vérification DB a bien eu lieu.
		expect(mockPrisma.user.findUnique).toHaveBeenCalled();
	});

	it("uses the NON-admin rate-limit identifier for a stale-admin (no 200/h quota)", async () => {
		mockGetSession.mockResolvedValue({
			user: { id: STALE_ADMIN_ID, role: "ADMIN" },
		});

		await callRoute("CMD-1700000000000-AAAAAAAAAAAA");

		// Identifiant non-admin (`user:<id>`) + config 10/h — PAS `admin-invoice:`.
		expectRateLimitBucket(`user:${STALE_ADMIN_ID}`, 10);
	});

	it("returns 404 for a SUSPENDED admin whose role is still ADMIN in DB", async () => {
		// Le cas que l'ancienne query locale ratait : `role` vaut toujours "ADMIN",
		// seul `suspendedAt` a changé. Retirer `suspendedAt: null` du where fait
		// remonter la ligne et rend ce test rouge.
		mockGetSession.mockResolvedValue({
			user: { id: SUSPENDED_ADMIN_ID, role: "ADMIN" },
		});

		const response = await callRoute("CMD-1700000000000-AAAAAAAAAAAA");

		expect(response.status).toBe(404);
		expect(mockCreateOrderAudit).not.toHaveBeenCalled();
	});

	it("uses the NON-admin rate-limit identifier for a SUSPENDED admin (no 200/h quota)", async () => {
		mockGetSession.mockResolvedValue({
			user: { id: SUSPENDED_ADMIN_ID, role: "ADMIN" },
		});

		await callRoute("CMD-1700000000000-AAAAAAAAAAAA");

		expectRateLimitBucket(`user:${SUSPENDED_ADMIN_ID}`, 10);
	});

	it("returns 200 for a genuine admin (DB confirms ADMIN) on another user's credit note", async () => {
		mockGetSession.mockResolvedValue({
			user: { id: REAL_ADMIN_ID, role: "ADMIN" },
		});

		const response = await callRoute("CMD-1700000000000-AAAAAAAAAAAA");

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("application/pdf");
		// Quota admin appliqué (200/h) une fois le rôle confirmé. La route avoir
		// partage l'identifiant `admin-invoice:` avec /invoice (cap effectif commun).
		expectRateLimitBucket(`admin-invoice:${REAL_ADMIN_ID}`, 200);
	});

	// `Order.userId` est parti le 2026-08-05 : il n'y a plus de « propriétaire »
	// d'une commande. Le seul chemin client de cette route est le token HMAC ; ce
	// que ce fichier verrouille — la re-vérification DB du rôle admin — reste
	// couvert par les cas ci-dessus.
	it("returns 404 for a non-admin session without a valid token", async () => {
		mockGetSession.mockResolvedValue({
			user: { id: OWNER_USER_ID, role: "USER" },
		});

		const response = await callRoute("CMD-1700000000000-AAAAAAAAAAAA");

		expect(response.status).toBe(404);
	});
});
