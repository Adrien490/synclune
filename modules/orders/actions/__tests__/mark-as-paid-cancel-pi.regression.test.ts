/**
 * @regression ORD-BIZ-007
 *
 * Garantit que `markAsPaid` annule le `PaymentIntent` Stripe (`stripePaymentIntentId`)
 * après commit transaction, pour éviter une double-charge si le client paie ensuite
 * via le lien checkout original.
 *
 * Best-effort post-commit : pas de rollback si Stripe refuse (payment_intent_unexpected_state
 * = PI déjà succeeded/canceled → silent skip ; toute autre erreur → Sentry warning).
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
	mockStripePaymentIntentsCancel,
	mockSentryCaptureException,
	mockSentryWithScope,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findUnique: vi.fn(), update: vi.fn() },
		productSku: { updateMany: vi.fn() },
		orderHistory: { create: vi.fn() },
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
	mockStripePaymentIntentsCancel: vi.fn(),
	mockSentryCaptureException: vi.fn(),
	mockSentryWithScope: vi.fn((cb: (scope: unknown) => void) =>
		cb({
			setLevel: vi.fn(),
			setTag: vi.fn(),
			setContext: vi.fn(),
		}),
	),
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
vi.mock("@/shared/constants/urls", () => ({
	buildUrl: mockBuildUrl,
	ROUTES: { ACCOUNT: { ORDER_DETAIL: (n: string) => `/compte/commandes/${n}` } },
}));
vi.mock("../../constants/order.constants", () => ({
	ORDER_ERROR_MESSAGES: {
		NOT_FOUND: "La commande n'existe pas.",
		ALREADY_PAID: "Cette commande est deja payee.",
		CANNOT_PAY_CANCELLED: "Une commande annulee ne peut pas etre marquee comme payee.",
		MARK_AS_PAID_FAILED: "Erreur lors du marquage.",
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
vi.mock("../../utils/invoice-token", () => ({
	generateInvoiceAccessToken: vi.fn().mockReturnValue("token"),
}));

vi.mock("@/shared/lib/stripe", () => ({
	stripe: { paymentIntents: { cancel: mockStripePaymentIntentsCancel } },
}));

vi.mock("@sentry/nextjs", () => ({
	withScope: mockSentryWithScope,
	captureException: mockSentryCaptureException,
	captureMessage: vi.fn(),
	addBreadcrumb: vi.fn(),
	startSpan: vi.fn((_opts: unknown, cb: () => unknown) => cb()),
}));

import { markAsPaid } from "../mark-as-paid";

const validFormData = createMockFormData({ id: VALID_CUID });

function createPendingOrder(overrides: Record<string, unknown> = {}) {
	return createMockOrder({
		status: "PENDING",
		paymentStatus: "PENDING",
		stripeCheckoutSessionId: null,
		stripePaymentIntentId: null,
		...overrides,
	});
}

describe("ORD-BIZ-007 — mark-as-paid annule le PaymentIntent Stripe", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRequireAdminWithUser.mockResolvedValue({
			user: { id: "admin-1", name: "Admin Test" },
		});
		mockEnforceRateLimit.mockResolvedValue({ rateLimited: false });
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => unknown) =>
			fn(mockPrisma),
		);
		mockSendOrderConfirmationEmail.mockResolvedValue(undefined);
	});

	it("appelle stripe.paymentIntents.cancel quand stripePaymentIntentId est présent", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(
			createPendingOrder({
				id: VALID_CUID,
				stripePaymentIntentId: "pi_open_1",
				stripeCheckoutSessionId: "cs_1",
				items: [],
			}),
		);
		mockStripePaymentIntentsCancel.mockResolvedValue({ id: "pi_open_1", status: "canceled" });

		const result = await markAsPaid(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockStripePaymentIntentsCancel).toHaveBeenCalledWith("pi_open_1", {
			cancellation_reason: "abandoned",
		});
	});

	it("ne fait PAS d'appel Stripe quand stripePaymentIntentId est null", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(
			createPendingOrder({
				id: VALID_CUID,
				stripePaymentIntentId: null,
				// EINV-CASH-001 : preuve Stripe via Checkout Session (paiement carte
				// dont le PI n'a pas été persisté) — le garde `no_stripe_proof` passe,
				// et l'absence de PI ⇒ aucun appel paymentIntents.cancel.
				stripeCheckoutSessionId: "cs_no_pi",
				items: [],
			}),
		);

		const result = await markAsPaid(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockStripePaymentIntentsCancel).not.toHaveBeenCalled();
	});

	it("ne capture PAS d'exception Sentry sur payment_intent_unexpected_state (PI déjà terminal)", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(
			createPendingOrder({
				id: VALID_CUID,
				stripePaymentIntentId: "pi_already_succeeded",
				stripeCheckoutSessionId: "cs_1",
				items: [],
			}),
		);
		mockStripePaymentIntentsCancel.mockRejectedValue(
			new Error(
				"This PaymentIntent's status (succeeded) is not in a valid state. (payment_intent_unexpected_state)",
			),
		);

		const result = await markAsPaid(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSentryCaptureException).not.toHaveBeenCalled();
	});

	it("capture Sentry warning si l'appel Stripe échoue avec une autre erreur (double-charge possible)", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(
			createPendingOrder({
				id: VALID_CUID,
				stripePaymentIntentId: "pi_unreachable",
				stripeCheckoutSessionId: "cs_1",
				items: [],
			}),
		);
		mockStripePaymentIntentsCancel.mockRejectedValue(new Error("Network unreachable"));

		const result = await markAsPaid(undefined, validFormData);

		// L'action reste SUCCESS (best-effort, pas de rollback)
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSentryCaptureException).toHaveBeenCalledTimes(1);
	});

	it("ne rollback PAS la commande si l'appel cancel Stripe échoue", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(
			createPendingOrder({
				id: VALID_CUID,
				stripePaymentIntentId: "pi_x",
				stripeCheckoutSessionId: "cs_1",
				items: [],
			}),
		);
		mockStripePaymentIntentsCancel.mockRejectedValue(new Error("Stripe outage"));

		const result = await markAsPaid(undefined, validFormData);

		// La commande a bien été mutée (update appelé dans la transaction)
		expect(mockPrisma.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ paymentStatus: "PAID" }),
			}),
		);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});
});
