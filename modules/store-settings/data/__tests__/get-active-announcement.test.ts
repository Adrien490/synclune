import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockLogger, mockCacheStoreAnnouncement } = vi.hoisted(() => ({
	mockPrisma: { storeSettings: { findUnique: vi.fn() } },
	mockLogger: { error: vi.fn() },
	mockCacheStoreAnnouncement: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));
vi.mock("../../constants/cache", () => ({
	STORE_SETTINGS_SINGLETON_ID: "store-settings-singleton",
	cacheStoreAnnouncement: mockCacheStoreAnnouncement,
}));

import { getActiveAnnouncement, hashAnnouncementMessage } from "../get-active-announcement";

function makeRecord(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		announcementMessage: "Livraison offerte",
		announcementLink: "/collections/promo",
		announcementStartsAt: null,
		announcementEndsAt: null,
		announcementIsActive: true,
		...overrides,
	};
}

describe("getActiveAnnouncement", () => {
	beforeEach(() => vi.resetAllMocks());

	it("returns the announcement with a stable 16-char hex hash when active", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValue(makeRecord());
		const result = await getActiveAnnouncement();
		expect(result).not.toBeNull();
		expect(result?.message).toBe("Livraison offerte");
		expect(result?.link).toBe("/collections/promo");
		expect(result?.hash).toMatch(/^[a-f0-9]{16}$/);
	});

	it("configures cache via cacheStoreAnnouncement", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValue(makeRecord());
		await getActiveAnnouncement();
		expect(mockCacheStoreAnnouncement).toHaveBeenCalled();
	});

	it("returns null when isActive=false", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValue(
			makeRecord({ announcementIsActive: false }),
		);
		expect(await getActiveAnnouncement()).toBeNull();
	});

	it("returns null when message is null", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValue(
			makeRecord({ announcementMessage: null }),
		);
		expect(await getActiveAnnouncement()).toBeNull();
	});

	it("returns null when message is blank whitespace", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValue(
			makeRecord({ announcementMessage: "   " }),
		);
		expect(await getActiveAnnouncement()).toBeNull();
	});

	it("returns null when startsAt is in the future", async () => {
		const future = new Date(Date.now() + 60_000);
		mockPrisma.storeSettings.findUnique.mockResolvedValue(
			makeRecord({ announcementStartsAt: future }),
		);
		expect(await getActiveAnnouncement()).toBeNull();
	});

	it("returns null when endsAt is in the past", async () => {
		const past = new Date(Date.now() - 60_000);
		mockPrisma.storeSettings.findUnique.mockResolvedValue(makeRecord({ announcementEndsAt: past }));
		expect(await getActiveAnnouncement()).toBeNull();
	});

	it("returns the announcement when within the scheduling window", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValue(
			makeRecord({
				announcementStartsAt: new Date(Date.now() - 60_000),
				announcementEndsAt: new Date(Date.now() + 60_000),
			}),
		);
		const result = await getActiveAnnouncement();
		expect(result).not.toBeNull();
	});

	it("fails open (returns null) when Prisma throws", async () => {
		mockPrisma.storeSettings.findUnique.mockRejectedValue(new Error("DB down"));
		expect(await getActiveAnnouncement()).toBeNull();
		expect(mockLogger.error).toHaveBeenCalled();
	});

	it("returns null when settings row is missing", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValue(null);
		expect(await getActiveAnnouncement()).toBeNull();
	});

	it("hash changes when the message changes (auto-reset dismiss cookie)", () => {
		const h1 = hashAnnouncementMessage("Livraison offerte");
		const h2 = hashAnnouncementMessage("Nouvelle collection");
		expect(h1).not.toBe(h2);
		expect(h1).toMatch(/^[a-f0-9]{16}$/);
		expect(h2).toMatch(/^[a-f0-9]{16}$/);
	});
});
