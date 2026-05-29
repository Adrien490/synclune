import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

// ============================================================================
// Hoisted mocks - must be declared before any imports
// ============================================================================

const {
	mockTx,
	mockPrisma,
	mockGetBaseUrl,
	mockROUTES,
	mockCreateOrderAuditTx,
	mockVoidInvoice,
	mockIssueCreditNoteForRefund,
	mockRecordRefundEReporting,
} = vi.hoisted(() => {
	const mockTx = {
		dispute: {
			create: vi.fn(),
			findUnique: vi.fn(),
			update: vi.fn(),
		},
		order: {
			update: vi.fn(),
		},
		orderNote: {
			create: vi.fn(),
		},
		refund: {
			aggregate: vi.fn(),
			create: vi.fn(),
		},
		orderHistory: {
			create: vi.fn(),
		},
	};

	return {
		mockTx,
		mockPrisma: {
			$transaction: vi.fn(),
			dispute: {
				findUnique: vi.fn(),
				update: vi.fn(),
			},
			order: {
				findFirst: vi.fn(),
				findUnique: vi.fn(),
				update: vi.fn(),
			},
			orderNote: {
				findFirst: vi.fn(),
				create: vi.fn(),
			},
		},
		mockGetBaseUrl: vi.fn(),
		mockROUTES: {
			ADMIN: {
				ORDER_DETAIL: (orderId: string) => `/admin/ventes/commandes/${orderId}`,
			},
		},
		mockCreateOrderAuditTx: vi.fn(),
		mockVoidInvoice: vi.fn(),
		mockIssueCreditNoteForRefund: vi.fn(),
		mockRecordRefundEReporting: vi.fn(),
	};
});

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/shared/constants/urls", () => ({
	getBaseUrl: mockGetBaseUrl,
	ROUTES: mockROUTES,
	EXTERNAL_URLS: {
		STRIPE: {
			DISPUTE: (disputeId: string) => `https://dashboard.stripe.com/test/disputes/${disputeId}`,
		},
	},
}));

vi.mock("@/modules/orders/constants/cache", () => ({
	ORDERS_CACHE_TAGS: {
		LIST: "orders-list",
		NOTES: (orderId: string) => `order-notes-${orderId}`,
	},
	// CACHE-AUDIT-010 : miroir de l'implémentation réelle (cf.
	// modules/orders/constants/cache.ts) pour vérifier que le chargeback perdu
	// invalide bien les tags user-scopés + détail commande, pas une liste partielle.
	getOrderInvalidationTags: (userId?: string, orderId?: string) => {
		const tags = ["orders-list", "admin-badges", "admin-orders-list"];
		if (userId) {
			tags.push(
				`orders-user-${userId}`,
				`last-order-user-${userId}`,
				`account-stats-${userId}`,
				`user-orders-count-${userId}`,
			);
		}
		if (orderId) {
			tags.push(
				`order-history-${orderId}`,
				`order-confirmation-${orderId}`,
				`order-detail-${orderId}`,
			);
		}
		return tags;
	},
}));

vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: {
		ADMIN_BADGES: "admin-badges",
	},
}));

vi.mock("@/app/generated/prisma/client", () => ({
	DisputeReason: {
		DUPLICATE: "DUPLICATE",
		FRAUDULENT: "FRAUDULENT",
		SUBSCRIPTION_CANCELED: "SUBSCRIPTION_CANCELED",
		PRODUCT_UNACCEPTABLE: "PRODUCT_UNACCEPTABLE",
		PRODUCT_NOT_RECEIVED: "PRODUCT_NOT_RECEIVED",
		UNRECOGNIZED: "UNRECOGNIZED",
		CREDIT_NOT_PROCESSED: "CREDIT_NOT_PROCESSED",
		GENERAL: "GENERAL",
	},
	DisputeStatus: {
		NEEDS_RESPONSE: "NEEDS_RESPONSE",
		UNDER_REVIEW: "UNDER_REVIEW",
		WON: "WON",
		LOST: "LOST",
		CHARGE_REFUNDED: "CHARGE_REFUNDED",
	},
	HistorySource: { ADMIN: "ADMIN", WEBHOOK: "WEBHOOK", SYSTEM: "SYSTEM", CUSTOMER: "CUSTOMER" },
	InvoiceStatus: {
		PENDING: "PENDING",
		GENERATED: "GENERATED",
		VOIDED: "VOIDED",
	},
	OrderAction: {
		REFUND_CREATED: "REFUND_CREATED",
		REFUND_COMPLETED: "REFUND_COMPLETED",
		REFUND_FAILED: "REFUND_FAILED",
		DISPUTE_OPENED: "DISPUTE_OPENED",
		DISPUTE_RESOLVED: "DISPUTE_RESOLVED",
	},
	PaymentStatus: {
		PAID: "PAID",
		REFUNDED: "REFUNDED",
		PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
	},
	RefundReason: {
		FRAUD: "FRAUD",
		OTHER: "OTHER",
	},
	RefundStatus: {
		COMPLETED: "COMPLETED",
	},
}));

