import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { AnnouncementListItem } from "../../../types/announcement.types";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockOpenDialog, mockOpenAlert, mockToggleStatus } = vi.hoisted(() => ({
	mockOpenDialog: vi.fn(),
	mockOpenAlert: vi.fn(),
	mockToggleStatus: vi.fn(),
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({ open: mockOpenDialog }),
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => ({ open: mockOpenAlert }),
}));

vi.mock("../../../hooks/use-toggle-announcement-status", () => ({
	useToggleAnnouncementStatus: () => ({
		toggleStatus: mockToggleStatus,
		isPending: false,
	}),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => (
		<button {...props}>{children}</button>
	),
}));

vi.mock("@/shared/components/ui/dropdown-menu", () => ({
	DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DropdownMenuItem: ({
		children,
		onClick,
		disabled,
		className,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		disabled?: boolean;
		className?: string;
	}) => (
		<button onClick={onClick} disabled={disabled} className={className}>
			{children}
		</button>
	),
	DropdownMenuSeparator: () => <hr />,
	DropdownMenuTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
		<div>{children}</div>
	),
}));

vi.mock("lucide-react", () => ({
	Edit: () => <span data-testid="icon-edit" />,
	MoreVertical: () => <span data-testid="icon-more" />,
	Power: () => <span data-testid="icon-power" />,
	PowerOff: () => <span data-testid="icon-power-off" />,
	Trash2: () => <span data-testid="icon-trash" />,
}));

import { AnnouncementRowActions } from "../announcement-row-actions";

// ============================================================================
// HELPERS
// ============================================================================

function createAnnouncement(overrides: Partial<AnnouncementListItem> = {}): AnnouncementListItem {
	return {
		id: "ann_1",
		message: "Promo été",
		link: null,
		linkText: null,
		startsAt: new Date("2026-03-01"),
		endsAt: null,
		isActive: false,
		dismissDurationHours: 24,
		createdAt: new Date("2026-03-01"),
		updatedAt: new Date("2026-03-01"),
		...overrides,
	} as AnnouncementListItem;
}

// ============================================================================
// TESTS
// ============================================================================

describe("AnnouncementRowActions", () => {
	beforeEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("should render trigger button with aria-label", () => {
		render(<AnnouncementRowActions announcement={createAnnouncement()} />);

		expect(screen.getByLabelText("Actions pour l'annonce")).toBeInTheDocument();
	});

	it("should render edit menu item", () => {
		render(<AnnouncementRowActions announcement={createAnnouncement()} />);

		expect(screen.getByText("Éditer")).toBeInTheDocument();
	});

	it("should render delete menu item", () => {
		render(<AnnouncementRowActions announcement={createAnnouncement()} />);

		expect(screen.getByText("Supprimer")).toBeInTheDocument();
	});

	// ─── Toggle label ─────────────────────────────────────────────────────────

	it("should show 'Activer' when announcement is inactive", () => {
		render(<AnnouncementRowActions announcement={createAnnouncement({ isActive: false })} />);

		expect(screen.getByText("Activer")).toBeInTheDocument();
	});

	it("should show 'Désactiver' when announcement is active", () => {
		render(<AnnouncementRowActions announcement={createAnnouncement({ isActive: true })} />);

		expect(screen.getByText("Désactiver")).toBeInTheDocument();
	});

	// ─── Edit action ──────────────────────────────────────────────────────────

	it("should open form dialog with announcement data on edit", () => {
		const announcement = createAnnouncement();
		render(<AnnouncementRowActions announcement={announcement} />);

		fireEvent.click(screen.getByText("Éditer"));

		expect(mockOpenDialog).toHaveBeenCalledWith({ announcement });
	});

	// ─── Toggle action ────────────────────────────────────────────────────────

	it("should toggle status to active when currently inactive", () => {
		const announcement = createAnnouncement({ isActive: false });
		render(<AnnouncementRowActions announcement={announcement} />);

		fireEvent.click(screen.getByText("Activer"));

		expect(mockToggleStatus).toHaveBeenCalledWith("ann_1", true);
	});

	it("should toggle status to inactive when currently active", () => {
		const announcement = createAnnouncement({ isActive: true });
		render(<AnnouncementRowActions announcement={announcement} />);

		fireEvent.click(screen.getByText("Désactiver"));

		expect(mockToggleStatus).toHaveBeenCalledWith("ann_1", false);
	});

	// ─── Delete action ────────────────────────────────────────────────────────

	it("should open alert dialog with announcement data on delete", () => {
		const announcement = createAnnouncement({ id: "ann_1", message: "Test annonce" });
		render(<AnnouncementRowActions announcement={announcement} />);

		fireEvent.click(screen.getByText("Supprimer"));

		expect(mockOpenAlert).toHaveBeenCalledWith({
			announcementId: "ann_1",
			announcementMessage: "Test annonce",
		});
	});
});
