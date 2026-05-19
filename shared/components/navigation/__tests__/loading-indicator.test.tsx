import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockUseLinkStatus } = vi.hoisted(() => ({
	mockUseLinkStatus: vi.fn(),
}));

vi.mock("next/link", () => ({
	useLinkStatus: mockUseLinkStatus,
}));

// Import AFTER mocks
import { LoadingIndicator } from "../loading-indicator";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("LoadingIndicator", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// --------------------------------------------------------------------------
	// Rendering contract
	// --------------------------------------------------------------------------

	describe("rendering", () => {
		it("renders the indicator span when navigation is pending", () => {
			mockUseLinkStatus.mockReturnValue({ pending: true });
			const { container } = render(<LoadingIndicator />);
			expect(container.querySelector("span")).toBeInTheDocument();
		});

		it("renders nothing when navigation is not pending", () => {
			mockUseLinkStatus.mockReturnValue({ pending: false });
			const { container } = render(<LoadingIndicator />);
			expect(container.firstChild).toBeNull();
		});
	});

	// --------------------------------------------------------------------------
	// Debounce contract — the JSDoc promise that fast nav shows nothing.
	// Locked via 3 classes that together produce a real debounce:
	//   - fade-in keyframe starts at opacity 0 (not 1 like animate-pulse)
	//   - slide-in-from-left-1 starts at translateX(-4px) for directional cue
	//   - animation-fill-mode:backwards applies the keyframe's "from" state during delay
	//   - 100ms animation-delay = the debounce window
	// --------------------------------------------------------------------------

	describe("debounce contract", () => {
		beforeEach(() => mockUseLinkStatus.mockReturnValue({ pending: true }));

		it("uses motion-safe fade-in (opacity 0 → 1 keyframe)", () => {
			const { container } = render(<LoadingIndicator />);
			expect(container.querySelector("span")?.className).toContain("motion-safe:fade-in");
		});

		it("uses motion-safe slide-in-from-left-1 (directional cue)", () => {
			const { container } = render(<LoadingIndicator />);
			expect(container.querySelector("span")?.className).toContain(
				"motion-safe:slide-in-from-left-1",
			);
		});

		it("locks animation-fill-mode:backwards (so the delay is invisible, not frozen-visible)", () => {
			const { container } = render(<LoadingIndicator />);
			expect(container.querySelector("span")?.className).toContain(
				"[animation-fill-mode:backwards]",
			);
		});

		it("locks the 100ms animation-delay (debounce window)", () => {
			const { container } = render(<LoadingIndicator />);
			expect(container.querySelector("span")?.className).toContain("[animation-delay:100ms]");
		});

		it("locks duration-200 and ease-out (animation timing)", () => {
			const { container } = render(<LoadingIndicator />);
			const className = container.querySelector("span")?.className ?? "";
			expect(className).toContain("motion-safe:duration-200");
			expect(className).toContain("motion-safe:ease-out");
		});
	});

	// --------------------------------------------------------------------------
	// Accessibility — purely decorative, no AT announcement (intentional, cf.
	// audit non-issue: Next.js Link pending is not user-initiated work).
	// --------------------------------------------------------------------------

	describe("accessibility", () => {
		beforeEach(() => mockUseLinkStatus.mockReturnValue({ pending: true }));

		it("is aria-hidden=true (visual-only, no AT noise)", () => {
			const { container } = render(<LoadingIndicator />);
			expect(container.querySelector("span")).toHaveAttribute("aria-hidden", "true");
		});

		it("is pointer-events-none (defensive: cannot intercept click)", () => {
			const { container } = render(<LoadingIndicator />);
			expect(container.querySelector("span")?.className).toContain("pointer-events-none");
		});
	});

	// --------------------------------------------------------------------------
	// Visual contract — brand color + WCAG 1.4.11 contrast + GPU smoothness.
	// --------------------------------------------------------------------------

	describe("visual contract", () => {
		beforeEach(() => mockUseLinkStatus.mockReturnValue({ pending: true }));

		it("uses bg-primary/70 (brand color, opacity above WCAG 1.4.11 threshold)", () => {
			const { container } = render(<LoadingIndicator />);
			expect(container.querySelector("span")?.className).toContain("bg-primary/70");
		});

		it("forces GPU compositing for slide smoothness on low-end mobile", () => {
			const { container } = render(<LoadingIndicator />);
			expect(container.querySelector("span")?.className).toContain("transform-gpu");
		});

		it("is positioned absolute at the bottom of the parent Link", () => {
			const { container } = render(<LoadingIndicator />);
			const className = container.querySelector("span")?.className ?? "";
			expect(className).toContain("absolute");
			expect(className).toContain("bottom-0");
			expect(className).toContain("inset-x-1");
			expect(className).toContain("h-0.5");
		});
	});
});