vi.mock("@/modules/orders/utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
}));

vi.mock("@/modules/orders/services/void-invoice.service", () => ({
	voidInvoice: mockVoidInvoice,
}));

vi.mock("@/modules/refunds/services/issue-credit-note.service", () => ({
	issueCreditNoteForRefund: mockIssueCreditNoteForRefund,
}));

vi.mock("@/modules/invoices/services/record-ereporting.service", () => ({
	recordRefundEReporting: mockRecordRefundEReporting,
}));

vi.mock("@sentry/nextjs", () => ({
	withScope: (cb: (scope: Record<string, () => void>) => void) =>
		cb({
			setLevel: vi.fn(),
			setTag: vi.fn(),
			setFingerprint: vi.fn(),
			setContext: vi.fn(),
		}),
	captureException: vi.fn(),
	captureMessage: vi.fn(),
}));

import {
	handleDisputeCreated,
	handleDisputeClosed,
	handleDisputeUpdated,
} from "../dispute-handlers";

// ============================================================================
// Helpers
// ============================================================================

function makeDispute(overrides: Partial<Stripe.Dispute> = {}): Stripe.Dispute {
	return {
		id: "dp_test_1",
		object: "dispute",
		amount: 5000,
		reason: "fraudulent",
		status: "needs_response",
		payment_intent: "pi_test_1",
		balance_transactions: [],
		evidence_details: {
			due_by: 1740000000, // Unix timestamp
			has_evidence: false,
			past_due: false,
			submission_count: 0,
		},
		...overrides,
	} as unknown as Stripe.Dispute;
}

function makeOrder(
	overrides: Partial<{
		id: string;
		orderNumber: string;
		customerEmail: string | null;
		paymentStatus: string;
		total: number;
	}> = {},
) {
	return {
		id: "order-1",
		orderNumber: "SYN-001",
		customerEmail: "client@test.com",
		paymentStatus: "PAID",
		total: 5000,
		userId: "user-1",
		...overrides,
	};
}

// ============================================================================
// handleDisputeCreated
// ============================================================================

