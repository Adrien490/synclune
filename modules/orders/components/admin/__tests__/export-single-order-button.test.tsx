import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/modules/orders/actions/export-single-order", () => ({
	exportSingleOrder: vi.fn(),
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
	Download: () => <svg data-testid="icon-download" />,
	LoaderCircle: () => <svg data-testid="icon-loader" />,
}));

import { ExportSingleOrderButton } from "../export-single-order-button";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ExportSingleOrderButton", () => {
	it("renders 'Exporter CSV' button", () => {
		render(<ExportSingleOrderButton orderId="order-123" />);
		expect(screen.getByRole("button", { name: /Exporter CSV/i })).toBeInTheDocument();
	});

	it("renders hidden orderId input", () => {
		render(<ExportSingleOrderButton orderId="order-456" />);
		const input = document.querySelector('input[name="id"]') as HTMLInputElement;
		expect(input).not.toBeNull();
		expect(input.value).toBe("order-456");
		expect(input.type).toBe("hidden");
	});

	it("submit button is type=submit", () => {
		render(<ExportSingleOrderButton orderId="order-123" />);
		const button = screen.getByRole("button", { name: /Exporter CSV/i });
		expect(button).toHaveAttribute("type", "submit");
	});

	it("shows download icon initially", () => {
		render(<ExportSingleOrderButton orderId="order-123" />);
		expect(screen.getByTestId("icon-download")).toBeInTheDocument();
	});

	it("button is enabled initially", () => {
		render(<ExportSingleOrderButton orderId="order-123" />);
		expect(screen.getByRole("button", { name: /Exporter CSV/i })).not.toBeDisabled();
	});

	it("button has aria-busy=false initially", () => {
		render(<ExportSingleOrderButton orderId="order-123" />);
		expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "false");
	});
});
