import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

// ============================================================================
// Hoisted mocks - must be declared before any imports
// ============================================================================

const {
	mockPrisma,
	mockGetBaseUrl,
	mockROUTES,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: {
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
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/shared/constants/urls", () => ({
	getBaseUrl: mockGetBaseUrl,
	ROUTES: mockROUTES,
}));

vi.mock("@/modules/orders/constants/cache", () => ({
	ORDERS_CACHE_TAGS: {
		LIST: "orders-list",
		NOTES: (orderId: string) => `order-notes-${orderId}`,
	},
}));

vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: {
		ADMIN_BADGES: "admin-badges",
	},
}));

import { handleDisputeCreated, handleDisputeClosed } from "../dispute-handlers";

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
		evidence_details: {
			due_by: 1740000000, // Unix timestamp
			has_evidence: false,
			past_due: false,
			submission_count: 0,
		},
		...overrides,
	} as unknown as Stripe.Dispute;
}

function makeOrder(overrides: Partial<{ id: string; orderNumber: string; customerEmail: string | null; paymentStatus: string }> = {}) {
	return {
		id: "order-1",
		orderNumber: "SYN-001",
		customerEmail: "client@test.com",
		paymentStatus: "PAID",
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
		mockPrisma.order.findUnique.mockResolvedValue(makeOrder());
		mockPrisma.orderNote.findFirst.mockResolvedValue(null);
		mockPrisma.orderNote.create.mockResolvedValue({});
	});

	it("should create an order note and return ADMIN_DISPUTE_ALERT + INVALIDATE_CACHE tasks on success", async () => {
		const dispute = makeDispute();

		const result = await handleDisputeCreated(dispute);

		// Verifies the note was created with the right content
		expect(mockPrisma.orderNote.create).toHaveBeenCalledWith({
			data: {
				orderId: "order-1",
				content: expect.stringContaining("[LITIGE OUVERT] Litige Stripe dp_test_1"),
				authorId: "system",
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
						stripeDashboardUrl: "https://dashboard.stripe.com/disputes/dp_test_1",
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
			"Dispute dp_test_1 has no payment_intent"
		);

		expect(mockPrisma.order.findUnique).not.toHaveBeenCalled();
	});

	it("should throw an error when no order is found for the payment intent", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);
		const dispute = makeDispute();

		await expect(handleDisputeCreated(dispute)).rejects.toThrow(
			"No order found for dispute dp_test_1 (PI: pi_test_1)"
		);

		expect(mockPrisma.orderNote.create).not.toHaveBeenCalled();
	});

	it("should skip and return skipped result when a duplicate note already exists (idempotence)", async () => {
		mockPrisma.orderNote.findFirst.mockResolvedValue({ id: "note-existing-1" });
		const dispute = makeDispute();

		const result = await handleDisputeCreated(dispute);

		expect(mockPrisma.orderNote.create).not.toHaveBeenCalled();
		expect(result).toEqual({
			success: true,
			skipped: true,
			reason: "Dispute note already created",
		});
	});

	it("should map known dispute reason to the French label", async () => {
		const dispute = makeDispute({ reason: "product_not_received" });

		await handleDisputeCreated(dispute);

		const createCall = mockPrisma.orderNote.create.mock.calls[0][0];
		expect(createCall.data.content).toContain("Produit non reçu");

		const result = await handleDisputeCreated(dispute);
		const alertTask = result?.tasks?.find((t) => t.type === "ADMIN_DISPUTE_ALERT");
		expect(alertTask?.data).toMatchObject({ reason: "Produit non reçu" });
	});

	it("should fall back to the raw reason string when the label is unknown", async () => {
		const dispute = makeDispute({ reason: "bank_cannot_process" as Stripe.Dispute.Reason });

		await handleDisputeCreated(dispute);

		const createCall = mockPrisma.orderNote.create.mock.calls[0][0];
		expect(createCall.data.content).toContain("bank_cannot_process");
	});

	it("should show N/A for deadline when evidence_details.due_by is missing", async () => {
		const dispute = makeDispute({ evidence_details: undefined });

		await handleDisputeCreated(dispute);

		const createCall = mockPrisma.orderNote.create.mock.calls[0][0];
		expect(createCall.data.content).toContain("Deadline de réponse: N/A");
	});

	it("should set deadline to null in task data when evidence_details.due_by is missing", async () => {
		const dispute = makeDispute({ evidence_details: undefined });

		const result = await handleDisputeCreated(dispute);

		const alertTask = result?.tasks?.find((t) => t.type === "ADMIN_DISPUTE_ALERT");
		expect(alertTask?.data).toMatchObject({ deadline: null });
	});

	it("should extract payment_intent id when payment_intent is an object", async () => {
		const dispute = makeDispute({
			payment_intent: { id: "pi_object_1" } as unknown as string,
		});

		await handleDisputeCreated(dispute);

		expect(mockPrisma.order.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { stripePaymentIntentId: "pi_object_1" },
			})
		);
	});

	it("should use fallback email when customerEmail is null", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(makeOrder({ customerEmail: null }));
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
		mockPrisma.order.findUnique.mockResolvedValue(makeOrder());
		mockPrisma.order.update.mockResolvedValue({});
		mockPrisma.orderNote.findFirst.mockResolvedValue(null);
		mockPrisma.orderNote.create.mockResolvedValue({});
	});

	it("should create a won note and NOT update paymentStatus when dispute is won", async () => {
		const dispute = makeDispute({ status: "won" });

		const result = await handleDisputeClosed(dispute);

		// Verify note content reflects a won dispute
		const createCall = mockPrisma.orderNote.create.mock.calls[0][0];
		expect(createCall.data.content).toContain("[LITIGE CLOTURE] Litige dp_test_1 clôturé: gagné");
		expect(createCall.data.content).not.toContain("Le montant a été débité par Stripe.");

		// paymentStatus must not be touched
		expect(mockPrisma.order.update).not.toHaveBeenCalled();

		// Verify the returned tasks
		const alertTask = result?.tasks?.find((t) => t.type === "ADMIN_DISPUTE_ALERT");
		expect(alertTask?.data).toMatchObject({
			reason: "Litige clôturé — Vous avez GAGNÉ",
			deadline: null,
		});
		expect(result?.success).toBe(true);
	});

	it("should create a lost note and update paymentStatus to REFUNDED when dispute is lost", async () => {
		const dispute = makeDispute({ status: "lost" });

		const result = await handleDisputeClosed(dispute);

		// Verify note content reflects a lost dispute
		const createCall = mockPrisma.orderNote.create.mock.calls[0][0];
		expect(createCall.data.content).toContain("[LITIGE CLOTURE] Litige dp_test_1 clôturé: perdu");
		expect(createCall.data.content).toContain("Le montant a été débité par Stripe.");

		// paymentStatus must be updated to REFUNDED
		expect(mockPrisma.order.update).toHaveBeenCalledWith({
			where: { id: "order-1" },
			data: { paymentStatus: "REFUNDED" },
		});

		// Verify the returned tasks
		const alertTask = result?.tasks?.find((t) => t.type === "ADMIN_DISPUTE_ALERT");
		expect(alertTask?.data).toMatchObject({
			reason: "Litige clôturé — Vous avez PERDU (montant débité)",
		});
		expect(result?.success).toBe(true);
	});

	it("should create note but NOT update paymentStatus when dispute is lost and order is already REFUNDED", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(makeOrder({ paymentStatus: "REFUNDED" }));
		const dispute = makeDispute({ status: "lost" });

		await handleDisputeClosed(dispute);

		expect(mockPrisma.orderNote.create).toHaveBeenCalledTimes(1);
		// No redundant DB update
		expect(mockPrisma.order.update).not.toHaveBeenCalled();
	});

	it("should throw an error when the dispute has no payment_intent", async () => {
		const dispute = makeDispute({ payment_intent: null as unknown as string });

		await expect(handleDisputeClosed(dispute)).rejects.toThrow(
			"Dispute dp_test_1 closed has no payment_intent"
		);

		expect(mockPrisma.order.findUnique).not.toHaveBeenCalled();
	});

	it("should throw an error when no order is found for the payment intent", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);
		const dispute = makeDispute({ status: "won" });

		await expect(handleDisputeClosed(dispute)).rejects.toThrow(
			"No order found for closed dispute dp_test_1 (PI: pi_test_1)"
		);

		expect(mockPrisma.orderNote.create).not.toHaveBeenCalled();
		expect(mockPrisma.order.update).not.toHaveBeenCalled();
	});

	it("should skip and return skipped result when a duplicate note already exists (idempotence)", async () => {
		mockPrisma.orderNote.findFirst.mockResolvedValue({ id: "note-existing-2" });
		const dispute = makeDispute({ status: "lost" });

		const result = await handleDisputeClosed(dispute);

		expect(mockPrisma.orderNote.create).not.toHaveBeenCalled();
		expect(mockPrisma.order.update).not.toHaveBeenCalled();
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
		expect(cacheTask).toEqual({
			type: "INVALIDATE_CACHE",
			tags: ["orders-list", "order-notes-order-1", "admin-badges"],
		});
	});

	it("should include correct dashboard URLs in the ADMIN_DISPUTE_ALERT task", async () => {
		const dispute = makeDispute({ status: "won" });

		const result = await handleDisputeClosed(dispute);

		const alertTask = result?.tasks?.find((t) => t.type === "ADMIN_DISPUTE_ALERT");
		expect(alertTask?.data).toMatchObject({
			dashboardUrl: "https://synclune.fr/admin/ventes/commandes/order-1",
			stripeDashboardUrl: "https://dashboard.stripe.com/disputes/dp_test_1",
		});
	});

	it("should extract payment_intent id when payment_intent is an object", async () => {
		const dispute = makeDispute({
			status: "won",
			payment_intent: { id: "pi_object_2" } as unknown as string,
		});

		await handleDisputeClosed(dispute);

		expect(mockPrisma.order.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { stripePaymentIntentId: "pi_object_2" },
			})
		);
	});
});
