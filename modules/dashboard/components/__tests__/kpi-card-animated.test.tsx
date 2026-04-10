import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("motion/react", () => ({
	m: {
		div: ({
			children,
			initial: _initial,
			animate: _animate,
			transition: _transition,
			...rest
		}: {
			children: React.ReactNode;
			initial?: unknown;
			animate?: unknown;
			transition?: unknown;
			[key: string]: unknown;
		}) => (
			<div data-testid="motion-div" {...rest}>
				{children}
			</div>
		),
	},
}));

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		transform: { fadeY: 16 },
		stagger: { normal: 0.08 },
		spring: { gentle: { type: "spring", stiffness: 100, damping: 15 } },
	},
}));

import { KpiCardAnimated } from "../kpi-card-animated";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("KpiCardAnimated", () => {
	// -------------------------------------------------------------------------
	// Rendering
	// -------------------------------------------------------------------------

	it("renders children inside the motion wrapper", () => {
		render(
			<KpiCardAnimated index={0}>
				<span data-testid="child-content">KPI Content</span>
			</KpiCardAnimated>,
		);

		expect(screen.getByTestId("child-content")).toBeInTheDocument();
		expect(screen.getByText("KPI Content")).toBeInTheDocument();
	});

	it("renders the motion div wrapper", () => {
		render(
			<KpiCardAnimated index={0}>
				<span>Content</span>
			</KpiCardAnimated>,
		);

		expect(screen.getByTestId("motion-div")).toBeInTheDocument();
	});

	it("renders multiple children correctly", () => {
		render(
			<KpiCardAnimated index={1}>
				<span data-testid="child-1">First</span>
				<span data-testid="child-2">Second</span>
			</KpiCardAnimated>,
		);

		expect(screen.getByTestId("child-1")).toBeInTheDocument();
		expect(screen.getByTestId("child-2")).toBeInTheDocument();
	});

	// -------------------------------------------------------------------------
	// Props
	// -------------------------------------------------------------------------

	it("accepts index 0 without error", () => {
		expect(() =>
			render(
				<KpiCardAnimated index={0}>
					<span>Content</span>
				</KpiCardAnimated>,
			),
		).not.toThrow();
	});

	it("accepts larger index values without error", () => {
		expect(() =>
			render(
				<KpiCardAnimated index={7}>
					<span>Content</span>
				</KpiCardAnimated>,
			),
		).not.toThrow();
	});

	it("renders a complex child tree", () => {
		render(
			<KpiCardAnimated index={2}>
				<div>
					<h2>Title</h2>
					<p>Description</p>
				</div>
			</KpiCardAnimated>,
		);

		expect(screen.getByText("Title")).toBeInTheDocument();
		expect(screen.getByText("Description")).toBeInTheDocument();
	});

	// -------------------------------------------------------------------------
	// Stagger behavior (via index prop)
	// -------------------------------------------------------------------------

	it("renders unique instances for different indices", () => {
		const { rerender } = render(
			<KpiCardAnimated index={0}>
				<span>Card 0</span>
			</KpiCardAnimated>,
		);

		expect(screen.getByText("Card 0")).toBeInTheDocument();

		rerender(
			<KpiCardAnimated index={3}>
				<span>Card 3</span>
			</KpiCardAnimated>,
		);

		expect(screen.getByText("Card 3")).toBeInTheDocument();
	});

	// -------------------------------------------------------------------------
	// Accessibility
	// -------------------------------------------------------------------------

	it("does not add extra ARIA attributes to the wrapper", () => {
		render(
			<KpiCardAnimated index={0}>
				<span>Content</span>
			</KpiCardAnimated>,
		);

		const wrapper = screen.getByTestId("motion-div");
		expect(wrapper).not.toHaveAttribute("aria-hidden");
		expect(wrapper).not.toHaveAttribute("role");
	});
});
