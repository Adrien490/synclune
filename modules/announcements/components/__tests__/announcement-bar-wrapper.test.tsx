import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockGetActiveAnnouncement, mockCookiesGet } = vi.hoisted(() => ({
	mockGetActiveAnnouncement: vi.fn(),
	mockCookiesGet: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/modules/announcements/data/get-active-announcement", () => ({
	getActiveAnnouncement: mockGetActiveAnnouncement,
}));

vi.mock("next/headers", () => ({
	cookies: vi.fn(() =>
		Promise.resolve({
			get: mockCookiesGet,
		}),
	),
}));

vi.mock("@/modules/announcements/constants/announcement-bar", () => ({
	getAnnouncementCookieName: (id: string) => `ab-dismissed-${id}`,
}));

vi.mock("../announcement-bar/announcement-bar", () => ({
	AnnouncementBar: ({
		message,
		announcementId,
	}: {
		message: string;
		link?: string;
		linkText?: string;
		announcementId: string;
		dismissDurationHours?: number;
	}) => (
		<div data-testid="announcement-bar" data-id={announcementId}>
			{message}
		</div>
	),
}));

// ============================================================================
// IMPORTS AFTER MOCKS
// ============================================================================

import { AnnouncementBarWrapper } from "../announcement-bar-wrapper";

// ============================================================================
// HELPERS
// ============================================================================

function createAnnouncement(overrides: Record<string, unknown> = {}) {
	return {
		id: "ann-1",
		message: "Livraison gratuite dès 50€",
		link: null,
		linkText: null,
		dismissDurationHours: 24,
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("AnnouncementBarWrapper", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCookiesGet.mockReturnValue(undefined);
	});

	it("renders null when no active announcement", async () => {
		mockGetActiveAnnouncement.mockResolvedValue(null);
		const Component = await AnnouncementBarWrapper();
		const { container } = render(Component as React.ReactElement);
		expect(container.firstChild).toBeNull();
	});

	it("renders AnnouncementBar when announcement is active and not dismissed", async () => {
		mockGetActiveAnnouncement.mockResolvedValue(createAnnouncement());
		mockCookiesGet.mockReturnValue(undefined); // not dismissed

		const Component = await AnnouncementBarWrapper();
		render(Component as React.ReactElement);
		expect(screen.getByTestId("announcement-bar")).toBeInTheDocument();
	});

	it("renders the announcement message", async () => {
		mockGetActiveAnnouncement.mockResolvedValue(
			createAnnouncement({ message: "Livraison gratuite dès 50€" }),
		);
		mockCookiesGet.mockReturnValue(undefined);

		const Component = await AnnouncementBarWrapper();
		render(Component as React.ReactElement);
		expect(screen.getByText("Livraison gratuite dès 50€")).toBeInTheDocument();
	});

	it("renders null when announcement is dismissed via cookie", async () => {
		mockGetActiveAnnouncement.mockResolvedValue(createAnnouncement({ id: "ann-1" }));
		mockCookiesGet.mockReturnValue({ value: "true" });

		const Component = await AnnouncementBarWrapper();
		const { container } = render(Component as React.ReactElement);
		expect(container.firstChild).toBeNull();
	});

	it("renders announcement when cookie exists but value is not 'true'", async () => {
		mockGetActiveAnnouncement.mockResolvedValue(createAnnouncement({ id: "ann-1" }));
		mockCookiesGet.mockReturnValue({ value: "false" });

		const Component = await AnnouncementBarWrapper();
		render(Component as React.ReactElement);
		expect(screen.getByTestId("announcement-bar")).toBeInTheDocument();
	});

	it("passes the correct announcement id to AnnouncementBar", async () => {
		mockGetActiveAnnouncement.mockResolvedValue(createAnnouncement({ id: "ann-42" }));
		mockCookiesGet.mockReturnValue(undefined);

		const Component = await AnnouncementBarWrapper();
		render(Component as React.ReactElement);
		expect(screen.getByTestId("announcement-bar")).toHaveAttribute("data-id", "ann-42");
	});

	it("checks cookie with correct key derived from announcement id", async () => {
		mockGetActiveAnnouncement.mockResolvedValue(createAnnouncement({ id: "ann-99" }));
		mockCookiesGet.mockReturnValue(undefined);

		const Component = await AnnouncementBarWrapper();
		render(Component as React.ReactElement);
		expect(mockCookiesGet).toHaveBeenCalledWith("ab-dismissed-ann-99");
	});

	it("renders announcement when cookies() throws (safe default)", async () => {
		const { cookies } = await import("next/headers");
		vi.mocked(cookies).mockRejectedValueOnce(new Error("cookies unavailable"));
		mockGetActiveAnnouncement.mockResolvedValue(createAnnouncement());

		const Component = await AnnouncementBarWrapper();
		render(Component as React.ReactElement);
		expect(screen.getByTestId("announcement-bar")).toBeInTheDocument();
	});
});
