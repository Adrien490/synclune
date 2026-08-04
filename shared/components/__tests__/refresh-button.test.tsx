import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { renderPropMock, type RenderPropMockProps } from "@/test/mocks/render-prop";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

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

vi.mock("@/shared/components/ui/tooltip", () => ({
	Tooltip: ({ children }: { children: unknown }) => children,
	TooltipTrigger: (props: RenderPropMockProps) => renderPropMock("div", props),
	TooltipContent: ({ children }: { children: unknown }) => {
		const { createElement } = require("react");
		return createElement("div", { "data-testid": "tooltip-content" }, children);
	},
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string" && a.length > 0)
			.join(" "),
}));

vi.mock("@phosphor-icons/react/ssr", () => {
	const { createElement } = require("react");
	return {
		ArrowsClockwiseIcon: ({ className, ...props }: Record<string, unknown>) =>
			createElement("svg", { "data-testid": "refresh-icon", className, ...props }),
	};
});

// Import AFTER mocks
import { RefreshButton } from "../refresh-button";

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

describe("RefreshButton", () => {
	it("renders a button with default aria-label", () => {
		render(<RefreshButton onRefresh={vi.fn()} isPending={false} />);

		expect(screen.getByRole("button", { name: "Rafraîchir" })).toBeInTheDocument();
	});

	it("renders with custom label", () => {
		render(<RefreshButton onRefresh={vi.fn()} isPending={false} label="Recharger les données" />);

		expect(screen.getByRole("button", { name: "Recharger les données" })).toBeInTheDocument();
	});

	it("calls onRefresh when the button is clicked", () => {
		const onRefresh = vi.fn();
		render(<RefreshButton onRefresh={onRefresh} isPending={false} />);

		fireEvent.click(screen.getByRole("button"));

		expect(onRefresh).toHaveBeenCalledTimes(1);
	});

	it("disables the button when isPending is true", () => {
		render(<RefreshButton onRefresh={vi.fn()} isPending={true} />);

		expect(screen.getByRole("button")).toBeDisabled();
	});

	it("does not call onRefresh when disabled (isPending)", () => {
		const onRefresh = vi.fn();
		render(<RefreshButton onRefresh={onRefresh} isPending={true} />);

		fireEvent.click(screen.getByRole("button"));

		expect(onRefresh).not.toHaveBeenCalled();
	});

	it("renders the refresh icon", () => {
		render(<RefreshButton onRefresh={vi.fn()} isPending={false} />);

		expect(screen.getByTestId("refresh-icon")).toBeInTheDocument();
	});

	it("renders tooltip with the label text", () => {
		render(<RefreshButton onRefresh={vi.fn()} isPending={false} label="Actualiser" />);

		expect(screen.getByTestId("tooltip-content")).toHaveTextContent("Actualiser");
	});

	it("is enabled when isPending is false", () => {
		render(<RefreshButton onRefresh={vi.fn()} isPending={false} />);

		expect(screen.getByRole("button")).not.toBeDisabled();
	});
});
