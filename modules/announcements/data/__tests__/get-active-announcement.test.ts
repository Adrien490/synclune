import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrisma, mockLogger, mockCacheActiveAnnouncement } = vi.hoisted(() => ({
	mockPrisma: { announcementBar: { findFirst: vi.fn() } },
	mockLogger: { error: vi.fn() },
	mockCacheActiveAnnouncement: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));
vi.mock("../../constants/cache", () => ({
	cacheActiveAnnouncement: mockCacheActiveAnnouncement,
}));

import { getActiveAnnouncement } from "../get-active-announcement";

// ============================================================================
// HELPERS
// ============================================================================

const MOCK_ANNOUNCEMENT = {
	id: "ann_1",
	message: "Livraison offerte dès 50€",
	link: "/soldes",
	linkText: "En profiter",
	dismissDurationHours: 24,
};

// ============================================================================
// TESTS
// ============================================================================

describe("getActiveAnnouncement", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockPrisma.announcementBar.findFirst.mockResolvedValue(MOCK_ANNOUNCEMENT);
	});

	// ─── Cache ────────────────────────────────────────────────────────────────

	it("should call cacheActiveAnnouncement for cache configuration", async () => {
		await getActiveAnnouncement();

		expect(mockCacheActiveAnnouncement).toHaveBeenCalled();
	});

	// ─── Query ────────────────────────────────────────────────────────────────

	it("should query for active announcements within schedule window", async () => {
		await getActiveAnnouncement();

		expect(mockPrisma.announcementBar.findFirst).toHaveBeenCalledWith({
			where: {
				isActive: true,
				startsAt: { lte: expect.any(Date) },
				OR: [{ endsAt: null }, { endsAt: { gt: expect.any(Date) } }],
			},
			select: {
				id: true,
				message: true,
				link: true,
				linkText: true,
				dismissDurationHours: true,
			},
			orderBy: { createdAt: "desc" },
		});
	});

	it("should select only storefront-needed fields", async () => {
		await getActiveAnnouncement();

		const call = mockPrisma.announcementBar.findFirst.mock.calls[0]![0];
		const selectKeys = Object.keys(call.select);
		expect(selectKeys).toEqual(["id", "message", "link", "linkText", "dismissDurationHours"]);
	});

	it("should order by createdAt desc (newest first)", async () => {
		await getActiveAnnouncement();

		const call = mockPrisma.announcementBar.findFirst.mock.calls[0]![0];
		expect(call.orderBy).toEqual({ createdAt: "desc" });
	});

	// ─── Success ──────────────────────────────────────────────────────────────

	it("should return the active announcement", async () => {
		const result = await getActiveAnnouncement();

		expect(result).toEqual(MOCK_ANNOUNCEMENT);
	});

	it("should return null when no active announcement exists", async () => {
		mockPrisma.announcementBar.findFirst.mockResolvedValue(null);

		const result = await getActiveAnnouncement();

		expect(result).toBeNull();
	});

	// ─── Error handling ───────────────────────────────────────────────────────

	it("should return null on database error", async () => {
		mockPrisma.announcementBar.findFirst.mockRejectedValue(new Error("DB error"));

		const result = await getActiveAnnouncement();

		expect(result).toBeNull();
	});

	it("should log error on database failure", async () => {
		const error = new Error("Connection lost");
		mockPrisma.announcementBar.findFirst.mockRejectedValue(error);

		await getActiveAnnouncement();

		expect(mockLogger.error).toHaveBeenCalledWith("Failed to fetch active announcement", error, {
			service: "fetchActiveAnnouncement",
		});
	});
});
