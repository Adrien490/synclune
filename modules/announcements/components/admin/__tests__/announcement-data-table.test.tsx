import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import type { AnnouncementListItem } from "../../../types/announcement.types";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockComputeStatus, mockFormatDateTime } = vi.hoisted(() => ({
	mockComputeStatus: vi.fn(() => "active" as const),
	mockFormatDateTime: vi.fn((date: Date) => date.toISOString()),
}));

vi.mock("../../../services/announcement-schedule.service", () => ({
	computeAnnouncementStatus: mockComputeStatus,
}));

vi.mock("@/shared/utils/dates", () => ({
	formatDateTime: mockFormatDateTime,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...classes: string[]) => classes.filter(Boolean).join(" "),
}));

vi.mock("../../../utils/announcement-status", () => ({
	ANNOUNCEMENT_STATUS_LABELS: {
		active: "Active",
		scheduled: "Programmée",
		expired: "Expirée",
		inactive: "Inactive",
	},
	ANNOUNCEMENT_STATUS_COLORS: {
		active: "bg-green-100 text-green-800",
		scheduled: "bg-blue-100 text-blue-800",
		expired: "bg-gray-100 text-gray-800",
		inactive: "bg-yellow-100 text-yellow-800",
	},
}));

vi.mock("../announcement-row-actions", () => ({
	AnnouncementRowActions: ({ announcement }: { announcement: AnnouncementListItem }) => (
		<button data-testid={`actions-${announcement.id}`} aria-label="row-actions" />
	),
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<span data-testid="badge" className={className}>
			{children}
		</span>
	),
}));

vi.mock("@/shared/components/ui/table", () => ({
	Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
	TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
	TableCell: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<td className={className}>{children}</td>
	),
	TableHead: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<th className={className}>{children}</th>
	),
	TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
	TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

import { AnnouncementDataTable } from "../announcement-data-table";

// ============================================================================
// HELPERS
// ============================================================================

function createAnnouncement(overrides: Partial<AnnouncementListItem> = {}): AnnouncementListItem {
	return {
		id: "ann_1",
		message: "Livraison offerte dès 50€",
		link: null,
		linkText: null,
		startsAt: new Date("2026-03-01"),
		endsAt: null,
		isActive: true,
		dismissDurationHours: 24,
		createdAt: new Date("2026-03-01"),
		updatedAt: new Date("2026-03-01"),
		...overrides,
	} as AnnouncementListItem;
}

async function renderTable(announcements: AnnouncementListItem[]) {
	await act(async () => {
		render(<AnnouncementDataTable announcementsPromise={Promise.resolve(announcements)} />);
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("AnnouncementDataTable", () => {
	beforeEach(() => {
		cleanup();
	});

	// ─── Empty state ──────────────────────────────────────────────────────────

	it("should show empty state when no announcements", async () => {
		await renderTable([]);

		expect(screen.getByText("Aucune annonce pour le moment")).toBeInTheDocument();
		expect(screen.getByText(/Créez votre première annonce/)).toBeInTheDocument();
	});

	it("should not render table in empty state", async () => {
		await renderTable([]);

		expect(screen.queryByRole("table")).not.toBeInTheDocument();
	});

	// ─── Table rendering ──────────────────────────────────────────────────────

	it("should render table with announcements", async () => {
		await renderTable([createAnnouncement()]);

		expect(screen.getByRole("table")).toBeInTheDocument();
	});

	it("should render announcement message", async () => {
		await renderTable([createAnnouncement({ message: "Promo spéciale" })]);

		expect(screen.getByText("Promo spéciale")).toBeInTheDocument();
	});

	it("should render linkText when present", async () => {
		await renderTable([createAnnouncement({ linkText: "En profiter" })]);

		expect(screen.getByText(/En profiter/)).toBeInTheDocument();
	});

	it("should not render linkText section when null", async () => {
		await renderTable([createAnnouncement({ linkText: null })]);

		expect(screen.queryByText(/Lien :/)).not.toBeInTheDocument();
	});

	// ─── Status badge ─────────────────────────────────────────────────────────

	it("should compute and display announcement status", async () => {
		mockComputeStatus.mockReturnValue("active");

		await renderTable([createAnnouncement()]);

		expect(screen.getByText("Active")).toBeInTheDocument();
	});

	it("should display scheduled status", async () => {
		mockComputeStatus.mockReturnValue("scheduled");

		await renderTable([createAnnouncement()]);

		expect(screen.getByText("Programmée")).toBeInTheDocument();
	});

	it("should display expired status", async () => {
		mockComputeStatus.mockReturnValue("expired");

		await renderTable([createAnnouncement()]);

		expect(screen.getByText("Expirée")).toBeInTheDocument();
	});

	// ─── Dates ────────────────────────────────────────────────────────────────

	it("should format start date", async () => {
		const startsAt = new Date("2026-04-01T10:00:00Z");
		await renderTable([createAnnouncement({ startsAt })]);

		expect(mockFormatDateTime).toHaveBeenCalledWith(startsAt);
	});

	it("should show dash when no end date", async () => {
		await renderTable([createAnnouncement({ endsAt: null })]);

		expect(screen.getByText("—")).toBeInTheDocument();
	});

	it("should format end date when present", async () => {
		const endsAt = new Date("2026-05-01T10:00:00Z");
		await renderTable([createAnnouncement({ endsAt })]);

		expect(mockFormatDateTime).toHaveBeenCalledWith(endsAt);
	});

	// ─── Row actions ──────────────────────────────────────────────────────────

	it("should render row actions for each announcement", async () => {
		await renderTable([createAnnouncement({ id: "ann_1" }), createAnnouncement({ id: "ann_2" })]);

		expect(screen.getByTestId("actions-ann_1")).toBeInTheDocument();
		expect(screen.getByTestId("actions-ann_2")).toBeInTheDocument();
	});

	// ─── Accessibility ────────────────────────────────────────────────────────

	it("should have sr-only label for actions column", async () => {
		await renderTable([createAnnouncement()]);

		expect(screen.getByText("Actions")).toBeInTheDocument();
	});

	// ─── Multiple rows ────────────────────────────────────────────────────────

	it("should render multiple announcements", async () => {
		await renderTable([
			createAnnouncement({ id: "ann_1", message: "Première" }),
			createAnnouncement({ id: "ann_2", message: "Deuxième" }),
		]);

		expect(screen.getByText("Première")).toBeInTheDocument();
		expect(screen.getByText("Deuxième")).toBeInTheDocument();
	});
});
