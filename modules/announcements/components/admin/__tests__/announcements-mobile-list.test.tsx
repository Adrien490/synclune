import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AnnouncementListItem } from "../../../types/announcement.types";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockComputeAnnouncementStatus, mockFormatDateTime } = vi.hoisted(() => ({
	mockComputeAnnouncementStatus: vi.fn<() => "active" | "scheduled" | "expired" | "inactive">(
		() => "active",
	),
	mockFormatDateTime: vi.fn((date: Date) => String(date)),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("../../../services/announcement-schedule.service", () => ({
	computeAnnouncementStatus: mockComputeAnnouncementStatus,
}));

vi.mock("../../../utils/announcement-status", () => ({
	ANNOUNCEMENT_STATUS_LABELS: {
		active: "Active",
		scheduled: "Programmée",
		expired: "Expirée",
		inactive: "Inactive",
	},
	ANNOUNCEMENT_STATUS_COLORS: {
		active: "bg-green",
		scheduled: "bg-blue",
		expired: "bg-gray",
		inactive: "bg-amber",
	},
}));

vi.mock("../announcement-row-actions", () => ({
	AnnouncementRowActions: ({ announcement }: { announcement: AnnouncementListItem }) => (
		<div data-testid="announcement-row-actions" data-id={announcement.id} />
	),
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({
		isOpen: false,
		data: undefined,
		open: vi.fn(),
		close: vi.fn(),
		toggle: vi.fn(),
		clearData: vi.fn(),
	}),
}));

vi.mock("@/shared/components/selectable-mobile-card", () => ({
	SelectableMobileCard: ({
		ariaLabel,
		onOpen,
		children,
	}: {
		ariaLabel: string;
		onOpen?: () => void;
		children: React.ReactNode;
	}) => (
		<button type="button" aria-label={ariaLabel} onClick={onOpen}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/utils/dates", () => ({
	formatDateTime: mockFormatDateTime,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => (args as string[]).filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/data-table/table-empty-state", () => ({
	TableEmptyState: ({
		title,
		description,
	}: {
		icon?: React.ElementType;
		title: string;
		description: string;
	}) => (
		<div data-testid="table-empty-state">
			<span>{title}</span>
			<span>{description}</span>
		</div>
	),
}));

vi.mock("@/shared/components/ui/item", () => ({
	ItemGroup: ({
		children,
		"aria-label": ariaLabel,
		className,
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
		className?: string;
	}) => (
		<div data-testid="item-group" aria-label={ariaLabel} className={className}>
			{children}
		</div>
	),
	Item: ({
		children,
		"aria-roledescription": ariaRoleDescription,
		className,
	}: {
		children: React.ReactNode;
		variant?: string;
		size?: string;
		className?: string;
		"aria-roledescription"?: string;
	}) => (
		<div data-testid="item" aria-roledescription={ariaRoleDescription} className={className}>
			{children}
		</div>
	),
	ItemContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="item-content" className={className}>
			{children}
		</div>
	),
	ItemTitle: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="item-title">{children}</div>
	),
	ItemDescription: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="item-description" className={className}>
			{children}
		</div>
	),
	ItemActions: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="item-actions">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({
		children,
		className,
	}: {
		children: React.ReactNode;
		variant?: string;
		className?: string;
	}) => (
		<span data-testid="badge" className={className}>
			{children}
		</span>
	),
}));

// ============================================================================
// COMPONENT IMPORT (after mocks)
// ============================================================================

import { AnnouncementsMobileList } from "../announcements-mobile-list";

// ============================================================================
// HELPERS
// ============================================================================

function createAnnouncement(overrides: Partial<AnnouncementListItem> = {}): AnnouncementListItem {
	return {
		id: "ann_1",
		message: "Livraison offerte dès 50€",
		link: null,
		linkText: null,
		startsAt: new Date("2026-03-01T10:00:00Z"),
		endsAt: null,
		isActive: true,
		dismissDurationHours: 24,
		createdAt: new Date("2026-03-01T10:00:00Z"),
		updatedAt: new Date("2026-03-01T10:00:00Z"),
		...overrides,
	} as AnnouncementListItem;
}

/**
 * Renders AnnouncementsMobileList wrapped in React.Suspense and flushes
 * the promise via `act` so the component resolves synchronously in tests.
 * The component uses React.use() to unwrap its promise prop.
 */
async function renderWithSuspense(announcements: AnnouncementListItem[]) {
	const promise = Promise.resolve(announcements);
	let result!: ReturnType<typeof render>;
	await act(async () => {
		result = render(
			<React.Suspense fallback={<div data-testid="suspense-fallback" />}>
				<AnnouncementsMobileList announcementsPromise={promise} />
			</React.Suspense>,
		);
	});
	return result;
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("AnnouncementsMobileList", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockComputeAnnouncementStatus.mockReturnValue("active");
	});

	// ─── Empty state ──────────────────────────────────────────────────────────

	describe("empty state", () => {
		it("renders TableEmptyState when no announcements", async () => {
			await renderWithSuspense([]);
			expect(screen.getByTestId("table-empty-state")).toBeInTheDocument();
		});

		it("shows 'Aucune annonce' title in empty state", async () => {
			await renderWithSuspense([]);
			expect(screen.getByText("Aucune annonce")).toBeInTheDocument();
		});

		it("shows description text in empty state", async () => {
			await renderWithSuspense([]);
			expect(
				screen.getByText(
					"Aucune annonce pour le moment. Creez votre premiere annonce pour l'afficher sur la boutique.",
				),
			).toBeInTheDocument();
		});

		it("does not render the item group in empty state", async () => {
			await renderWithSuspense([]);
			expect(screen.queryByTestId("item-group")).not.toBeInTheDocument();
		});

		it("empty state wrapper has md:hidden class", async () => {
			const { container } = await renderWithSuspense([]);
			expect(container.querySelector(".md\\:hidden")).toBeInTheDocument();
		});
	});

	// ─── List rendering ───────────────────────────────────────────────────────

	describe("list rendering", () => {
		it("renders ItemGroup when announcements exist", async () => {
			await renderWithSuspense([createAnnouncement()]);
			expect(screen.getByTestId("item-group")).toBeInTheDocument();
		});

		it("ItemGroup has aria-label 'Annonces'", async () => {
			await renderWithSuspense([createAnnouncement()]);
			expect(screen.getByTestId("item-group")).toHaveAttribute("aria-label", "Annonces");
		});

		it("renders one Item per announcement", async () => {
			await renderWithSuspense([
				createAnnouncement({ id: "ann_1" }),
				createAnnouncement({ id: "ann_2" }),
				createAnnouncement({ id: "ann_3" }),
			]);
			expect(screen.getAllByTestId("item")).toHaveLength(3);
		});

		it("list wrapper has md:hidden class", async () => {
			const { container } = await renderWithSuspense([createAnnouncement()]);
			expect(container.querySelector(".md\\:hidden")).toBeInTheDocument();
		});

		it("does not render TableEmptyState when announcements exist", async () => {
			await renderWithSuspense([createAnnouncement()]);
			expect(screen.queryByTestId("table-empty-state")).not.toBeInTheDocument();
		});
	});

	// ─── Message ──────────────────────────────────────────────────────────────

	describe("message", () => {
		it("shows message text for each announcement", async () => {
			await renderWithSuspense([
				createAnnouncement({ id: "ann_1", message: "Promo printemps -20%" }),
				createAnnouncement({ id: "ann_2", message: "Livraison gratuite" }),
			]);
			expect(screen.getByText("Promo printemps -20%")).toBeInTheDocument();
			expect(screen.getByText("Livraison gratuite")).toBeInTheDocument();
		});

		it("renders message inside ItemTitle", async () => {
			await renderWithSuspense([createAnnouncement({ message: "Soldes été" })]);
			const title = screen.getByTestId("item-title");
			expect(title).toHaveTextContent("Soldes été");
		});
	});

	// ─── Status badge ─────────────────────────────────────────────────────────

	describe("status badge", () => {
		it("calls computeAnnouncementStatus for each announcement", async () => {
			await renderWithSuspense([
				createAnnouncement({ id: "ann_1" }),
				createAnnouncement({ id: "ann_2" }),
			]);
			expect(mockComputeAnnouncementStatus).toHaveBeenCalledTimes(2);
		});

		it("shows 'Active' status badge", async () => {
			mockComputeAnnouncementStatus.mockReturnValue("active");
			await renderWithSuspense([createAnnouncement()]);
			expect(screen.getByTestId("badge")).toHaveTextContent("Active");
		});

		it("shows 'Programmée' status badge", async () => {
			mockComputeAnnouncementStatus.mockReturnValue("scheduled");
			await renderWithSuspense([createAnnouncement()]);
			expect(screen.getByTestId("badge")).toHaveTextContent("Programmée");
		});

		it("shows 'Expirée' status badge", async () => {
			mockComputeAnnouncementStatus.mockReturnValue("expired");
			await renderWithSuspense([createAnnouncement()]);
			expect(screen.getByTestId("badge")).toHaveTextContent("Expirée");
		});

		it("shows 'Inactive' status badge", async () => {
			mockComputeAnnouncementStatus.mockReturnValue("inactive");
			await renderWithSuspense([createAnnouncement()]);
			expect(screen.getByTestId("badge")).toHaveTextContent("Inactive");
		});

		it("applies status color class to badge", async () => {
			mockComputeAnnouncementStatus.mockReturnValue("active");
			await renderWithSuspense([createAnnouncement()]);
			expect(screen.getByTestId("badge").className).toContain("bg-green");
		});
	});

	// ─── Dates ────────────────────────────────────────────────────────────────

	describe("dates", () => {
		it("calls formatDateTime with startsAt", async () => {
			const startsAt = new Date("2026-04-01T08:00:00Z");
			await renderWithSuspense([createAnnouncement({ startsAt })]);
			expect(mockFormatDateTime).toHaveBeenCalledWith(startsAt);
		});

		it("shows formatted start date text", async () => {
			const startsAt = new Date("2026-04-01T08:00:00Z");
			await renderWithSuspense([createAnnouncement({ startsAt })]);
			expect(screen.getByText(String(startsAt))).toBeInTheDocument();
		});

		it("shows end date with arrow separator when endsAt is set", async () => {
			const endsAt = new Date("2026-05-01T08:00:00Z");
			await renderWithSuspense([createAnnouncement({ endsAt })]);
			expect(mockFormatDateTime).toHaveBeenCalledWith(endsAt);
			expect(screen.getByText("→")).toBeInTheDocument();
			expect(screen.getByText(String(endsAt))).toBeInTheDocument();
		});

		it("does not show end date or arrow when endsAt is null", async () => {
			await renderWithSuspense([createAnnouncement({ endsAt: null })]);
			expect(screen.queryByText("→")).not.toBeInTheDocument();
		});
	});

	// ─── Item interaction ─────────────────────────────────────────────────────

	describe("item interaction", () => {
		it("renders a clickable button per announcement", async () => {
			await renderWithSuspense([
				createAnnouncement({ id: "ann_1" }),
				createAnnouncement({ id: "ann_2" }),
			]);
			expect(screen.getAllByRole("button", { name: /Annonce/i })).toHaveLength(2);
		});

		it("renders one listitem per announcement", async () => {
			await renderWithSuspense([createAnnouncement({ id: "ann_xyz" })]);
			expect(screen.getAllByRole("listitem")).toHaveLength(1);
		});
	});
});