describe("handleDisputeCreated", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetBaseUrl.mockReturnValue("https://synclune.fr");
		mockPrisma.order.findFirst.mockResolvedValue(makeOrder());
		mockPrisma.orderNote.findFirst.mockResolvedValue(null);
		mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<void>) =>
			cb(mockTx),
		);
		mockTx.dispute.create.mockResolvedValue({});
		mockTx.orderNote.create.mockResolvedValue({});
	});

	it("should create a Dispute record, order note and return ADMIN_DISPUTE_ALERT + INVALIDATE_CACHE tasks on success", async () => {
		const dispute = makeDispute();

		const result = await handleDisputeCreated(dispute);

		// Verifies the Dispute record was created
		expect(mockTx.dispute.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					stripeDisputeId: "dp_test_1",
					orderId: "order-1",
					amount: 5000,
					reason: "FRAUDULENT",
					status: "NEEDS_RESPONSE",
				}),
			}),
		);

		// Verifies the note was created with the right content
		expect(mockTx.orderNote.create).toHaveBeenCalledWith({
			data: {
				orderId: "order-1",
				content: expect.stringContaining("[LITIGE OUVERT] Litige Stripe dp_test_1"),
				authorId: "00000000-0000-0000-0000-000000000000",
				authorName: "Système (webhook Stripe)",
			},
		});

		expect(result).toEqual({
			success: true,
			tasks: [
				{
					type: "ADMIN_DISPUTE_ALERT",
					data: expect.objectContaining({
						orderNumber: "SYN-001",
						customerEmail: "client@test.com",
						amount: 5000,
						disputeId: "dp_test_1",
						dashboardUrl: "https://synclune.fr/admin/ventes/commandes/order-1",
						stripeDashboardUrl: "https://dashboard.stripe.com/test/disputes/dp_test_1",
					}),
				},
				{
					type: "INVALIDATE_CACHE",
					tags: ["orders-list", "order-notes-order-1", "admin-badges"],
				},
			],
		});
	});

	it("should throw an error when the dispute has no payment_intent", async () => {
		const dispute = makeDispute({ payment_intent: null as unknown as string });

		await expect(handleDisputeCreated(dispute)).rejects.toThrow(
			"Dispute dp_test_1 has no payment_intent",
		);

		expect(mockPrisma.order.findFirst).not.toHaveBeenCalled();
	});

	it("should throw an error when no order is found for the payment intent", async () => {
		mockPrisma.order.findFirst.mockResolvedValue(null);
		const dispute = makeDispute();

		await expect(handleDisputeCreated(dispute)).rejects.toThrow(
			"No order found for dispute dp_test_1 (PI: pi_test_1)",
		);

		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should skip and return skipped result when a duplicate note already exists (idempotence)", async () => {
		mockPrisma.orderNote.findFirst.mockResolvedValue({ id: "note-existing-1" });
		const dispute = makeDispute();

		const result = await handleDisputeCreated(dispute);

		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
		expect(result).toEqual({
			success: true,
			skipped: true,
			reason: "Dispute note already created",
		});
	});

	it("should map known dispute reason to the French label", async () => {
		const dispute = makeDispute({ reason: "product_not_received" });

		const result = await handleDisputeCreated(dispute);

		const alertTask = result?.tasks?.find((t) => t.type === "ADMIN_DISPUTE_ALERT");
		expect(alertTask?.data).toMatchObject({ reason: "Produit non reçu" });
	});

	it("should fall back to the raw reason string when the label is unknown", async () => {
		const dispute = makeDispute({ reason: "bank_cannot_process" as Stripe.Dispute["reason"] });

		await handleDisputeCreated(dispute);

		const createCall = mockTx.orderNote.create.mock.calls[0]![0];
		expect(createCall.data.content).toContain("bank_cannot_process");
	});

	it("should show N/A for deadline when evidence_details.due_by is missing", async () => {
		const dispute = makeDispute({
			evidence_details: {
				due_by: null,
				has_evidence: false,
				past_due: false,
				submission_count: 0,
			} as Stripe.Dispute.EvidenceDetails,
		});

		await handleDisputeCreated(dispute);

		const createCall = mockTx.orderNote.create.mock.calls[0]![0];
		expect(createCall.data.content).toContain("Deadline de réponse: N/A");
	});

	it("should set deadline to null in task data when evidence_details.due_by is missing", async () => {
		const dispute = makeDispute({
			evidence_details: {
				due_by: null,
				has_evidence: false,
				past_due: false,
				submission_count: 0,
			} as Stripe.Dispute.EvidenceDetails,
		});

		const result = await handleDisputeCreated(dispute);

		const alertTask = result?.tasks?.find((t) => t.type === "ADMIN_DISPUTE_ALERT");
		expect(alertTask?.data).toMatchObject({ deadline: null });
	});

	it("should extract payment_intent id when payment_intent is an object", async () => {
		const dispute = makeDispute({
			payment_intent: { id: "pi_object_1" } as unknown as string,
		});

		await handleDisputeCreated(dispute);

		expect(mockPrisma.order.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ stripePaymentIntentId: "pi_object_1" }),
			}),
		);
	});

	it("should use fallback email when customerEmail is null", async () => {
		mockPrisma.order.findFirst.mockResolvedValue(makeOrder({ customerEmail: null }));
		const dispute = makeDispute();

		const result = await handleDisputeCreated(dispute);

		const alertTask = result?.tasks?.find((t) => t.type === "ADMIN_DISPUTE_ALERT");
		expect(alertTask?.data).toMatchObject({ customerEmail: "Email non disponible" });
	});
});

