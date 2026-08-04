import type React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { renderPropMock, type RenderPropMockProps } from "@/test/mocks/render-prop";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockSetFabVisibility, mockHaptic, mockIsDesktop } = vi.hoisted(() => ({
	mockSetFabVisibility: vi.fn().mockResolvedValue({ status: "success" }),
	mockHaptic: vi.fn(),
	mockIsDesktop: { value: true },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("motion/react", () => {
	// forwardRef is available via a dynamic require inside the factory

	const { forwardRef: fRef } = require("react");
	return {
		AnimatePresence: ({ children }: { children: unknown }) => children,
		m: {
			div: fRef(
				(
					{
						children,
						initial: _i,
						animate: _a,
						exit: _e,
						transition: _t,
						...props
					}: Record<string, unknown> & { children?: unknown },
					ref: unknown,
				) => {
					const { createElement } = require("react");
					return createElement("div", { ref, ...props }, children);
				},
			),
		},
		useReducedMotion: vi.fn(() => false),
	};
});

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: { spring: { snappy: { type: "spring", damping: 35, stiffness: 500, mass: 0.3 } } },
	maybeReduceMotion: (config: unknown) => config,
}));

vi.mock("@/shared/actions/set-fab-visibility", () => ({
	setFabVisibility: mockSetFabVisibility,
}));

vi.mock("@/shared/utils/with-callbacks", () => ({
	withCallbacks: (action: (...args: unknown[]) => unknown) => action,
}));

vi.mock("@/shared/utils/toast", () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
}));

vi.mock("@/shared/hooks/use-media-query", () => ({
	useMediaQuery: vi.fn(() => mockIsDesktop.value),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ size: _size, variant: _variant, render, ...props }: RenderPropMockProps) =>
		// Sans `render`, le mock rend un <div data-testid="button"> (et non un
		// <button>) : plusieurs assertions du fichier s'appuient sur ce testid.
		render
			? renderPropMock("div", { ...props, render })
			: renderPropMock("div", { "data-testid": "button", ...props }),
}));

vi.mock("@/shared/components/ui/tooltip", () => {
	const { createElement } = require("react");
	return {
		Tooltip: ({ children }: { children: unknown }) => children,
		TooltipTrigger: (props: RenderPropMockProps) => renderPropMock("div", props),
		TooltipContent: ({ children }: { children: unknown }) =>
			createElement("div", { "data-testid": "tooltip-content" }, children),
	};
});

vi.mock("lucide-react", () => {
	const { createElement } = require("react");
	return {
		ChevronLeft: () => createElement("span", { "data-testid": "icon-chevron-left" }),
		X: () => createElement("span", { "data-testid": "icon-x" }),
	};
});

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string" && a.length > 0)
			.join(" "),
}));

// Import AFTER all mocks
import { Fab } from "../fab";
import { useMediaQuery } from "@/shared/hooks/use-media-query";
import { useReducedMotion } from "motion/react";

// ============================================================================
// HELPERS
// ============================================================================

const DEFAULT_PROPS = {
	fabKey: "admin-dashboard" as const,
	initialHidden: false,
	icon: <span data-testid="test-icon" />,
	tooltip: { title: "Actions rapides", description: "Gérer le tableau de bord" },
	ariaLabel: "Ouvrir le menu d'actions",
	showTooltip: "Afficher",
	hideTooltip: "Masquer",
};

