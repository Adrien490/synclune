import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockDialog, mockAction, mockIsPending, mockHaptic } = vi.hoisted(() => ({
	mockDialog: {
		isOpen: true,
		data: {
			discountId: "d-1",
			discountCode: "PROMO10",
			usageCount: 0,
		} as {
			discountId: string;
			discountCode: string;
			usageCount: number;
			[key: string]: unknown;
		} | null,
		open: vi.fn(),
		close: vi.fn(),
	},
	mockAction: vi.fn(),
	mockIsPending: { value: false },
	mockHaptic: vi.fn(),
}));

vi.mock("@/shared/hooks/use-back-to-list-on-delete", () => ({
	useBackToListOnDelete: () => vi.fn(),
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => mockDialog,
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
	triggerHaptic: mockHaptic,
}));

vi.mock("@/modules/discounts/hooks/use-delete-discount", () => ({
	useDeleteDiscount: () => ({ action: mockAction, isPending: mockIsPending.value }),
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
		<button
			data-testid="cancel-button"
			disabled={disabled}
			type={type as "button" | "submit" | undefined}
		>
			{children}
		</button>
	),
	AlertDialogAction: ({
		children,
		disabled,
		"aria-busy": ariaBusy,
		onClick,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		"aria-busy"?: boolean;
		onClick?: React.MouseEventHandler<HTMLButtonElement>;
	}) => (
		<button data-testid="submit-button" disabled={disabled} aria-busy={ariaBusy} onClick={onClick}>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", async (importOriginal) => ({
	...((await importOriginal()) as Record<string, unknown>),
	LoaderCircle: ({ className }: { className?: string }) => (
		<span data-testid="loader" className={className} />
	),
}));

import { DeleteDiscountAlertDialog } from "../delete-discount-alert-dialog";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("DeleteDiscountAlertDialog", () => {
	beforeEach(() => {
		mockIsPending.value = false;
		mockDialog.isOpen = true;
		mockDialog.data = {
			discountId: "d-1",
			discountCode: "PROMO10",
			usageCount: 0,
		};
	});

	// ─── Visibility ───────────────────────────────────────────────────────────

	it("renders nothing when dialog is closed", () => {
		mockDialog.isOpen = false;
		render(<DeleteDiscountAlertDialog />);
		expect(screen.queryByTestId("alert-dialog")).not.toBeInTheDocument();
	});

	it("renders title when dialog is open", () => {
		render(<DeleteDiscountAlertDialog />);
		expect(screen.getByText("Confirmer la suppression")).toBeInTheDocument();
	});

	// ─── Content ──────────────────────────────────────────────────────────────

	it("shows the discount code in the description", () => {
		render(<DeleteDiscountAlertDialog />);
		expect(screen.getByText(/PROMO10/)).toBeInTheDocument();
	});

	it("shows irreversible warning when usageCount is 0", () => {
		render(<DeleteDiscountAlertDialog />);
		expect(screen.getByText("Cette action est irréversible.")).toBeInTheDocument();
	});

	it("shows amber warning when usageCount is greater than 0", () => {
		mockDialog.data = {
			discountId: "d-1",
			discountCode: "PROMO10",
			usageCount: 3,
		};
		render(<DeleteDiscountAlertDialog />);
		expect(
			screen.getByText(/Ce code a été utilisé 3 fois et ne peut pas être supprimé/),
		).toBeInTheDocument();
	});

	it("does not show irreversible warning when usageCount is greater than 0", () => {
		mockDialog.data = {
			discountId: "d-1",
			discountCode: "PROMO10",
			usageCount: 3,
		};
		render(<DeleteDiscountAlertDialog />);
		expect(screen.queryByText("Cette action est irréversible.")).not.toBeInTheDocument();
	});

	// ─── Submit button state ───────────────────────────────────────────────────

	it("disables submit button when usageCount is greater than 0", () => {
		mockDialog.data = {
			discountId: "d-1",
			discountCode: "PROMO10",
			usageCount: 5,
		};
		render(<DeleteDiscountAlertDialog />);
		expect(screen.getByTestId("submit-button")).toBeDisabled();
	});

	it("shows 'Suppression…' on submit button when isPending", () => {
		mockIsPending.value = true;
		render(<DeleteDiscountAlertDialog />);
		expect(screen.getByText("Suppression…")).toBeInTheDocument();
	});

	it("disables cancel button when isPending", () => {
		mockIsPending.value = true;
		render(<DeleteDiscountAlertDialog />);
		expect(screen.getByTestId("cancel-button")).toBeDisabled();
	});

	it("triggers heavy haptic on submit click (destructive)", () => {
		render(<DeleteDiscountAlertDialog />);
		const submit = screen.getByTestId("submit-button");
		fireEvent.click(submit);
		expect(mockHaptic).toHaveBeenCalledWith("heavy");
	});
});
