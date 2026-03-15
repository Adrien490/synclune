import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockToast } = vi.hoisted(() => ({
	mockToast: { success: vi.fn(), error: vi.fn() },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("sonner", () => ({
	toast: mockToast,
}));

vi.mock("@/shared/components/ui/button", () => {
	const { forwardRef, createElement } = require("react");
	const Button = forwardRef(
		(
			{
				children,
				variant: _v,
				size: _s,
				...props
			}: Record<string, unknown> & { children?: unknown },
			ref: unknown,
		) => createElement("button", { ref, ...props }, children),
	);
	Button.displayName = "Button";
	return { Button };
});

vi.mock("lucide-react", () => {
	const { createElement } = require("react");
	return {
		Copy: (props: Record<string, unknown>) =>
			createElement("svg", { "data-testid": "copy-icon", ...props }),
	};
});

// Import AFTER mocks
import { CopyButton } from "../copy-button";

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("CopyButton", () => {
	it("renders with correct aria-label derived from label prop", () => {
		render(<CopyButton text="ABC123" label="Code promo" />);

		const button = screen.getByRole("button", { name: "Copier code promo" });
		expect(button).toBeInTheDocument();
	});

	it("renders the Copy icon", () => {
		render(<CopyButton text="ABC123" label="Code" />);

		expect(screen.getByTestId("copy-icon")).toBeInTheDocument();
	});

	it("copies text to clipboard and shows success toast", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, { clipboard: { writeText } });

		render(<CopyButton text="MON-CODE" label="Numéro" />);
		fireEvent.click(screen.getByRole("button"));

		await vi.waitFor(() => {
			expect(writeText).toHaveBeenCalledWith("MON-CODE");
			expect(mockToast.success).toHaveBeenCalledWith("Numéro copié");
		});
	});

	it("shows error toast when clipboard write fails", async () => {
		const writeText = vi.fn().mockRejectedValue(new Error("fail"));
		Object.assign(navigator, { clipboard: { writeText } });

		render(<CopyButton text="X" label="Code" />);
		fireEvent.click(screen.getByRole("button"));

		await vi.waitFor(() => {
			expect(mockToast.error).toHaveBeenCalledWith("Impossible de copier dans le presse-papiers");
		});
	});

	it("passes className to the button", () => {
		render(<CopyButton text="X" label="Code" className="my-class" />);

		expect(screen.getByRole("button")).toHaveClass("my-class");
	});

	it("renders without crashing with default size", () => {
		expect(() => render(<CopyButton text="X" label="Code" />)).not.toThrow();
	});

	it("renders without crashing with custom size", () => {
		expect(() => render(<CopyButton text="X" label="Code" size="icon" />)).not.toThrow();
	});
});
