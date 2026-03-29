import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockDialogIsOpen, mockDialogData, mockDialogClose, mockDeleteAction, mockIsPending } =
	vi.hoisted(() => ({
		mockDialogIsOpen: { current: true },
		mockDialogData: {
			current: {
				faqItemId: "faq-1",
				faqItemQuestion: "Comment passer commande ?",
			} as { faqItemId?: string; faqItemQuestion?: string } | null,
		},
		mockDialogClose: vi.fn(),
		mockDeleteAction: vi.fn(),
		mockIsPending: { value: false },
	}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => ({
		isOpen: mockDialogIsOpen.current,
		close: mockDialogClose,
		data: mockDialogData.current,
	}),
}));

vi.mock("@/modules/faq/hooks/use-delete-faq-item", () => ({
	useDeleteFaqItem: ({ onSuccess }: { onSuccess?: () => void }) => ({
		action: mockDeleteAction,
		isPending: mockIsPending.value,
		onSuccess,
	}),
}));

vi.mock("@/modules/faq/constants/dialog", () => ({
	FAQ_FORM_DIALOG_ID: "faq-form",
	DELETE_FAQ_DIALOG_ID: "delete-faq",
}));

vi.mock("@/shared/components/ui/alert-dialog", () => ({
	AlertDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => (open ? <div data-testid="alert-dialog">{children}</div> : null),
	AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="alert-dialog-content">{children}</div>
	),
	AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="alert-dialog-header">{children}</div>
	),
	AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
		<h2 data-testid="alert-dialog-title">{children}</h2>
	),
	AlertDialogDescription: ({
		children,
		asChild,
	}: {
		children: React.ReactNode;
		asChild?: boolean;
	}) => <div data-testid="alert-dialog-description">{children}</div>,
	AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="alert-dialog-footer">{children}</div>
	),
	AlertDialogCancel: ({
		children,
		type,
		disabled,
	}: {
		children: React.ReactNode;
		type?: string;
		disabled?: boolean;
	}) => (
		<button type={type as "button"} disabled={disabled}>
			{children}
		</button>
	),
	AlertDialogAction: ({
		children,
		type,
		disabled,
		"aria-busy": ariaBusy,
	}: {
		children: React.ReactNode;
		type?: string;
		disabled?: boolean;
		"aria-busy"?: boolean;
	}) => (
		<button type={type as "submit"} disabled={disabled} aria-busy={ariaBusy}>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	LoaderCircle: ({ className }: { className?: string }) => (
		<svg data-testid="icon-loader" className={className} />
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { DeleteFaqAlertDialog } from "../delete-faq-alert-dialog";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("DeleteFaqAlertDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDialogIsOpen.current = true;
		mockIsPending.value = false;
		mockDialogData.current = {
			faqItemId: "faq-1",
			faqItemQuestion: "Comment passer commande ?",
		};
	});

	// ─── Visibility ───────────────────────────────────────────────────────────

	it("renders nothing when dialog is closed", () => {
		mockDialogIsOpen.current = false;
		render(<DeleteFaqAlertDialog />);
		expect(screen.queryByTestId("alert-dialog")).not.toBeInTheDocument();
	});

	it("renders dialog content when dialog is open", () => {
		render(<DeleteFaqAlertDialog />);
		expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
	});

	// ─── Title and description ────────────────────────────────────────────────

	it("renders 'Confirmer la suppression' title", () => {
		render(<DeleteFaqAlertDialog />);
		expect(screen.getByText("Confirmer la suppression")).toBeInTheDocument();
	});

	it("renders the FAQ question in the description", () => {
		render(<DeleteFaqAlertDialog />);
		expect(screen.getByText(/Comment passer commande ?/)).toBeInTheDocument();
	});

	it("renders 'Cette action est irréversible.' warning", () => {
		render(<DeleteFaqAlertDialog />);
		expect(screen.getByText("Cette action est irréversible.")).toBeInTheDocument();
	});

	// ─── Footer buttons ───────────────────────────────────────────────────────

	it("renders 'Annuler' cancel button", () => {
		render(<DeleteFaqAlertDialog />);
		expect(screen.getByText("Annuler")).toBeInTheDocument();
	});

	it("renders 'Supprimer' action button", () => {
		render(<DeleteFaqAlertDialog />);
		expect(screen.getByText("Supprimer")).toBeInTheDocument();
	});

	// ─── Hidden form input ────────────────────────────────────────────────────

	it("renders hidden id input with faqItemId value", () => {
		render(<DeleteFaqAlertDialog />);
		const input = document.querySelector('input[name="id"]') as HTMLInputElement;
		expect(input).not.toBeNull();
		expect(input.value).toBe("faq-1");
	});

	it("renders hidden id input with empty string when data is null", () => {
		mockDialogData.current = null;
		render(<DeleteFaqAlertDialog />);
		const input = document.querySelector('input[name="id"]') as HTMLInputElement;
		expect(input).not.toBeNull();
		expect(input.value).toBe("");
	});

	// ─── Pending state ────────────────────────────────────────────────────────

	it("shows 'Suppression...' label when isPending is true", () => {
		mockIsPending.value = true;
		render(<DeleteFaqAlertDialog />);
		expect(screen.getByText("Suppression...")).toBeInTheDocument();
	});

	it("shows loader icon when isPending is true", () => {
		mockIsPending.value = true;
		render(<DeleteFaqAlertDialog />);
		expect(screen.getByTestId("icon-loader")).toBeInTheDocument();
	});

	it("disables cancel button when isPending is true", () => {
		mockIsPending.value = true;
		render(<DeleteFaqAlertDialog />);
		expect(screen.getByText("Annuler")).toBeDisabled();
	});

	it("disables action button when isPending is true", () => {
		mockIsPending.value = true;
		render(<DeleteFaqAlertDialog />);
		expect(screen.getByText("Suppression...")).toBeDisabled();
	});

	it("does not show loader icon when not pending", () => {
		mockIsPending.value = false;
		render(<DeleteFaqAlertDialog />);
		expect(screen.queryByTestId("icon-loader")).not.toBeInTheDocument();
	});
});
