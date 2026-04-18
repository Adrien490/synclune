import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockClose, mockClearSelection, mockBulkDelete, mockHaptic } = vi.hoisted(() => ({
	mockClose: vi.fn(),
	mockClearSelection: vi.fn(),
	mockBulkDelete: vi.fn(),
	mockHaptic: vi.fn(),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
	triggerHaptic: mockHaptic,
}));

let mockDialogState = {
	isOpen: true,
	close: mockClose,
	data: {
		discountIds: ["d-1", "d-2", "d-3"],
		totalUsageCount: 0,
	} as Record<string, unknown> | null,
};

let mockIsPending = false;

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => mockDialogState,
}));

vi.mock("@/shared/contexts/selection-context", () => ({
	useSelectionContext: () => ({ clearSelection: mockClearSelection }),
}));

vi.mock("@/modules/discounts/hooks/use-bulk-delete-discounts", () => ({
	useBulkDeleteDiscounts: ({ onSuccess }: { onSuccess?: () => void } = {}) => ({
		action: mockBulkDelete,
		isPending: mockIsPending,
		onSuccess,
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
		onPointerDown,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		"aria-busy"?: boolean;
		onPointerDown?: React.PointerEventHandler<HTMLButtonElement>;
	}) => (
		<button
			data-testid="submit-button"
			disabled={disabled}
			aria-busy={ariaBusy}
			onPointerDown={onPointerDown}
		>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	LoaderCircle: ({ className }: { className?: string }) => (
		<span data-testid="loader" className={className} />
	),
}));

import { BulkDeleteDiscountsAlertDialog } from "../bulk-delete-discounts-alert-dialog";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("BulkDeleteDiscountsAlertDialog", () => {
	beforeEach(() => {
		mockIsPending = false;
		mockDialogState = {
			isOpen: true,
			close: mockClose,
			data: {
				discountIds: ["d-1", "d-2", "d-3"],
				totalUsageCount: 0,
			},
		};
	});

	// ─── Visibility ───────────────────────────────────────────────────────────

	it("does not render content when dialog is closed", () => {
		mockDialogState = { ...mockDialogState, isOpen: false };
		render(<BulkDeleteDiscountsAlertDialog />);
		expect(screen.queryByTestId("alert-dialog")).not.toBeInTheDocument();
	});

	it("renders title when dialog is open", () => {
		render(<BulkDeleteDiscountsAlertDialog />);
		expect(screen.getByText("Confirmer la suppression")).toBeInTheDocument();
	});

	// ─── Count display ────────────────────────────────────────────────────────

	it("shows singular 'code promo' for a count of 1", () => {
		mockDialogState = {
			...mockDialogState,
			data: { discountIds: ["d-1"], totalUsageCount: 0 },
		};
		render(<BulkDeleteDiscountsAlertDialog />);
		expect(screen.getByText("1 code promo")).toBeInTheDocument();
	});

	it("shows plural 'codes promo' for a count of 3", () => {
		render(<BulkDeleteDiscountsAlertDialog />);
		expect(screen.getByText("3 codes promo")).toBeInTheDocument();
	});

	// ─── Usage warning ────────────────────────────────────────────────────────

	it("shows amber usage warning when totalUsageCount is greater than 0", () => {
		mockDialogState = {
			...mockDialogState,
			data: { discountIds: ["d-1", "d-2"], totalUsageCount: 5 },
		};
		render(<BulkDeleteDiscountsAlertDialog />);
		expect(screen.getByText(/5 utilisations/)).toBeInTheDocument();
	});

	it("does not show usage warning when totalUsageCount is 0", () => {
		render(<BulkDeleteDiscountsAlertDialog />);
		expect(screen.queryByText(/utilisations/)).not.toBeInTheDocument();
	});

	it("shows singular 'utilisation' for a count of 1", () => {
		mockDialogState = {
			...mockDialogState,
			data: { discountIds: ["d-1"], totalUsageCount: 1 },
		};
		render(<BulkDeleteDiscountsAlertDialog />);
		expect(screen.getByText(/1 utilisation/)).toBeInTheDocument();
	});

	// ─── Irreversible warning ─────────────────────────────────────────────────

	it("always shows irreversible warning", () => {
		render(<BulkDeleteDiscountsAlertDialog />);
		expect(screen.getByText("Cette action est irréversible.")).toBeInTheDocument();
	});

	// ─── Pending state ────────────────────────────────────────────────────────

	it("shows 'Suppression...' on submit button when isPending", () => {
		mockIsPending = true;
		render(<BulkDeleteDiscountsAlertDialog />);
		expect(screen.getByText("Suppression...")).toBeInTheDocument();
	});

	it("disables cancel button when isPending", () => {
		mockIsPending = true;
		render(<BulkDeleteDiscountsAlertDialog />);
		expect(screen.getByTestId("cancel-button")).toBeDisabled();
	});

	it("triggers heavy haptic on bulk submit pointerdown (destructive)", () => {
		render(<BulkDeleteDiscountsAlertDialog />);
		const submit = screen.getByTestId("submit-button");
		submit.dispatchEvent(new Event("pointerdown", { bubbles: true }));
		expect(mockHaptic).toHaveBeenCalledWith("heavy");
	});
});
