import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockReducedMotion, mockSpringValue } = vi.hoisted(() => ({
	mockReducedMotion: { value: false },
	mockSpringValue: { current: 0 },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("motion/react", () => {
	const { forwardRef: fRef } = require("react");
	return {
		m: {
			span: fRef(
				(
					{ children, ...props }: Record<string, unknown> & { children?: unknown },
					ref: unknown,
				) => {
					const { createElement } = require("react");
					return createElement("span", { ref, ...props }, children);
				},
			),
		},
		useReducedMotion: () => mockReducedMotion.value,
		useInView: () => true,
		useSpring: (initial: number) => {
			mockSpringValue.current = initial;
			return {
				set: vi.fn(),
				get: () => mockSpringValue.current,
				on: vi.fn(() => () => {}),
			};
		},
		useTransform: (_spring: unknown, formatter: (n: number) => string) => {
			return formatter(mockSpringValue.current);
		},
	};
});

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		spring: { number: { mass: 0.8, stiffness: 75, damping: 15 } },
	},
}));

// ============================================================================
// IMPORT UNDER TEST
// ============================================================================

import { AnimatedNumber, NumberTicker } from "../animated-number";

describe("AnimatedNumber", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockReducedMotion.value = false;
		mockSpringValue.current = 0;
	});

	afterEach(cleanup);

	it("renders <span> with formatted value when reduced motion", () => {
		mockReducedMotion.value = true;
		render(<AnimatedNumber value={42} />);
		const el = screen.getByRole("status");
		expect(el.tagName).toBe("SPAN");
		expect(el.textContent).toContain("42");
	});

	it("formats with fr-FR locale by default (space as thousands separator)", () => {
		mockReducedMotion.value = true;
		render(<AnimatedNumber value={1234} />);
		const text = screen.getByRole("status").textContent!;
		// fr-FR uses narrow no-break space (U+202F) or non-breaking space
		expect(text.replace(/\s/g, " ")).toBe("1 234");
	});

	it("displays decimal places when specified", () => {
		mockReducedMotion.value = true;
		render(<AnimatedNumber value={42} decimalPlaces={2} />);
		const text = screen.getByRole("status").textContent!;
		expect(text).toContain("42,00");
	});

	it("uses custom formatter when provided", () => {
		mockReducedMotion.value = true;
		render(<AnimatedNumber value={42} formatter={(n) => `${n}%`} />);
		expect(screen.getByRole("status").textContent).toBe("42%");
	});

	it("has correct ARIA attributes", () => {
		mockReducedMotion.value = true;
		render(<AnimatedNumber value={10} />);
		const el = screen.getByRole("status");
		expect(el).toHaveAttribute("aria-live", "polite");
		expect(el).toHaveAttribute("aria-atomic", "true");
	});

	it("applies className and default classes", () => {
		mockReducedMotion.value = true;
		render(<AnimatedNumber value={10} className="text-xl" />);
		const el = screen.getByRole("status");
		expect(el.className).toContain("inline-block");
		expect(el.className).toContain("tabular-nums");
		expect(el.className).toContain("text-xl");
	});

	it("NumberTicker is an alias of AnimatedNumber", () => {
		expect(NumberTicker).toBe(AnimatedNumber);
	});

	it("direction=down sets initial spring value to value (not startValue)", () => {
		mockReducedMotion.value = false;
		render(<AnimatedNumber value={100} startValue={0} direction="down" />);
		// useSpring was called with value (100) as initial for direction=down
		expect(mockSpringValue.current).toBe(100);
	});

	it("direction=up sets initial spring value to startValue", () => {
		mockReducedMotion.value = false;
		render(<AnimatedNumber value={100} startValue={5} direction="up" />);
		expect(mockSpringValue.current).toBe(5);
	});

	it("formats with en-US locale when specified", () => {
		mockReducedMotion.value = true;
		render(<AnimatedNumber value={1234} locale="en-US" />);
		const text = screen.getByRole("status").textContent!;
		expect(text).toBe("1,234");
	});
});
