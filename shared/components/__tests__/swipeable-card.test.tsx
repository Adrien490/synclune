import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

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

			const sliding = Array.from(container.querySelectorAll("div")).find((div) =>
				div.style.transform.includes("translateX"),
			);
			expect(sliding?.style.transform).toBe("translateX(0px)");
		});

		it("action zone opacity is 0 at rest", () => {
			render(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			const zone = screen.getByRole("button", { name: "Delete" });
			expect(zone.style.opacity).toBe("0");
		});

		it("applies spring-like snap-back transition when not swiping", () => {
			const { container } = render(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			const sliding = Array.from(container.querySelectorAll("div")).find(
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

			expect(sliding?.style.transition).toBe("none");
		});

		it("strips scale+rotate transform on icon wrapper when reduced motion active", () => {
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
	// CSS custom property on action zones
	// -------------------------------------------------------------------------

	describe("action zone CSS vars", () => {
		it("exposes --swipe-progress CSS var on the left action zone (initial 0)", () => {
			render(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			const zone = screen.getByRole("button", { name: "Delete" });
			expect(zone.style.getPropertyValue("--swipe-progress")).toBe("0");
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
	});

	// -------------------------------------------------------------------------
	// Color shift via filter saturate
	// -------------------------------------------------------------------------

	describe("color shift (filter saturate)", () => {
		it("applies saturate filter with default base (0.7) at rest", () => {
			render(
				<SwipeableCard
					leftAction={{ children: <span>Delete</span>, label: "Delete", onAction: vi.fn() }}
				>
					<span>Content</span>
				</SwipeableCard>,
			);

			const zone = screen.getByRole("button", { name: "Delete" });
			expect(zone.style.filter).toContain("saturate(0.7");
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
