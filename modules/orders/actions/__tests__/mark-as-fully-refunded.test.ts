import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import {
	createMockFormData,
	createMockOrder,
	VALID_CUID,
	VALID_USER_ID,
	VALID_ORDER_ID,
} from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

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
	// EINV-CREDIT-004 : hoister ces 2 mocks pour pouvoir les re-set après
	// `vi.resetAllMocks()` du beforeEach. Sans accès au nom hoisted, le mock
	// inline (`vi.fn().mockResolvedValue(...)` dans vi.mock) est vidé par reset
	// et retourne undefined → `creditNoteResult.kind` throw TypeError ligne 275.
	mockIssueCreditNoteForRefund,
	mockSendRefundConfirmationOnce,
} = vi.hoisted(() => ({
	mockPrisma: {
		// IDEM-CANCEL-001 : claim atomique order.updateMany (précondition
		// paymentStatus PAID/PARTIALLY_REFUNDED dans le where, retour { count })
		// remplace l'ancien order.update final.
		order: { findUnique: vi.fn(), updateMany: vi.fn() },
		refund: {
			count: vi.fn().mockResolvedValue(0),
			// EINV-CREDIT-004 : créé pour traçabilité du flux financier manuel.
			create: vi.fn().mockResolvedValue({ id: "refund-manual-1" }),
		},
		// IDEM-CANCEL-001 : advisory lock acquireOrderPaidLockTx → tx.$queryRaw
		$queryRaw: vi.fn(),
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
	mockIssueCreditNoteForRefund: vi.fn(),
	mockSendRefundConfirmationOnce: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));
vi.mock("@/modules/admin-auth/lib/require-admin", () => ({
	requireAdmin: mockRequireAdmin,
	requireAdminWithUser: mockRequireAdmin,
}));
vi.mock("@/modules/admin-auth/lib/rate-limit-helpers", () => ({
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
	ORDERS_CACHE_TAGS: { REFUNDS: (orderId: string) => `order-refunds-${orderId}` },
}));
// SSOT refund (P3 audit 2026-08-01) : le Refund manuel créé invalide aussi
// refunds-list / refund-<id> / ADMIN_BADGES via le helper refund.
vi.mock("@/modules/refunds/constants/cache", () => ({
	getRefundInvalidationTags: (refundId: string, orderId: string) => [
		"refunds-list",
		`refund-${refundId}`,
		`order-refunds-${orderId}`,
		"admin-badges",
	],
}));
vi.mock("@/modules/refunds/services/send-refund-confirmation.service", () => ({
	sendRefundConfirmationOnce: mockSendRefundConfirmationOnce,
}));
vi.mock("@/shared/constants/urls", () => ({
	buildUrl: (path: string) => `https://synclune.test${path}`,
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
		ALREADY_FULLY_REFUNDED: "Cette commande est déjà entièrement remboursée.",
		CANNOT_REFUND_NOT_PAID: "Seules les commandes payées peuvent être remboursées.",
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
	// par catch handleActionError → tests passent à 'error' au lieu de 'success'.
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
	InvoiceStatus: {
		PENDING: "PENDING",
		GENERATED: "GENERATED",
		VOIDED: "VOIDED",
	},
}));

vi.mock("../../services/void-invoice.service", () => ({
	voidInvoice: vi.fn().mockResolvedValue({ kind: "noop", reason: "no-active-invoice" }),
}));

// EINV-CREDIT-004 : markAsFullyRefunded crée un Refund + appelle ces 2 services
// best-effort hors transaction. Mocké pour isoler les tests legacy de l'avoir
// comptable (couvert dans issue-credit-note.service.test.ts).
vi.mock("@/modules/refunds/services/issue-credit-note.service", () => ({
	issueCreditNoteForRefund: mockIssueCreditNoteForRefund,
}));

vi.mock("../../schemas/order.schemas", () => ({
	markAsFullyRefundedSchema: {},
}));

import { markAsFullyRefunded } from "../mark-as-fully-refunded";

// ============================================================================
// TESTS
// ============================================================================

const validFormData = createMockFormData({
	id: VALID_CUID,
	reason: "Geste commercial",
	manualRefundMethod: "goodwill",
});

describe("markAsFullyRefunded", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "admin@x.com" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockSanitizeText.mockImplementation((t: string) => t);
		mockValidateInput.mockReturnValue({
			data: { id: VALID_CUID, reason: "Geste commercial", manualRefundMethod: "goodwill" },
		});
		mockGetOrderInvalidationTags.mockReturnValue(["orders-list"]);

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.order.findUnique.mockResolvedValue(createMockOrder({ paymentStatus: "PAID" }));
		mockPrisma.$queryRaw.mockResolvedValue([]);
		mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
		// EINV-CREDIT-004 : vi.resetAllMocks() reset les mockResolvedValue de la
		// hoisted — il faut re-set ici. Sans ça, `tx.refund.create` retourne
		// undefined → TypeError silencieuse sur `createdRefund.id` → tests "succeeds
		// when..." passent à 'error' (pattern « green for the wrong reason »).
		mockPrisma.refund.count.mockResolvedValue(0);
		mockPrisma.refund.create.mockResolvedValue({ id: "refund-manual-1" });
		mockIssueCreditNoteForRefund.mockResolvedValue({ kind: "noop", reason: "missing" });
		// Idem : reset → undefined → `.catch` sur undefined → TypeError silencieuse.
		mockSendRefundConfirmationOnce.mockResolvedValue({ sent: true, skipped: false });

		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("returns auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.FORBIDDEN, message: "Admin requis" },
		});
		const result = await markAsFullyRefunded(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
	});

	it("returns rate limit error when exceeded", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Limite" },
		});
		const result = await markAsFullyRefunded(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("returns validation error for invalid input", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "ID invalide" },
		});
		const result = await markAsFullyRefunded(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("returns NOT_FOUND when order does not exist", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);
		const result = await markAsFullyRefunded(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("returns error when order is already REFUNDED", async () => {
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				mockPrisma.order.findUnique.mockResolvedValue(
					createMockOrder({ paymentStatus: "REFUNDED" }),
				);
				return fn(mockPrisma);
			},
		);
		const result = await markAsFullyRefunded(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("déjà");
	});

	it("returns error when order is PENDING (not paid)", async () => {
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				mockPrisma.order.findUnique.mockResolvedValue(
					createMockOrder({ paymentStatus: "PENDING" }),
				);
				return fn(mockPrisma);
			},
		);
		const result = await markAsFullyRefunded(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("payées");
	});

	it("succeeds when order is PAID", async () => {
		const result = await markAsFullyRefunded(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		// IDEM-CANCEL-001 : claim atomique — le where porte la précondition
		// PAID/PARTIALLY_REFUNDED, la data fait la transition REFUNDED.
		expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					id: VALID_CUID,
					paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED"] },
				}),
				data: { paymentStatus: "REFUNDED" },
			}),
		);
	});

	// IDEM-CANCEL-001 : count===0 ⇒ un concurrent a déjà posé REFUNDED entre le
	// findUnique et le claim → abort SANS créer de Refund doublon (200 % compta).
	it("returns already-refunded error when the atomic claim matches no row", async () => {
		mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });

		const result = await markAsFullyRefunded(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("déjà");
		expect(mockPrisma.refund.create).not.toHaveBeenCalled();
		expect(mockCreateOrderAuditTx).not.toHaveBeenCalled();
	});

	it("succeeds when order is PARTIALLY_REFUNDED", async () => {
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				mockPrisma.order.findUnique.mockResolvedValue(
					createMockOrder({ paymentStatus: "PARTIALLY_REFUNDED" }),
				);
				return fn(mockPrisma);
			},
		);
		const result = await markAsFullyRefunded(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("creates audit trail with REFUND_COMPLETED", async () => {
		await markAsFullyRefunded(undefined, validFormData);
		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			mockPrisma,
			expect.objectContaining({
				action: "REFUND_COMPLETED",
				previousPaymentStatus: "PAID",
				newPaymentStatus: "REFUNDED",
				note: "Geste commercial",
				metadata: expect.objectContaining({ manual: true }),
			}),
		);
	});

	it("invalidates order caches", async () => {
		await markAsFullyRefunded(undefined, validFormData);
		expect(mockGetOrderInvalidationTags).toHaveBeenCalledWith(expect.any(String));
		expect(mockUpdateTag).toHaveBeenCalled();
	});

	// Audit statuts commande 2026-07-02 (F2a) : getOrderInvalidationTags omet
	// volontairement REFUNDS — le Refund manuel créé doit invalider explicitement
	// la liste des remboursements de la fiche admin (sinon stale ~10 min).
	it("invalidates the order REFUNDS tag when a manual refund is created", async () => {
		await markAsFullyRefunded(undefined, validFormData);
		expect(mockUpdateTag).toHaveBeenCalledWith(`order-refunds-${VALID_ORDER_ID}`);
	});

	// Audit statuts commande 2026-07-02 (F2b) : le client remboursé hors-Stripe
	// (chèque, virement, geste) doit être notifié — même émetteur unique que le
	// chemin Stripe/webhook/cron (ORD-STRIPE-005, claim atomique).
	describe("email client remboursement hors-Stripe", () => {
		it("envoie la confirmation via sendRefundConfirmationOnce avec le Refund créé", async () => {
			await markAsFullyRefunded(undefined, validFormData);

			expect(mockSendRefundConfirmationOnce).toHaveBeenCalledWith(
				expect.objectContaining({
					refundId: "refund-manual-1",
					to: "client@example.com",
					orderNumber: "SYN-2026-0001",
					refundAmount: 4999,
					reason: "OTHER",
				}),
			);
		});

		it("n'envoie RIEN quand aucun Refund n'est créé (solde déjà couvert)", async () => {
			// Les refunds préexistants couvrent le total : pas de Refund manuel,
			// le chemin Stripe a déjà notifié le client — pas de tag REFUNDS non plus.
			mockPrisma.order.findUnique.mockResolvedValue(
				createMockOrder({
					paymentStatus: "PARTIALLY_REFUNDED",
					refunds: [{ amount: 4999 }],
				}),
			);

			const result = await markAsFullyRefunded(undefined, validFormData);

			expect(result.status).toBe(ActionStatus.SUCCESS);
			expect(mockPrisma.refund.create).not.toHaveBeenCalled();
			expect(mockSendRefundConfirmationOnce).not.toHaveBeenCalled();
			expect(mockUpdateTag).not.toHaveBeenCalledWith(`order-refunds-${VALID_ORDER_ID}`);
		});

		it("reste SUCCESS si l'envoi échoue (best-effort, transition déjà committée)", async () => {
			mockSendRefundConfirmationOnce.mockRejectedValue(new Error("Resend down"));

			const result = await markAsFullyRefunded(undefined, validFormData);

			expect(result.status).toBe(ActionStatus.SUCCESS);
		});
	});

	it("uses transaction for atomic operation (with explicit advisory-lock timeouts)", async () => {
		await markAsFullyRefunded(undefined, validFormData);
		// IDEM-CANCEL-001 : l'attente derrière l'advisory lock compte dans le
		// timeout de la tx → overrides explicites (cf. CLAUDE.md).
		expect(mockPrisma.$transaction).toHaveBeenCalledWith(
			expect.any(Function),
			expect.objectContaining({
				timeout: expect.any(Number),
				maxWait: expect.any(Number),
			}),
		);
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await markAsFullyRefunded(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	// `RefundItem` est parti le 2026-08-05 : il n'y a plus de répartition par ligne,
	// donc plus d'arrondis à absorber ni de parts nulles à écarter. Ce qui reste —
	// et qui est le vrai invariant comptable — c'est que le Refund manuel porte
	// EXACTEMENT le solde restant, dérivé de `order.total - Σ Refund.amount`.
	describe("montant du Refund manuel", () => {
		function makeItem(id: string, price: number, quantity: number) {
			return { id, skuId: `sku-${id}`, quantity, price };
		}

		function createdRefundAmount() {
			expect(mockPrisma.refund.create).toHaveBeenCalledTimes(1);
			const arg = mockPrisma.refund.create.mock.calls[0]![0] as { data: { amount: number } };
			return arg.data.amount;
		}

		it("porte le SOLDE restant, pas le total de la commande", async () => {
			mockPrisma.order.findUnique.mockResolvedValue(
				createMockOrder({
					paymentStatus: "PAID",
					total: 400,
					refunds: [{ amount: 300 }],
					items: [makeItem("i1", 100, 1), makeItem("i2", 100, 1), makeItem("i3", 100, 1)],
				}),
			);

			const result = await markAsFullyRefunded(undefined, validFormData);

			expect(result.status).toBe(ActionStatus.SUCCESS);
			expect(createdRefundAmount()).toBe(100);
		});

		it("porte le total quand aucun remboursement n'existe encore", async () => {
			mockPrisma.order.findUnique.mockResolvedValue(
				createMockOrder({
					paymentStatus: "PAID",
					total: 500,
					refunds: [],
					items: [makeItem("i1", 500, 1)],
				}),
			);

			const result = await markAsFullyRefunded(undefined, validFormData);

			expect(result.status).toBe(ActionStatus.SUCCESS);
			expect(createdRefundAmount()).toBe(500);
		});

		it("ne crée pas de Refund quand tout est déjà remboursé (remainingAmount <= 0)", async () => {
			mockPrisma.order.findUnique.mockResolvedValue(
				createMockOrder({
					paymentStatus: "PARTIALLY_REFUNDED",
					total: 400,
					refunds: [{ amount: 400 }],
					items: [makeItem("i1", 400, 1)],
				}),
			);

			const result = await markAsFullyRefunded(undefined, validFormData);

			expect(result.status).toBe(ActionStatus.SUCCESS);
			expect(mockPrisma.refund.create).not.toHaveBeenCalled();
		});
	});

	it("uses default note (including manualRefundMethod) when reason is not provided", async () => {
		mockValidateInput.mockReturnValue({
			data: { id: VALID_CUID, reason: undefined, manualRefundMethod: "goodwill" },
		});
		const fdNoReason = createMockFormData({ id: VALID_CUID, manualRefundMethod: "goodwill" });
		await markAsFullyRefunded(undefined, fdNoReason);
		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			mockPrisma,
			expect.objectContaining({
				note: expect.stringMatching(/Marquée comme remboursée.*goodwill/i),
			}),
		);
	});
});
