import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockSwipeAction, mockReducedMotion } = vi.hoisted(() => ({
	mockSwipeAction: {
		swipeOffset: 0,
		isSwiping: false,
		leftProgress: 0,
		rightProgress: 0,
		containerWidth: 0,
		effectiveLeftThreshold: 80,
		effectiveRightThreshold: 80,
	},
	mockReducedMotion: { value: false },
}));

vi.mock("@/shared/hooks/use-swipe-action", () => ({
	useSwipeAction: vi.fn(() => mockSwipeAction),
	SWIPE_ACTION_THRESHOLD: 80,
}));

const mockHaptic = vi.fn();
vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
}));

vi.mock("motion/react", () => ({
	useReducedMotion: () => mockReducedMotion.value,
}));

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		duration: { normal: 200 },
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
import { useSwipeAction } from "@/shared/hooks/use-swipe-action";

const mockUseSwipeAction = vi.mocked(useSwipeAction);

// ============================================================================
// HELPERS
// ============================================================================

function setSwipeState(partial: Partial<typeof mockSwipeAction>) {
	Object.assign(mockSwipeAction, partial);
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("SwipeableCard", () => {
	beforeEach(() => {
		mockSwipeAction.swipeOffset = 0;
		mockSwipeAction.isSwiping = false;
		mockSwipeAction.leftProgress = 0;
		mockSwipeAction.rightProgress = 0;
		mockSwipeAction.containerWidth = 0;
		mockSwipeAction.effectiveLeftThreshold = 80;
		mockSwipeAction.effectiveRightThreshold = 80;
		mockReducedMotion.value = false;
		mockHaptic.mockClear();
		mockUseSwipeAction.mockClear();
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

		it("renders without actions (no swipe zones)", () => {
			render(
				<SwipeableCard>
					<span>Content</span>
				</SwipeableCard>,
			);

			expect(screen.queryByRole("button")).not.toBeInTheDocument();
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
	// Action zones — accessibility
	// -------------------------------------------------------------------------

	describe("action zones accessibility", () => {
		it("renders left action zone with aria-label and role=button", () => {
			render(
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

			const actionZone = screen.getByRole("button", { name: "Supprimer l'article" });
			expect(actionZone).toBeInTheDocument();
			expect(screen.getByText("Delete")).toBeInTheDocument();
		});

		it("renders right action zone with aria-label and role=button", () => {
			render(
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

			const actionZone = screen.getByRole("button", { name: "Archiver l'article" });
			expect(actionZone).toBeInTheDocument();
		});

		it("renders both action zones when both actions provided", () => {
			render(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
					rightAction={{ children: <span>Archive</span>, label: "Archive", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();
		});

		it("action zones have tabIndex=-1 (not keyboard-focusable)", () => {
			render(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			const zone = screen.getByRole("button", { name: "Delete" });
			expect(zone).toHaveAttribute("tabindex", "-1");
		});
	});

	// -------------------------------------------------------------------------
	// Action zones — styling
	// -------------------------------------------------------------------------

	describe("action zones styling", () => {
		it("applies default bg-destructive to left action zone", () => {
			render(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			const zone = screen.getByRole("button", { name: "Delete" });
			expect(zone.className).toContain("bg-destructive");
		});

		it("applies default bg-secondary to right action zone", () => {
			render(
				<SwipeableCard
					rightAction={{
						children: <span>Archive</span>,
						label: "Archive",
						onAction: vi.fn(),
					}}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			const zone = screen.getByRole("button", { name: "Archive" });
			expect(zone.className).toContain("bg-secondary");
		});

		it("applies custom className to action zone", () => {
			render(
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

			const zone = screen.getByRole("button", { name: "Delete" });
			expect(zone.className).toContain("bg-red-500");
		});

		it("action zones have explicit w-20 width", () => {
			render(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			const zone = screen.getByRole("button", { name: "Delete" });
			expect(zone).toHaveClass("w-20");
		});
	});

	// -------------------------------------------------------------------------
	// Progress-based opacity
	// -------------------------------------------------------------------------

	describe("progress-based opacity", () => {
		it("sets left action zone opacity from leftProgress", () => {
			setSwipeState({ leftProgress: 0.6 });

			render(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			const zone = screen.getByRole("button", { name: "Delete" });
			expect(zone.style.opacity).toBe("0.6");
		});

		it("sets right action zone opacity from rightProgress", () => {
			setSwipeState({ rightProgress: 0.4 });

			render(
				<SwipeableCard
					rightAction={{
						children: <span>Archive</span>,
						label: "Archive",
						onAction: vi.fn(),
					}}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			const zone = screen.getByRole("button", { name: "Archive" });
			expect(zone.style.opacity).toBe("0.4");
		});
	});

	// -------------------------------------------------------------------------
	// Sliding card content
	// -------------------------------------------------------------------------

	describe("sliding card content", () => {
		it("applies translateX from swipeOffset", () => {
			setSwipeState({ swipeOffset: -50, isSwiping: true });

			const { container } = render(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			const allDivs = container.querySelectorAll("div");
			const sliding = Array.from(allDivs).find((div) => div.style.transform.includes("translateX"));

			expect(sliding?.style.transform).toBe("translateX(-50px)");
		});

		it("uses no transition while swiping", () => {
			setSwipeState({ swipeOffset: -50, isSwiping: true });

			const { container } = render(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			const allDivs = container.querySelectorAll("div");
			const sliding = Array.from(allDivs).find((div) => div.style.transform.includes("translateX"));

			expect(sliding?.style.transition).toBe("none");
		});

		it("applies spring-like snap-back transition when not swiping", () => {
			setSwipeState({ swipeOffset: 0, isSwiping: false });

			const { container } = render(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			const allDivs = container.querySelectorAll("div");
			const sliding = Array.from(allDivs).find(
				(div) => div.style.transition && div.style.transition !== "none",
			);

			expect(sliding?.style.transition).toContain("transform");
			expect(sliding?.style.transition).toContain("200ms");
		});
	});

	// -------------------------------------------------------------------------
	// Reduced motion
	// -------------------------------------------------------------------------

	describe("reduced motion", () => {
		it("disables transition when prefers-reduced-motion is active", () => {
			mockReducedMotion.value = true;
			setSwipeState({ swipeOffset: 0, isSwiping: false });

			const { container } = render(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			const allDivs = container.querySelectorAll("div");
			const sliding = Array.from(allDivs).find((div) => div.style.transform.includes("translateX"));

			expect(sliding?.style.transition).toBe("none");
		});

		it("still applies transform even with reduced motion", () => {
			mockReducedMotion.value = true;
			setSwipeState({ swipeOffset: -40, isSwiping: true });

			const { container } = render(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			const allDivs = container.querySelectorAll("div");
			const sliding = Array.from(allDivs).find((div) => div.style.transform.includes("translateX"));

			expect(sliding?.style.transform).toBe("translateX(-40px)");
		});
	});

	// -------------------------------------------------------------------------
	// useSwipeAction integration
	// -------------------------------------------------------------------------

	describe("useSwipeAction integration", () => {
		it("passes leftAction onAction wrapper that invokes user callback", () => {
			const onAction = vi.fn();

			render(
				<SwipeableCard leftAction={{ children: <span>Delete</span>, label: "Delete", onAction }}>
					<span>Content</span>
				</SwipeableCard>,
			);

			expect(mockUseSwipeAction).toHaveBeenCalledWith(
				expect.objectContaining({
					leftAction: expect.objectContaining({ onAction: expect.any(Function) }),
				}),
			);

			const forwarded = mockUseSwipeAction.mock.calls[0]?.[0]?.leftAction?.onAction;
			forwarded?.();
			expect(onAction).toHaveBeenCalledTimes(1);
		});

		it("passes rightAction onAction wrapper that invokes user callback", () => {
			const onAction = vi.fn();

			render(
				<SwipeableCard rightAction={{ children: <span>Archive</span>, label: "Archive", onAction }}>
					<span>Content</span>
				</SwipeableCard>,
			);

			expect(mockUseSwipeAction).toHaveBeenCalledWith(
				expect.objectContaining({
					rightAction: expect.objectContaining({ onAction: expect.any(Function) }),
				}),
			);

			const forwarded = mockUseSwipeAction.mock.calls[0]?.[0]?.rightAction?.onAction;
			forwarded?.();
			expect(onAction).toHaveBeenCalledTimes(1);
		});

		it("wrapper does NOT fire haptic itself — hook is the sole source of truth (P1.2 regression guard)", () => {
			const onAction = vi.fn();

			render(
				<SwipeableCard leftAction={{ children: <span>Delete</span>, label: "Delete", onAction }}>
					<span>Content</span>
				</SwipeableCard>,
			);

			const forwarded = mockUseSwipeAction.mock.calls[0]?.[0]?.leftAction?.onAction;
			forwarded?.();

			// The wrapper must not fire `medium` — that responsibility belongs to the hook.
			// Only `light` is acceptable here (progress-hint path, unrelated to this test).
			expect(mockHaptic).not.toHaveBeenCalledWith("medium");
			expect(mockHaptic).not.toHaveBeenCalledWith("heavy");
		});

		it("passes undefined to useSwipeAction when no leftAction", () => {
			render(
				<SwipeableCard>
					<span>Content</span>
				</SwipeableCard>,
			);

			expect(mockUseSwipeAction).toHaveBeenCalledWith(
				expect.objectContaining({ leftAction: undefined }),
			);
		});

		it("passes enabled=false to useSwipeAction", () => {
			render(
				<SwipeableCard
					enabled={false}
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			expect(mockUseSwipeAction).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
		});

		it("forwards custom threshold to useSwipeAction", () => {
			const onAction = vi.fn();

			render(
				<SwipeableCard
					leftAction={{
						children: <span>Delete</span>,
						label: "Delete",
						onAction,
						threshold: 120,
					}}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			expect(mockUseSwipeAction).toHaveBeenCalledWith(
				expect.objectContaining({
					leftAction: expect.objectContaining({ threshold: 120 }),
				}),
			);
		});
	});

	// -------------------------------------------------------------------------
	// Rubber-band elasticity (P1.1)
	// -------------------------------------------------------------------------

	describe("rubber-band elasticity", () => {
		it("applies identity transform below threshold (linear, no compression)", () => {
			setSwipeState({
				swipeOffset: -60,
				isSwiping: true,
				containerWidth: 400,
				effectiveLeftThreshold: 80,
			});

			const { container } = render(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			const sliding = Array.from(container.querySelectorAll("div")).find((div) =>
				div.style.transform.includes("translateX"),
			);

			// -60 is below threshold (80) → linear
			expect(sliding?.style.transform).toBe("translateX(-60px)");
		});

		it("compresses transform beyond threshold (logarithmic)", () => {
			setSwipeState({
				swipeOffset: -200,
				isSwiping: true,
				containerWidth: 400,
				effectiveLeftThreshold: 80,
			});

			const { container } = render(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			const sliding = Array.from(container.querySelectorAll("div")).find((div) =>
				div.style.transform.includes("translateX"),
			);

			// Raw offset -200, expected compressed to something between -80 (threshold) and -200
			const match = sliding?.style.transform.match(/translateX\((-?[\d.]+)px\)/);
			const displayed = Number(match?.[1] ?? 0);
			expect(Math.abs(displayed)).toBeGreaterThan(80);
			expect(Math.abs(displayed)).toBeLessThan(200);
		});

		it("skips rubber-band when prefers-reduced-motion is active (identity)", () => {
			mockReducedMotion.value = true;
			setSwipeState({
				swipeOffset: -200,
				isSwiping: true,
				containerWidth: 400,
				effectiveLeftThreshold: 80,
			});

			const { container } = render(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			const sliding = Array.from(container.querySelectorAll("div")).find((div) =>
				div.style.transform.includes("translateX"),
			);

			expect(sliding?.style.transform).toBe("translateX(-200px)");
		});
	});

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

	// -------------------------------------------------------------------------
	// Scale + rotate reveal icône (P1.3)
	// -------------------------------------------------------------------------

	describe("icon scale + rotate reveal", () => {
		it("exposes --swipe-progress CSS var on the left action zone", () => {
			setSwipeState({ leftProgress: 0.5 });

			render(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			const zone = screen.getByRole("button", { name: "Delete" });
			expect(zone.style.getPropertyValue("--swipe-progress")).toBe("0.5");
		});

		it("exposes --swipe-progress CSS var on the right action zone", () => {
			setSwipeState({ rightProgress: 0.75 });

			render(
				<SwipeableCard
					rightAction={{
						children: <span>Archive</span>,
						label: "Archive",
						onAction: vi.fn(),
					}}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			const zone = screen.getByRole("button", { name: "Archive" });
			expect(zone.style.getPropertyValue("--swipe-progress")).toBe("0.75");
		});

		it("applies scale+rotate transform on the icon wrapper (motion enabled)", () => {
			render(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			const zone = screen.getByRole("button", { name: "Delete" });
			const iconWrapper = zone.querySelector("span");
			expect(iconWrapper?.style.transform).toContain("scale(calc(0.6");
			expect(iconWrapper?.style.transform).toContain("rotate(calc");
		});

		it("strips scale+rotate transform when prefers-reduced-motion is active", () => {
			mockReducedMotion.value = true;

			render(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			const zone = screen.getByRole("button", { name: "Delete" });
			const iconWrapper = zone.querySelector("span");
			expect(iconWrapper?.style.transform).toBe("");
		});
	});

	// -------------------------------------------------------------------------
	// Color shift via filter saturate (P2.1)
	// -------------------------------------------------------------------------

	describe("color shift (filter saturate)", () => {
		it("applies saturate filter scaling with leftProgress", () => {
			setSwipeState({ leftProgress: 0 });

			const { rerender } = render(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			let zone = screen.getByRole("button", { name: "Delete" });
			// progress=0 → saturate(0.7)
			expect(zone.style.filter).toContain("saturate(0.7");

			setSwipeState({ leftProgress: 1 });
			rerender(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			zone = screen.getByRole("button", { name: "Delete" });
			// progress=1 → saturate(1.2)
			expect(zone.style.filter).toContain("saturate(1.2");
		});
	});

	// -------------------------------------------------------------------------
	// aria-live region (P1.4)
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

		it("announces the action label after the swipe fires the callback", () => {
			const onAction = vi.fn();

			render(
				<SwipeableCard
					leftAction={{
						children: <span>Delete</span>,
						label: "Supprimer l'article",
						onAction,
					}}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			const forwarded = mockUseSwipeAction.mock.calls[0]?.[0]?.leftAction?.onAction;

			// Wrap in act() so the setState inside the wrapper flushes before the assertion.
			act(() => {
				forwarded?.();
			});

			const status = screen.getByRole("status");
			expect(status.textContent).toBe("Supprimer l'article");
		});

		it("clears the announcement after 1500ms", () => {
			vi.useFakeTimers();

			const onAction = vi.fn();

			render(
				<SwipeableCard leftAction={{ children: <span>Delete</span>, label: "Deleted", onAction }}>
					<span>Content</span>
				</SwipeableCard>,
			);

			const forwarded = mockUseSwipeAction.mock.calls[0]?.[0]?.leftAction?.onAction;

			act(() => {
				forwarded?.();
			});

			const status = screen.getByRole("status");
			expect(status.textContent).toBe("Deleted");

			act(() => {
				vi.advanceTimersByTime(1500);
			});

			expect(status.textContent).toBe("");

			vi.useRealTimers();
		});
	});
});
