import type React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { useReducedMotionMock } = vi.hoisted(() => ({
	useReducedMotionMock: vi.fn<() => boolean | null>(() => false),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("motion/react", () => ({
	useReducedMotion: useReducedMotionMock,
	AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	m: {
		span: ({
			children,
			className,
		}: {
			children: React.ReactNode;
			className?: string;
			[key: string]: unknown;
		}) => (
			<span className={className} data-testid="animated-word">
				{children}
			</span>
		),
	},
}));

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		duration: { medium: 0.3 },
		easing: { easeInOut: [0.4, 0, 0.2, 1] },
	},
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { LayoutTextFlip } from "../layout-text-flip";

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.useFakeTimers();
	useReducedMotionMock.mockReturnValue(false);
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	vi.useRealTimers();
});

// ============================================================================
// TESTS
// ============================================================================

describe("LayoutTextFlip", () => {
	// ============================================================================
	// STATIC TEXT
	// ============================================================================

	it("displays the static text 'Des bijoux' by default", () => {
		render(<LayoutTextFlip />);

		expect(screen.getByText("Des bijoux")).toBeInTheDocument();
	});

	it("displays the first word on mount", () => {
		render(<LayoutTextFlip words={["colorés", "uniques", "joyeux"]} />);

		const animated = screen.getByTestId("animated-word");
		expect(animated.textContent).toBe("colorés");
	});

	// ============================================================================
	// ACCESSIBILITY
	// ============================================================================

	it("aria-label on pill contains all words joined with ' et '", () => {
		render(<LayoutTextFlip words={["colorés", "uniques", "joyeux"]} />);

		const pill = screen.getByLabelText("colorés et uniques et joyeux");
		expect(pill).toBeInTheDocument();
	});

	// ============================================================================
	// ANTI-CLS PLACEHOLDER
	// ============================================================================

	it("invisible placeholder contains the longest word", () => {
		render(<LayoutTextFlip words={["colorés", "uniques", "extraordinaires"]} />);

		const { container } = render(
			<LayoutTextFlip words={["colorés", "uniques", "extraordinaires"]} />,
		);
		const placeholder = container.querySelector(".invisible");
		expect(placeholder).not.toBeNull();
		expect(placeholder?.textContent).toBe("extraordinaires");
	});

	it("invisible placeholder uses reduce logic (picks last word on tie)", () => {
		render(<LayoutTextFlip words={["colorés", "uniques"]} />);

		// Both are 7 chars: reduce((a,b) => a.length > b.length ? a : b) → strict >, ties keep second
		const { container } = render(<LayoutTextFlip words={["colorés", "uniques"]} />);
		const placeholder = container.querySelector(".invisible");
		expect(placeholder?.textContent).toBe("uniques");
	});

	// ============================================================================
	// REDUCED MOTION
	// ============================================================================

	it("renders statically when reduced motion is preferred (no animated-word)", () => {
		useReducedMotionMock.mockReturnValue(true);

		render(<LayoutTextFlip words={["colorés", "uniques", "joyeux"]} />);

		// No AnimatePresence child rendered (no data-testid="animated-word")
		expect(screen.queryByTestId("animated-word")).not.toBeInTheDocument();
	});

	it("shows the first word in reduced motion mode", () => {
		useReducedMotionMock.mockReturnValue(true);

		render(<LayoutTextFlip words={["colorés", "uniques", "joyeux"]} />);

		expect(screen.getByText("colorés")).toBeInTheDocument();
	});

	// ============================================================================
	// TIMER ROTATION
	// ============================================================================

	it("rotates to the next word after the duration elapses", () => {
		render(<LayoutTextFlip words={["colorés", "uniques", "joyeux"]} duration={3000} />);

		act(() => {
			vi.advanceTimersByTime(3000);
		});

		const animated = screen.getByTestId("animated-word");
		expect(animated.textContent).toBe("uniques");
	});

	// ============================================================================
	// CUSTOM PROPS
	// ============================================================================

	it("respects custom text and words props", () => {
		render(<LayoutTextFlip text="Mes créations" words={["rares", "précieuses"]} />);

		expect(screen.getByText("Mes créations")).toBeInTheDocument();
		const animated = screen.getByTestId("animated-word");
		expect(animated.textContent).toBe("rares");
	});
});
