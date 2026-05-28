import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockAction, mockIsPending, mockCartOptimistic, mockHaptic } = vi.hoisted(() => ({
	mockAction: vi.fn(),
	mockIsPending: { value: false },
	mockCartOptimistic: { value: null as null | { updateOptimisticCart: ReturnType<typeof vi.fn> } },
	mockHaptic: vi.fn(),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
	triggerHaptic: mockHaptic,
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/cart/hooks/use-update-cart-item", () => ({
	useUpdateCartItem: () => ({
		action: mockAction,
		isPending: mockIsPending.value,
	}),
}));

vi.mock("../contexts/cart-optimistic-context", () => ({
	useCartOptimisticSafe: () => mockCartOptimistic.value,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		onClick,
		"aria-label": ariaLabel,
		...props
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		onClick?: () => void;
		"aria-label"?: string;
		[key: string]: unknown;
	}) => (
		<button disabled={disabled} onClick={onClick} aria-label={ariaLabel} {...props}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/button-group", () => ({
	ButtonGroup: ({
		children,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
	}) => <div aria-label={ariaLabel}>{children}</div>,
}));

vi.mock("@/shared/components/ui/input", () => ({
	Input: ({
		value,
		onChange,
		onBlur,
		disabled,
		min,
		max,
		"aria-label": ariaLabel,
		...props
	}: {
		value: number;
		onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
		onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
		disabled?: boolean;
		min?: number;
		max?: number;
		"aria-label"?: string;
		[key: string]: unknown;
	}) => (
		<input
			value={value}
			onChange={onChange}
			onBlur={onBlur}
			disabled={disabled}
			min={min}
			max={max}
			aria-label={ariaLabel}
			data-testid="quantity-input"
			{...props}
		/>
	),
}));

vi.mock("lucide-react", () => ({
	Minus: () => <svg data-testid="minus-icon" />,
	Plus: () => <svg data-testid="plus-icon" />,
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CartItemQuantitySelector } from "../cart-item-quantity-selector";

// ============================================================================
// TEST HELPERS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockIsPending.value = false;
	mockCartOptimistic.value = null;
});

function renderSelector(
	overrides: Partial<React.ComponentProps<typeof CartItemQuantitySelector>> = {},
) {
	const props = {
		cartItemId: "item-1",
		currentQuantity: 2,
		maxQuantity: 5,
		isInactive: false,
		...overrides,
	};
	return render(<CartItemQuantitySelector {...props} />);
}

// ============================================================================
// TESTS
// ============================================================================

describe("CartItemQuantitySelector", () => {
	it("renders null when maxQuantity is 1 or less", () => {
		const { container } = renderSelector({ maxQuantity: 1 });
		expect(container.firstChild).toBeNull();
	});

	it("renders quantity input with current quantity value", () => {
		renderSelector({ currentQuantity: 3, maxQuantity: 5 });
		const input = screen.getByTestId("quantity-input");
		expect(input).toBeInTheDocument();
		// Input renders optimistic quantity as a string attribute
		expect((input as HTMLInputElement).value).toBe("3");
	});

	it("renders increment and decrement buttons", () => {
		renderSelector();
		expect(screen.getByLabelText("Augmenter la quantité")).toBeInTheDocument();
		expect(screen.getByLabelText("Diminuer la quantité")).toBeInTheDocument();
	});

	it("disables decrement button when quantity is at minimum (1)", () => {
		renderSelector({ currentQuantity: 1, maxQuantity: 5 });
		const decrementBtn = screen.getByLabelText("Quantité minimale atteinte");
		expect(decrementBtn).toBeDisabled();
	});

	it("disables increment button when quantity is at maximum", () => {
		renderSelector({ currentQuantity: 5, maxQuantity: 5 });
		const incrementBtn = screen.getByLabelText("Quantité maximale atteinte");
		expect(incrementBtn).toBeDisabled();
	});

	it("calls action when increment button is clicked", () => {
		renderSelector({ currentQuantity: 2, maxQuantity: 5 });
		const incrementBtn = screen.getByLabelText("Augmenter la quantité");
		fireEvent.click(incrementBtn);
		expect(mockAction).toHaveBeenCalled();
	});

	it("calls action when decrement button is clicked", () => {
		renderSelector({ currentQuantity: 3, maxQuantity: 5 });
		const decrementBtn = screen.getByLabelText("Diminuer la quantité");
		fireEvent.click(decrementBtn);
		expect(mockAction).toHaveBeenCalled();
	});

	it("disables all controls when isInactive is true", () => {
		renderSelector({ isInactive: true, currentQuantity: 2, maxQuantity: 5 });
		const input = screen.getByTestId("quantity-input");
		expect(input).toBeDisabled();
	});

	it("has accessible group label with current quantity", () => {
		renderSelector({ currentQuantity: 2, maxQuantity: 5 });
		const group = screen.getByRole("group", { name: /Quantité de l'article, actuellement 2/ });
		expect(group).toBeInTheDocument();
	});

	it("marks the group as not busy when idle", () => {
		renderSelector({ currentQuantity: 2, maxQuantity: 5 });
		const group = screen.getByRole("group", { name: /Quantité de l'article/ });
		expect(group).toHaveAttribute("aria-busy", "false");
	});

	it("marks the group as busy while a quantity update is pending", () => {
		mockIsPending.value = true;
		renderSelector({ currentQuantity: 2, maxQuantity: 5 });
		const group = screen.getByRole("group", { name: /Quantité de l'article/ });
		expect(group).toHaveAttribute("aria-busy", "true");
	});

	it("input has correct aria-label with min and max bounds", () => {
		renderSelector({ currentQuantity: 2, maxQuantity: 8 });
		const input = screen.getByTestId("quantity-input");
		expect(input).toHaveAttribute("aria-label", "Quantité, entre 1 et 8");
	});

	it("triggers selection haptic when incrementing", () => {
		renderSelector({ currentQuantity: 2, maxQuantity: 5 });
		fireEvent.click(screen.getByLabelText("Augmenter la quantité"));
		expect(mockHaptic).toHaveBeenCalledWith("selection");
	});

	it("triggers selection haptic when decrementing", () => {
		renderSelector({ currentQuantity: 3, maxQuantity: 5 });
		fireEvent.click(screen.getByLabelText("Diminuer la quantité"));
		expect(mockHaptic).toHaveBeenCalledWith("selection");
	});

	it("triggers error haptic when typed value is clamped against a limit", () => {
		renderSelector({ currentQuantity: 5, maxQuantity: 5 });
		const input = screen.getByTestId("quantity-input");
		// User types a value higher than max — clamp brings it back to 5, same as current
		fireEvent.change(input, { target: { value: "99" } });
		expect(mockHaptic).toHaveBeenCalledWith("error");
	});
});
