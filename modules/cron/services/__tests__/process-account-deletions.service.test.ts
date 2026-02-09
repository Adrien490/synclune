import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockDeleteUploadThingFileFromUrl } = vi.hoisted(() => ({
	mockPrisma: {
		user: { findMany: vi.fn() },
		$transaction: vi.fn(),
	},
	mockDeleteUploadThingFileFromUrl: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/modules/media/services/delete-uploadthing-files.service", () => ({
	deleteUploadThingFileFromUrl: mockDeleteUploadThingFileFromUrl,
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

		expect(result).toEqual({ processed: 0, errors: 0 });
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
			select: { id: true, email: true, image: true },
			take: 50,
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
			email: "test@example.com",
			image: null,
		};
		mockPrisma.user.findMany.mockResolvedValue([mockUser]);
		mockPrisma.$transaction.mockResolvedValue(undefined);

		const result = await processAccountDeletions();

		expect(result).toEqual({ processed: 1, errors: 0 });
		expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);

		const transactionFn = mockPrisma.$transaction.mock.calls[0][0];
		const mockTx = {
			user: { update: vi.fn() },
			session: { deleteMany: vi.fn() },
			account: { deleteMany: vi.fn() },
			address: { deleteMany: vi.fn() },
			cart: { deleteMany: vi.fn() },
			wishlist: { deleteMany: vi.fn() },
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

	it("should delete avatar from UploadThing after successful transaction", async () => {
		const mockUser = {
			id: "user-2",
			email: "avatar@example.com",
			image: "https://utfs.io/f/abc123",
		};
		mockPrisma.user.findMany.mockResolvedValue([mockUser]);
		mockPrisma.$transaction.mockResolvedValue(undefined);
		mockDeleteUploadThingFileFromUrl.mockResolvedValue(true);

		await processAccountDeletions();

		expect(mockDeleteUploadThingFileFromUrl).toHaveBeenCalledWith(
			"https://utfs.io/f/abc123"
		);
	});

	it("should not fail if avatar deletion fails (non-blocking)", async () => {
		const mockUser = {
			id: "user-3",
			email: "avatar-fail@example.com",
			image: "https://utfs.io/f/failing-key",
		};
		mockPrisma.user.findMany.mockResolvedValue([mockUser]);
		mockPrisma.$transaction.mockResolvedValue(undefined);
		mockDeleteUploadThingFileFromUrl.mockRejectedValue(
			new Error("UploadThing API error")
		);

		const result = await processAccountDeletions();

		expect(result).toEqual({ processed: 1, errors: 0 });
	});

	it("should count errors when transaction fails", async () => {
		const mockUser = {
			id: "user-4",
			email: "error@example.com",
			image: null,
		};
		mockPrisma.user.findMany.mockResolvedValue([mockUser]);
		mockPrisma.$transaction.mockRejectedValue(new Error("DB connection lost"));

		const result = await processAccountDeletions();

		expect(result).toEqual({ processed: 0, errors: 1 });
	});

	it("should process multiple users and handle mixed success/failure", async () => {
		const users = [
			{ id: "user-ok", email: "ok@test.com", image: null },
			{ id: "user-fail", email: "fail@test.com", image: null },
			{ id: "user-ok2", email: "ok2@test.com", image: null },
		];
		mockPrisma.user.findMany.mockResolvedValue(users);
		mockPrisma.$transaction
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(new Error("DB error"))
			.mockResolvedValueOnce(undefined);

		const result = await processAccountDeletions();

		expect(result).toEqual({ processed: 2, errors: 1 });
	});
});