// ============================================================================
// handleDisputeClosed
// ============================================================================

describe("handleDisputeClosed", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetBaseUrl.mockReturnValue("https://synclune.fr");
		mockPrisma.order.findFirst.mockResolvedValue(makeOrder({ total: 5000 }));
		mockPrisma.orderNote.findFirst.mockResolvedValue(null);
		mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<void>) =>
			cb(mockTx),
		);
		mockTx.dispute.findUnique.mockResolvedValue({ id: "dispute-1" });
		mockTx.dispute.update.mockResolvedValue({});
		mockTx.order.update.mockResolvedValue({});
		mockTx.orderNote.create.mockResolvedValue({});
		// ORD-REFUND-010: chargeback materialization needs aggregate + create
		mockTx.refund.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
		mockTx.refund.create.mockResolvedValue({ id: "ref-chargeback-1" });
		// Post-tx accounting wiring : par défaut pas de facture active (void skip),
		// services best-effort résolus en noop.
		mockPrisma.order.findUnique.mockResolvedValue(null);
		mockVoidInvoice.mockResolvedValue({ kind: "noop", reason: "no-active-invoice" });
		mockIssueCreditNoteForRefund.mockResolvedValue({ kind: "noop", reason: "missing" });
		mockRecordRefundEReporting.mockResolvedValue("skipped");
	});

	it("should create a won note, update Dispute, and NOT update paymentStatus when dispute is won", async () => {
		const dispute = makeDispute({ status: "won" });

		const result = await handleDisputeClosed(dispute);

		// Verify Dispute record was updated
		expect(mockTx.dispute.update).toHaveBeenCalledWith({
			where: { stripeDisputeId: "dp_test_1" },
			data: {
				status: "WON",
				resolvedAt: expect.any(Date),
			},
		});

		// Verify note content reflects a won dispute
		const createCall = mockTx.orderNote.create.mock.calls[0]![0];
		expect(createCall.data.content).toContain("[LITIGE CLOTURE] Litige dp_test_1 clôturé: gagné");
		expect(createCall.data.content).not.toContain("Le montant a été débité par Stripe.");

		// paymentStatus must not be touched
		expect(mockTx.order.update).not.toHaveBeenCalled();

		// No admin alert on dispute close (only emitted on dispute open)
		expect(result?.tasks?.find((t) => t.type === "ADMIN_DISPUTE_ALERT")).toBeUndefined();
		expect(result?.success).toBe(true);
	});

	it("should create a lost note, update Dispute, and update paymentStatus to REFUNDED when dispute is lost", async () => {
		const dispute = makeDispute({ status: "lost" });

		const result = await handleDisputeClosed(dispute);

		// Verify Dispute record was updated
		expect(mockTx.dispute.update).toHaveBeenCalledWith({
			where: { stripeDisputeId: "dp_test_1" },
			data: {
				status: "LOST",
				resolvedAt: expect.any(Date),
			},
		});

		// Verify note content reflects a lost dispute
		const createCall = mockTx.orderNote.create.mock.calls[0]![0];
		expect(createCall.data.content).toContain("[LITIGE CLOTURE] Litige dp_test_1 clôturé: perdu");
		expect(createCall.data.content).toContain("Le montant a été débité par Stripe.");

		// paymentStatus must be updated to REFUNDED
		expect(mockTx.order.update).toHaveBeenCalledWith({
			where: { id: "order-1" },
			data: { paymentStatus: "REFUNDED" },
		});

		// No admin alert on dispute close (only emitted on dispute open)
		expect(result?.tasks?.find((t) => t.type === "ADMIN_DISPUTE_ALERT")).toBeUndefined();
		expect(result?.success).toBe(true);
	});

	it("should create note but NOT update paymentStatus when dispute is lost and order is already REFUNDED", async () => {
		mockPrisma.order.findFirst.mockResolvedValue(makeOrder({ paymentStatus: "REFUNDED" }));
		const dispute = makeDispute({ status: "lost" });

		await handleDisputeClosed(dispute);

		expect(mockTx.orderNote.create).toHaveBeenCalledTimes(1);
		// No redundant paymentStatus update
		expect(mockTx.order.update).not.toHaveBeenCalled();
	});

	it("should throw an error when the dispute has no payment_intent", async () => {
		const dispute = makeDispute({ payment_intent: null as unknown as string });

		await expect(handleDisputeClosed(dispute)).rejects.toThrow(
			"Dispute dp_test_1 closed has no payment_intent",
		);

		expect(mockPrisma.order.findFirst).not.toHaveBeenCalled();
	});

	it("should throw an error when no order is found for the payment intent", async () => {
		mockPrisma.order.findFirst.mockResolvedValue(null);
		const dispute = makeDispute({ status: "won" });

		await expect(handleDisputeClosed(dispute)).rejects.toThrow(
			"No order found for closed dispute dp_test_1 (PI: pi_test_1)",
		);

		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should skip and return skipped result when a duplicate note already exists (idempotence)", async () => {
		mockPrisma.orderNote.findFirst.mockResolvedValue({ id: "note-existing-2" });
		const dispute = makeDispute({ status: "lost" });

		const result = await handleDisputeClosed(dispute);

		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
		expect(result).toEqual({
			success: true,
			skipped: true,
			reason: "Dispute closed note already created",
		});
	});

	it("should include INVALIDATE_CACHE task with correct tags", async () => {
		const dispute = makeDispute({ status: "won" });

		const result = await handleDisputeClosed(dispute);

		const cacheTask = result?.tasks?.find((t) => t.type === "INVALIDATE_CACHE");
		// CACHE-AUDIT-010 : helper canonique (user-scopé + détail) + NOTES.
		expect(cacheTask).toEqual({
			type: "INVALIDATE_CACHE",
			tags: [
				"orders-list",
				"admin-badges",
				"admin-orders-list",
				"orders-user-user-1",
				"last-order-user-user-1",
				"account-stats-user-1",
				"user-orders-count-user-1",
				"order-history-order-1",
				"order-confirmation-order-1",
				"order-detail-order-1",
				"order-notes-order-1",
			],
		});
	});

	it("should emit ONLY an INVALIDATE_CACHE task (no admin alert on close)", async () => {
		const dispute = makeDispute({ status: "won" });

		const result = await handleDisputeClosed(dispute);

		expect(result?.tasks).toHaveLength(1);
		expect(result?.tasks?.[0]?.type).toBe("INVALIDATE_CACHE");
		expect(result?.tasks?.find((t) => t.type === "ADMIN_DISPUTE_ALERT")).toBeUndefined();
	});

	it("should extract payment_intent id when payment_intent is an object", async () => {
		const dispute = makeDispute({
			status: "won",
			payment_intent: { id: "pi_object_2" } as unknown as string,
		});

		await handleDisputeClosed(dispute);

		expect(mockPrisma.order.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ stripePaymentIntentId: "pi_object_2" }),
			}),
		);
	});

	it("should skip Dispute update when no Dispute record exists", async () => {
		mockTx.dispute.findUnique.mockResolvedValue(null);
		const dispute = makeDispute({ status: "won" });

		await handleDisputeClosed(dispute);

		expect(mockTx.dispute.update).not.toHaveBeenCalled();
		// Note should still be created
		expect(mockTx.orderNote.create).toHaveBeenCalledTimes(1);
	});
});

