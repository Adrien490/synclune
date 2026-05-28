/**
 * @regression mark-as-fully-refunded-void-invoice
 *
 * Garde-fou comptable Art. 272-I CGI : markAsFullyRefunded DOIT appeler
 * voidInvoice() quand la facture est `invoiceStatus=GENERATED` ET que
 * `invoiceNumber` est défini. Idempotent sur 2e appel (déjà VOIDED).
 *
 * Bug latent visé (EINV-TEST-004) : le test existant `mark-as-fully-refunded.test.ts`
 * mocke `voidInvoice` mais ne vérifie jamais son appel.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, createMockOrder, VALID_CUID } from "@/test/factories";

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockValidateInput,
	mockHandleActionError,
	mockUpdateTag,
	mockSanitizeText,
	mockCreateOrderAuditTx,
	mockGetOrderInvalidationTags,
	mockVoidInvoice,
	mockIssueCreditNoteForRefund,
	mockRecordRefundEReporting,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findUnique: vi.fn(), update: vi.fn() },
		refund: { count: vi.fn().mockResolvedValue(0), create: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockSanitizeText: vi.fn(),
	mockCreateOrderAuditTx: vi.fn(),
	mockGetOrderInvalidationTags: vi.fn(),
	mockVoidInvoice: vi.fn(),
	// EINV-CREDIT-001 : mark-as-fully-refunded.ts:275-276 câble ces 2 services
	// après création du Refund manuel. Sans ces mocks, le test est « green for
	// wrong reason » — il vérifie voidInvoice mais ignore l'émission d'avoir
	// rattachée au Refund (Art. 272-I CGI) ET la transmission e-reporting B2C.
	mockIssueCreditNoteForRefund: vi.fn(),
	mockRecordRefundEReporting: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdmin,
	requireAdminWithUser: mockRequireAdmin,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_ORDER_LIMITS: { SINGLE_OPERATIONS: "single" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
}));
vi.mock("@/shared/lib/sanitize", () => ({ sanitizeText: mockSanitizeText }));
vi.mock("../../utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
}));
vi.mock("../../constants/cache", () => ({
	getOrderInvalidationTags: mockGetOrderInvalidationTags,
}));
vi.mock("../../constants/order.constants", () => ({
	ORDER_ERROR_MESSAGES: {
		NOT_FOUND: "Commande introuvable.",
		ALREADY_FULLY_REFUNDED: "Cette commande est déjà entièrement remboursée.",
		CANNOT_REFUND_NOT_PAID: "Seules les commandes payées peuvent être remboursées.",
		PENDING_STRIPE_REFUNDS: "Refunds Stripe en cours, attendre traitement.",
		MARK_AS_FULLY_REFUNDED_FAILED: "Erreur lors du marquage de la commande comme remboursée.",
	},
}));
vi.mock("@/app/generated/prisma/client", () => ({
	PaymentStatus: {
		PENDING: "PENDING",
		PAID: "PAID",
		FAILED: "FAILED",
		EXPIRED: "EXPIRED",
		PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
		REFUNDED: "REFUNDED",
	},
	HistorySource: { ADMIN: "ADMIN", CUSTOMER: "CUSTOMER", SYSTEM: "SYSTEM" },
	RefundStatus: {
		PENDING: "PENDING",
		APPROVED: "APPROVED",
		COMPLETED: "COMPLETED",
		REJECTED: "REJECTED",
		FAILED: "FAILED",
		CANCELLED: "CANCELLED",
	},
	// EINV-CREDIT-004 : Refund manuel créé avec reason=OTHER. Sans ce mock,
	// `RefundReason.OTHER` throw TypeError → exception silencieusement attrapée
	// par le catch handleActionError → tests `mockVoidInvoice` non appelés
	// passent à 0 calls. C'est précisément le pattern « green for the wrong
	// reason » dont parle l'audit 2026-05-28.
	RefundReason: {
		CUSTOMER_REQUEST: "CUSTOMER_REQUEST",
		DEFECTIVE: "DEFECTIVE",
		WRONG_ITEM: "WRONG_ITEM",
		LOST_IN_TRANSIT: "LOST_IN_TRANSIT",
		FRAUD: "FRAUD",
		OTHER: "OTHER",
	},
	OrderAction: {
		REFUND_CREATED: "REFUND_CREATED",
		REFUND_COMPLETED: "REFUND_COMPLETED",
	},
	InvoiceStatus: { PENDING: "PENDING", GENERATED: "GENERATED", VOIDED: "VOIDED" },
}));
vi.mock("../../services/void-invoice.service", () => ({
	voidInvoice: mockVoidInvoice,
}));
vi.mock("@/modules/refunds/services/issue-credit-note.service", () => ({
	issueCreditNoteForRefund: mockIssueCreditNoteForRefund,
}));
vi.mock("@/modules/invoices/services/record-ereporting.service", () => ({
	recordRefundEReporting: mockRecordRefundEReporting,
}));
vi.mock("../../schemas/order.schemas", () => ({
	markAsFullyRefundedSchema: {},
}));

import { markAsFullyRefunded } from "../mark-as-fully-refunded";

const validFormData = createMockFormData({
	id: VALID_CUID,
	reason: "Geste commercial",
});

function setupOrderInTx(orderOverrides: Record<string, unknown>) {
	mockPrisma.$transaction.mockImplementation(
		async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
			mockPrisma.order.findUnique.mockResolvedValue(createMockOrder(orderOverrides));
			return fn(mockPrisma);
		},
	);
}

describe("@regression mark-as-fully-refunded-void-invoice — EINV-TEST-004", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRequireAdmin.mockResolvedValue({
			user: { id: "admin-1", name: "Admin Sophie", email: "admin@x.com" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockSanitizeText.mockImplementation((t: string) => t);
		mockValidateInput.mockReturnValue({
			data: { id: VALID_CUID, reason: "Geste commercial" },
		});
		mockGetOrderInvalidationTags.mockReturnValue(["orders-list"]);
		mockVoidInvoice.mockResolvedValue({
			kind: "voided",
			creditNoteNumber: "A-2026-00099",
			creditNoteGeneratedAt: new Date(),
			invoiceVoidedAt: new Date(),
		});
		// Defaults : noop par défaut (les tests qui ciblent l'émission overrident).
		mockIssueCreditNoteForRefund.mockResolvedValue({
			kind: "noop",
			reason: "refund-not-completed",
		});
		mockRecordRefundEReporting.mockResolvedValue(undefined);
		mockPrisma.refund.create.mockResolvedValue({ id: "refund-manual-1" });

		setupOrderInTx({
			paymentStatus: "PAID",
			invoiceStatus: "GENERATED",
			invoiceNumber: "F-2026-00200",
		});
		mockPrisma.order.update.mockResolvedValue({});
		mockPrisma.refund.count.mockResolvedValue(0);
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	describe("invoice GENERATED — voidInvoice IS called", () => {
		it("appelle voidInvoice avec orderId + authorId admin + source=ADMIN", async () => {
			await markAsFullyRefunded(undefined, validFormData);

			expect(mockVoidInvoice).toHaveBeenCalledTimes(1);
			expect(mockVoidInvoice).toHaveBeenCalledWith({
				orderId: expect.any(String),
				authorId: "admin-1",
				authorName: "Admin Sophie",
				source: "ADMIN",
				reason: "Geste commercial",
			});
		});

		it("utilise la raison par défaut quand reason est null", async () => {
			mockValidateInput.mockReturnValue({
				data: { id: VALID_CUID, reason: undefined },
			});
			const fdNoReason = createMockFormData({ id: VALID_CUID });

			await markAsFullyRefunded(undefined, fdNoReason);

			expect(mockVoidInvoice).toHaveBeenCalledWith(
				expect.objectContaining({
					reason: "Avoir suite à remboursement total manuel",
				}),
			);
		});

		it("message de succès contient le numéro d'avoir A-YYYY-NNNNN", async () => {
			const result = await markAsFullyRefunded(undefined, validFormData);

			expect(result.status).toBe(ActionStatus.SUCCESS);
			expect(result.message).toContain("F-2026-00200");
			expect(result.message).toContain("A-2026-00099");
		});

		it("EINV-CREDIT-001 garde anti-green-for-wrong-reason : issueCreditNoteForRefund + recordRefundEReporting SONT appelés sur le Refund manuel", async () => {
			// Sans cette assertion, le test aurait été « green for the wrong reason »
			// si un dev futur retirait l'appel à issueCreditNoteForRefund — le mock
			// vi.fn() couvrirait silencieusement la régression (cf audit 2026-05-28).
			mockIssueCreditNoteForRefund.mockResolvedValue({
				kind: "issued",
				creditNoteNumber: "A-2026-00101",
				creditNoteGeneratedAt: new Date(),
			});

			await markAsFullyRefunded(undefined, validFormData);

			expect(mockIssueCreditNoteForRefund).toHaveBeenCalledTimes(1);
			expect(mockIssueCreditNoteForRefund).toHaveBeenCalledWith(
				expect.objectContaining({
					refundId: expect.any(String),
					source: "ADMIN",
				}),
			);
			expect(mockRecordRefundEReporting).toHaveBeenCalledTimes(1);
		});
	});

	describe("invoice non-GENERATED — voidInvoice NOT called", () => {
		it("ne déclenche PAS voidInvoice quand invoiceStatus=PENDING", async () => {
			setupOrderInTx({
				paymentStatus: "PAID",
				invoiceStatus: "PENDING",
				invoiceNumber: null,
			});

			await markAsFullyRefunded(undefined, validFormData);

			expect(mockVoidInvoice).not.toHaveBeenCalled();
		});

		it("ne déclenche PAS voidInvoice quand invoiceStatus=VOIDED (déjà invalidée)", async () => {
			setupOrderInTx({
				paymentStatus: "PARTIALLY_REFUNDED",
				invoiceStatus: "VOIDED",
				invoiceNumber: "F-2026-00033",
			});

			await markAsFullyRefunded(undefined, validFormData);

			expect(mockVoidInvoice).not.toHaveBeenCalled();
		});

		it("ne déclenche PAS voidInvoice quand invoiceNumber est null malgré invoiceStatus GENERATED (état incohérent)", async () => {
			setupOrderInTx({
				paymentStatus: "PAID",
				invoiceStatus: "GENERATED",
				invoiceNumber: null,
			});

			await markAsFullyRefunded(undefined, validFormData);

			expect(mockVoidInvoice).not.toHaveBeenCalled();
		});
	});

	describe("idempotence — 2e appel sur Order déjà REFUNDED", () => {
		it("2e appel court-circuité au check already_refunded ; voidInvoice non appelé", async () => {
			setupOrderInTx({
				paymentStatus: "REFUNDED",
				invoiceStatus: "VOIDED",
				invoiceNumber: "F-2026-00111",
			});

			const result = await markAsFullyRefunded(undefined, validFormData);

			expect(result.status).toBe(ActionStatus.ERROR);
			expect(result.message).toContain("déjà");
			expect(mockVoidInvoice).not.toHaveBeenCalled();
		});
	});
});
