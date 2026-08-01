import { cleanup, render, screen, fireEvent, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { mockApplyAction, mockApplyState, mockRemoveAction, mockRemoveState, mockHaptic } =
	vi.hoisted(() => ({
		mockApplyAction: vi.fn(),
		mockApplyState: { current: { isPending: false } },
		mockRemoveAction: vi.fn(),
		mockRemoveState: { current: { isPending: false } },
		mockHaptic: vi.fn(),
	}));

vi.mock("../../hooks/use-apply-cart-discount", () => ({
	useApplyCartDiscount: () => ({
		action: mockApplyAction,
		state: undefined,
		isPending: mockApplyState.current.isPending,
	}),
}));

vi.mock("../../hooks/use-remove-cart-discount", () => ({
	useRemoveCartDiscount: () => ({
		action: mockRemoveAction,
		state: undefined,
		isPending: mockRemoveState.current.isPending,
	}),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		onClick,
		type,
		className,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		onClick?: () => void;
		type?: "submit" | "button";
		className?: string;
		"aria-label"?: string;
	}) => (
		<button
			type={type ?? "button"}
			disabled={disabled}
			onClick={onClick}
			className={className}
			aria-label={ariaLabel}
		>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/input", () => ({
	Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock("lucide-react", () => ({
	Loader2Icon: () => <svg data-testid="loader-icon" />,
	Tag: () => <svg data-testid="tag-icon" />,
	X: () => <svg data-testid="x-icon" />,
}));

import { CartPromoCodeForm } from "../cart-promo-code-form";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockApplyState.current.isPending = false;
	mockRemoveState.current.isPending = false;
});

describe("CartPromoCodeForm", () => {
	it("renders the disclosure trigger button collapsed by default", () => {
		render(<CartPromoCodeForm />);
		const trigger = screen.getByRole("button", { name: /j'ai un code promo/i });
		expect(trigger).toBeInTheDocument();
		expect(trigger).toHaveAttribute("aria-expanded", "false");
		expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
	});

	it("expands to show input + apply button when trigger is clicked", () => {
		render(<CartPromoCodeForm />);
		fireEvent.click(screen.getByRole("button", { name: /j'ai un code promo/i }));
		expect(screen.getByPlaceholderText(/^code$/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /appliquer/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /fermer le formulaire/i })).toBeInTheDocument();
	});

	it("collapses when cancel button is clicked", () => {
		render(<CartPromoCodeForm />);
		fireEvent.click(screen.getByRole("button", { name: /j'ai un code promo/i }));
		fireEvent.click(screen.getByRole("button", { name: /fermer le formulaire/i }));
		expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
	});

	it("disables input and submit while pending", () => {
		mockApplyState.current.isPending = true;
		render(<CartPromoCodeForm />);
		fireEvent.click(screen.getByRole("button", { name: /j'ai un code promo/i }));
		expect(screen.getByPlaceholderText(/^code$/i)).toBeDisabled();
	});

	it("shows a loader inside the Apply button while pending", () => {
		mockApplyState.current.isPending = true;
		render(<CartPromoCodeForm />);
		fireEvent.click(screen.getByRole("button", { name: /j'ai un code promo/i }));
		expect(screen.getByTestId("loader-icon")).toBeInTheDocument();
	});

	it("focuses the input after the disclosure expands", () => {
		vi.useFakeTimers();
		render(<CartPromoCodeForm />);
		fireEvent.click(screen.getByRole("button", { name: /j'ai un code promo/i }));
		act(() => {
			vi.advanceTimersByTime(60);
		});
		expect(document.activeElement).toBe(screen.getByPlaceholderText(/^code$/i));
		vi.useRealTimers();
	});

	describe("when a discount code is applied", () => {
		it("renders the applied chip with code and amount instead of the toggle", () => {
			render(<CartPromoCodeForm appliedDiscountCode="SUMMER20" discountAmount={500} />);
			expect(screen.queryByRole("button", { name: /j'ai un code promo/i })).not.toBeInTheDocument();
			expect(screen.getByText("SUMMER20")).toBeInTheDocument();
			expect(screen.getByText(/−5,00\s*€/)).toBeInTheDocument();
		});

		it("hides the discounted amount when discountAmount is zero or null", () => {
			render(<CartPromoCodeForm appliedDiscountCode="FREESHIP" discountAmount={null} />);
			expect(screen.getByText("FREESHIP")).toBeInTheDocument();
			expect(screen.queryByText(/−/)).not.toBeInTheDocument();
		});

		it("renders a remove button with accessible label", () => {
			render(<CartPromoCodeForm appliedDiscountCode="SUMMER20" discountAmount={500} />);
			const removeButton = screen.getByRole("button", {
				name: /retirer le code promo summer20/i,
			});
			expect(removeButton).toBeInTheDocument();
			expect(removeButton).toHaveAttribute("type", "submit");
		});

		it("triggers haptic feedback when the remove button is clicked", () => {
			render(<CartPromoCodeForm appliedDiscountCode="SUMMER20" discountAmount={500} />);
			fireEvent.click(screen.getByRole("button", { name: /retirer le code promo summer20/i }));
			expect(mockHaptic).toHaveBeenCalledWith("selection");
		});

		it("shows a loader inside the Remove button while removing", () => {
			mockRemoveState.current.isPending = true;
			render(<CartPromoCodeForm appliedDiscountCode="SUMMER20" discountAmount={500} />);
			expect(screen.getByTestId("loader-icon")).toBeInTheDocument();
		});
	});
});
