import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockReducedMotion, captured } = vi.hoisted(() => ({
	mockReducedMotion: { value: false },
	captured: { completions: [] as Array<(() => void) | undefined> },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("motion/react", () => {
	const { forwardRef: fRef, createElement } = require("react");
	return {
		m: {
			svg: fRef(
				(
					{
						children,
						initial,
						animate,
						transition: _t,
						onAnimationComplete,
						...props
					}: Record<string, unknown> & {
						children?: unknown;
						onAnimationComplete?: () => void;
					},
					ref: unknown,
				) => {
					captured.completions.push(onAnimationComplete);
					return createElement(
						"svg",
						{
							ref,
							"data-initial": initial ? JSON.stringify(initial) : undefined,
							"data-animate": animate ? JSON.stringify(animate) : undefined,
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
		spring: { bouncy: { type: "spring", damping: 15, stiffness: 400, mass: 0.5 } },
	},
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		(args as (string | boolean | null | undefined)[]).filter(Boolean).join(" "),
}));

vi.mock("@/shared/utils/seeded-random", () => ({
	// Déterministe et neutre (0.5 → jitter nul) pour des assertions stables.
	seededRandom: () => 0.5,
}));

// ============================================================================
// IMPORT UNDER TEST
// ============================================================================

import { HeartBurst } from "../heart-burst";

const PARTICLE_COUNT = 6;

describe("HeartBurst", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockReducedMotion.value = false;
		captured.completions = [];
	});

	afterEach(cleanup);

	it("renders the burst container with accessibility guards", () => {
		render(<HeartBurst />);
		const burst = screen.getByTestId("heart-burst");
		expect(burst).toBeInTheDocument();
		expect(burst).toHaveAttribute("aria-hidden", "true");
		expect(burst).toHaveClass("pointer-events-none");
		expect(burst).toHaveClass("overflow-visible");
	});

	it("renders exactly 6 particles", () => {
		const { container } = render(<HeartBurst />);
		expect(container.querySelectorAll("svg")).toHaveLength(PARTICLE_COUNT);
	});

	it("returns null under prefers-reduced-motion (no layout, no node)", () => {
		mockReducedMotion.value = true;
		const { container } = render(<HeartBurst />);
		expect(container.firstChild).toBeNull();
		expect(screen.queryByTestId("heart-burst")).not.toBeInTheDocument();
	});

	it("applies a white drop-shadow on each particle for contrast", () => {
		const { container } = render(<HeartBurst />);
		const svg = container.querySelector("svg")!;
		expect(svg.getAttribute("class")).toContain("drop-shadow-");
	});

	it("scales particle size with the `scale` prop", () => {
		const { container } = render(<HeartBurst scale={2} />);
		const widths = Array.from(container.querySelectorAll("svg")).map((s) =>
			Number(s.getAttribute("width")),
		);
		// Tailles de base [10,8,11,9,8,10] × 2.
		expect(widths).toEqual([20, 16, 22, 18, 16, 20]);
	});

	it("animates a gravity arc (3-keyframe y ending below the apex)", () => {
		const { container } = render(<HeartBurst scale={1} />);
		const animate = JSON.parse(container.querySelector("svg")!.getAttribute("data-animate")!);
		expect(animate.y).toHaveLength(3);
		// dernier point = apex + drift (retombée) → strictement supérieur à l'apex.
		expect(animate.y[2]).toBeGreaterThan(animate.y[1]);
		expect(animate.opacity).toEqual([1, 1, 0]);
		expect(animate.scale).toEqual([0, 1, 0.6]);
	});

	it("self-unmounts after the last particle completes its animation", () => {
		const { container } = render(<HeartBurst />);
		expect(container.querySelectorAll("svg")).toHaveLength(PARTICLE_COUNT);

		// Seule la dernière particule porte un onAnimationComplete.
		const completions = captured.completions.filter(Boolean);
		expect(completions).toHaveLength(1);

		act(() => completions[0]!());
		expect(container.querySelector("svg")).toBeNull();
		expect(screen.queryByTestId("heart-burst")).not.toBeInTheDocument();
	});
});
