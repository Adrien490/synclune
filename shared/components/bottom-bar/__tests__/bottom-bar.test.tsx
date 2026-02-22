import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Hoisted mocks (vi.mock factories are hoisted above variable declarations)
const { useReducedMotionMock, useBottomBarHeightMock } = vi.hoisted(() => ({
	useReducedMotionMock: vi.fn(() => false),
	useBottomBarHeightMock: vi.fn(),
}));

// Mock cn utility
vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// Mock motion/react — render plain elements, expose useReducedMotion spy
vi.mock("motion/react", () => ({
	useReducedMotion: useReducedMotionMock,
	motion: {
		div: "div",
		nav: "nav",
	},
}));

// Mock useBottomBarHeight to track calls
vi.mock("@/shared/hooks", () => ({
	useBottomBarHeight: useBottomBarHeightMock,
}));

// Mock motion config
vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: { spring: { bar: { damping: 25, stiffness: 300 } } },
}));

import {
	BottomBar,
	ActiveDot,
	bottomBarContainerClass,
	bottomBarItemClass,
	bottomBarIconClass,
	bottomBarLabelClass,
} from "../bottom-bar";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// BottomBar
// ---------------------------------------------------------------------------

describe("BottomBar", () => {
	it("renders children", () => {
		render(
			<BottomBar>
				<span data-testid="child">Hello</span>
			</BottomBar>
		);

		expect(screen.getByTestId("child")).toBeDefined();
	});

	it("renders as div by default", () => {
		render(
			<BottomBar aria-label="bar">
				<span>content</span>
			</BottomBar>
		);

		const el = screen.getByLabelText("bar");
		expect(el.tagName).toBe("DIV");
	});

	it('renders as nav when as="nav"', () => {
		render(
			<BottomBar as="nav" aria-label="navigation">
				<span>content</span>
			</BottomBar>
		);

		const el = screen.getByLabelText("navigation");
		expect(el.tagName).toBe("NAV");
	});

	it("applies aria-label", () => {
		render(
			<BottomBar aria-label="test label">
				<span>content</span>
			</BottomBar>
		);

		expect(screen.getByLabelText("test label")).toBeDefined();
	});

	it("applies pointer-events-none when isHidden", () => {
		render(
			<BottomBar isHidden aria-label="bar">
				<span>content</span>
			</BottomBar>
		);

		const el = screen.getByLabelText("bar");
		expect(el.className).toContain("pointer-events-none");
	});

	it("does not apply pointer-events-none when visible", () => {
		render(
			<BottomBar aria-label="bar">
				<span>content</span>
			</BottomBar>
		);

		const el = screen.getByLabelText("bar");
		expect(el.className).not.toContain("pointer-events-none");
	});

	it("uses custom breakpointClass", () => {
		render(
			<BottomBar breakpointClass="lg:hidden" aria-label="bar">
				<span>content</span>
			</BottomBar>
		);

		const el = screen.getByLabelText("bar");
		expect(el.className).toContain("lg:hidden");
		expect(el.className).not.toContain("md:hidden");
	});

	it("uses custom zIndex", () => {
		render(
			<BottomBar zIndex="z-[75]" aria-label="bar">
				<span>content</span>
			</BottomBar>
		);

		const el = screen.getByLabelText("bar");
		expect(el.className).toContain("z-[75]");
	});

	it("passes custom className", () => {
		render(
			<BottomBar className="custom-class" aria-label="bar">
				<span>content</span>
			</BottomBar>
		);

		const el = screen.getByLabelText("bar");
		expect(el.className).toContain("custom-class");
	});

	it("calls useBottomBarHeight with height and enabled", () => {
		render(
			<BottomBar height={64} enabled>
				<span>content</span>
			</BottomBar>
		);

		expect(useBottomBarHeightMock).toHaveBeenCalledWith(64, true);
	});

	it("disables height registration when isHidden", () => {
		render(
			<BottomBar isHidden enabled>
				<span>content</span>
			</BottomBar>
		);

		expect(useBottomBarHeightMock).toHaveBeenCalledWith(56, false);
	});

	it("disables height registration when not enabled", () => {
		render(
			<BottomBar enabled={false}>
				<span>content</span>
			</BottomBar>
		);

		expect(useBottomBarHeightMock).toHaveBeenCalledWith(56, false);
	});
});

