import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockSendReviewRequestEmail } = vi.hoisted(() => ({
	mockPrisma: {
		order: { findMany: vi.fn(), update: vi.fn() },
	},
	mockSendReviewRequestEmail: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/emails/services/review-emails", () => ({
	sendReviewRequestEmail: mockSendReviewRequestEmail,
}));

vi.mock("@/shared/constants/urls", () => ({
	buildUrl: (path: string) => `https://synclune.fr${path}`,
	ROUTES: {
		SHOP: { PRODUCT: (slug: string) => `/creations/${slug}` },
		NOTIFICATIONS: { UNSUBSCRIBE: "/notifications/desinscription" },
	},
}));

import { sendReviewRequests } from "../send-review-requests.service";
import { THRESHOLDS } from "@/modules/cron/constants/limits";

interface OrderFixture {
	id: string;
	orderNumber: string;
	userId: string | null;
	customerEmail: string;
	customerName: string;
	items: Array<{
		id: string;
		sku: {
			images: Array<{ url: string }>;
			product: { id: string; title: string; slug: string };
		};
	}>;
}

function buildOrder(overrides: Partial<OrderFixture> = {}): OrderFixture {
	return {
		id: overrides.id ?? "order-1",
		orderNumber: overrides.orderNumber ?? "SYN-2026-00001",
		userId: overrides.userId ?? "user-1",
		customerEmail: overrides.customerEmail ?? "marie@example.com",
		customerName: overrides.customerName ?? "Marie",
		items: overrides.items ?? [
			{
				id: "item-1",
				sku: {
					images: [{ url: "https://utfs.io/bague.jpg" }],
					product: {
						id: "product-1",
						title: "Bague Éternité",
						slug: "bague-eternite",
					},
				},
			},
		],
	};
}

