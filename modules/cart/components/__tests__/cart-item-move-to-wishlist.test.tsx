import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockAction, mockIsPending, mockToastSuccess, mockRouterPush } = vi.hoisted(() => ({
	mockAction: vi.fn(),
	mockIsPending: { value: false },
	mockToastSuccess: vi.fn(),
	mockRouterPush: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/hooks/use-action-with-toast", () => ({
	useActionWithToast: vi.fn(
		(
			_serverAction: unknown,
			_options?: {
				toastOptions?: { showSuccessToast: boolean };
				onSuccess?: (result: { message: string }) => void;
			},
		) => ({
			action: mockAction,
			isPending: mockIsPending.value,
		}),
	),
}));

vi.mock("@/modules/wishlist/actions/add-to-wishlist", () => ({
	addToWishlist: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock("sonner", () => ({
	toast: {
		success: mockToastSuccess,
	},
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		"aria-busy": ariaBusy,
		"aria-label": ariaLabel,
		type,
		title,
		...props
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		"aria-busy"?: boolean;
		"aria-label"?: string;
		type?: string;
		title?: string;
		[key: string]: unknown;
	}) => (
		<button
			disabled={disabled}
			aria-busy={ariaBusy}
			aria-label={ariaLabel}
			type={type as "submit" | "button" | "reset" | undefined}
			title={title}
			{...props}
		>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	Heart: ({ className }: { className?: string }) => (
		<svg data-testid="heart-icon" className={className} />
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CartItemMoveToWishlist } from "../cart-item-move-to-wishlist";

// ============================================================================
// TEST HELPERS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockIsPending.value = false;
});

function renderButton(
	overrides: Partial<React.ComponentProps<typeof CartItemMoveToWishlist>> = {},
) {
	const props = {
		productId: "prod-1",
		itemName: "Bague Lune",
		...overrides,
	};
	return render(<CartItemMoveToWishlist {...props} />);
}

// ============================================================================
// TESTS
// ============================================================================

describe("CartItemMoveToWishlist", () => {
	it("renders the wishlist button with correct aria-label", () => {
		renderButton();
		expect(
			screen.getByRole("button", { name: "Ajouter Bague Lune aux favoris" }),
		).toBeInTheDocument();
	});

	it("renders the heart icon", () => {
		renderButton();
		expect(screen.getByTestId("heart-icon")).toBeInTheDocument();
	});

	it("renders a hidden input with the product id", () => {
		const { container } = renderButton({ productId: "prod-42" });
		const input = container.querySelector('input[name="productId"]') as HTMLInputElement;
		expect(input).not.toBeNull();
		expect(input.value).toBe("prod-42");
	});

	it("submits the form (calls action) when button is clicked", () => {
		renderButton();
		const form = screen.getByRole("button").closest("form")!;
		fireEvent.submit(form);
		expect(mockAction).toHaveBeenCalled();
	});

	it("is disabled when isPending is true", () => {
		mockIsPending.value = true;
		renderButton();
		expect(screen.getByRole("button")).toBeDisabled();
	});

	it("has aria-busy=true when isPending is true", () => {
		mockIsPending.value = true;
		renderButton();
		expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
	});

	it("has aria-busy=false when not pending", () => {
		mockIsPending.value = false;
		renderButton();
		expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "false");
	});

	it("renders the form wrapping the button", () => {
		const { container } = renderButton();
		const form = container.querySelector("form");
		expect(form).not.toBeNull();
	});
});