// ============================================================================
// Dispute reason and fee mapping
// ============================================================================

describe("handleDisputeCreated - reason and fee mapping", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetBaseUrl.mockReturnValue("https://synclune.fr");
		mockPrisma.order.findFirst.mockResolvedValue(makeOrder());
		mockPrisma.orderNote.findFirst.mockResolvedValue(null);
		mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<void>) =>
			cb(mockTx),
		);
		mockTx.dispute.create.mockResolvedValue({});
		mockTx.orderNote.create.mockResolvedValue({});
	});

	it("should store balance_transactions[0].fee when present", async () => {
		const dispute = makeDispute({
			balance_transactions: [{ fee: 1500 }] as unknown as Stripe.Dispute["balance_transactions"],
		});

		await handleDisputeCreated(dispute);

		expect(mockTx.dispute.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ fee: 1500 }),
			}),
		);
	});

	it("should default fee to 0 when balance_transactions is empty", async () => {
		const dispute = makeDispute({ balance_transactions: [] });

		await handleDisputeCreated(dispute);

		expect(mockTx.dispute.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ fee: 0 }),
			}),
		);
	});

	it.each([
		["duplicate", "DUPLICATE"],
		["fraudulent", "FRAUDULENT"],
		["subscription_canceled", "SUBSCRIPTION_CANCELED"],
		["product_unacceptable", "PRODUCT_UNACCEPTABLE"],
		["product_not_received", "PRODUCT_NOT_RECEIVED"],
		["unrecognized", "UNRECOGNIZED"],
		["credit_not_processed", "CREDIT_NOT_PROCESSED"],
		["general", "GENERAL"],
	])("should map Stripe reason '%s' to DisputeReason.%s", async (stripeReason, expectedEnum) => {
		const dispute = makeDispute({ reason: stripeReason as Stripe.Dispute["reason"] });

		await handleDisputeCreated(dispute);

		expect(mockTx.dispute.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ reason: expectedEnum }),
			}),
		);
	});

	it("should default unknown reason to GENERAL", async () => {
		const dispute = makeDispute({
			reason: "bank_cannot_process" as Stripe.Dispute["reason"],
		});

		await handleDisputeCreated(dispute);

		expect(mockTx.dispute.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ reason: "GENERAL" }),
			}),
		);
	});

	it("should attach a stable idempotencyKey to the opening admin alert (LOW-2)", async () => {
		const dispute = makeDispute();

		const result = await handleDisputeCreated(dispute);

		const alertTask = result?.tasks?.find((t) => t.type === "ADMIN_DISPUTE_ALERT");
		expect(alertTask?.data).toMatchObject({
			idempotencyKey: "alert:dispute-open:dp_test_1",
		});
	});
});

