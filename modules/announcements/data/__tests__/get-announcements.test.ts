import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrisma, mockLogger, mockCacheAnnouncementsList } = vi.hoisted(() => ({
	mockPrisma: { announcementBar: { findMany: vi.fn() } },
	mockLogger: { error: vi.fn() },
	mockCacheAnnouncementsList: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));
vi.mock("../../constants/cache", () => ({
	cacheAnnouncementsList: mockCacheAnnouncementsList,
}));

import { getAnnouncements } from "../get-announcements";

// ============================================================================
// HELPERS
// ============================================================================

const MOCK_ANNOUNCEMENTS = [
	{
		id: "ann_2",
		message: "Nouveau",
		link: null,
		linkText: null,
		startsAt: new Date("2026-03-01"),
		endsAt: null,
		isActive: true,
		dismissDurationHours: 24,
		createdAt: new Date("2026-03-01"),
		updatedAt: new Date("2026-03-01"),
	},
	{
		id: "ann_1",
		message: "Ancien",
		link: "/promo",
		linkText: "Voir",
		startsAt: new Date("2026-01-01"),
		endsAt: new Date("2026-02-01"),
		isActive: false,
		dismissDurationHours: 48,
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
	},
];

// ============================================================================
// TESTS
// ============================================================================

describe("getAnnouncements", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockPrisma.announcementBar.findMany.mockResolvedValue(MOCK_ANNOUNCEMENTS);
	});

	// ─── Cache ────────────────────────────────────────────────────────────────

	it("should call cacheAnnouncementsList for cache configuration", async () => {
		await getAnnouncements();

		expect(mockCacheAnnouncementsList).toHaveBeenCalled();
	});

	// ─── Query ────────────────────────────────────────────────────────────────

	it("should select all admin-needed fields", async () => {
		await getAnnouncements();

		expect(mockPrisma.announcementBar.findMany).toHaveBeenCalledWith({
			select: {
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
			},
			orderBy: { createdAt: "desc" },
		});
	});

	it("should order by createdAt desc", async () => {
		await getAnnouncements();

		const call = mockPrisma.announcementBar.findMany.mock.calls[0]![0];
		expect(call.orderBy).toEqual({ createdAt: "desc" });
	});

	// ─── Success ──────────────────────────────────────────────────────────────

	it("should return all announcements", async () => {
		const result = await getAnnouncements();

		expect(result).toEqual(MOCK_ANNOUNCEMENTS);
		expect(result).toHaveLength(2);
	});

	it("should return empty array when no announcements exist", async () => {
		mockPrisma.announcementBar.findMany.mockResolvedValue([]);

		const result = await getAnnouncements();

		expect(result).toEqual([]);
	});

	// ─── Error handling ───────────────────────────────────────────────────────

	it("should return empty array on database error", async () => {
		mockPrisma.announcementBar.findMany.mockRejectedValue(new Error("DB error"));

		const result = await getAnnouncements();

		expect(result).toEqual([]);
	});

	it("should log error on database failure", async () => {
		const error = new Error("Connection lost");
		mockPrisma.announcementBar.findMany.mockRejectedValue(error);

		await getAnnouncements();

		expect(mockLogger.error).toHaveBeenCalledWith("Failed to fetch announcements", error, {
			service: "fetchAnnouncements",
		});
	});
});
