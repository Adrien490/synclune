import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockIsInView, mockIsTouchDevice, mockReducedMotion } = vi.hoisted(() => ({
	mockIsInView: { value: true },
	mockIsTouchDevice: { value: false },
	mockReducedMotion: { value: false },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("motion/react", () => ({
	useInView: () => mockIsInView.value,
	useReducedMotion: () => mockReducedMotion.value,
}));

vi.mock("@/shared/hooks", () => ({
	useIsTouchDevice: () => mockIsTouchDevice.value,
}));

vi.mock("@/shared/utils/seeded-random", () => ({
	seededRandom: (seed: number) => Math.abs(Math.sin(seed)) % 1,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		background: {
			sparkle: { durationRange: [2, 4], delayMax: 3 },
		},
	},
}));

// ============================================================================
// IMPORT UNDER TEST
// ============================================================================

import { GlitterSparkles } from "../glitter-sparkles";

// ============================================================================
// TESTS
// ============================================================================

describe("GlitterSparkles", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsInView.value = true;
		mockIsTouchDevice.value = false;
		mockReducedMotion.value = false;
	});

	afterEach(cleanup);

	it("renders with aria-hidden='true'", () => {
		const { container } = render(<GlitterSparkles />);
		expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
	});

	it("has data-testid='glitter-sparkles'", () => {
		render(<GlitterSparkles />);
		expect(screen.getByTestId("glitter-sparkles")).toBeInTheDocument();
	});

	it("has contain: 'layout paint' inline style", () => {
		const { container } = render(<GlitterSparkles />);
		const root = container.firstChild as HTMLElement;
		expect(root.style.contain).toBe("layout paint");
	});

	it("renders desktop container with class 'hidden md:contents'", () => {
		const { container } = render(<GlitterSparkles />);
		const root = container.firstChild as HTMLElement;
		const desktopContainer = root.querySelector(".hidden.md\\:contents");
		expect(desktopContainer).toBeInTheDocument();
	});

	it("renders mobile container with class 'contents md:hidden'", () => {
		const { container } = render(<GlitterSparkles />);
		const root = container.firstChild as HTMLElement;
		const mobileContainer = root.querySelector(".contents.md\\:hidden");
		expect(mobileContainer).toBeInTheDocument();
	});

	it("returns null when disableOnMobile=true and device is touch", () => {
		mockIsTouchDevice.value = true;
		const { container } = render(<GlitterSparkles disableOnMobile />);
		expect(container.firstChild).toBeNull();
	});

	it("does not appear in DOM at all when disableOnMobile=true and device is touch", () => {
		mockIsTouchDevice.value = true;
		render(<GlitterSparkles disableOnMobile />);
		expect(screen.queryByTestId("glitter-sparkles")).not.toBeInTheDocument();
	});

	it("renders normally when disableOnMobile=false and device is touch", () => {
		mockIsTouchDevice.value = true;
		render(<GlitterSparkles disableOnMobile={false} />);
		expect(screen.getByTestId("glitter-sparkles")).toBeInTheDocument();
	});

	it("renders normally when disableOnMobile=true but device is not touch", () => {
		mockIsTouchDevice.value = false;
		render(<GlitterSparkles disableOnMobile />);
		expect(screen.getByTestId("glitter-sparkles")).toBeInTheDocument();
	});

	it("renders normally when disableOnMobile defaults to false on touch device", () => {
		mockIsTouchDevice.value = true;
		// disableOnMobile defaults to false — should still render
		render(<GlitterSparkles />);
		expect(screen.getByTestId("glitter-sparkles")).toBeInTheDocument();
	});

	it("renders sparkle elements when in view", () => {
		mockIsInView.value = true;
		render(<GlitterSparkles />);
		const container = screen.getByTestId("glitter-sparkles");
		const sparkles = container.querySelectorAll(".animate-glitter-twinkle");
		expect(sparkles.length).toBeGreaterThan(0);
	});

	it("renders no sparkle elements when not in view", () => {
		mockIsInView.value = false;
		render(<GlitterSparkles />);
		const container = screen.getByTestId("glitter-sparkles");
		// SparkleSet returns null when not in view
		const sparkles = container.querySelectorAll(".animate-glitter-twinkle");
		expect(sparkles.length).toBe(0);
	});

	it("passes custom className to the container", () => {
		const { container } = render(<GlitterSparkles className="extra-class" />);
		expect(container.firstChild).toHaveClass("extra-class");
	});

	it("renders the correct number of sparkles with custom count prop", () => {
		mockIsInView.value = true;
		const count = 4;
		render(<GlitterSparkles count={count} />);
		const container = screen.getByTestId("glitter-sparkles");
		// count=4 → 4 desktop + 4 mobile = 8 total sparkle divs
		const sparkles = container.querySelectorAll(".animate-glitter-twinkle");
		expect(sparkles.length).toBe(count * 2);
	});

	it("renders default 25 desktop and 12 mobile sparkles when no count specified", () => {
		mockIsInView.value = true;
		render(<GlitterSparkles />);
		const container = screen.getByTestId("glitter-sparkles");
		// 25 desktop + 12 mobile = 37 total
		const sparkles = container.querySelectorAll(".animate-glitter-twinkle");
		expect(sparkles.length).toBe(37);
	});

	it("sparkle elements have absolute and rounded-full classes", () => {
		mockIsInView.value = true;
		render(<GlitterSparkles count={1} />);
		const container = screen.getByTestId("glitter-sparkles");
		const sparkle = container.querySelector(".animate-glitter-twinkle");
		expect(sparkle).toHaveClass("absolute");
		expect(sparkle).toHaveClass("rounded-full");
	});

	it("each sparkle has --sparkle-duration CSS variable set", () => {
		mockIsInView.value = true;
		render(<GlitterSparkles count={1} />);
		const container = screen.getByTestId("glitter-sparkles");
		const sparkle = container.querySelector(".animate-glitter-twinkle") as HTMLElement;
		expect(sparkle.style.getPropertyValue("--sparkle-duration")).toMatch(/^\d+(\.\d+)?s$/);
	});

	it("each sparkle has --sparkle-delay CSS variable set", () => {
		mockIsInView.value = true;
		render(<GlitterSparkles count={1} />);
		const container = screen.getByTestId("glitter-sparkles");
		const sparkle = container.querySelector(".animate-glitter-twinkle") as HTMLElement;
		expect(sparkle.style.getPropertyValue("--sparkle-delay")).toMatch(/^\d+(\.\d+)?s$/);
	});

	it("returns null when prefers-reduced-motion is enabled", () => {
		mockReducedMotion.value = true;
		const { container } = render(<GlitterSparkles />);
		expect(container.firstChild).toBeNull();
	});

	it("does not render sparkles when prefers-reduced-motion is enabled", () => {
		mockReducedMotion.value = true;
		render(<GlitterSparkles />);
		expect(screen.queryByTestId("glitter-sparkles")).not.toBeInTheDocument();
	});
});
