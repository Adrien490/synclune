import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockAction, mockIsPending, mockHaptic } = vi.hoisted(() => ({
	mockAction: vi.fn(),
	mockIsPending: { value: false },
	mockHaptic: vi.fn(),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
	triggerHaptic: mockHaptic,
}));

let mockDialogState = {
	isOpen: true,
	close: vi.fn(),
	data: {
		discountId: "d-1",
		discountCode: "PROMO10",
		isActive: true,
	} as {
		discountId: string;
		discountCode: string;
		isActive: boolean;
		[key: string]: unknown;
	} | null,
};

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => mockDialogState,
}));

vi.mock("@/modules/discounts/hooks/use-toggle-discount-status", () => ({
	useToggleDiscountStatus: () => ({
		action: mockAction,
		isPending: mockIsPending.value,
	}),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
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
		className,
		"aria-busy": ariaBusy,
		onClick,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		className?: string;
		"aria-busy"?: boolean;
		onClick?: React.MouseEventHandler<HTMLButtonElement>;
	}) => (
		<button
			data-testid="submit-button"
			disabled={disabled}
			className={className}
			aria-busy={ariaBusy}
			onClick={onClick}
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

import { ToggleDiscountStatusAlertDialog } from "../toggle-discount-status-alert-dialog";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ToggleDiscountStatusAlertDialog", () => {
	beforeEach(() => {
		mockIsPending.value = false;
		mockDialogState = {
			isOpen: true,
			close: vi.fn(),
			data: {
				discountId: "d-1",
				discountCode: "PROMO10",
				isActive: true,
			},
		};
	});

	// ─── Visibility ───────────────────────────────────────────────────────────

	it("renders nothing when dialog is closed", () => {
		mockDialogState = { ...mockDialogState, isOpen: false };
		render(<ToggleDiscountStatusAlertDialog />);
		expect(screen.queryByTestId("alert-dialog")).not.toBeInTheDocument();
	});

	// ─── Title changes based on isActive ──────────────────────────────────────

	it("shows 'Désactiver le code promo' title when isActive is true", () => {
		render(<ToggleDiscountStatusAlertDialog />);
		expect(screen.getByText("Désactiver le code promo")).toBeInTheDocument();
	});

	it("shows 'Activer le code promo' title when isActive is false", () => {
		mockDialogState = {
			...mockDialogState,
			data: { discountId: "d-1", discountCode: "PROMO10", isActive: false },
		};
		render(<ToggleDiscountStatusAlertDialog />);
		expect(screen.getByText("Activer le code promo")).toBeInTheDocument();
	});

	// ─── Content ──────────────────────────────────────────────────────────────

	it("shows the discount code in the description", () => {
		render(<ToggleDiscountStatusAlertDialog />);
		expect(screen.getByText(/PROMO10/)).toBeInTheDocument();
	});

	it("shows deactivation description when isActive is true", () => {
		render(<ToggleDiscountStatusAlertDialog />);
		expect(screen.getByText(/Le code ne sera plus utilisable par les clients/)).toBeInTheDocument();
	});

	it("shows activation description when isActive is false", () => {
		mockDialogState = {
			...mockDialogState,
			data: { discountId: "d-1", discountCode: "PROMO10", isActive: false },
		};
		render(<ToggleDiscountStatusAlertDialog />);
		expect(screen.getByText(/Le code redeviendra utilisable par les clients/)).toBeInTheDocument();
	});

	// ─── Submit button labels ─────────────────────────────────────────────────

	it("shows 'Désactiver' on submit button when isActive is true", () => {
		render(<ToggleDiscountStatusAlertDialog />);
		expect(screen.getByTestId("submit-button")).toHaveTextContent("Désactiver");
	});

	it("shows 'Activer' on submit button when isActive is false", () => {
		mockDialogState = {
			...mockDialogState,
			data: { discountId: "d-1", discountCode: "PROMO10", isActive: false },
		};
		render(<ToggleDiscountStatusAlertDialog />);
		expect(screen.getByTestId("submit-button")).toHaveTextContent("Activer");
	});

	it("shows 'En cours...' on submit button when isPending", () => {
		mockIsPending.value = true;
		render(<ToggleDiscountStatusAlertDialog />);
		expect(screen.getByText("En cours...")).toBeInTheDocument();
	});

	it("disables cancel button when isPending", () => {
		mockIsPending.value = true;
		render(<ToggleDiscountStatusAlertDialog />);
		expect(screen.getByTestId("cancel-button")).toBeDisabled();
	});

	it("triggers medium haptic on toggle submit click", () => {
		render(<ToggleDiscountStatusAlertDialog />);
		const submit = screen.getByTestId("submit-button");
		fireEvent.click(submit);
		expect(mockHaptic).toHaveBeenCalledWith("medium");
	});
});
