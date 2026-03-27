import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/components/ui/button-group", () => ({
	ButtonGroup: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="button-group">{children}</div>
	),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string" && a.length > 0)
			.join(" "),
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { ToolbarSkeleton } from "../toolbar-skeleton";

// ============================================================================
// SETUP
// ============================================================================

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ToolbarSkeleton", () => {
	// ─── Accessibility ─────────────────────────────────────────────────────

	it("has role='status'", () => {
		render(<ToolbarSkeleton />);

		expect(screen.getByRole("status")).toBeInTheDocument();
	});

	it("has aria-busy='true'", () => {
		render(<ToolbarSkeleton />);

		expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
	});

	it("has aria-label 'Chargement de la barre d\u2019outils'", () => {
		render(<ToolbarSkeleton />);

		expect(screen.getByRole("status")).toHaveAttribute(
			"aria-label",
			"Chargement de la barre d'outils",
		);
	});

	it("renders sr-only text 'Chargement de la barre d\u2019outils'", () => {
		render(<ToolbarSkeleton />);

		const srOnly = screen.getByText("Chargement de la barre d'outils");
		expect(srOnly).toBeInTheDocument();
		expect(srOnly.className).toContain("sr-only");
	});

	// ─── Search skeleton ───────────────────────────────────────────────────

	it("renders search skeleton by default (hasSearch=true)", () => {
		const { container } = render(<ToolbarSkeleton />);

		// Search skeleton: min-w-0 flex-1 wrapper with shimmer inside
		const searchWrapper = container.querySelector(".min-w-0.flex-1");
		expect(searchWrapper).toBeInTheDocument();
	});

	it("does not render search skeleton when hasSearch=false", () => {
		const { container } = render(<ToolbarSkeleton hasSearch={false} />);

		const searchWrapper = container.querySelector(".min-w-0.flex-1");
		expect(searchWrapper).toBeNull();
	});

	// ─── Select skeletons ──────────────────────────────────────────────────

	it("renders 1 select skeleton by default", () => {
		const { container } = render(<ToolbarSkeleton />);

		const selectSkeletons = container.querySelectorAll(".h-9.w-32");
		expect(selectSkeletons.length).toBe(1);
	});

	it("renders 3 select skeletons when selectCount=3", () => {
		const { container } = render(<ToolbarSkeleton selectCount={3} />);

		const selectSkeletons = container.querySelectorAll(".h-9.w-32");
		expect(selectSkeletons.length).toBe(3);
	});

	it("renders 0 select skeletons when selectCount=0", () => {
		const { container } = render(<ToolbarSkeleton selectCount={0} />);

		const selectSkeletons = container.querySelectorAll(".h-9.w-32");
		expect(selectSkeletons.length).toBe(0);
	});

	// ─── Button skeletons ──────────────────────────────────────────────────

	it("renders no button skeletons by default (buttonCount=0)", () => {
		const { container } = render(<ToolbarSkeleton />);

		const buttonSkeletons = container.querySelectorAll(".h-9.w-9");
		expect(buttonSkeletons.length).toBe(0);
	});

	it("renders 1 button skeleton without ButtonGroup when buttonCount=1", () => {
		const { container } = render(<ToolbarSkeleton buttonCount={1} />);

		const buttonSkeletons = container.querySelectorAll(".h-9.w-9");
		expect(buttonSkeletons.length).toBe(1);
		expect(screen.queryByTestId("button-group")).toBeNull();
	});

	it("wraps buttons in ButtonGroup when buttonCount > 1", () => {
		render(<ToolbarSkeleton buttonCount={3} />);

		expect(screen.getByTestId("button-group")).toBeInTheDocument();
	});

	it("renders correct number of button skeletons inside ButtonGroup", () => {
		render(<ToolbarSkeleton buttonCount={3} />);

		const buttonGroup = screen.getByTestId("button-group");
		const buttonSkeletons = buttonGroup.querySelectorAll(".h-9.w-9");
		expect(buttonSkeletons.length).toBe(3);
	});

	// ─── Custom className ──────────────────────────────────────────────────

	it("applies custom className to the root element", () => {
		render(<ToolbarSkeleton className="my-toolbar-skeleton" />);

		expect(screen.getByRole("status")).toHaveClass("my-toolbar-skeleton");
	});
});
