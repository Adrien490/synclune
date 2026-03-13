import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockCookieStore, mockCookies } = vi.hoisted(() => {
	const mockCookieStore = { set: vi.fn() };
	return {
		mockCookieStore,
		mockCookies: vi.fn().mockResolvedValue(mockCookieStore),
	};
});

vi.mock("next/headers", () => ({ cookies: mockCookies }));

import { dismissAnnouncementAction } from "../dismiss-announcement";

// ============================================================================
// TESTS
// ============================================================================

describe("dismissAnnouncementAction", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockCookies.mockResolvedValue(mockCookieStore);
	});

	it("should set a cookie with the correct name", async () => {
		await dismissAnnouncementAction("abc-123", 24);

		expect(mockCookieStore.set).toHaveBeenCalledWith(
			"ab-dismissed-abc-123",
			"true",
			expect.any(Object),
		);
	});

	it("should set httpOnly to true", async () => {
		await dismissAnnouncementAction("abc-123", 24);

		expect(mockCookieStore.set).toHaveBeenCalledWith(
			expect.any(String),
			"true",
			expect.objectContaining({ httpOnly: true }),
		);
	});

	it("should set sameSite to strict", async () => {
		await dismissAnnouncementAction("abc-123", 24);

		expect(mockCookieStore.set).toHaveBeenCalledWith(
			expect.any(String),
			"true",
			expect.objectContaining({ sameSite: "strict" }),
		);
	});

	it("should set path to /", async () => {
		await dismissAnnouncementAction("abc-123", 24);

		expect(mockCookieStore.set).toHaveBeenCalledWith(
			expect.any(String),
			"true",
			expect.objectContaining({ path: "/" }),
		);
	});

	it("should calculate maxAge from dismissDurationHours", async () => {
		await dismissAnnouncementAction("abc-123", 48);

		expect(mockCookieStore.set).toHaveBeenCalledWith(
			expect.any(String),
			"true",
			expect.objectContaining({ maxAge: 48 * 60 * 60 }),
		);
	});

	it("should set secure=false in non-production", async () => {
		await dismissAnnouncementAction("abc-123", 24);

		expect(mockCookieStore.set).toHaveBeenCalledWith(
			expect.any(String),
			"true",
			expect.objectContaining({ secure: false }),
		);
	});

	it("should return { success: true }", async () => {
		const result = await dismissAnnouncementAction("abc-123", 24);

		expect(result).toEqual({ success: true });
	});

	it("should handle different announcement IDs", async () => {
		await dismissAnnouncementAction("xyz-789", 12);

		expect(mockCookieStore.set).toHaveBeenCalledWith(
			"ab-dismissed-xyz-789",
			"true",
			expect.objectContaining({ maxAge: 12 * 60 * 60 }),
		);
	});
});
