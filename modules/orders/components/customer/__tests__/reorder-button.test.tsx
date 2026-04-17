import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("next/navigation", () => ({
	useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/modules/cart/actions/reorder-from-order", () => ({
	reorderFromOrder: vi.fn(),
}));

vi.mock("@/shared/utils/with-callbacks", () => ({
	withCallbacks: (action: unknown) => action,
}));

vi.mock("@/shared/utils/create-toast-callbacks", () => ({
	createToastCallbacks: () => ({}),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		"aria-busy": ariaBusy,
		...props
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		"aria-busy"?: boolean;
		[key: string]: unknown;
	}) => (
		<button disabled={disabled} aria-busy={ariaBusy} {...props}>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	RotateCcw: () => <svg data-testid="icon-rotate" />,
	LoaderCircle: () => <svg data-testid="icon-loader" />,
}));

import { ReorderButton } from "../reorder-button";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ReorderButton", () => {
	it("renders section with 'Commander à nouveau' heading", () => {
		render(<ReorderButton orderId="order-123" />);
		expect(screen.getByRole("heading", { name: "Commander à nouveau" })).toBeInTheDocument();
	});

	it("shows 'Ajouter au panier' button by default", () => {
		render(<ReorderButton orderId="order-123" />);
		expect(screen.getByRole("button", { name: /Ajouter au panier/i })).toBeInTheDocument();
	});

	it("button is enabled initially", () => {
		render(<ReorderButton orderId="order-123" />);
		expect(screen.getByRole("button", { name: /Ajouter au panier/i })).not.toBeDisabled();
	});

	it("shows rotate icon initially", () => {
		render(<ReorderButton orderId="order-123" />);
		expect(screen.getByTestId("icon-rotate")).toBeInTheDocument();
	});

	it("renders hidden input with orderId value", () => {
		render(<ReorderButton orderId="order-456" />);
		const input = document.querySelector('input[name="orderId"]') as HTMLInputElement;
		expect(input).not.toBeNull();
		expect(input.value).toBe("order-456");
		expect(input.type).toBe("hidden");
	});

	it("submit button is type=submit", () => {
		render(<ReorderButton orderId="order-123" />);
		const button = screen.getByRole("button", { name: /Ajouter au panier/i });
		expect(button).toHaveAttribute("type", "submit");
	});

	it("button has aria-busy=false initially", () => {
		render(<ReorderButton orderId="order-123" />);
		const button = screen.getByRole("button", { name: /Ajouter au panier/i });
		expect(button).toHaveAttribute("aria-busy", "false");
	});
});
