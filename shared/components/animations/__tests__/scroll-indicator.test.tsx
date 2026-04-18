import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockReducedMotion, mockScrollY, mockTriggerHaptic } = vi.hoisted(() => ({
	mockReducedMotion: { value: false },
	mockScrollY: { value: 0, listeners: [] as ((v: number) => void)[] },
	mockTriggerHaptic: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("motion/react", () => {
	const { forwardRef: fRef } = require("react");
	return {
		m: {
			button: fRef(
				(
					{
						children,
						animate: _a,
						transition: _t,
						style: _s,
						...props
					}: Record<string, unknown> & { children?: unknown },
					ref: unknown,
				) => {
					const { createElement } = require("react");
					return createElement("button", { ref, ...props }, children);
				},
			),
		},
		useReducedMotion: () => mockReducedMotion.value,
		useScroll: () => ({ scrollY: { get: () => mockScrollY.value } }),
		useTransform: () => ({ get: () => 1 }),
		useMotionValueEvent: (_motionValue: unknown, _event: string, callback: (v: number) => void) => {
			mockScrollY.listeners.push(callback);
		},
	};
});

vi.mock("lucide-react", () => ({
	ChevronDown: ({ size: _size, strokeWidth: _sw, ...props }: Record<string, unknown>) => {
		const { createElement } = require("react");
		return createElement("svg", { "data-testid": "chevron-down", ...props });
	},
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		easing: { easeInOut: [0.25, 0.1, 0.25, 1] },
		background: { scrollIndicator: { duration: 1.5 } },
	},
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockTriggerHaptic,
}));

// ============================================================================
// IMPORT UNDER TEST
// ============================================================================

import { ScrollIndicator } from "../scroll-indicator";

// ============================================================================
// HELPERS
// ============================================================================

const createTargetElement = (id: string): HTMLElement => {
	const el = document.createElement("div");
	el.id = id;
	document.body.appendChild(el);
	return el;
};

// ============================================================================
// TESTS
// ============================================================================

describe("ScrollIndicator", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockReducedMotion.value = false;
		mockScrollY.value = 0;
		mockScrollY.listeners = [];
	});

	afterEach(() => {
		cleanup();
		// Remove any target elements added to document.body
		document.body.innerHTML = "";
	});

	it("renders with default aria-label 'Voir la suite'", () => {
		render(<ScrollIndicator targetIds="section-1" />);
		expect(screen.getByRole("button", { name: "Voir la suite" })).toBeInTheDocument();
	});

	it("renders with custom ariaLabel", () => {
		render(<ScrollIndicator targetIds="section-1" ariaLabel="Descendre" />);
		expect(screen.getByRole("button", { name: "Descendre" })).toBeInTheDocument();
	});

	it("renders ChevronDown icon with aria-hidden", () => {
		render(<ScrollIndicator targetIds="section-1" />);
		const icon = screen.getByTestId("chevron-down");
		expect(icon).toBeInTheDocument();
		expect(icon).toHaveAttribute("aria-hidden", "true");
	});

	it("passes className to the button", () => {
		const { container } = render(
			<ScrollIndicator targetIds="section-1" className="my-custom-class" />,
		);
		expect(container.firstChild).toHaveClass("my-custom-class");
	});

	it("has type='button' attribute", () => {
		render(<ScrollIndicator targetIds="section-1" />);
		const button = screen.getByRole("button");
		expect(button).toHaveAttribute("type", "button");
	});

	it("calls scrollIntoView with behavior 'smooth' on click (no reduced motion)", () => {
		const target = createTargetElement("hero-next");
		const scrollIntoView = vi.fn();
		target.scrollIntoView = scrollIntoView;

		render(<ScrollIndicator targetIds="hero-next" />);
		fireEvent.click(screen.getByRole("button"));

		expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
	});

	it("calls scrollIntoView with behavior 'auto' when reduced motion is enabled", () => {
		mockReducedMotion.value = true;
		const target = createTargetElement("hero-next-reduced");
		const scrollIntoView = vi.fn();
		target.scrollIntoView = scrollIntoView;

		render(<ScrollIndicator targetIds="hero-next-reduced" />);
		fireEvent.click(screen.getByRole("button"));

		expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto" });
	});

	it("uses first found target when targetIds is an array", () => {
		// Only create the second target - the first does not exist
		const secondTarget = createTargetElement("section-b");
		const scrollIntoView = vi.fn();
		secondTarget.scrollIntoView = scrollIntoView;

		render(<ScrollIndicator targetIds={["section-missing", "section-b"]} />);
		fireEvent.click(screen.getByRole("button"));

		expect(scrollIntoView).toHaveBeenCalledTimes(1);
		expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
	});

	it("uses the first available target and does not scroll to subsequent ones", () => {
		const firstTarget = createTargetElement("section-first");
		const firstScrollIntoView = vi.fn();
		firstTarget.scrollIntoView = firstScrollIntoView;

		const secondTarget = createTargetElement("section-second");
		const secondScrollIntoView = vi.fn();
		secondTarget.scrollIntoView = secondScrollIntoView;

		render(<ScrollIndicator targetIds={["section-first", "section-second"]} />);
		fireEvent.click(screen.getByRole("button"));

		expect(firstScrollIntoView).toHaveBeenCalledTimes(1);
		expect(secondScrollIntoView).not.toHaveBeenCalled();
	});

	it("does not scroll if no target element is found", () => {
		const scrollIntoView = vi.fn();
		// Spy on document.getElementById - no element present
		vi.spyOn(document, "getElementById").mockReturnValue(null);

		render(<ScrollIndicator targetIds="non-existent" />);
		fireEvent.click(screen.getByRole("button"));

		expect(scrollIntoView).not.toHaveBeenCalled();
	});

	it("accepts a single string targetId (not array)", () => {
		const target = createTargetElement("single-target");
		const scrollIntoView = vi.fn();
		target.scrollIntoView = scrollIntoView;

		render(<ScrollIndicator targetIds="single-target" />);
		fireEvent.click(screen.getByRole("button"));

		expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
	});

	it("renders as a button element (m.button mock renders native button)", () => {
		render(<ScrollIndicator targetIds="section-1" />);
		const button = screen.getByRole("button");
		expect(button.tagName).toBe("BUTTON");
	});

	it("triggers haptic 'light' on click", () => {
		const target = createTargetElement("haptic-target");
		target.scrollIntoView = vi.fn();
		render(<ScrollIndicator targetIds="haptic-target" />);
		fireEvent.click(screen.getByRole("button"));
		expect(mockTriggerHaptic).toHaveBeenCalledWith("light");
	});
});
