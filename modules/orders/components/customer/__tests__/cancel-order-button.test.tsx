import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("next/navigation", () => ({
	useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/modules/orders/actions/cancel-order-customer", () => ({
	cancelOrderCustomer: vi.fn(),
}));

vi.mock("@/shared/utils/with-callbacks", () => ({
	withCallbacks: (action: unknown) => action,
}));

vi.mock("@/shared/utils/create-toast-callbacks", () => ({
	createToastCallbacks: () => ({}),
}));

vi.mock("@/shared/components/responsive-dialog", () => ({
	ResponsiveDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open: boolean;
		onOpenChange?: (v: boolean) => void;
	}) => (open ? <div data-testid="dialog">{children}</div> : null),
	ResponsiveDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ResponsiveDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ResponsiveDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	ResponsiveDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	ResponsiveDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		...props
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		[key: string]: unknown;
	}) => (
		<button onClick={onClick} {...props}>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	CircleX: () => <svg data-testid="icon-circle-x" />,
	LoaderCircle: () => <svg data-testid="loader" />,
}));

import { CancelOrderButton } from "../cancel-order-button";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("CancelOrderButton", () => {
	it("renders section with 'Annulation' heading", () => {
		render(<CancelOrderButton orderId="order-123" />);
		expect(screen.getByRole("heading", { name: "Annulation" })).toBeInTheDocument();
	});

	it("shows 'Annuler la commande' button", () => {
		render(<CancelOrderButton orderId="order-123" />);
		expect(screen.getByRole("button", { name: /Annuler la commande/i })).toBeInTheDocument();
	});

	it("does not show the dialog initially", () => {
		render(<CancelOrderButton orderId="order-123" />);
		expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
	});

	it("opens the dialog when the button is clicked", () => {
		render(<CancelOrderButton orderId="order-123" />);
		fireEvent.click(screen.getByRole("button", { name: /Annuler la commande/i }));
		expect(screen.getByTestId("dialog")).toBeInTheDocument();
	});

	it("shows the dialog title 'Annuler la commande'", () => {
		render(<CancelOrderButton orderId="order-123" />);
		fireEvent.click(screen.getByRole("button", { name: /Annuler la commande/i }));
		expect(screen.getByRole("heading", { name: "Annuler la commande" })).toBeInTheDocument();
	});

	it("renders hidden input with the orderId value", () => {
		render(<CancelOrderButton orderId="order-123" />);
		fireEvent.click(screen.getByRole("button", { name: /Annuler la commande/i }));
		const input = document.querySelector('input[name="id"]') as HTMLInputElement;
		expect(input).toBeTruthy();
		expect(input.value).toBe("order-123");
	});
});
