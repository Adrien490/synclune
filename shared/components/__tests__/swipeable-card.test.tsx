import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockReducedMotion } = vi.hoisted(() => ({
	mockReducedMotion: { value: false },
}));

const mockHaptic = vi.fn();
vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
	triggerHaptic: vi.fn(),
}));

vi.mock("motion/react", () => ({
	useReducedMotion: () => mockReducedMotion.value,
}));

// `duration.normal` mirrors production: MOTION_CONFIG durations are in SECONDS
// (0.2 = 200ms). Mocking it as `200` here would hide the snap-back unit bug.
vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		duration: { normal: 0.2 },
		spring: { list: { type: "spring", stiffness: 400, damping: 30, mass: 1 } },
	},
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string" && a.length > 0)
			.join(" "),
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { SwipeableCard, applyRubberBand } from "../swipeable-card";

// ============================================================================
// HELPERS
// ============================================================================

/** Locate a decorative swipe-action zone by its `data-swipe-action` attribute. */
function getZone(container: HTMLElement, side: "left" | "right"): HTMLElement {
	const zone = container.querySelector<HTMLElement>(`[data-swipe-action="${side}"]`);
	if (!zone) throw new Error(`No swipe-action zone found for side "${side}"`);
	return zone;
}

/** Locate the sliding card content div (the one carrying the translateX transform). */
function getSlidingCard(container: HTMLElement): HTMLElement | undefined {
	return Array.from(container.querySelectorAll("div")).find((div) =>
		div.style.transform.includes("translateX"),
	);
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("SwipeableCard", () => {
	beforeEach(() => {
		mockReducedMotion.value = false;
		mockHaptic.mockClear();
	});

	// -------------------------------------------------------------------------
	// Rendering
	// -------------------------------------------------------------------------

	describe("rendering", () => {
		it("renders children", () => {
			render(
				<SwipeableCard>
					<span>Card content</span>
				</SwipeableCard>,
			);

			expect(screen.getByText("Card content")).toBeInTheDocument();
		});

		it("renders no swipe zones when no actions are provided", () => {
			const { container } = render(
				<SwipeableCard>
					<span>Content</span>
				</SwipeableCard>,
			);

			expect(container.querySelector("[data-swipe-action]")).toBeNull();
		});

		it("applies custom className to the container", () => {
			const { container } = render(
				<SwipeableCard className="custom-class">
					<span>Content</span>
				</SwipeableCard>,
			);

			expect(container.firstChild).toHaveClass("custom-class");
		});

		it("has touch-pan-y and overflow-hidden on container", () => {
			const { container } = render(
				<SwipeableCard>
					<span>Content</span>
				</SwipeableCard>,
			);

			expect(container.firstChild).toHaveClass("touch-pan-y", "overflow-hidden");
		});
	});

	// -------------------------------------------------------------------------
	// Action zones — accessibility (decorative reveal zones)
	// -------------------------------------------------------------------------

	describe("action zones accessibility", () => {
		it("renders the left action zone with its icon", () => {
			const { container } = render(
				<SwipeableCard
					leftAction={{
						children: <span>Delete</span>,
						label: "Supprimer l'article",
						onAction: vi.fn(),
					}}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			expect(getZone(container, "left")).toBeInTheDocument();
			expect(screen.getByText("Delete")).toBeInTheDocument();
		});

		it("renders the right action zone with its icon", () => {
			const { container } = render(
				<SwipeableCard
					rightAction={{
						children: <span>Archive</span>,
						label: "Archiver l'article",
						onAction: vi.fn(),
					}}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			expect(getZone(container, "right")).toBeInTheDocument();
		});

		it("renders both action zones when both actions provided", () => {
			const { container } = render(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
					rightAction={{ children: <span>Archive</span>, label: "Archive", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			expect(getZone(container, "left")).toBeInTheDocument();
			expect(getZone(container, "right")).toBeInTheDocument();
		});

		it("action zones are decorative — aria-hidden, no role, not focusable", () => {
			const { container } = render(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			const zone = getZone(container, "left");
			expect(zone).toHaveAttribute("aria-hidden", "true");
			expect(zone).not.toHaveAttribute("role");
			expect(zone).not.toHaveAttribute("tabindex");
		});
	});

	// -------------------------------------------------------------------------
	// Action zones — styling
	// -------------------------------------------------------------------------

	describe("action zones styling", () => {
		it("applies default bg-destructive to left action zone", () => {
			const { container } = render(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			expect(getZone(container, "left").className).toContain("bg-destructive");
		});

		it("applies default bg-secondary to right action zone", () => {
			const { container } = render(
				<SwipeableCard
					rightAction={{ children: <span>Archive</span>, label: "Archive", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			expect(getZone(container, "right").className).toContain("bg-secondary");
		});

		it("applies custom className to action zone", () => {
			const { container } = render(
				<SwipeableCard
					leftAction={{
						children: <span>Delete</span>,
						label: "Delete",
						className: "bg-red-500",
						onAction: vi.fn(),
					}}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			expect(getZone(container, "left").className).toContain("bg-red-500");
		});

		it("action zone width is collapsed (0px) at rest", () => {
			const { container } = render(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			expect(getZone(container, "left").style.width).toBe("0px");
		});
	});

	// -------------------------------------------------------------------------
	// Initial state (offset=0, progress=0)
	// -------------------------------------------------------------------------

	describe("initial rendered state", () => {
		it("sliding card has translateX(0px) at rest", () => {
			const { container } = render(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			expect(getSlidingCard(container)?.style.transform).toBe("translateX(0px)");
		});

		it("action zone opacity is 0 at rest", () => {
			const { container } = render(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			expect(getZone(container, "left").style.opacity).toBe("0");
		});

		it("applies a 0.2s spring-like snap-back transition on the sliding card when not swiping", () => {
			const { container } = render(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			const transition = getSlidingCard(container)?.style.transition;
			expect(transition).toContain("transform");
			// `0.2s` — NOT `0.2ms`: MOTION_CONFIG.duration values are seconds.
			expect(transition).toContain("0.2s");
		});
	});

	// -------------------------------------------------------------------------
	// Reduced motion
	// -------------------------------------------------------------------------

	describe("reduced motion", () => {
		it("disables transition when prefers-reduced-motion is active", () => {
			mockReducedMotion.value = true;

			const { container } = render(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			expect(getSlidingCard(container)?.style.transition).toBe("none");
		});

		it("strips scale+rotate transform on icon wrapper when reduced motion active", () => {
			mockReducedMotion.value = true;

			const { container } = render(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			const iconWrapper = getZone(container, "left").querySelector("span");
			expect(iconWrapper?.style.transform).toBe("");
		});
	});

	// -------------------------------------------------------------------------
	// CSS custom property on action zones
	// -------------------------------------------------------------------------

	describe("action zone CSS vars", () => {
		it("exposes --swipe-progress CSS var on the left action zone (initial 0)", () => {
			const { container } = render(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			expect(getZone(container, "left").style.getPropertyValue("--swipe-progress")).toBe("0");
		});

		it("applies scale+rotate transform on the icon wrapper (motion enabled)", () => {
			const { container } = render(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			const iconWrapper = getZone(container, "left").querySelector("span");
			expect(iconWrapper?.style.transform).toContain("scale(calc(0.6");
			expect(iconWrapper?.style.transform).toContain("rotate(calc");
		});
	});

	// -------------------------------------------------------------------------
	// Color shift via filter saturate
	// -------------------------------------------------------------------------

	describe("color shift (filter saturate)", () => {
		it("applies saturate filter with default base (0.7) at rest", () => {
			const { container } = render(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			expect(getZone(container, "left").style.filter).toContain("saturate(0.7");
		});
	});

	// -------------------------------------------------------------------------
	// aria-live announcement (initial state only — full swipe flow needs E2E)
	// -------------------------------------------------------------------------

	describe("aria-live announcement", () => {
		it("renders an sr-only polite status region", () => {
			render(
				<SwipeableCard>
					<span>Content</span>
				</SwipeableCard>,
			);

			const status = screen.getByRole("status");
			expect(status).toHaveAttribute("aria-live", "polite");
			expect(status).toHaveClass("sr-only");
			expect(status.textContent).toBe("");
		});
	});

	// -------------------------------------------------------------------------
	// data-no-swipe opt-out (regression)
	// -------------------------------------------------------------------------

	describe("data-no-swipe opt-out", () => {
		it("ignores touchstart that originates inside a [data-no-swipe] subtree", () => {
			const onAction = vi.fn();
			const { container } = render(
				<SwipeableCard leftAction={{ children: <span>Delete</span>, label: "Delete", onAction }}>
					<div>
						<div data-no-swipe data-testid="actions">
							<button type="button">Stepper +</button>
						</div>
					</div>
				</SwipeableCard>,
			);

			const button = screen.getByRole("button", { name: "Stepper +" });
			fireEvent.touchStart(button, { touches: [{ clientX: 100, clientY: 100 }] });
			fireEvent.touchMove(button, { touches: [{ clientX: 20, clientY: 100 }] });
			fireEvent.touchEnd(button);

			// Tracking was skipped → sliding card stays at rest, no action fired.
			expect(getSlidingCard(container)?.style.transform).toBe("translateX(0px)");
			expect(onAction).not.toHaveBeenCalled();
		});

		it("still tracks touchstart outside [data-no-swipe] (control)", () => {
			const { container } = render(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
				>
					<div data-testid="card-body">
						<span>Swipable area</span>
					</div>
				</SwipeableCard>,
			);

			// Touching the body (no data-no-swipe) must start tracking — sliding card
			// switches its transition to "none" while tracking is active.
			fireEvent.touchStart(screen.getByTestId("card-body"), {
				touches: [{ clientX: 100, clientY: 100 }],
			});
			expect(getSlidingCard(container)?.style.transition).toBe("none");
		});
	});

	// -------------------------------------------------------------------------
	// applyRubberBand pure helper
	// -------------------------------------------------------------------------

	describe("applyRubberBand helper", () => {
		it("returns identity when offset is below the threshold", () => {
			expect(applyRubberBand(40, 400, 80)).toBe(40);
			expect(applyRubberBand(-40, 400, 80)).toBe(-40);
		});

		it("returns identity when width is zero (safety fallback)", () => {
			expect(applyRubberBand(200, 0, 80)).toBe(200);
			expect(applyRubberBand(-200, 0, 80)).toBe(-200);
		});

		it("compresses logarithmically beyond the threshold (preserves sign)", () => {
			const left = applyRubberBand(-200, 400, 80);
			const right = applyRubberBand(200, 400, 80);
			expect(Math.abs(left)).toBeGreaterThan(80);
			expect(Math.abs(left)).toBeLessThan(200);
			expect(left).toBeLessThan(0);
			expect(right).toBeGreaterThan(0);
			expect(Math.abs(left)).toBe(Math.abs(right));
		});

		it("caps the compressed offset at 85% of container width (asymptote)", () => {
			const width = 400;
			const extreme = applyRubberBand(9999, width, 80);
			expect(extreme).toBeLessThanOrEqual(width * 0.85);
		});
	});
});
