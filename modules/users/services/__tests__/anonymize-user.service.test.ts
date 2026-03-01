import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockAccountStatus, mockNewsletterStatus } = vi.hoisted(() => ({
	mockAccountStatus: {
		PENDING_DELETION: "PENDING_DELETION",
		ANONYMIZED: "ANONYMIZED",
		ACTIVE: "ACTIVE",
	},
	mockNewsletterStatus: {
		UNSUBSCRIBED: "UNSUBSCRIBED",
	},
}));

vi.mock("@/app/generated/prisma/client", () => ({
	AccountStatus: mockAccountStatus,
	NewsletterStatus: mockNewsletterStatus,
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
		productReview: { updateMany: vi.fn() },
		newsletterSubscriber: { updateMany: vi.fn() },
		customizationRequest: { updateMany: vi.fn() },
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

		const updateData = mockTx.user.update.mock.calls[0][0].data;
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

	it("should anonymize review content", async () => {
		mockTx.user.findUnique.mockResolvedValue({ accountStatus: "PENDING_DELETION" });

		await anonymizeUserInTransaction(mockTx as never, "user_abc");

		expect(mockTx.productReview.updateMany).toHaveBeenCalledWith({
			where: { userId: "user_abc" },
			data: {
				content: "Contenu supprimé suite à la suppression du compte.",
				title: null,
			},
		});
	});

	it("should unsubscribe and anonymize newsletter with RGPD fields nulled", async () => {
		mockTx.user.findUnique.mockResolvedValue({ accountStatus: "PENDING_DELETION" });

		await anonymizeUserInTransaction(mockTx as never, "user_abc");

		expect(mockTx.newsletterSubscriber.updateMany).toHaveBeenCalledWith({
			where: { userId: "user_abc" },
			data: expect.objectContaining({
				status: "UNSUBSCRIBED",
				email: "anonymized-user_abc@deleted.synclune.local",
				ipAddress: null,
				confirmationIpAddress: null,
				userAgent: null,
			}),
		});
	});

	it("should anonymize customization requests", async () => {
		mockTx.user.findUnique.mockResolvedValue({ accountStatus: "PENDING_DELETION" });

		await anonymizeUserInTransaction(mockTx as never, "user_abc");

		expect(mockTx.customizationRequest.updateMany).toHaveBeenCalledWith({
			where: { userId: "user_abc" },
			data: {
				firstName: "Anonyme",
				email: "anonymized-user_abc@deleted.synclune.local",
				phone: null,
				details: "Contenu supprimé",
			},
		});
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

	it("should perform all 11 operations in order", async () => {
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
		expect(mockTx.newsletterSubscriber.updateMany).toHaveBeenCalledTimes(1);
		expect(mockTx.customizationRequest.updateMany).toHaveBeenCalledTimes(1);
		expect(mockTx.order.updateMany).toHaveBeenCalledTimes(1);
	});
});
