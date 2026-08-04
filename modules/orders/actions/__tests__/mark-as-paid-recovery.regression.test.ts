/**
 * @regression ORD-BIZ-004
 *
 * Garantit que `markAsPaid` autorise la recovery `FAILED → PAID`
 * (paiement bancaire manuel post-échec) avec safety guards :
 * - refus si un Refund non-terminal existe (sinon double-comptabilisation)
 * - refus si commande CANCELLED ou paymentStatus PAID/PARTIALLY_REFUNDED/REFUNDED
 * - audit `metadata.recoveredFrom` tracé pour distinguer recovery vs paiement initial
 *
 * Le service `canMarkAsPaid` (UI) est aussi élargi pour exposer le bouton sur
 * FAILED. Sans cette régression, cette transition est silencieusement
 * bloquée et l'admin doit créer une nouvelle commande (perte traçabilité).
 * (La branche EXPIRED de cette régression est partie au Lot 6 avec la valeur
 * d'enum — vestige du flux Checkout Session, plus aucun writer.)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, createMockOrder, VALID_CUID } from "@/test/factories";
import type * as SharedActions from "@/shared/lib/actions";

const {
	mockPrisma,
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockHandleActionError,
	mockSendOrderConfirmationEmail,
	mockCreateOrderAuditTx,
	mockBuildUrl,
	mockGetOrderInvalidationTags,
	mockStripeCancel,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
		productSku: { updateMany: vi.fn() },
		orderHistory: { create: vi.fn() },
		refund: { findFirst: vi.fn() },
		// STOCK-02 : acquireOrderPaidLockTx fait un tx.$queryRaw (advisory lock).
		$queryRaw: vi.fn(),
		$transaction: vi.fn(),
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSendOrderConfirmationEmail: vi.fn(),
	mockCreateOrderAuditTx: vi.fn(),
	mockBuildUrl: vi.fn().mockReturnValue("https://synclune.fr/x"),
	mockGetOrderInvalidationTags: vi.fn().mockReturnValue([]),
	mockStripeCancel: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma, notDeleted: { deletedAt: null } }));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdminWithUser,
	requireAdminWithUser: mockRequireAdminWithUser,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_ORDER_LIMITS: { MARK_AS_PAID: "admin-mark-paid" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", async (importOriginal) => {
	const original = await importOriginal<typeof SharedActions>();
	return {
		...original,
		safeFormGet: (formData: FormData, key: string) => {
			const v = formData.get(key);
			return typeof v === "string" ? v : null;
		},
		handleActionError: mockHandleActionError,
	};
});
vi.mock("@/modules/emails/services/order-emails", () => ({
	sendOrderConfirmationEmail: mockSendOrderConfirmationEmail,
}));
vi.mock("../../utils/order-audit", () => ({ createOrderAuditTx: mockCreateOrderAuditTx }));
vi.mock("../../utils/invoice-token", () => ({
	generateInvoiceAccessToken: vi.fn().mockReturnValue("token"),
}));
vi.mock("@/shared/constants/urls", () => ({
	buildUrl: mockBuildUrl,
	ROUTES: {
		// `SHOP.ORDER_TRACKING` : le lien client des emails passe par
		// `buildOrderTrackingUrl` depuis le retrait de l'espace client (2026-07-31).
		SHOP: { ORDER_TRACKING: "/suivi-commande" },
		ACCOUNT: { ORDER_DETAIL: (n: string) => `/compte/commandes/${n}` },
	},
}));
vi.mock("../../constants/order.constants", () => ({
	ORDER_ERROR_MESSAGES: {
		NOT_FOUND: "Commande introuvable.",
		ALREADY_PAID: "Déjà payée.",
		CANNOT_PAY_CANCELLED: "Commande annulée.",
		MARK_AS_PAID_FAILED: "Erreur.",
	},
}));
vi.mock("../../constants/cache", () => ({
	getOrderInvalidationTags: mockGetOrderInvalidationTags,
}));
vi.mock("../../schemas/order.schemas", () => ({
	markAsPaidSchema: {
		safeParse: vi.fn().mockReturnValue({ success: true, data: { id: "test", note: undefined } }),
	},
}));
vi.mock("@/shared/lib/stripe", () => ({
	stripe: { paymentIntents: { cancel: mockStripeCancel } },
}));
vi.mock("@sentry/nextjs", () => ({
	withScope: vi.fn(),
	captureException: vi.fn(),
	captureMessage: vi.fn(),
	addBreadcrumb: vi.fn(),
	startSpan: vi.fn((_o: unknown, cb: () => unknown) => cb()),
}));

// EINV-CASH-005 : import dynamique post-commit (émission eager facture) — mocké
// (la chaîne d'archivage tire UploadThing à l'import).
vi.mock("@/modules/cron/services/reconcile-invoices.service", () => ({
	reconcileInvoiceOrder: vi.fn().mockResolvedValue({ kind: "recovered" }),
}));

import { markAsPaid } from "../mark-as-paid";

const validFormData = createMockFormData({ id: VALID_CUID });

function createOrder(overrides: Record<string, unknown> = {}) {
	return createMockOrder({
		status: "PENDING",
		paymentStatus: "PENDING",
		stripeCheckoutSessionId: null,
		// EINV-CASH-001 : une commande FAILED/EXPIRED/PENDING recoverable a toujours
		// un PaymentIntent Stripe (le paiement a été tenté). Sans lui, le garde
		// `no_stripe_proof` rejette avant d'atteindre la logique de recovery.
		stripePaymentIntentId: "pi_recovery_test",
		items: [],
		...overrides,
	});
}

describe("ORD-BIZ-004 — mark-as-paid recovery FAILED/EXPIRED → PAID", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRequireAdminWithUser.mockResolvedValue({
			user: { id: "admin-9", name: "Admin Test" },
		});
		mockEnforceRateLimit.mockResolvedValue({ rateLimited: false });
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => unknown) =>
			fn(mockPrisma),
		);
		mockSendOrderConfirmationEmail.mockResolvedValue(undefined);
		mockPrisma.refund.findFirst.mockResolvedValue(null);
		// Garde atomique (audit 2026-08-01, P3) : l'écriture est un updateMany
		// ré-assertant l'état lu — count 1 = pas de writer concurrent.
		mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
	});

	it("autorise FAILED → PAID quand aucun Refund existant + trace metadata.recoveredFrom=FAILED", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(
			createOrder({ id: VALID_CUID, paymentStatus: "FAILED" }),
		);

		const result = await markAsPaid(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			mockPrisma,
			expect.objectContaining({
				action: "PAID",
				previousPaymentStatus: "FAILED",
				newPaymentStatus: "PAID",
				metadata: expect.objectContaining({ recoveredFrom: "FAILED" }),
			}),
		);
	});

	it("autorise PENDING → PAID SANS poser metadata.recoveredFrom (paiement initial, pas recovery)", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(
			createOrder({ id: VALID_CUID, paymentStatus: "PENDING" }),
		);

		await markAsPaid(undefined, validFormData);

		const auditCall = mockCreateOrderAuditTx.mock.calls[0]?.[1];
		expect(auditCall?.metadata).toBeDefined();
		expect(auditCall?.metadata.recoveredFrom).toBeUndefined();
	});

	it("refuse FAILED → PAID si un Refund non-terminal existe (anti double-comptabilisation)", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(
			createOrder({ id: VALID_CUID, paymentStatus: "FAILED" }),
		);
		mockPrisma.refund.findFirst.mockResolvedValue({ id: "ref-existing" });

		const result = await markAsPaid(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toMatch(/remboursement/i);
		expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
	});

	it("refuse PAID → PAID (idempotence préservée)", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(
			createOrder({ id: VALID_CUID, paymentStatus: "PAID" }),
		);

		const result = await markAsPaid(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toMatch(/payée/i);
	});

	it("refuse PARTIALLY_REFUNDED → PAID (déjà remboursée)", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(
			createOrder({ id: VALID_CUID, paymentStatus: "PARTIALLY_REFUNDED" }),
		);

		const result = await markAsPaid(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toMatch(/remboursée/i);
	});

	it("refuse REFUNDED → PAID (déjà remboursée)", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(
			createOrder({ id: VALID_CUID, paymentStatus: "REFUNDED" }),
		);

		const result = await markAsPaid(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
	});
});

describe("ORD-BIZ-004 — getOrderPermissions.canMarkAsPaid expose le bouton pour FAILED", () => {
	it("expose canMarkAsPaid sur PENDING + FAILED ; refuse PAID/REFUNDED", async () => {
		const { getOrderPermissions } = await import("../../services/order-status-validation.service");

		expect(
			getOrderPermissions({
				status: "PENDING",
				paymentStatus: "PENDING",
				fulfillmentStatus: "UNFULFILLED",
				trackingNumber: null,
			}).canMarkAsPaid,
		).toBe(true);

		expect(
			getOrderPermissions({
				status: "PENDING",
				paymentStatus: "FAILED",
				fulfillmentStatus: "UNFULFILLED",
				trackingNumber: null,
			}).canMarkAsPaid,
		).toBe(true);

		expect(
			getOrderPermissions({
				status: "PROCESSING",
				paymentStatus: "PAID",
				fulfillmentStatus: "PROCESSING",
				trackingNumber: null,
			}).canMarkAsPaid,
		).toBe(false);

		expect(
			getOrderPermissions({
				status: "PENDING",
				paymentStatus: "REFUNDED",
				fulfillmentStatus: "UNFULFILLED",
				trackingNumber: null,
			}).canMarkAsPaid,
		).toBe(false);

		expect(
			getOrderPermissions({
				status: "CANCELLED",
				paymentStatus: "FAILED",
				fulfillmentStatus: "UNFULFILLED",
				trackingNumber: null,
			}).canMarkAsPaid,
		).toBe(false);
	});
});
