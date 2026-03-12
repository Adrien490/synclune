import { cleanup, render, screen, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { useReducedMotionMock } = vi.hoisted(() => ({
	useReducedMotionMock: vi.fn<() => boolean | null>(() => false),
}));

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

import { RotatingWord } from "../rotating-word";

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	vi.useRealTimers();
	useReducedMotionMock.mockReturnValue(false);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RotatingWord", () => {
	const words = ["colorés", "uniques"];

	it("renders with role=group and aria-label listing all words", () => {
		render(<RotatingWord words={words} />);

		const group = screen.getByRole("group");
		expect(group).toBeInTheDocument();
		expect(group.getAttribute("aria-label")).toBe("colorés et uniques");
	});

	it("renders with lang=fr for correct pronunciation", () => {
		render(<RotatingWord words={words} />);

		const group = screen.getByRole("group");
		expect(group.getAttribute("lang")).toBe("fr");
	});

	it("renders CSS containment for performance", () => {
		render(<RotatingWord words={words} />);

		const group = screen.getByRole("group");
		expect(group.style.contain).toBe("layout paint");
	});

	it("renders the first word initially", () => {
		render(<RotatingWord words={words} />);

		const animated = screen.getByTestId("animated-word");
		expect(animated.textContent).toBe("colorés");
	});

	it("includes invisible placeholder for CLS prevention", () => {
		render(<RotatingWord words={words} />);

		// The placeholder should contain the longest word (by .length)
		const group = screen.getByRole("group");
		const invisibleSpan = group.querySelector(".invisible");
		expect(invisibleSpan).not.toBeNull();
		// Both words are 7 chars; reduce picks "colorés" (a.length > b.length is false, so b wins on ties)
		expect(invisibleSpan?.textContent).toBe("uniques");
	});

	it("rotates to next word after duration", () => {
		render(<RotatingWord words={words} duration={3000} />);

		act(() => {
			vi.advanceTimersByTime(3000);
		});

		const animated = screen.getByTestId("animated-word");
		expect(animated.textContent).toBe("uniques");
	});

	it("cycles back to first word after all words shown", () => {
		render(<RotatingWord words={words} duration={3000} />);

		act(() => {
			vi.advanceTimersByTime(6000);
		});

		const animated = screen.getByTestId("animated-word");
		expect(animated.textContent).toBe("colorés");
	});

	it("does not rotate when reduced motion is preferred", () => {
		useReducedMotionMock.mockReturnValue(true);

		render(<RotatingWord words={words} duration={3000} />);

		act(() => {
			vi.advanceTimersByTime(6000);
		});

		// Should still show first word (no rotation)
		const animated = screen.getByTestId("animated-word");
		expect(animated.textContent).toBe("colorés");
	});

	it("marks animated word container as aria-hidden", () => {
		render(<RotatingWord words={words} />);

		const group = screen.getByRole("group");
		// The inner span wrapping AnimatePresence has aria-hidden
		const ariaHiddenSpan = group.querySelector("[aria-hidden='true']");
		expect(ariaHiddenSpan).not.toBeNull();
	});

	it("applies custom className to the pill", () => {
		render(<RotatingWord words={words} className="custom-class" />);

		const group = screen.getByRole("group");
		expect(group.className).toContain("custom-class");
	});
});
