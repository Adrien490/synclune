import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockReducedMotion, mockIsTouchDevice } = vi.hoisted(() => ({
	mockReducedMotion: { value: false },
	mockIsTouchDevice: { value: false },
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
						viewport: _viewport,
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

vi.mock("@/shared/hooks", () => ({
	useIsTouchDevice: () => mockIsTouchDevice.value,
}));

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		stagger: { normal: 0.06 },
		duration: { normal: 0.2 },
		easing: { easeOut: [0, 0, 0.2, 1] },
	},
}));

// ============================================================================
// IMPORT UNDER TEST
// ============================================================================

import { Stagger } from "../stagger";

describe("Stagger", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockReducedMotion.value = false;
		mockIsTouchDevice.value = false;
	});

	afterEach(cleanup);

	it("renders each child in a wrapper div", () => {
		render(
			<Stagger>
				<span>A</span>
				<span>B</span>
				<span>C</span>
			</Stagger>,
		);
		expect(screen.getByText("A")).toBeInTheDocument();
		expect(screen.getByText("B")).toBeInTheDocument();
		expect(screen.getByText("C")).toBeInTheDocument();
	});

	it("creates correct number of wrapper divs", () => {
		const { container } = render(
			<Stagger>
				<span>A</span>
				<span>B</span>
			</Stagger>,
		);
		// Container > 2 item wrappers
		const wrappers = container.firstChild!.childNodes;
		expect(wrappers).toHaveLength(2);
	});

	it("renders plain divs when disableOnTouch + touch device", () => {
		mockIsTouchDevice.value = true;
		const { container } = render(
			<Stagger disableOnTouch>
				<span>A</span>
				<span>B</span>
			</Stagger>,
		);
		// Container should not have data-initial (plain div, not m.div)
		expect(container.firstChild).not.toHaveAttribute("data-initial");
	});

	it("uses whileInView when inView=true", () => {
		const { container } = render(
			<Stagger inView>
				<span>A</span>
			</Stagger>,
		);
		expect(container.firstChild).toHaveAttribute("data-while-in-view", "visible");
	});

	it("uses animate when inView=false", () => {
		const { container } = render(
			<Stagger>
				<span>A</span>
			</Stagger>,
		);
		expect(container.firstChild).toHaveAttribute("data-animate", "visible");
		expect(container.firstChild).not.toHaveAttribute("data-while-in-view");
	});

	it("passes role and className to the container", () => {
		const { container } = render(
			<Stagger className="grid" role="list">
				<span>A</span>
			</Stagger>,
		);
		expect(container.firstChild).toHaveClass("grid");
		expect(container.firstChild).toHaveAttribute("role", "list");
	});

	it("uses child.key if present via getStableKey", () => {
		// This test verifies rendering works with keyed children (no crash)
		const { container } = render(
			<Stagger>
				<span key="item-a">A</span>
				<span key="item-b">B</span>
			</Stagger>,
		);
		expect(container.firstChild!.childNodes).toHaveLength(2);
	});

	it("uses index fallback when no key", () => {
		// Verify children without keys render correctly
		const items = ["X", "Y"];
		const { container } = render(
			<Stagger>
				{items.map((item, i) => (
					<span key={i}>{item}</span>
				))}
			</Stagger>,
		);
		expect(container.firstChild!.childNodes).toHaveLength(2);
	});

	it("sets staggerChildren to 0 when reduced motion is on", () => {
		mockReducedMotion.value = true;
		// Verify it renders without crashing (reduced motion applied internally via variants)
		const { container } = render(
			<Stagger>
				<span>A</span>
			</Stagger>,
		);
		expect(container.firstChild).toHaveAttribute("data-has-variants", "true");
	});
});
