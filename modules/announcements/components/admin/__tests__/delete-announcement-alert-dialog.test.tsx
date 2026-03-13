import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockClose, mockAction } = vi.hoisted(() => ({
	mockClose: vi.fn(),
	mockAction: vi.fn(),
}));

let mockDialogState = {
	isOpen: true,
	close: mockClose,
	data: {
		announcementId: "ann_1",
		announcementMessage: "Promo été",
	},
};

let mockIsPending = false;

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => mockDialogState,
}));

vi.mock("../../../hooks/use-delete-announcement", () => ({
	useDeleteAnnouncement: () => ({
		action: mockAction,
		isPending: mockIsPending,
	}),
}));

vi.mock("@/shared/components/ui/alert-dialog", () => ({
	AlertDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => (open ? <div data-testid="alert-dialog">{children}</div> : null),
	AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	AlertDialogDescription: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
		<div>{children}</div>
	),
	AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogCancel: ({
		children,
		disabled,
		type,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
	}) => (
		<button disabled={disabled} type={type as "button" | "submit" | undefined}>
			{children}
		</button>
	),
	AlertDialogAction: ({
		children,
		disabled,
		type,
		"aria-busy": ariaBusy,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
		"aria-busy"?: boolean;
	}) => (
		<button disabled={disabled} type={type as "button" | "submit" | undefined} aria-busy={ariaBusy}>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	Loader2: ({ className }: { className?: string }) => (
		<span data-testid="loader" className={className} />
	),
}));

import { DeleteAnnouncementAlertDialog } from "../delete-announcement-alert-dialog";

// ============================================================================
// TESTS
// ============================================================================

describe("DeleteAnnouncementAlertDialog", () => {
	beforeEach(() => {
		cleanup();
		vi.clearAllMocks();
		mockIsPending = false;
		mockDialogState = {
			isOpen: true,
			close: mockClose,
			data: {
				announcementId: "ann_1",
				announcementMessage: "Promo été",
			},
		};
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("should render when dialog is open", () => {
		render(<DeleteAnnouncementAlertDialog />);

		expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
	});

	it("should not render when dialog is closed", () => {
		mockDialogState = { ...mockDialogState, isOpen: false };

		render(<DeleteAnnouncementAlertDialog />);

		expect(screen.queryByTestId("alert-dialog")).not.toBeInTheDocument();
	});

	it("should display confirmation title", () => {
		render(<DeleteAnnouncementAlertDialog />);

		expect(screen.getByText("Confirmer la suppression")).toBeInTheDocument();
	});

	it("should display announcement message in confirmation", () => {
		render(<DeleteAnnouncementAlertDialog />);

		expect(screen.getByText(/Promo été/)).toBeInTheDocument();
	});

	it("should display irreversible warning", () => {
		render(<DeleteAnnouncementAlertDialog />);

		expect(screen.getByText("Cette action est irréversible.")).toBeInTheDocument();
	});

	// ─── Hidden input ─────────────────────────────────────────────────────────

	it("should include hidden input with announcement ID", () => {
		render(<DeleteAnnouncementAlertDialog />);

		const hiddenInput = document.querySelector('input[name="id"]') as HTMLInputElement;
		expect(hiddenInput).toBeTruthy();
		expect(hiddenInput.value).toBe("ann_1");
	});

	// ─── Buttons ──────────────────────────────────────────────────────────────

	it("should render cancel and submit buttons", () => {
		render(<DeleteAnnouncementAlertDialog />);

		expect(screen.getByText("Annuler")).toBeInTheDocument();
		expect(screen.getByText("Supprimer")).toBeInTheDocument();
	});

	// ─── Loading state ────────────────────────────────────────────────────────

	it("should show loading text when pending", () => {
		mockIsPending = true;

		render(<DeleteAnnouncementAlertDialog />);

		expect(screen.getByText("Suppression...")).toBeInTheDocument();
	});

	it("should show loader icon when pending", () => {
		mockIsPending = true;

		render(<DeleteAnnouncementAlertDialog />);

		expect(screen.getByTestId("loader")).toBeInTheDocument();
	});

	it("should disable buttons when pending", () => {
		mockIsPending = true;

		render(<DeleteAnnouncementAlertDialog />);

		expect(screen.getByText("Annuler")).toBeDisabled();
		expect(screen.getByText("Suppression...")).toBeDisabled();
	});

	it("should set aria-busy when pending", () => {
		mockIsPending = true;

		render(<DeleteAnnouncementAlertDialog />);

		expect(screen.getByText("Suppression...")).toHaveAttribute("aria-busy", "true");
	});
});
