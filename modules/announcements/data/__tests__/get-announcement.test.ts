import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrisma, mockLogger, mockCacheAnnouncementsList } = vi.hoisted(() => ({
	mockPrisma: { announcementBar: { findUnique: vi.fn() } },
	mockLogger: { error: vi.fn() },
	mockCacheAnnouncementsList: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));
vi.mock("../../constants/cache", () => ({
	cacheAnnouncementsList: mockCacheAnnouncementsList,
}));

import { getAnnouncement } from "../get-announcement";

// ============================================================================
// HELPERS
// ============================================================================

const MOCK_ANNOUNCEMENT = {
	id: "ann_1",
	message: "Promo été",
	link: "/soldes",
	linkText: "En profiter",
	startsAt: new Date("2026-04-01"),
	endsAt: null,
	isActive: true,
	dismissDurationHours: 24,
	createdAt: new Date("2026-03-01"),
	updatedAt: new Date("2026-03-01"),
};

// ============================================================================
// TESTS
// ============================================================================

describe("getAnnouncement", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockPrisma.announcementBar.findUnique.mockResolvedValue(MOCK_ANNOUNCEMENT);
	});

	// ─── Cache ────────────────────────────────────────────────────────────────

	it("should call cacheAnnouncementsList for cache configuration", async () => {
		await getAnnouncement("ann_1");

		expect(mockCacheAnnouncementsList).toHaveBeenCalled();
	});

	// ─── Query ────────────────────────────────────────────────────────────────

	it("should query by ID", async () => {
		await getAnnouncement("ann_1");

		expect(mockPrisma.announcementBar.findUnique).toHaveBeenCalledWith({
			where: { id: "ann_1" },
			select: expect.objectContaining({
				id: true,
				message: true,
				link: true,
				linkText: true,
				startsAt: true,
				endsAt: true,
				isActive: true,
				dismissDurationHours: true,
				createdAt: true,
				updatedAt: true,
			}),
		});
	});

	// ─── Success ──────────────────────────────────────────────────────────────

	it("should return the announcement", async () => {
		const result = await getAnnouncement("ann_1");

		expect(result).toEqual(MOCK_ANNOUNCEMENT);
	});

	it("should return null when announcement does not exist", async () => {
		mockPrisma.announcementBar.findUnique.mockResolvedValue(null);

		const result = await getAnnouncement("nonexistent");

		expect(result).toBeNull();
	});

	// ─── Error handling ───────────────────────────────────────────────────────

	it("should return null on database error", async () => {
		mockPrisma.announcementBar.findUnique.mockRejectedValue(new Error("DB error"));

		const result = await getAnnouncement("ann_1");

		expect(result).toBeNull();
	});

	it("should log error on database failure", async () => {
		const error = new Error("Connection lost");
		mockPrisma.announcementBar.findUnique.mockRejectedValue(error);

		await getAnnouncement("ann_1");

		expect(mockLogger.error).toHaveBeenCalledWith("Failed to fetch announcement", error, {
			service: "fetchAnnouncement",
		});
	});
});
