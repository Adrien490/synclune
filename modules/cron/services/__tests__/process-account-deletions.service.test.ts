import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockDeleteUploadThingFileFromUrl, mockDeleteUploadThingFilesFromUrls } = vi.hoisted(() => ({
	mockPrisma: {
		user: { findMany: vi.fn() },
		reviewMedia: { findMany: vi.fn() },
		$transaction: vi.fn(),
	},
	mockDeleteUploadThingFileFromUrl: vi.fn(),
	mockDeleteUploadThingFilesFromUrls: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/modules/media/services/delete-uploadthing-files.service", () => ({
	deleteUploadThingFileFromUrl: mockDeleteUploadThingFileFromUrl,
	deleteUploadThingFilesFromUrls: mockDeleteUploadThingFilesFromUrls,
}));

vi.mock("next/cache", () => ({
	updateTag: vi.fn(),
}));

vi.mock("@/modules/reviews/constants/cache", () => ({
	REVIEWS_CACHE_TAGS: {
		USER: (id: string) => `reviews-user-${id}`,
		REVIEWABLE: (id: string) => `reviews-reviewable-${id}`,
	},
}));

import { processAccountDeletions } from "../process-account-deletions.service";
import { RETENTION } from "@/modules/cron/constants/limits";

describe("processAccountDeletions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-02-09T05:00:00Z"));
	});

	it("should return zero counts when no accounts are pending deletion", async () => {
		mockPrisma.user.findMany.mockResolvedValue([]);

		const result = await processAccountDeletions();

		expect(result).toEqual({ processed: 0, errors: 0, hasMore: false });
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should query users with correct filters", async () => {
		mockPrisma.user.findMany.mockResolvedValue([]);

		await processAccountDeletions();

		expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
			where: {
				accountStatus: "PENDING_DELETION",
				deletionRequestedAt: { lt: expect.any(Date) },
				anonymizedAt: null,
			},
			select: { id: true, image: true },
			take: 25,
		});

		const call = mockPrisma.user.findMany.mock.calls[0][0];
		const gracePeriodEnd = call.where.deletionRequestedAt.lt;
		const expectedDate = new Date(
			Date.now() - RETENTION.GDPR_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000
		);
		expect(gracePeriodEnd.getTime()).toBe(expectedDate.getTime());
	});

	it("should anonymize user data in a transaction", async () => {
		const mockUser = {
			id: "user-1",
			image: null,
		};
		mockPrisma.user.findMany.mockResolvedValue([mockUser]);
		mockPrisma.reviewMedia.findMany.mockResolvedValue([]);
		mockPrisma.$transaction.mockResolvedValue(undefined);

		const result = await processAccountDeletions();

		expect(result).toEqual({ processed: 1, errors: 0, hasMore: false });
		expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);

		const transactionFn = mockPrisma.$transaction.mock.calls[0][0];
		const mockTx = {
			user: { update: vi.fn() },
			session: { deleteMany: vi.fn() },
			account: { deleteMany: vi.fn() },
			address: { deleteMany: vi.fn() },
			cart: { deleteMany: vi.fn() },
			wishlist: { deleteMany: vi.fn() },
			reviewMedia: { deleteMany: vi.fn() },
			productReview: { updateMany: vi.fn() },
			newsletterSubscriber: { updateMany: vi.fn() },
			order: { updateMany: vi.fn() },
		};

		await transactionFn(mockTx);

		expect(mockTx.user.update).toHaveBeenCalledWith({
			where: { id: "user-1" },
			data: expect.objectContaining({
				accountStatus: "ANONYMIZED",
				email: "anonymized-user-1@deleted.local",
				name: "Utilisateur supprimé",
				image: null,
				stripeCustomerId: null,
			}),
		});

		expect(mockTx.session.deleteMany).toHaveBeenCalledWith({
			where: { userId: "user-1" },
		});
		expect(mockTx.account.deleteMany).toHaveBeenCalledWith({
			where: { userId: "user-1" },
		});
		expect(mockTx.address.deleteMany).toHaveBeenCalledWith({
			where: { userId: "user-1" },
		});
		expect(mockTx.cart.deleteMany).toHaveBeenCalledWith({
			where: { userId: "user-1" },
		});
		expect(mockTx.wishlist.deleteMany).toHaveBeenCalledWith({
			where: { userId: "user-1" },
		});
	});

	it("should anonymize order PII in the transaction", async () => {
		const mockUser = {
			id: "user-order",
			image: null,
		};
		mockPrisma.user.findMany.mockResolvedValue([mockUser]);
		mockPrisma.reviewMedia.findMany.mockResolvedValue([]);
		mockPrisma.$transaction.mockResolvedValue(undefined);

		await processAccountDeletions();

		const transactionFn = mockPrisma.$transaction.mock.calls[0][0];
		const mockTx = {
			user: { update: vi.fn() },
			session: { deleteMany: vi.fn() },
			account: { deleteMany: vi.fn() },
			address: { deleteMany: vi.fn() },
			cart: { deleteMany: vi.fn() },
			wishlist: { deleteMany: vi.fn() },
			reviewMedia: { deleteMany: vi.fn() },
			productReview: { updateMany: vi.fn() },
			newsletterSubscriber: { updateMany: vi.fn() },
			order: { updateMany: vi.fn() },
		};

		await transactionFn(mockTx);

		expect(mockTx.order.updateMany).toHaveBeenCalledWith({
			where: { userId: "user-order" },
			data: {
				customerEmail: "anonymized-user-order@deleted.local",
				customerName: "Client supprimé",
				customerPhone: null,
				shippingFirstName: "X",
				shippingLastName: "X",
				shippingAddress1: "Adresse supprimée",
				shippingAddress2: null,
				shippingPostalCode: "00000",
				shippingCity: "Supprimé",
				shippingPhone: "",
				stripeCustomerId: null,
			},
		});
	});

	it("should delete avatar from UploadThing after successful transaction", async () => {
		const mockUser = {
			id: "user-2",
			image: "https://utfs.io/f/abc123",
		};
		mockPrisma.user.findMany.mockResolvedValue([mockUser]);
		mockPrisma.reviewMedia.findMany.mockResolvedValue([]);
		mockPrisma.$transaction.mockResolvedValue(undefined);
		mockDeleteUploadThingFileFromUrl.mockResolvedValue(true);

		await processAccountDeletions();

		expect(mockDeleteUploadThingFileFromUrl).toHaveBeenCalledWith(
			"https://utfs.io/f/abc123"
		);
	});

	it("should delete review media from UploadThing after successful transaction", async () => {
		const mockUser = {
			id: "user-3",
			image: null,
		};
		const mockReviewMedias = [
			{ url: "https://utfs.io/f/review1" },
			{ url: "https://utfs.io/f/review2" },
		];
		mockPrisma.user.findMany.mockResolvedValue([mockUser]);
		mockPrisma.reviewMedia.findMany.mockResolvedValue(mockReviewMedias);
		mockPrisma.$transaction.mockResolvedValue(undefined);
		mockDeleteUploadThingFilesFromUrls.mockResolvedValue(undefined);

		await processAccountDeletions();

		expect(mockPrisma.reviewMedia.findMany).toHaveBeenCalledWith({
			where: { review: { userId: "user-3" } },
			select: { url: true },
		});

		expect(mockDeleteUploadThingFilesFromUrls).toHaveBeenCalledWith([
			"https://utfs.io/f/review1",
			"https://utfs.io/f/review2",
		]);
	});

	it("should not fail if avatar deletion fails (non-blocking)", async () => {
		const mockUser = {
			id: "user-4",
			image: "https://utfs.io/f/failing-key",
		};
		mockPrisma.user.findMany.mockResolvedValue([mockUser]);
		mockPrisma.reviewMedia.findMany.mockResolvedValue([]);
		mockPrisma.$transaction.mockResolvedValue(undefined);
		mockDeleteUploadThingFileFromUrl.mockRejectedValue(
			new Error("UploadThing API error")
		);

		const result = await processAccountDeletions();

		expect(result).toEqual({ processed: 1, errors: 0, hasMore: false });
	});

	it("should not fail if review media deletion fails (non-blocking)", async () => {
		const mockUser = {
			id: "user-5",
			image: null,
		};
		mockPrisma.user.findMany.mockResolvedValue([mockUser]);
		mockPrisma.reviewMedia.findMany.mockResolvedValue([
			{ url: "https://utfs.io/f/failing-review" },
		]);
		mockPrisma.$transaction.mockResolvedValue(undefined);
		mockDeleteUploadThingFilesFromUrls.mockRejectedValue(
			new Error("UploadThing batch error")
		);

		const result = await processAccountDeletions();

		expect(result).toEqual({ processed: 1, errors: 0, hasMore: false });
	});

	it("should count errors when transaction fails", async () => {
		const mockUser = {
			id: "user-6",
			image: null,
		};
		mockPrisma.user.findMany.mockResolvedValue([mockUser]);
		mockPrisma.reviewMedia.findMany.mockResolvedValue([]);
		mockPrisma.$transaction.mockRejectedValue(new Error("DB connection lost"));

		const result = await processAccountDeletions();

		expect(result).toEqual({ processed: 0, errors: 1, hasMore: false });
	});

	it("should process multiple users and handle mixed success/failure", async () => {
		const users = [
			{ id: "user-ok", image: null },
			{ id: "user-fail", image: null },
			{ id: "user-ok2", image: null },
		];
		mockPrisma.user.findMany.mockResolvedValue(users);
		mockPrisma.reviewMedia.findMany.mockResolvedValue([]);
		mockPrisma.$transaction
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(new Error("DB error"))
			.mockResolvedValueOnce(undefined);

		const result = await processAccountDeletions();

		expect(result).toEqual({ processed: 2, errors: 1, hasMore: false });
	});

	it("should return hasMore=true when batch size limit is reached", async () => {
		const users = Array.from({ length: 25 }, (_, i) => ({
			id: `user-${i}`,
			image: null,
		}));
		mockPrisma.user.findMany.mockResolvedValue(users);
		mockPrisma.reviewMedia.findMany.mockResolvedValue([]);
		mockPrisma.$transaction.mockResolvedValue(undefined);

		const result = await processAccountDeletions();

		expect(result.hasMore).toBe(true);
		expect(result.processed).toBe(25);
	});

	it("should return hasMore=false when batch size limit is not reached", async () => {
		const users = Array.from({ length: 10 }, (_, i) => ({
			id: `user-${i}`,
			image: null,
		}));
		mockPrisma.user.findMany.mockResolvedValue(users);
		mockPrisma.reviewMedia.findMany.mockResolvedValue([]);
		mockPrisma.$transaction.mockResolvedValue(undefined);

		const result = await processAccountDeletions();

		expect(result.hasMore).toBe(false);
		expect(result.processed).toBe(10);
	});
});
