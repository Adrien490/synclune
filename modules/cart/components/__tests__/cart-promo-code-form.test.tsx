import { cleanup, render, screen, fireEvent, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { mockApplyAction, mockApplyState } = vi.hoisted(() => ({
	mockApplyAction: vi.fn(),
	mockApplyState: { current: { isPending: false } },
}));

vi.mock("../../hooks/use-apply-cart-discount", () => ({
	useApplyCartDiscount: () => ({
		action: mockApplyAction,
		state: undefined,
		isPending: mockApplyState.current.isPending,
	}),
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
	LoaderCircle: () => <svg data-testid="loader-icon" />,
	Tag: () => <svg data-testid="tag-icon" />,
}));

import { CartPromoCodeForm } from "../cart-promo-code-form";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockApplyState.current.isPending = false;
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
});
