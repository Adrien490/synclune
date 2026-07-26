import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockPrisma, mockVerify, mockLogger } = vi.hoisted(() => ({
	mockPrisma: { order: { findFirst: vi.fn() } },
	mockVerify: vi.fn(),
	mockLogger: { warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));
vi.mock("../../utils/tracking-token", () => ({ verifyOrderTrackingToken: mockVerify }));

import { getOrderForTracking } from "../get-order-for-tracking";

const ORDER = { id: "order_1", orderNumber: "CMD-1704067200000-A1B2C3D4E5F6", userId: null };
const TOKEN = "a".repeat(32);

describe("getOrderForTracking", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.order.findFirst.mockResolvedValue(ORDER);
		mockVerify.mockReturnValue(true);
	});

	it("returns the order when the token verifies", async () => {
		await expect(getOrderForTracking(ORDER.orderNumber, TOKEN)).resolves.toEqual(ORDER);
		expect(mockVerify).toHaveBeenCalledWith(ORDER.id, ORDER.orderNumber, TOKEN);
	});

	it("excludes soft-deleted orders", async () => {
		await getOrderForTracking(ORDER.orderNumber, TOKEN);
		expect(mockPrisma.order.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ deletedAt: null }),
			}),
		);
	});

	// Fail-closed indistinct : le caller rend le MÊME 404 dans les trois cas, pour
	// ne pas offrir d'oracle d'existence de commande à qui tâtonne des URLs.
	it("returns null on an invalid token", async () => {
		mockVerify.mockReturnValue(false);
		await expect(getOrderForTracking(ORDER.orderNumber, TOKEN)).resolves.toBeNull();
	});

	it("returns null when the order does not exist", async () => {
		mockPrisma.order.findFirst.mockResolvedValue(null);
		await expect(getOrderForTracking("CMD-unknown", TOKEN)).resolves.toBeNull();
		// Pas de vérification de token sur une commande inexistante : rien à comparer.
		expect(mockVerify).not.toHaveBeenCalled();
	});

	it("returns null (never throws) when the DB fails", async () => {
		mockPrisma.order.findFirst.mockRejectedValue(new Error("DB down"));
		await expect(getOrderForTracking(ORDER.orderNumber, TOKEN)).resolves.toBeNull();
		expect(mockLogger.error).toHaveBeenCalled();
	});

	/**
	 * AUDIT-BIZ-001 — minimisation PII. La page est authentifiée par un LIEN, pas
	 * par une session : son `select` doit rester strictement plus étroit que celui
	 * de l'espace client. Un élargissement accidentel (copier-coller de
	 * `GET_ORDER_SELECT_CUSTOMER`) exposerait l'identité légale de facturation ou
	 * les identifiants PSP à quiconque détient l'URL.
	 */
	it("never selects billing identity, PSP identifiers or free-text refund notes", async () => {
		await getOrderForTracking(ORDER.orderNumber, TOKEN);

		const select = mockPrisma.order.findFirst.mock.calls[0]?.[0]?.select as Record<string, unknown>;

		for (const forbidden of [
			"billingFirstName",
			"billingLastName",
			"billingAddress1",
			"billingPostalCode",
			"billingCity",
			"billingCountry",
			"billingPhone",
			"invoiceDataSnapshot",
			"invoicePdfUrl",
			"invoicePdfHash",
			"stripePaymentIntentId",
			"stripeCustomerId",
			"customerPhone",
			"shippingPhone",
		]) {
			expect(select, `${forbidden} must not be exposed on a link-authenticated page`).not.toContain(
				forbidden,
			);
			expect(select[forbidden]).toBeUndefined();
		}

		// Les remboursements ne remontent que leur statut (pour détecter une demande
		// de retour déjà en cours), jamais le montant ni la note libre.
		const refundSelect = (select.refunds as { select: Record<string, unknown> }).select;
		expect(Object.keys(refundSelect)).toEqual(["status"]);
	});
});