// ============================================================================
// @regression dispute-lost-accounting-2026-05-29
// Un chargeback PERDU reprend des fonds sur une commande facturée : il doit être
// traité comptablement comme un remboursement (avoir Art. 272-I + e-reporting
// REFUND DGFiP), en miroir de `charge.refunded`. Une régression cassant ce
// câblage = facture stale + agrégat DGFiP surévalué (risque réglementaire).
// ============================================================================

describe("handleDisputeClosed — accounting wiring (regression)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetBaseUrl.mockReturnValue("https://synclune.fr");
		mockPrisma.order.findFirst.mockResolvedValue(makeOrder({ total: 5000 }));
		mockPrisma.orderNote.findFirst.mockResolvedValue(null);
		mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) =>
			cb(mockTx),
		);
		mockTx.dispute.findUnique.mockResolvedValue({ id: "dispute-1" });
		mockTx.dispute.update.mockResolvedValue({});
		mockTx.order.update.mockResolvedValue({});
		mockTx.orderNote.create.mockResolvedValue({});
		mockTx.refund.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
		mockTx.refund.create.mockResolvedValue({ id: "ref-chargeback-1" });
		mockPrisma.order.findUnique.mockResolvedValue(null);
		mockVoidInvoice.mockResolvedValue({ kind: "noop", reason: "no-active-invoice" });
		mockIssueCreditNoteForRefund.mockResolvedValue({ kind: "noop", reason: "missing" });
		mockRecordRefundEReporting.mockResolvedValue("skipped");
	});

	it("HIGH-1: records a REFUND e-reporting transaction for the chargeback refund when lost", async () => {
		const dispute = makeDispute({ status: "lost" });

		await handleDisputeClosed(dispute);

		expect(mockRecordRefundEReporting).toHaveBeenCalledWith("ref-chargeback-1");
	});

	it("HIGH-1: does NOT record e-reporting when won", async () => {
		const dispute = makeDispute({ status: "won" });

		await handleDisputeClosed(dispute);

		expect(mockRecordRefundEReporting).not.toHaveBeenCalled();
		expect(mockVoidInvoice).not.toHaveBeenCalled();
		expect(mockIssueCreditNoteForRefund).not.toHaveBeenCalled();
	});

	it("HIGH-2 (full reclaim): voids the invoice when reclaim covers the full order and invoice is GENERATED", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			invoiceStatus: "GENERATED",
			invoiceNumber: "F-2026-00042",
		});
		const dispute = makeDispute({ status: "lost", amount: 5000 }); // total 5000 → full

		await handleDisputeClosed(dispute);

		expect(mockVoidInvoice).toHaveBeenCalledWith(
			expect.objectContaining({ orderId: "order-1", source: "WEBHOOK" }),
		);
		// Full reclaim → l'avoir canonique est porté par voidInvoice, PAS un 2e avoir Refund.
		expect(mockIssueCreditNoteForRefund).not.toHaveBeenCalled();
	});

	it("HIGH-2 (full reclaim): skips void when no active GENERATED invoice", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			invoiceStatus: "VOIDED",
			invoiceNumber: "F-2026-00042",
		});
		const dispute = makeDispute({ status: "lost", amount: 5000 });

		await handleDisputeClosed(dispute);

		expect(mockVoidInvoice).not.toHaveBeenCalled();
	});

	it("HIGH-2 (partial reclaim): issues a Refund credit note (not a void) when reclaim is partial", async () => {
		mockPrisma.order.findFirst.mockResolvedValue(makeOrder({ total: 10000 }));
		const dispute = makeDispute({ status: "lost", amount: 3000 }); // 3000 < 10000 → partiel

		await handleDisputeClosed(dispute);

		expect(mockIssueCreditNoteForRefund).toHaveBeenCalledWith(
			expect.objectContaining({ refundId: "ref-chargeback-1", source: "WEBHOOK" }),
		);
		expect(mockVoidInvoice).not.toHaveBeenCalled();
	});

	it("MEDIUM-2: emits a double-reclaim admin alert when refunds + chargeback exceed the order total", async () => {
		// Déjà remboursé 5000 + chargeback 5000 = 10000 > total 5000 → double reprise.
		mockTx.refund.aggregate.mockResolvedValue({ _sum: { amount: 5000 } });
		mockPrisma.order.findFirst.mockResolvedValue(
			makeOrder({ total: 5000, paymentStatus: "REFUNDED" }),
		);
		const dispute = makeDispute({ status: "lost", amount: 5000 });

		const result = await handleDisputeClosed(dispute);

		const alert = result?.tasks?.find((t) => t.type === "ADMIN_DISPUTE_ALERT");
		expect(alert).toBeDefined();
		expect(alert?.data).toMatchObject({
			disputeId: "dp_test_1",
			idempotencyKey: "alert:dispute-double-reclaim:dp_test_1",
		});
		expect(alert?.data.reason).toContain("DOUBLE REPRISE DE FONDS");
	});

	it("MEDIUM-2: no double-reclaim alert when refunds + chargeback stay within the order total", async () => {
		mockTx.refund.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
		const dispute = makeDispute({ status: "lost", amount: 5000 }); // total 5000, exactement

		const result = await handleDisputeClosed(dispute);

		expect(result?.tasks?.find((t) => t.type === "ADMIN_DISPUTE_ALERT")).toBeUndefined();
	});
});

// ============================================================================
// handleDisputeUpdated (LOW-1)
// ============================================================================

describe("handleDisputeUpdated", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.dispute.findUnique.mockResolvedValue({
			id: "dispute-1",
			orderId: "order-1",
			status: "NEEDS_RESPONSE",
		});
		mockPrisma.dispute.update.mockResolvedValue({});
	});

	it("updates the dispute status + dueBy and invalidates cache", async () => {
		const dispute = makeDispute({ status: "under_review" });

		const result = await handleDisputeUpdated(dispute);

		expect(mockPrisma.dispute.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { stripeDisputeId: "dp_test_1" },
				data: expect.objectContaining({ status: "UNDER_REVIEW" }),
			}),
		);
		expect(result?.tasks?.[0]?.type).toBe("INVALIDATE_CACHE");
	});

	it("skips (no mutation) when the dispute does not exist yet", async () => {
		mockPrisma.dispute.findUnique.mockResolvedValue(null);
		const dispute = makeDispute({ status: "under_review" });

		const result = await handleDisputeUpdated(dispute);

		expect(mockPrisma.dispute.update).not.toHaveBeenCalled();
		expect(result).toEqual({
			success: true,
			skipped: true,
			reason: "Dispute not yet created",
		});
	});
});