describe("sendReviewRequests", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers({ shouldAdvanceTime: true });
		vi.setSystemTime(new Date("2026-05-18T10:00:00Z"));
	});

	it("returns zeros when no candidate orders are eligible", async () => {
		mockPrisma.order.findMany.mockResolvedValue([]);

		const result = await sendReviewRequests();

		expect(result).toMatchObject({ processed: 0, errored: 0, skipped: 0, emailsSent: 0 });
		expect(mockSendReviewRequestEmail).not.toHaveBeenCalled();
		expect(mockPrisma.order.update).not.toHaveBeenCalled();
	});

	it("queries DELIVERED orders past the J+7 cutoff with reviewRequestSentAt null", async () => {
		mockPrisma.order.findMany.mockResolvedValue([]);

		await sendReviewRequests();

		const call = mockPrisma.order.findMany.mock.calls[0]![0];
		expect(call.where.fulfillmentStatus).toBe("DELIVERED");
		expect(call.where.reviewRequestSentAt).toBeNull();
		expect(call.where.userId).toEqual({ not: null });
		expect(call.where.deletedAt).toBeNull();

		const cutoff = new Date(Date.now() - THRESHOLDS.REVIEW_REQUEST_DELAY_MS);
		expect(call.where.actualDelivery.lt.getTime()).toBe(cutoff.getTime());
		expect(call.where.actualDelivery.not).toBeNull();
		expect(call.orderBy).toEqual({ actualDelivery: "asc" });

		// Filtre items éligibles (déléguée à Prisma au lieu de filtrer en JS)
		expect(call.select.items.where).toEqual({
			review: null,
			sku: { product: { deletedAt: null } },
		});
	});

	/**
	 * @regression biz-bug-001
	 * Une demande d'avis ne doit jamais cibler une commande annulée ou
	 * intégralement remboursée/échouée. Le filtre vit dans la clause `where`
	 * Prisma (pas en JS) — on verrouille sa présence.
	 */
	it("[regression biz-bug-001] excludes cancelled / fully-refunded / failed / expired orders via where clause", async () => {
		mockPrisma.order.findMany.mockResolvedValue([]);

		await sendReviewRequests();

		const call = mockPrisma.order.findMany.mock.calls[0]![0];
		expect(call.where.status).toEqual({ not: "CANCELLED" });
		expect(call.where.paymentStatus).toEqual({
			notIn: ["REFUNDED", "FAILED", "EXPIRED"],
		});
		// PARTIALLY_REFUNDED reste éligible (client peut noter la partie conservée).
		expect(call.where.paymentStatus.notIn).not.toContain("PARTIALLY_REFUNDED");
		expect(call.where.paymentStatus.notIn).not.toContain("PAID");
	});

	it("sends one email per eligible order then flags reviewRequestSentAt", async () => {
		const order = buildOrder();
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockSendReviewRequestEmail.mockResolvedValue({ success: true });

		const result = await sendReviewRequests();

		expect(mockSendReviewRequestEmail).toHaveBeenCalledTimes(1);
		const args = mockSendReviewRequestEmail.mock.calls[0]![0];
		expect(args).toMatchObject({
			to: "marie@example.com",
			customerName: "Marie",
			orderNumber: "SYN-2026-00001",
			idempotencyKey: "review-request:order-1",
		});
		expect(args.unsubscribeUrl).toMatch(
			/^https:\/\/synclune\.fr\/notifications\/desinscription\?email=marie%40example\.com&token=[a-f0-9]+$/,
		);
		expect(args.items).toHaveLength(1);
		expect(args.items[0]).toMatchObject({
			productTitle: "Bague Éternité",
			productSlug: "bague-eternite",
			productUrl: "https://synclune.fr/creations/bague-eternite",
			productImageUrl: "https://utfs.io/bague.jpg",
		});

		expect(mockPrisma.order.update).toHaveBeenCalledWith({
			where: { id: "order-1" },
			data: { reviewRequestSentAt: expect.any(Date) },
		});
		expect(result).toMatchObject({ processed: 1, errored: 0, skipped: 0, emailsSent: 1 });
	});

	it("dedups products inside an order (same productId from multiple SKUs)", async () => {
		const sharedProduct = {
			id: "product-1",
			title: "Bague Éternité",
			slug: "bague-eternite",
		};
		const order = buildOrder({
			items: [
				{
					id: "item-a",
					sku: { images: [{ url: "https://utfs.io/a.jpg" }], product: sharedProduct },
				},
				{
					id: "item-b",
					sku: { images: [], product: sharedProduct },
				},
			],
		});
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockSendReviewRequestEmail.mockResolvedValue({ success: true });

		await sendReviewRequests();

		const args = mockSendReviewRequestEmail.mock.calls[0]![0];
		expect(args.items).toHaveLength(1);
	});

	it("flags reviewRequestSentAt without sending when Prisma returns no eligible items", async () => {
		// Prisma where filter already excludes reviewed items / deleted products,
		// so the service simply sees an empty `items` array for such orders.
		const order = buildOrder({ items: [] });
		mockPrisma.order.findMany.mockResolvedValue([order]);

		const result = await sendReviewRequests();

		expect(mockSendReviewRequestEmail).not.toHaveBeenCalled();
		expect(mockPrisma.order.update).toHaveBeenCalledWith({
			where: { id: "order-1" },
			data: { reviewRequestSentAt: expect.any(Date) },
		});
		expect(result).toMatchObject({
			processed: 0,
			skipped: 1,
			emailsSent: 0,
			ordersWithoutEligibleItems: 1,
		});
	});

	it("counts a Resend failure as errored AND still flags the order (best-effort, no duplicates)", async () => {
		mockPrisma.order.findMany.mockResolvedValue([buildOrder()]);
		mockSendReviewRequestEmail.mockResolvedValue({ success: false, error: "boom" });
		mockPrisma.order.update.mockResolvedValue({});

		const result = await sendReviewRequests();

		// Even on Resend failure, the order is flagged so we never re-send (avoids
		// the historical "user gets 2 emails on Resend timeout" duplication bug).
		expect(mockPrisma.order.update).toHaveBeenCalledWith({
			where: { id: "order-1" },
			data: { reviewRequestSentAt: expect.any(Date) },
		});
		expect(result).toMatchObject({ processed: 0, errored: 1, emailsSent: 0 });
	});

	it("flags the order even when sendReviewRequestEmail throws (best-effort)", async () => {
		mockPrisma.order.findMany.mockResolvedValue([buildOrder()]);
		mockSendReviewRequestEmail.mockRejectedValue(new Error("network down"));
		mockPrisma.order.update.mockResolvedValue({});

		const result = await sendReviewRequests();

		expect(mockPrisma.order.update).toHaveBeenCalledWith({
			where: { id: "order-1" },
			data: { reviewRequestSentAt: expect.any(Date) },
		});
		expect(result).toMatchObject({ processed: 0, errored: 1 });
	});

	it("skips and flags orders with an invalid customer email (never reach Resend)", async () => {
		mockPrisma.order.findMany.mockResolvedValue([
			buildOrder({ id: "order-bad", customerEmail: "not-an-email" }),
		]);
		mockPrisma.order.update.mockResolvedValue({});

		const result = await sendReviewRequests();

		expect(mockSendReviewRequestEmail).not.toHaveBeenCalled();
		expect(mockPrisma.order.update).toHaveBeenCalledWith({
			where: { id: "order-bad" },
			data: { reviewRequestSentAt: expect.any(Date) },
		});
		expect(result).toMatchObject({ processed: 0, errored: 0, skipped: 1, emailsSent: 0 });
	});

	it("passes a stable idempotencyKey 'review-request:<orderId>' to Resend", async () => {
		mockPrisma.order.findMany.mockResolvedValue([buildOrder({ id: "order-abc-123" })]);
		mockSendReviewRequestEmail.mockResolvedValue({ success: true });

		await sendReviewRequests();

		const args = mockSendReviewRequestEmail.mock.calls[0]![0];
		expect(args.idempotencyKey).toBe("review-request:order-abc-123");
	});

	it("falls back to a default customerName when name is empty", async () => {
		mockPrisma.order.findMany.mockResolvedValue([buildOrder({ customerName: "" })]);
		mockSendReviewRequestEmail.mockResolvedValue({ success: true });

		await sendReviewRequests();

		expect(mockSendReviewRequestEmail.mock.calls[0]![0].customerName).toBe("vous");
	});
});