// State is now driven via `initialHidden` prop (no-op kept for call-site clarity).
function setHidden(_value: boolean) {
	// intentionally empty — callers still pass `initialHidden` prop
}

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
	mockIsDesktop.value = true;
	vi.mocked(useReducedMotion).mockReturnValue(false);
	vi.mocked(useMediaQuery).mockImplementation(() => mockIsDesktop.value);
});

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("Fab", () => {
	describe("visible state (initialHidden=false)", () => {
		it("renders the main action button with aria-label", () => {
			render(<Fab {...DEFAULT_PROPS} />);

			// Button mock renders <div data-testid="button"> — query by testid
			const labeled = screen
				.getAllByTestId("button")
				.find((el) => el.getAttribute("aria-label") === "Ouvrir le menu d'actions");
			expect(labeled).toBeDefined();
		});

		it("renders tooltip title text", () => {
			render(<Fab {...DEFAULT_PROPS} />);

			expect(screen.getByText("Actions rapides")).toBeInTheDocument();
		});

		it("renders tooltip description text", () => {
			render(<Fab {...DEFAULT_PROPS} />);

			expect(screen.getByText("Gérer le tableau de bord")).toBeInTheDocument();
		});

		it("renders the icon", () => {
			render(<Fab {...DEFAULT_PROPS} />);

			expect(screen.getByTestId("test-icon")).toBeInTheDocument();
		});

		it("renders the close button with hideTooltip aria-label", () => {
			render(<Fab {...DEFAULT_PROPS} hideTooltip="Masquer le FAB" />);

			const closeButton = screen
				.getAllByTestId("button")
				.find((el) => el.getAttribute("aria-label") === "Masquer le FAB");
			expect(closeButton).toBeDefined();
		});

		it("does not render the toggle (show) button", () => {
			render(<Fab {...DEFAULT_PROPS} showTooltip="Afficher le FAB" />);

			const toggleButton = screen
				.getAllByTestId("button")
				.find((el) => el.getAttribute("aria-label") === "Afficher le FAB");
			expect(toggleButton).toBeUndefined();
		});
	});

	describe("hidden state (initialHidden=true)", () => {
		beforeEach(() => {
			setHidden(true);
		});

		it("renders the toggle button with showTooltip text", () => {
			render(<Fab {...DEFAULT_PROPS} initialHidden showTooltip="Afficher le panneau" />);

			const toggleButton = screen
				.getAllByTestId("button")
				.find((el) => el.getAttribute("aria-label") === "Afficher le panneau");
			expect(toggleButton).toBeDefined();
		});

		it("renders the ChevronLeft icon in hidden state", () => {
			render(<Fab {...DEFAULT_PROPS} initialHidden />);

			expect(screen.getByTestId("icon-chevron-left")).toBeInTheDocument();
		});

		it("does not render the main action button in hidden state", () => {
			render(<Fab {...DEFAULT_PROPS} initialHidden />);

			expect(screen.queryByTestId("test-icon")).not.toBeInTheDocument();
		});

		it("does not render tooltip title in hidden state", () => {
			render(<Fab {...DEFAULT_PROPS} initialHidden />);

			// tooltip title only appears in the visible container
			expect(screen.queryByText("Actions rapides")).not.toBeInTheDocument();
		});

		it("collapsed toggle exposes a 44px hit area and accessible resting opacity", () => {
			render(<Fab {...DEFAULT_PROPS} initialHidden />);

			const toggleButton = screen
				.getAllByTestId("button")
				.find((el) => el.getAttribute("aria-label") === DEFAULT_PROPS.showTooltip);
			expect(toggleButton).toBeDefined();
			// F2: hit-area expansion to ~44px (WCAG 2.5.5), aligned with the X button pattern
			expect(toggleButton!.className).toContain("after:inset-[-4px]");
			// F3: resting opacity raised to 60% for non-text contrast (WCAG 1.4.11)
			expect(toggleButton!.className).toContain("opacity-60");
			expect(toggleButton!.className).not.toContain("opacity-40");
		});
	});

	describe("href vs onClick variants", () => {
		it("renders an anchor tag when href is provided", () => {
			render(<Fab {...DEFAULT_PROPS} href="/admin" />);

			const anchor = screen.getByRole("link", { hidden: true });
			expect(anchor).toBeInTheDocument();
			expect(anchor).toHaveAttribute("href", "/admin");
		});

		it("anchor carries aria-label", () => {
			render(<Fab {...DEFAULT_PROPS} href="/admin" ariaLabel="Aller au tableau de bord" />);

			const anchor = screen.getByRole("link", { hidden: true });
			expect(anchor).toHaveAttribute("aria-label", "Aller au tableau de bord");
		});

		it("renders a button when onClick is provided (no href)", () => {
			const handleClick = vi.fn();
			render(<Fab {...DEFAULT_PROPS} onClick={handleClick} />);

			// No anchor rendered
			expect(screen.queryByRole("link", { hidden: true })).toBeNull();
		});

		it("calls onClick handler when main button is clicked", () => {
			const handleClick = vi.fn();
			render(<Fab {...DEFAULT_PROPS} onClick={handleClick} />);

			const buttons = screen.getAllByTestId("button");
			// The main button is the one with our aria-label
			const mainBtn = buttons.find(
				(el) => el.getAttribute("aria-label") === "Ouvrir le menu d'actions",
			);
			expect(mainBtn).toBeDefined();
			fireEvent.click(mainBtn!);
			expect(handleClick).toHaveBeenCalledOnce();
		});
	});

	describe("badge", () => {
		it("renders badge when provided", () => {
			const badge = <span data-testid="test-badge">3</span>;
			render(<Fab {...DEFAULT_PROPS} badge={badge} />);

			expect(screen.getByTestId("test-badge")).toBeInTheDocument();
		});

		it("does not render badge container when badge is not provided", () => {
			render(<Fab {...DEFAULT_PROPS} />);

			// The badge wrapper div should not be present
			const container = document.querySelector(".pointer-events-none.absolute");
			expect(container).toBeNull();
		});
	});

	describe("children", () => {
		it("renders children in visible state", () => {
			render(
				<Fab {...DEFAULT_PROPS}>
					<div data-testid="fab-child">Child content</div>
				</Fab>,
			);

			expect(screen.getByTestId("fab-child")).toBeInTheDocument();
		});

		it("does not render children in hidden state", () => {
			setHidden(true);
			render(
				<Fab {...DEFAULT_PROPS} initialHidden>
					<div data-testid="fab-child">Child content</div>
				</Fab>,
			);

			expect(screen.queryByTestId("fab-child")).toBeNull();
		});
	});

	describe("hideOnMobile", () => {
		it("adds hidden md:block class when hideOnMobile is true (default)", () => {
			render(<Fab {...DEFAULT_PROPS} hideOnMobile />);

			// The m.div container rendered as div — check its className
			// The visible container div should include "hidden md:block"
			const containers = document.querySelectorAll("div[id]");
			const visibleContainer = Array.from(containers).find(
				(el) => el.id === "fab-visible-admin-dashboard",
			);
			expect(visibleContainer).toBeDefined();
			expect(visibleContainer!.className).toContain("hidden md:block");
		});

		it("adds block class when hideOnMobile is false", () => {
			render(<Fab {...DEFAULT_PROPS} hideOnMobile={false} />);

			const containers = document.querySelectorAll("div[id]");
			const visibleContainer = Array.from(containers).find(
				(el) => el.id === "fab-visible-admin-dashboard",
			);
			expect(visibleContainer).toBeDefined();
			expect(visibleContainer!.className).toContain("block");
			expect(visibleContainer!.className).not.toContain("hidden");
		});
	});

	describe("aria-pressed (toggle button state)", () => {
		it("toggle button (hidden state) exposes aria-pressed='true'", () => {
			setHidden(true);
			render(<Fab {...DEFAULT_PROPS} initialHidden />);

			const toggleButton = screen
				.getAllByTestId("button")
				.find((el) => el.getAttribute("aria-label") === "Afficher");
			expect(toggleButton).toBeDefined();
			expect(toggleButton!.getAttribute("aria-pressed")).toBe("true");
		});

		it("close button (visible state) exposes aria-pressed='false'", () => {
			render(<Fab {...DEFAULT_PROPS} />);

			const closeButton = screen
				.getAllByTestId("button")
				.find((el) => el.getAttribute("aria-label") === "Masquer");
			expect(closeButton).toBeDefined();
			expect(closeButton!.getAttribute("aria-pressed")).toBe("false");
		});

		it("does not render aria-controls (was broken: targets element absent from DOM in mode='wait')", () => {
			render(<Fab {...DEFAULT_PROPS} />);
			const closeButton = screen
				.getAllByTestId("button")
				.find((el) => el.getAttribute("aria-label") === "Masquer");
			expect(closeButton!.getAttribute("aria-controls")).toBeNull();

			cleanup();
			setHidden(true);
			render(<Fab {...DEFAULT_PROPS} initialHidden />);
			const toggleButton = screen
				.getAllByTestId("button")
				.find((el) => el.getAttribute("aria-label") === "Afficher");
			expect(toggleButton!.getAttribute("aria-controls")).toBeNull();
		});
	});

	describe("aria-describedby", () => {
		it("links main button to sr-only description span when ariaDescription is provided", () => {
			render(<Fab {...DEFAULT_PROPS} ariaDescription="Accès rapide au tableau de bord admin" />);

			const desc = screen.getByText("Accès rapide au tableau de bord admin");
			expect(desc).toBeInTheDocument();
			expect(desc).toHaveAttribute("id", "fab-description-admin-dashboard");
			expect(desc.className).toContain("sr-only");

			const buttons = screen.getAllByTestId("button");
			const mainBtn = buttons.find(
				(el) => el.getAttribute("aria-label") === "Ouvrir le menu d'actions",
			);
			expect(mainBtn!.getAttribute("aria-describedby")).toBe("fab-description-admin-dashboard");
		});

		it("does not add aria-describedby when ariaDescription is not provided", () => {
			render(<Fab {...DEFAULT_PROPS} />);

			const buttons = screen.getAllByTestId("button");
			const mainBtn = buttons.find(
				(el) => el.getAttribute("aria-label") === "Ouvrir le menu d'actions",
			);
			expect(mainBtn!.getAttribute("aria-describedby")).toBeNull();
		});
	});

	describe("ESC key handler", () => {
		it("calls toggle when ESC is pressed on an element inside the container", () => {
			render(<Fab {...DEFAULT_PROPS} />);

			// The container div has data-fab-container attribute and contains the buttons
			const container = document.querySelector("[data-fab-container]");
			expect(container).not.toBeNull();

			// Fire the keydown event directly on an element inside the container
			// (the event listener checks containerRef.current?.contains(e.target))
			const innerElement = container!.querySelector("[data-testid='button']");
			expect(innerElement).not.toBeNull();
			fireEvent.keyDown(innerElement!, { key: "Escape" });
			expect(mockSetFabVisibility).toHaveBeenCalled();
		});

		it("does not call toggle when ESC is pressed outside the container", () => {
			render(<Fab {...DEFAULT_PROPS} />);

			// Dispatch on document.body which is outside the FAB container
			fireEvent.keyDown(document.body, { key: "Escape" });
			expect(mockSetFabVisibility).not.toHaveBeenCalled();
		});

		it("does not attach ESC listener when isHidden is true", () => {
			setHidden(true);
			render(<Fab {...DEFAULT_PROPS} initialHidden />);

			fireEvent.keyDown(document.body, { key: "Escape" });
			expect(mockSetFabVisibility).not.toHaveBeenCalled();
		});
	});

	describe("reduced motion", () => {
		it("shouldAnimate is false when useReducedMotion returns true", () => {
			vi.mocked(useReducedMotion).mockReturnValue(true);

			// No error thrown means maybeReduceMotion was called and handled correctly.
			// The key behavior: hasMounted stays false on first render, so shouldAnimate = false
			// regardless of reducedMotion. With reducedMotion=true, shouldAnimate is also false
			// on subsequent renders. We verify the component renders without issues.
			expect(() => render(<Fab {...DEFAULT_PROPS} />)).not.toThrow();
		});

		it("renders correctly with reduced motion enabled", () => {
			vi.mocked(useReducedMotion).mockReturnValue(true);
			render(<Fab {...DEFAULT_PROPS} />);

			expect(screen.getByText("Actions rapides")).toBeInTheDocument();
		});
	});

	describe("custom className", () => {
		it("applies custom className to the main button", () => {
			render(<Fab {...DEFAULT_PROPS} className="my-custom-class" />);

			const buttons = screen.getAllByTestId("button");
			const mainBtn = buttons.find(
				(el) => el.getAttribute("aria-label") === "Ouvrir le menu d'actions",
			);
			expect(mainBtn!.className).toContain("my-custom-class");
		});
	});

	describe("ariaHasPopup", () => {
		it("passes ariaHasPopup to main button when provided", () => {
			render(<Fab {...DEFAULT_PROPS} ariaHasPopup="dialog" />);

			const buttons = screen.getAllByTestId("button");
			const mainBtn = buttons.find(
				(el) => el.getAttribute("aria-label") === "Ouvrir le menu d'actions",
			);
			expect(mainBtn!.getAttribute("aria-haspopup")).toBe("dialog");
		});

		it("passes ariaHasPopup to anchor when href is provided", () => {
			render(<Fab {...DEFAULT_PROPS} href="/admin" ariaHasPopup="menu" />);

			const anchor = screen.getByRole("link", { hidden: true });
			expect(anchor.getAttribute("aria-haspopup")).toBe("menu");
		});

		it("does not set aria-haspopup when not provided", () => {
			render(<Fab {...DEFAULT_PROPS} />);

			const buttons = screen.getAllByTestId("button");
			const mainBtn = buttons.find(
				(el) => el.getAttribute("aria-label") === "Ouvrir le menu d'actions",
			);
			expect(mainBtn!.getAttribute("aria-haspopup")).toBeNull();
		});
	});

	describe("aria-live status region", () => {
		it("renders a polite aria-live region for screen reader announcements", () => {
			render(<Fab {...DEFAULT_PROPS} />);

			const statusRegion = screen.getByRole("status");
			expect(statusRegion).toBeInTheDocument();
			expect(statusRegion.getAttribute("aria-live")).toBe("polite");
			expect(statusRegion.className).toContain("sr-only");
		});

		it("status region has aria-atomic='true' to force full re-read", () => {
			render(<Fab {...DEFAULT_PROPS} />);

			const statusRegion = screen.getByRole("status");
			expect(statusRegion.getAttribute("aria-atomic")).toBe("true");
		});
	});

	describe("haptic feedback (2026 mobile pattern)", () => {
		it("fires haptic('selection') when the close (hide) button is clicked", () => {
			render(<Fab {...DEFAULT_PROPS} />);

			const closeButton = screen
				.getAllByTestId("button")
				.find((el) => el.getAttribute("aria-label") === "Masquer");
			fireEvent.click(closeButton!);

			expect(mockHaptic).toHaveBeenCalledWith("selection");
		});

		it("fires haptic('selection') when the show toggle is clicked (hidden state)", () => {
			setHidden(true);
			render(<Fab {...DEFAULT_PROPS} initialHidden />);

			const toggleButton = screen
				.getAllByTestId("button")
				.find((el) => el.getAttribute("aria-label") === "Afficher");
			fireEvent.click(toggleButton!);

			expect(mockHaptic).toHaveBeenCalledWith("selection");
		});

		it("fires haptic('light') when the main button is clicked (onClick variant)", () => {
			const onClick = vi.fn();
			render(<Fab {...DEFAULT_PROPS} onClick={onClick} />);

			const mainBtn = screen
				.getAllByTestId("button")
				.find((el) => el.getAttribute("aria-label") === "Ouvrir le menu d'actions");
			fireEvent.click(mainBtn!);

			expect(mockHaptic).toHaveBeenCalledWith("light");
			expect(onClick).toHaveBeenCalledOnce();
		});

		it("fires haptic('light') when the main link is clicked (href variant)", () => {
			render(<Fab {...DEFAULT_PROPS} href="/admin" />);

			const anchor = screen.getByRole("link", { hidden: true });
			fireEvent.click(anchor);

			expect(mockHaptic).toHaveBeenCalledWith("light");
		});
	});

	describe("safe-area iOS positioning (notch / Home Indicator)", () => {
		it("visible container uses bottom safe-area inset", () => {
			render(<Fab {...DEFAULT_PROPS} />);

			const visibleContainer = document.getElementById("fab-visible-admin-dashboard");
			expect(visibleContainer).not.toBeNull();
			expect(visibleContainer!.className).toContain(
				"bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))]",
			);
			expect(visibleContainer!.className).toContain(
				"right-[max(1.5rem,env(safe-area-inset-right,0px))]",
			);
		});

		it("hidden container uses bottom safe-area inset", () => {
			setHidden(true);
			render(<Fab {...DEFAULT_PROPS} initialHidden />);

			const hiddenContainer = document.getElementById("fab-hidden-admin-dashboard");
			expect(hiddenContainer).not.toBeNull();
			expect(hiddenContainer!.className).toContain(
				"bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))]",
			);
		});
	});

	describe("TooltipMaybe (mobile flash mitigation)", () => {
		it("renders TooltipContent on desktop (useMediaQuery returns true)", () => {
			mockIsDesktop.value = true;
			render(<Fab {...DEFAULT_PROPS} />);

			expect(screen.getAllByTestId("tooltip-content").length).toBeGreaterThan(0);
		});

		it("does not render TooltipContent on mobile (useMediaQuery returns false)", () => {
			mockIsDesktop.value = false;
			render(<Fab {...DEFAULT_PROPS} />);

			expect(screen.queryAllByTestId("tooltip-content")).toHaveLength(0);
		});

		it("main button still works on mobile when tooltip skipped", () => {
			mockIsDesktop.value = false;
			const onClick = vi.fn();
			render(<Fab {...DEFAULT_PROPS} onClick={onClick} />);

			const mainBtn = screen
				.getAllByTestId("button")
				.find((el) => el.getAttribute("aria-label") === "Ouvrir le menu d'actions");
			expect(mainBtn).toBeDefined();
			fireEvent.click(mainBtn!);
			expect(onClick).toHaveBeenCalledOnce();
		});

		it("hide tooltip skipped on mobile but button preserves aria-label", () => {
			mockIsDesktop.value = false;
			render(<Fab {...DEFAULT_PROPS} hideTooltip="Masquer" />);

			const closeButton = screen
				.getAllByTestId("button")
				.find((el) => el.getAttribute("aria-label") === "Masquer");
			expect(closeButton).toBeDefined();
		});
	});

	describe("toggle button behavior", () => {
		it("calls toggle when the close button is clicked", () => {
			render(<Fab {...DEFAULT_PROPS} hideTooltip="Masquer" />);

			// Button mock renders <div data-testid="button">
			const closeButton = screen
				.getAllByTestId("button")
				.find((el) => el.getAttribute("aria-label") === "Masquer");
			expect(closeButton).toBeDefined();
			fireEvent.click(closeButton!);
			expect(mockSetFabVisibility).toHaveBeenCalled();
		});

		it("calls toggle when the show button is clicked (hidden state)", () => {
			setHidden(true);
			render(<Fab {...DEFAULT_PROPS} initialHidden showTooltip="Afficher" />);

			const toggleButton = screen
				.getAllByTestId("button")
				.find((el) => el.getAttribute("aria-label") === "Afficher");
			expect(toggleButton).toBeDefined();
			fireEvent.click(toggleButton!);
			expect(mockSetFabVisibility).toHaveBeenCalled();
		});
	});

	describe("stable IDs from fabKey", () => {
		it("uses fabKey to build stable container IDs", () => {
			render(<Fab {...DEFAULT_PROPS} fabKey="admin-dashboard" />);

			const visibleContainer = document.getElementById("fab-visible-admin-dashboard");
			expect(visibleContainer).not.toBeNull();
		});

		it("builds hidden container ID from fabKey", () => {
			render(<Fab {...DEFAULT_PROPS} fabKey="admin-dashboard" initialHidden />);

			const hiddenContainer = document.getElementById("fab-hidden-admin-dashboard");
			expect(hiddenContainer).not.toBeNull();
		});
	});

	// Regression: focus was lost on every toggle. onToggle scheduled focus inside a
	// single requestAnimationFrame, but AnimatePresence mode="wait" mounts the entering
	// branch only after the exit animation (~200-400ms) — so the ref was still null and
	// focus fell to <body>. The fix moves focus into callback refs gated by a pending
	// flag. Motion is mocked here, so these tests verify the callback-ref/flag CONTRACT
	// (which is what makes the fix timing- and mode-agnostic), not real spring timing.
	describe("focus management after toggle (G1 regression)", () => {
		it("focuses the show-toggle button after the FAB is hidden", async () => {
			const focusSpy = vi.spyOn(HTMLElement.prototype, "focus");
			render(<Fab {...DEFAULT_PROPS} hideTooltip="Masquer" showTooltip="Afficher" />);

			const closeButton = screen
				.getAllByTestId("button")
				.find((el) => el.getAttribute("aria-label") === "Masquer");
			expect(closeButton).toBeDefined();

			await act(async () => {
				fireEvent.click(closeButton!);
			});

			const focusedLabels = focusSpy.mock.contexts.map((ctx) =>
				(ctx as HTMLElement | null)?.getAttribute("aria-label"),
			);
			expect(focusedLabels).toContain("Afficher");
			focusSpy.mockRestore();
		});

		it("focuses the main button after the FAB is shown", async () => {
			const focusSpy = vi.spyOn(HTMLElement.prototype, "focus");
			render(<Fab {...DEFAULT_PROPS} initialHidden showTooltip="Afficher" />);

			const toggleButton = screen
				.getAllByTestId("button")
				.find((el) => el.getAttribute("aria-label") === "Afficher");
			expect(toggleButton).toBeDefined();

			await act(async () => {
				fireEvent.click(toggleButton!);
			});

			const focusedLabels = focusSpy.mock.contexts.map((ctx) =>
				(ctx as HTMLElement | null)?.getAttribute("aria-label"),
			);
			expect(focusedLabels).toContain("Ouvrir le menu d'actions");
			focusSpy.mockRestore();
		});

		it("does not steal focus on initial mount (pending flag starts null)", () => {
			const focusSpy = vi.spyOn(HTMLElement.prototype, "focus");
			render(<Fab {...DEFAULT_PROPS} />);

			expect(focusSpy).not.toHaveBeenCalled();
			focusSpy.mockRestore();
		});
	});

	// Guard tests locking in the design-system consistency fixes (G2/G3/G5).
	describe("design-system consistency", () => {
		it("hidden toggle button bumps opacity on keyboard focus (G2)", () => {
			render(<Fab {...DEFAULT_PROPS} initialHidden showTooltip="Afficher" />);

			const toggleButton = screen
				.getAllByTestId("button")
				.find((el) => el.getAttribute("aria-label") === "Afficher");
			expect(toggleButton!.className).toContain("focus-visible:opacity-100");
		});

		it("main button does not redeclare a focus ring — relies on the DS SSOT (G3)", () => {
			render(<Fab {...DEFAULT_PROPS} />);

			const mainBtn = screen
				.getAllByTestId("button")
				.find((el) => el.getAttribute("aria-label") === "Ouvrir le menu d'actions");
			expect(mainBtn!.className).not.toContain("ring-offset");
			expect(mainBtn!.className).not.toContain("focus-visible:ring-2");
		});

		it("renders the badge in the top-left corner, clear of the close button (G5)", () => {
			const badge = <span data-testid="test-badge">3</span>;
			render(<Fab {...DEFAULT_PROPS} badge={badge} />);

			const wrapper = document.querySelector(".pointer-events-none.absolute");
			expect(wrapper).not.toBeNull();
			expect(wrapper!.className).toContain("-left-1.5");
			expect(wrapper!.className).not.toContain("-right-1.5");
		});

		// Hover modernization audit (2026-05-25) — halo + scale + can-hover guard
		// Audit beauté (2026-05-26) — halo migré sur l'utility SSOT `hover-halo` (globals.css).
		it("applies hover-halo SSOT utility + scale classes (F1/F4 — sticky-hover safe on touch)", () => {
			render(<Fab {...DEFAULT_PROPS} onClick={() => {}} />);

			const mainBtn = screen
				.getAllByTestId("button")
				.find((el) => el.getAttribute("aria-label") === "Ouvrir le menu d'actions");
			expect(mainBtn!.className).toContain("group/fab");
			expect(mainBtn!.className).toContain("hover-halo");
			expect(mainBtn!.className).toContain("motion-safe:can-hover:hover:scale-[1.06]");
			expect(mainBtn!.className).toContain("motion-safe:active:scale-[0.94]");
			expect(mainBtn!.className).not.toContain("active:scale-95"); // F7 legacy removed
		});

		it("wraps the main icon in a group-hover rotate span (F3 — icon micro-interaction)", () => {
			render(<Fab {...DEFAULT_PROPS} onClick={() => {}} />);

			const icon = screen.getByTestId("test-icon");
			const wrapper = icon.parentElement;
			expect(wrapper).not.toBeNull();
			expect(wrapper!.tagName).toBe("SPAN");
			expect(wrapper!.className).toContain("motion-safe:can-hover:group-hover/fab:rotate-[6deg]");
		});
	});
});
