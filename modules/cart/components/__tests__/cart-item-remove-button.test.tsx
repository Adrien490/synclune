import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockOpenAlertDialog, mockHaptic } = vi.hoisted(() => ({
	mockOpenAlertDialog: vi.fn(),
	mockHaptic: vi.fn(),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
	triggerHaptic: mockHaptic,
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/providers/overlay-store-provider", () => ({
	useAlertDialogStore: vi.fn(
		(selector: (state: { openAlertDialog: typeof mockOpenAlertDialog }) => unknown) =>
			selector({ openAlertDialog: mockOpenAlertDialog }),
	),
}));

vi.mock("../remove-cart-item-alert-dialog", () => ({
	REMOVE_CART_ITEM_DIALOG_ID: "remove-cart-item",
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		onClick,
		"aria-label": ariaLabel,
		"data-pending": dataPending,
		...props
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		onClick?: () => void;
		"aria-label"?: string;
		"data-pending"?: string;
		[key: string]: unknown;
	}) => (
		<button
			disabled={disabled}
			onClick={onClick}
			aria-label={ariaLabel}
			data-pending={dataPending}
			{...props}
		>
			{children}
		</button>
	),
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	TrashIcon: ({ className }: { className?: string }) => (
		<svg data-testid="trash-icon" className={className} />
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CartItemRemoveButton } from "../cart-item-remove-button";

// ============================================================================
// TEST HELPERS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

function renderButton(overrides: Partial<React.ComponentProps<typeof CartItemRemoveButton>> = {}) {
	const props = {
		variantId: "item-1",
		itemName: "Bague Lune",
		quantity: 2,
		...overrides,
	};
	return render(<CartItemRemoveButton {...props} />);
}

// ============================================================================
// TESTS
// ============================================================================

describe("CartItemRemoveButton", () => {
	it("renders a button with correct aria-label", () => {
		renderButton();
		expect(
			screen.getByRole("button", { name: "Supprimer Bague Lune du panier" }),
		).toBeInTheDocument();
	});

	it("renders the trash icon", () => {
		renderButton();
		expect(screen.getByTestId("trash-icon")).toBeInTheDocument();
	});

	it("calls openAlertDialog with correct arguments on click", () => {
		renderButton({ variantId: "variant-42", itemName: "Collier Étoile", quantity: 1 });
		fireEvent.click(screen.getByRole("button"));
		expect(mockOpenAlertDialog).toHaveBeenCalledOnce();
		expect(mockOpenAlertDialog).toHaveBeenCalledWith("remove-cart-item", {
			variantId: "variant-42",
			itemName: "Collier Étoile",
			quantity: 1,
		});
	});

	it("triggers light haptic feedback when clicked", () => {
		renderButton();
		fireEvent.click(screen.getByRole("button"));
		expect(mockHaptic).toHaveBeenCalledWith("light");
	});

	it("is never disabled (removal is optimistic, no pending state)", () => {
		renderButton();
		expect(screen.getByRole("button")).not.toBeDisabled();
	});

	it("does not set a data-pending attribute", () => {
		renderButton();
		const button = screen.getByRole("button");
		expect(button.dataset.pending).toBeUndefined();
	});
});