// ---------------------------------------------------------------------------
// ActiveDot
// ---------------------------------------------------------------------------

describe("ActiveDot", () => {
	it("renders with aria-hidden", () => {
		render(<ActiveDot />);

		const dot = document.querySelector("[aria-hidden='true']");
		expect(dot).toBeDefined();
		expect(dot).not.toBeNull();
	});

	it("renders as a span", () => {
		const { container } = render(<ActiveDot />);

		const span = container.querySelector("span");
		expect(span).not.toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Exported class constants
// ---------------------------------------------------------------------------

describe("Exported class constants", () => {
	it("bottomBarContainerClass contains flex", () => {
		expect(bottomBarContainerClass).toContain("flex");
	});

	it("bottomBarItemClass contains focus-visible styles", () => {
		expect(bottomBarItemClass).toContain("focus-visible");
	});

	it("bottomBarItemClass contains min touch target", () => {
		expect(bottomBarItemClass).toContain("min-h-14");
	});

	it("bottomBarIconClass defines size", () => {
		expect(bottomBarIconClass).toContain("size-5");
	});

	it("bottomBarLabelClass defines text size", () => {
		expect(bottomBarLabelClass).toContain("text-xs");
	});
});

// ---------------------------------------------------------------------------
// useBottomBarHeight (CSS var integration)
// ---------------------------------------------------------------------------

describe("useBottomBarHeight", () => {
	const CSS_VAR = "--bottom-bar-height";

	afterEach(() => {
		document.documentElement.style.removeProperty(CSS_VAR);
	});

	it("sets CSS variable when enabled", async () => {
		const { useBottomBarHeight: realHook } = await vi.importActual<
			typeof import("@/shared/hooks/use-bottom-bar-height")
		>("@/shared/hooks/use-bottom-bar-height");

		function TestComponent({ height, enabled }: { height: number; enabled: boolean }) {
			realHook(height, enabled);
			return <div data-testid="test" />;
		}

		render(<TestComponent height={56} enabled />);

		expect(document.documentElement.style.getPropertyValue(CSS_VAR)).toBe("56px");
	});

	it("removes CSS variable when disabled", async () => {
		const { useBottomBarHeight: realHook } = await vi.importActual<
			typeof import("@/shared/hooks/use-bottom-bar-height")
		>("@/shared/hooks/use-bottom-bar-height");

		function TestComponent({ enabled }: { enabled: boolean }) {
			realHook(56, enabled);
			return <div />;
		}

		const { rerender } = render(<TestComponent enabled />);
		expect(document.documentElement.style.getPropertyValue(CSS_VAR)).toBe("56px");

		rerender(<TestComponent enabled={false} />);
		expect(document.documentElement.style.getPropertyValue(CSS_VAR)).toBe("");
	});

	it("cleans up CSS variable on unmount", async () => {
		const { useBottomBarHeight: realHook } = await vi.importActual<
			typeof import("@/shared/hooks/use-bottom-bar-height")
		>("@/shared/hooks/use-bottom-bar-height");

		function TestComponent() {
			realHook(56, true);
			return <div />;
		}

		const { unmount } = render(<TestComponent />);
		expect(document.documentElement.style.getPropertyValue(CSS_VAR)).toBe("56px");

		unmount();
		expect(document.documentElement.style.getPropertyValue(CSS_VAR)).toBe("");
	});

	it("updates CSS variable when height changes", async () => {
		const { useBottomBarHeight: realHook } = await vi.importActual<
			typeof import("@/shared/hooks/use-bottom-bar-height")
		>("@/shared/hooks/use-bottom-bar-height");

		function TestComponent({ height }: { height: number }) {
			realHook(height, true);
			return <div />;
		}

		const { rerender } = render(<TestComponent height={56} />);
		expect(document.documentElement.style.getPropertyValue(CSS_VAR)).toBe("56px");

		rerender(<TestComponent height={72} />);
		expect(document.documentElement.style.getPropertyValue(CSS_VAR)).toBe("72px");
	});
});
