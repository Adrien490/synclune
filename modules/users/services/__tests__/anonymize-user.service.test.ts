import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockAccountStatus, mockReviewStatus, mockRecompute } = vi.hoisted(() => ({
	mockAccountStatus: {
		PENDING_DELETION: "PENDING_DELETION",
		ANONYMIZED: "ANONYMIZED",
		ACTIVE: "ACTIVE",
	},
	mockReviewStatus: {
		PUBLISHED: "PUBLISHED",
		HIDDEN: "HIDDEN",
	},
	mockRecompute: vi.fn(),
}));

vi.mock("@/app/generated/prisma/client", () => ({
	AccountStatus: mockAccountStatus,
	ReviewStatus: mockReviewStatus,
}));

vi.mock("@/modules/reviews/services/review-stats.service", () => ({
	recomputeProductReviewStatsBatch: mockRecompute,
}));

vi.mock("../../utils/anonymization.utils", () => ({
	generateAnonymizedEmail: vi.fn((userId: string) => `anonymized-${userId}@deleted.synclune.local`),
}));

import { anonymizeUserInTransaction } from "../anonymize-user.service";

function createMockTx() {
	return {
		user: {
			findUnique: vi.fn(),
			update: vi.fn(),
		},
		session: { deleteMany: vi.fn() },
		account: { deleteMany: vi.fn() },
		address: { deleteMany: vi.fn() },
		cart: { deleteMany: vi.fn() },
		wishlist: { deleteMany: vi.fn() },
		reviewMedia: { deleteMany: vi.fn() },
		productReview: { updateMany: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
		reviewResponse: { updateMany: vi.fn() },
		order: { updateMany: vi.fn() },
	};
}

describe("anonymizeUserInTransaction", () => {
	let mockTx: ReturnType<typeof createMockTx>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockTx = createMockTx();
	});

	it("should throw if user is not found", async () => {
		mockTx.user.findUnique.mockResolvedValue(null);

		await expect(anonymizeUserInTransaction(mockTx as never, "user_abc")).rejects.toThrow(
			"Cannot anonymize user user_abc: status is not found, expected PENDING_DELETION",
		);
	});

	it("should throw if user status is not PENDING_DELETION", async () => {
		mockTx.user.findUnique.mockResolvedValue({ accountStatus: "ACTIVE" });

		await expect(anonymizeUserInTransaction(mockTx as never, "user_abc")).rejects.toThrow(
			"Cannot anonymize user user_abc: status is ACTIVE, expected PENDING_DELETION",
		);
	});

	it("should anonymize user data with correct values", async () => {
		mockTx.user.findUnique.mockResolvedValue({ accountStatus: "PENDING_DELETION" });

		await anonymizeUserInTransaction(mockTx as never, "user_abc");

		expect(mockTx.user.update).toHaveBeenCalledWith({
			where: { id: "user_abc" },
			data: expect.objectContaining({
				accountStatus: "ANONYMIZED",
				email: "anonymized-user_abc@deleted.synclune.local",
				name: "Utilisateur supprimé",
				image: null,
				stripeCustomerId: null,
				deletionRequestedAt: null,
			}),
		});

		const updateData = mockTx.user.update.mock.calls[0]![0].data;
		expect(updateData.anonymizedAt).toBeInstanceOf(Date);
		expect(updateData.deletedAt).toBeInstanceOf(Date);
	});

	it("should delete sessions", async () => {
		mockTx.user.findUnique.mockResolvedValue({ accountStatus: "PENDING_DELETION" });

		await anonymizeUserInTransaction(mockTx as never, "user_abc");

		expect(mockTx.session.deleteMany).toHaveBeenCalledWith({
			where: { userId: "user_abc" },
		});
	});

	it("should delete OAuth accounts", async () => {
		mockTx.user.findUnique.mockResolvedValue({ accountStatus: "PENDING_DELETION" });

		await anonymizeUserInTransaction(mockTx as never, "user_abc");

		expect(mockTx.account.deleteMany).toHaveBeenCalledWith({
			where: { userId: "user_abc" },
		});
	});

	it("should delete addresses", async () => {
		mockTx.user.findUnique.mockResolvedValue({ accountStatus: "PENDING_DELETION" });

		await anonymizeUserInTransaction(mockTx as never, "user_abc");

		expect(mockTx.address.deleteMany).toHaveBeenCalledWith({
			where: { userId: "user_abc" },
		});
	});

	it("should delete cart and wishlist", async () => {
		mockTx.user.findUnique.mockResolvedValue({ accountStatus: "PENDING_DELETION" });

		await anonymizeUserInTransaction(mockTx as never, "user_abc");

		expect(mockTx.cart.deleteMany).toHaveBeenCalledWith({ where: { userId: "user_abc" } });
		expect(mockTx.wishlist.deleteMany).toHaveBeenCalledWith({ where: { userId: "user_abc" } });
	});

	it("should delete review media (PII risk)", async () => {
		mockTx.user.findUnique.mockResolvedValue({ accountStatus: "PENDING_DELETION" });

		await anonymizeUserInTransaction(mockTx as never, "user_abc");

		expect(mockTx.reviewMedia.deleteMany).toHaveBeenCalledWith({
			where: { review: { userId: "user_abc" } },
		});
	});

	// REVIEW-AUDIT-005 : l'avis est masqué (HIDDEN) en plus d'être anonymisé, pour le
	// retirer du storefront et des stats (l'auteur n'existe plus).
	it("should hide and anonymize review content", async () => {
		mockTx.user.findUnique.mockResolvedValue({ accountStatus: "PENDING_DELETION" });

		await anonymizeUserInTransaction(mockTx as never, "user_abc");

		expect(mockTx.productReview.updateMany).toHaveBeenCalledWith({
			where: { userId: "user_abc" },
			data: {
				status: "HIDDEN",
				content: "Contenu supprimé suite à la suppression du compte.",
				title: null,
			},
		});
	});

	// REVIEW-AUDIT-002 / 005 : les stats des produits concernés sont recalculées
	// (les avis masqués ne comptent plus dans la moyenne).
	it("should recompute review stats for the user's reviewed products", async () => {
		mockTx.user.findUnique.mockResolvedValue({ accountStatus: "PENDING_DELETION" });
		mockTx.productReview.findMany.mockResolvedValue([
			{ productId: "prod-1" },
			{ productId: "prod-2" },
		]);

		await anonymizeUserInTransaction(mockTx as never, "user_abc");

		expect(mockTx.productReview.findMany).toHaveBeenCalledWith({
			where: { userId: "user_abc", productId: { not: null } },
			select: { productId: true },
			distinct: ["productId"],
		});
		expect(mockRecompute).toHaveBeenCalledWith(mockTx, ["prod-1", "prod-2"]);
	});

	it("should anonymize order PII while preserving financial data", async () => {
		mockTx.user.findUnique.mockResolvedValue({ accountStatus: "PENDING_DELETION" });

		await anonymizeUserInTransaction(mockTx as never, "user_abc");

		expect(mockTx.order.updateMany).toHaveBeenCalledWith({
			where: { userId: "user_abc" },
			data: expect.objectContaining({
				customerEmail: "anonymized-user_abc@deleted.synclune.local",
				customerName: "Client supprimé",
				customerPhone: null,
				shippingFirstName: "X",
				shippingLastName: "X",
				shippingAddress1: "Adresse supprimée",
				shippingAddress2: null,
				shippingPostalCode: "00000",
				shippingCity: "Supprimé",
				shippingPhone: "0000000000",
				stripeCustomerId: null,
			}),
		});
	});

	it("should NOT scrub billing* (invoice legal identity kept until 10y purge)", async () => {
		mockTx.user.findUnique.mockResolvedValue({ accountStatus: "PENDING_DELETION" });

		await anonymizeUserInTransaction(mockTx as never, "user_abc");

		// billing* = identité de facturation (Art. 289 CGI), conservée jusqu'à
		// paidAt+10ans (verrouillé par la régression preserves-invoice-snapshot).
		const orderData = mockTx.order.updateMany.mock.calls[0]?.[0]?.data ?? {};
		expect(orderData).not.toHaveProperty("billingFirstName");
		expect(orderData).not.toHaveProperty("billingAddress1");
		expect(orderData).not.toHaveProperty("invoiceDataSnapshot");
	});

	it("should anonymize public ReviewResponse author name to the brand", async () => {
		mockTx.user.findUnique.mockResolvedValue({ accountStatus: "PENDING_DELETION" });

		await anonymizeUserInTransaction(mockTx as never, "user_abc");

		expect(mockTx.reviewResponse.updateMany).toHaveBeenCalledWith({
			where: { authorId: "user_abc" },
			data: { authorName: "Synclune" },
		});
	});

	it("should perform all anonymization operations", async () => {
		mockTx.user.findUnique.mockResolvedValue({ accountStatus: "PENDING_DELETION" });

		await anonymizeUserInTransaction(mockTx as never, "user_abc");

		// Verify all operations were called
		expect(mockTx.user.update).toHaveBeenCalledTimes(1);
		expect(mockTx.session.deleteMany).toHaveBeenCalledTimes(1);
		expect(mockTx.account.deleteMany).toHaveBeenCalledTimes(1);
		expect(mockTx.address.deleteMany).toHaveBeenCalledTimes(1);
		expect(mockTx.cart.deleteMany).toHaveBeenCalledTimes(1);
		expect(mockTx.wishlist.deleteMany).toHaveBeenCalledTimes(1);
		expect(mockTx.reviewMedia.deleteMany).toHaveBeenCalledTimes(1);
		expect(mockTx.productReview.updateMany).toHaveBeenCalledTimes(1);
		expect(mockTx.order.updateMany).toHaveBeenCalledTimes(1);
	});

	it("should be idempotent when user is already ANONYMIZED (no-op)", async () => {
		mockTx.user.findUnique.mockResolvedValue({ accountStatus: "ANONYMIZED" });

		await expect(anonymizeUserInTransaction(mockTx as never, "user_abc")).resolves.toBeUndefined();

		expect(mockTx.user.update).not.toHaveBeenCalled();
		expect(mockTx.session.deleteMany).not.toHaveBeenCalled();
	});

	it("should allow ACTIVE users when allowImmediate: true (admin GDPR override)", async () => {
		mockTx.user.findUnique.mockResolvedValue({ accountStatus: "ACTIVE" });

		await anonymizeUserInTransaction(mockTx as never, "user_abc", { allowImmediate: true });

		expect(mockTx.user.update).toHaveBeenCalledWith({
			where: { id: "user_abc" },
			data: expect.objectContaining({ accountStatus: "ANONYMIZED" }),
		});
	});

	it("should still reject ACTIVE users without allowImmediate (default strict path)", async () => {
		mockTx.user.findUnique.mockResolvedValue({ accountStatus: "ACTIVE" });

		await expect(anonymizeUserInTransaction(mockTx as never, "user_abc")).rejects.toThrow(
			"Cannot anonymize user user_abc: status is ACTIVE, expected PENDING_DELETION",
		);
		expect(mockTx.user.update).not.toHaveBeenCalled();
	});
});
