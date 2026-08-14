/**
 * @regression cancel-order-void-invoice
 *
 * Garde-fou comptable Art. 272-I CGI : cancelOrder DOIT appeler voidInvoice()
 * avec les bons arguments (orderId, authorName, source=ADMIN, reason)
 * UNIQUEMENT quand la facture est `invoiceStatus=GENERATED`.
 *
 * Bug latent visé (EINV-TEST-003) : le test existant `cancel-order.test.ts`
 * mocke `voidInvoice` mais ne vérifie jamais son appel. Un refactor peut casser
 * silencieusement le branchement post-tx (`if (order._invoiceVoided)`) sans
 * qu'aucun test rouge ne le signale → émission avoir cassée Art. 272-I CGI.
 *
 * Complète aussi l'alerte Sentry sur `kind: "failed"` quand paymentStatus passe
 * à REFUNDED (cf EINV-CREDIT-008).
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
	mockAfter,
	mockHandleActionError,
	mockSendCancelEmail,
	mockSanitizeText,
	mockCanCancelOrder,
	mockCreateOrderAuditTx,
	mockBuildUrl,
	mockGetOrderInvalidationTags,
	mockVoidInvoice,
	mockSentryWithScope,
	mockSentryCaptureMessage,
} = vi.hoisted(() => ({
	mockPrisma: {
		// IDEM-CANCEL-001 : claim atomique order.updateMany ({ count }) remplace
		// l'ancien order.update inconditionnel.
		order: { findUnique: vi.fn(), updateMany: vi.fn() },
		// P1-1 : le restock lit l'état AVANT crédit (discriminant de réactivation).
		productSku: { update: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
		discountUsage: { findMany: vi.fn(), deleteMany: vi.fn() },
		discount: { update: vi.fn() },
		refund: {
			create: vi.fn(),
			aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 0 } }),
		},
		// ORD-STRIPE-007 : hasOpenDisputeTx compte les entrees d'audit DISPUTE_OPENED
		// vs DISPUTE_RESOLVED (le modele Dispute a ete retire en V1). 0/0 = aucun litige.
		orderHistory: { create: vi.fn(), count: vi.fn().mockResolvedValue(0) },
		// IDEM-CANCEL-001 : advisory lock acquireOrderPaidLockTx → tx.$queryRaw
		$queryRaw: vi.fn(),
		$transaction: vi.fn(),
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockAfter: vi.fn((fn: () => Promise<void>) => fn()),
	mockHandleActionError: vi.fn(),
	mockSendCancelEmail: vi.fn(),
	mockSanitizeText: vi.fn(),
	mockCanCancelOrder: vi.fn(),
	mockCreateOrderAuditTx: vi.fn(),
	mockBuildUrl: vi.fn(),
	mockGetOrderInvalidationTags: vi.fn(),
	mockVoidInvoice: vi.fn(),
	mockSentryWithScope: vi.fn(),
	mockSentryCaptureMessage: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/admin-auth/lib/require-admin", () => ({
	requireAdmin: mockRequireAdminWithUser,
	requireAdminWithUser: mockRequireAdminWithUser,
}));

vi.mock("@/modules/admin-auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_ORDER_LIMITS: { SINGLE_OPERATIONS: "admin-order-single" },
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("next/server", () => ({ after: mockAfter }));

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

vi.mock("@/modules/emails/services/status-emails", () => ({
	sendCancelOrderConfirmationEmail: mockSendCancelEmail,
}));

vi.mock("@/shared/lib/sanitize", () => ({ sanitizeText: mockSanitizeText }));

vi.mock("../../services/order-status-validation.service", () => ({
	canCancelOrder: mockCanCancelOrder,
}));

vi.mock("../../utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
}));

vi.mock("../../services/void-invoice.service", () => ({
	voidInvoice: mockVoidInvoice,
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

vi.mock("../../schemas/order.schemas", () => ({
	cancelOrderSchema: {
		safeParse: vi
			.fn()
			.mockReturnValue({ success: true, data: { id: VALID_CUID, reason: "Test reason" } }),
	},
}));

vi.mock("../../constants/order.constants", () => ({
	ORDER_ERROR_MESSAGES: {
		NOT_FOUND: "La commande n'existe pas.",
		ALREADY_CANCELLED: "Cette commande est deja annulee.",
		CANCEL_FAILED: "Erreur lors de l'annulation de la commande.",
	},
}));

vi.mock("../../constants/cache", () => ({
	getOrderInvalidationTags: mockGetOrderInvalidationTags,
	ORDERS_CACHE_TAGS: { REFUNDS: (orderId: string) => `order-refunds-${orderId}` },
}));

vi.mock("@sentry/nextjs", () => ({
	withScope: mockSentryWithScope,
	captureMessage: mockSentryCaptureMessage,
}));

import { cancelOrder } from "../cancel-order";
import { cancelOrderSchema } from "../../schemas/order.schemas";

// ORD-BIZ-009 : autoRefund=true requis pour annuler une commande PAID
const validFormData = createMockFormData({
	id: VALID_CUID,
	reason: "Annulation client",
	autoRefund: "true",
});

function createTxOrder(overrides: Record<string, unknown> = {}) {
	return createMockOrder({
		status: "PROCESSING",
		paymentStatus: "PAID",
		invoiceNumber: null,
		invoiceStatus: null,
		...overrides,
	});
}

describe("@regression cancel-order-void-invoice — EINV-TEST-003", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		// ⚠️ `resetAllMocks` efface les implémentations posées au hoist : le retour de
		// `findMany` DOIT être réarmé ici, sinon il rend `undefined` et le restock lève.
		mockPrisma.productSku.findMany.mockResolvedValue([]);
		mockAfter.mockImplementation((fn: () => Promise<void>) => fn());
		mockRequireAdminWithUser.mockResolvedValue({
			user: { id: "admin-1", name: "Léane" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockSanitizeText.mockImplementation((t: string) => t);
		mockCanCancelOrder.mockReturnValue(true);
		mockCreateOrderAuditTx.mockResolvedValue(undefined);
		mockSendCancelEmail.mockResolvedValue(undefined);
		mockBuildUrl.mockReturnValue("https://synclune.fr/compte/commandes/SYN-2026-0001");
		mockGetOrderInvalidationTags.mockReturnValue(["orders-list"]);
		mockVoidInvoice.mockResolvedValue({
			kind: "voided",
			creditNoteNumber: "A-2026-00042",
			creditNoteGeneratedAt: new Date("2026-05-28"),
			invoiceVoidedAt: new Date("2026-05-28"),
		});

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.order.findUnique.mockResolvedValue(createTxOrder());
		mockPrisma.$queryRaw.mockResolvedValue([]);
		mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
		mockPrisma.productSku.update.mockResolvedValue({});
		mockPrisma.discountUsage.findMany.mockResolvedValue([]);
		mockPrisma.refund.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
		// ORD-BIZ-009 : autoRefund=true crée un Refund (DB write requires mock)
		mockPrisma.refund.create.mockResolvedValue({ id: "ref-auto-1" });

		vi.mocked(cancelOrderSchema.safeParse).mockReturnValue({
			success: true,
			data: { id: VALID_CUID, reason: "Annulation client", autoRefund: true },
		} as never);

		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	describe("invoice GENERATED — voidInvoice must be called with admin context", () => {
		it("appelle voidInvoice avec orderId, authorName, source=ADMIN", async () => {
			const order = createTxOrder({
				invoiceNumber: "F-2026-00123",
				invoiceStatus: "GENERATED",
			});
			mockPrisma.order.findUnique.mockResolvedValue(order);

			await cancelOrder(undefined, validFormData);

			expect(mockVoidInvoice).toHaveBeenCalledTimes(1);
			expect(mockVoidInvoice).toHaveBeenCalledWith({
				orderId: order.id,
				authorName: "Léane",
				source: "ADMIN",
				reason: "Annulation client",
			});
		});

		it("utilise une raison par défaut quand sanitizedReason est null", async () => {
			vi.mocked(cancelOrderSchema.safeParse).mockReturnValue({
				success: true,
				data: { id: VALID_CUID, reason: undefined, autoRefund: true },
			} as never);
			const fdNoReason = createMockFormData({ id: VALID_CUID, autoRefund: "true" });
			mockPrisma.order.findUnique.mockResolvedValue(
				createTxOrder({ invoiceNumber: "F-2026-00045", invoiceStatus: "GENERATED" }),
			);

			await cancelOrder(undefined, fdNoReason);

			expect(mockVoidInvoice).toHaveBeenCalledWith(
				expect.objectContaining({
					reason: "Facture invalidée suite à annulation",
				}),
			);
		});

		it("retourne success message mentionnant creditNoteNumber A-YYYY-NNNNN", async () => {
			mockPrisma.order.findUnique.mockResolvedValue(
				createTxOrder({ invoiceNumber: "F-2026-00123", invoiceStatus: "GENERATED" }),
			);

			const result = await cancelOrder(undefined, validFormData);

			expect(result.status).toBe(ActionStatus.SUCCESS);
			expect(result.message).toContain("F-2026-00123");
			expect(result.message).toContain("A-2026-00042");
		});

		it("retourne success mais signale avoir à émettre manuellement quand voidInvoice noop already-voided sans num", async () => {
			mockVoidInvoice.mockResolvedValue({ kind: "noop", reason: "already-voided" });
			mockPrisma.order.findUnique.mockResolvedValue(
				createTxOrder({ invoiceNumber: "F-2026-00007", invoiceStatus: "GENERATED" }),
			);

			const result = await cancelOrder(undefined, validFormData);

			expect(result.status).toBe(ActionStatus.SUCCESS);
			expect(result.message).toContain("avoir à émettre manuellement");
		});
	});

	describe("invoice non-GENERATED — voidInvoice must NOT be called", () => {
		it("ne déclenche PAS voidInvoice quand invoiceStatus=PENDING", async () => {
			mockPrisma.order.findUnique.mockResolvedValue(
				createTxOrder({ invoiceNumber: null, invoiceStatus: null }),
			);

			await cancelOrder(undefined, validFormData);

			expect(mockVoidInvoice).not.toHaveBeenCalled();
		});

		it("ne déclenche PAS voidInvoice quand invoiceStatus=VOIDED (déjà invalidée)", async () => {
			mockPrisma.order.findUnique.mockResolvedValue(
				createTxOrder({
					invoiceNumber: "F-2026-00001",
					invoiceStatus: "VOIDED",
				}),
			);

			await cancelOrder(undefined, validFormData);

			expect(mockVoidInvoice).not.toHaveBeenCalled();
		});

		it("ne déclenche PAS voidInvoice pour une commande PENDING payment sans facture", async () => {
			mockPrisma.order.findUnique.mockResolvedValue(
				createTxOrder({ paymentStatus: "PENDING", invoiceStatus: null, invoiceNumber: null }),
			);

			await cancelOrder(undefined, validFormData);

			expect(mockVoidInvoice).not.toHaveBeenCalled();
		});
	});

	describe("voidInvoice failed → Sentry alert quand paymentStatus=REFUNDED", () => {
		it("Sentry.captureMessage fire quand voidInvoice failed + paymentStatus passe à REFUNDED", async () => {
			mockVoidInvoice.mockResolvedValue({ kind: "failed", error: "MAX_RETRIES exceeded" });
			mockSentryWithScope.mockImplementation((cb: (scope: unknown) => void) => {
				cb({
					setLevel: vi.fn(),
					setTag: vi.fn(),
					setFingerprint: vi.fn(),
					setContext: vi.fn(),
				});
			});
			mockPrisma.order.findUnique.mockResolvedValue(
				createTxOrder({
					invoiceNumber: "F-2026-00001",
					invoiceStatus: "GENERATED",
					paymentStatus: "PAID",
				}),
			);

			const result = await cancelOrder(undefined, validFormData);

			expect(mockSentryCaptureMessage).toHaveBeenCalledWith(
				expect.stringContaining("voidInvoice failed"),
				"error",
			);
			expect(result.status).toBe(ActionStatus.SUCCESS);
		});

		it("Sentry NE fire PAS quand voidInvoice failed mais paymentStatus reste FAILED (PENDING→FAILED)", async () => {
			mockVoidInvoice.mockResolvedValue({ kind: "failed", error: "X" });
			mockPrisma.order.findUnique.mockResolvedValue(
				createTxOrder({
					invoiceNumber: "F-2026-00001",
					invoiceStatus: "GENERATED",
					paymentStatus: "PENDING",
				}),
			);

			await cancelOrder(undefined, validFormData);

			expect(mockSentryCaptureMessage).not.toHaveBeenCalled();
		});
	});
});
