import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockReducedMotion } = vi.hoisted(() => ({
	mockReducedMotion: { value: false },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("motion/react", () => {
	const { forwardRef: fRef } = require("react");
	return {
		m: {
			div: fRef(
				(
					{
						children,
						initial,
						animate,
						whileInView,
						variants,
						viewport,
						...props
					}: Record<string, unknown> & { children?: unknown },
					ref: unknown,
				) => {
					const { createElement } = require("react");
					return createElement(
						"div",
						{
							ref,
							"data-initial": initial ? String(initial) : undefined,
							"data-animate": animate ? String(animate) : undefined,
							"data-while-in-view": whileInView ? String(whileInView) : undefined,
							"data-has-variants": variants ? "true" : undefined,
							"data-viewport": viewport ? JSON.stringify(viewport) : undefined,
							...props,
						},
						children,
					);
				},
			),
		},
		useReducedMotion: () => mockReducedMotion.value,
	};
});

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		stagger: { normal: 0.06 },
		duration: { slow: 0.3 },
		easing: { easeOut: [0, 0, 0.2, 1] },
	},
}));

// ============================================================================
// IMPORT UNDER TEST
// ============================================================================

import { StaggerGrid } from "../stagger-grid";

describe("StaggerGrid", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockReducedMotion.value = false;
	});

	afterEach(cleanup);

	it("renders each child in a wrapper div", () => {
		render(
			<StaggerGrid>
				<span>A</span>
				<span>B</span>
				<span>C</span>
			</StaggerGrid>,
		);
		expect(screen.getByText("A")).toBeInTheDocument();
		expect(screen.getByText("B")).toBeInTheDocument();
		expect(screen.getByText("C")).toBeInTheDocument();
	});

	it("uses whileInView by default (inView=true)", () => {
		const { container } = render(
			<StaggerGrid>
				<span>A</span>
			</StaggerGrid>,
		);
		expect(container.firstChild).toHaveAttribute("data-while-in-view", "visible");
	});

	it("uses animate when inView=false", () => {
		const { container } = render(
			<StaggerGrid inView={false}>
				<span>A</span>
			</StaggerGrid>,
		);
		expect(container.firstChild).toHaveAttribute("data-animate", "visible");
		expect(container.firstChild).not.toHaveAttribute("data-while-in-view");
	});

	it("passes role, className, and data-* to the container", () => {
		const { container } = render(
			<StaggerGrid className="grid-cols-3" role="list" data-testid="my-grid">
				<span>A</span>
			</StaggerGrid>,
		);
		expect(container.firstChild).toHaveClass("grid-cols-3");
		expect(container.firstChild).toHaveAttribute("role", "list");
		expect(container.firstChild).toHaveAttribute("data-testid", "my-grid");
	});

	it("uses child.key when present", () => {
		const { container } = render(
			<StaggerGrid>
				<span key="k1">A</span>
				<span key="k2">B</span>
			</StaggerGrid>,
		);
		expect(container.firstChild!.childNodes).toHaveLength(2);
	});

	it("uses index fallback when no key", () => {
		const items = ["X", "Y"];
		const { container } = render(
			<StaggerGrid>
				{items.map((item, i) => (
					<span key={i}>{item}</span>
				))}
			</StaggerGrid>,
		);
		expect(container.firstChild!.childNodes).toHaveLength(2);
	});

	it("wraps a single child correctly", () => {
		const { container } = render(
			<StaggerGrid>
				<span>Only</span>
			</StaggerGrid>,
		);
		expect(container.firstChild!.childNodes).toHaveLength(1);
		expect(screen.getByText("Only")).toBeInTheDocument();
	});

	it("passes viewport with once and amount when inView", () => {
		const { container } = render(
			<StaggerGrid inView once amount={0.3}>
				<span>A</span>
			</StaggerGrid>,
		);
		const viewport = JSON.parse((container.firstChild as Element).getAttribute("data-viewport")!);
		expect(viewport.once).toBe(true);
		expect(viewport.amount).toBe(0.3);
	});
});
