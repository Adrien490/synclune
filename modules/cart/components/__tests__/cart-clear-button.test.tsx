import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { mockOpenAlertDialog, mockHaptic } = vi.hoisted(() => ({
	mockOpenAlertDialog: vi.fn(),
	mockHaptic: vi.fn(),
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialogStore: (selector: (s: unknown) => unknown) =>
		selector({ openAlertDialog: mockOpenAlertDialog }),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		onClick,
		"aria-label": ariaLabel,
		className,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		onClick?: () => void;
		"aria-label"?: string;
		className?: string;
	}) => (
		<button
			type="button"
			disabled={disabled}
			onClick={onClick}
			aria-label={ariaLabel}
			className={className}
		>
			{children}
		</button>
	),
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	TrashIcon: () => <svg data-testid="trash-icon" />,
}));

import { CartClearButton } from "../cart-clear-button";
import { CLEAR_CART_DIALOG_ID } from "../clear-cart-dialog-id";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("CartClearButton", () => {
	it("renders a button labelled 'Vider le panier'", () => {
		render(<CartClearButton />);
		expect(screen.getByRole("button", { name: /vider le panier/i })).toBeInTheDocument();
	});

	it("is disabled when disabled prop is true", () => {
		render(<CartClearButton disabled />);
		expect(screen.getByRole("button", { name: /vider le panier/i })).toBeDisabled();
	});

	it("triggers light haptic and opens the clear-cart dialog on click", () => {
		render(<CartClearButton />);
		fireEvent.click(screen.getByRole("button", { name: /vider le panier/i }));
		expect(mockHaptic).toHaveBeenCalledWith("light");
		expect(mockOpenAlertDialog).toHaveBeenCalledWith(CLEAR_CART_DIALOG_ID);
	});

	it("does not fire when disabled", () => {
		render(<CartClearButton disabled />);
		fireEvent.click(screen.getByRole("button", { name: /vider le panier/i }));
		expect(mockOpenAlertDialog).not.toHaveBeenCalled();
		expect(mockHaptic).not.toHaveBeenCalled();
	});
});
