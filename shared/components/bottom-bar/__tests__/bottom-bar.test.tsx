import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type * as UseBottomBarHeightModule from "@/shared/hooks/use-bottom-bar-height";

// Hoisted mocks (vi.mock factories are hoisted above variable declarations)
const { useReducedMotionMock, useBottomBarHeightMock, useKeyboardOpenMock, useMediaQueryMock } =
	vi.hoisted(() => ({
		useReducedMotionMock: vi.fn(() => false),
		useBottomBarHeightMock: vi.fn(),
		useKeyboardOpenMock: vi.fn(() => false),
		// Défaut : viewport sous le breakpoint → la barre est visible.
		useMediaQueryMock: vi.fn(() => true),
	}));

// Mock cn utility
vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// Mock motion/react — render plain elements while forwarding `layoutId` and
// `transition` as data-attrs so tests can assert pill morphing wiring.
vi.mock("motion/react", async () => {
	const { createElement } = await import("react");

	const makeStub =
		(tag: string) =>
		({
			layoutId,
			transition,
			initial,
			animate,
			...rest
		}: Record<string, unknown> & { children?: React.ReactNode }) => {
			const extras: Record<string, string> = {};
			if (layoutId !== undefined) extras["data-layout-id"] = String(layoutId);
			if (transition !== undefined) extras["data-transition"] = JSON.stringify(transition);
			if (initial !== undefined) extras["data-initial"] = JSON.stringify(initial);
			if (animate !== undefined) extras["data-animate"] = JSON.stringify(animate);
			return createElement(tag, { ...rest, ...extras });
		};

	return {
		useReducedMotion: useReducedMotionMock,
		motion: {
			div: makeStub("div"),
			nav: makeStub("nav"),
		},
		m: new Proxy(
			{},
			{
				get: (_target, prop) => {
					if (typeof prop === "symbol") return undefined;
					return makeStub(String(prop));
				},
			},
		),
	};
});

// Mock useBottomBarHeight to track calls
vi.mock("@/shared/hooks", () => ({
	useBottomBarHeight: useBottomBarHeightMock,
}));

// Mock useMediaQuery — pilote la visibilité réelle de la barre.
vi.mock("@/shared/hooks/use-media-query", () => ({
	useMediaQuery: useMediaQueryMock,
}));

// Mock soft-keyboard observer — controllable per test.
vi.mock("@/shared/components/visual-viewport-bridge", () => ({
	useKeyboardOpen: useKeyboardOpenMock,
}));

// Mock motion config — include `snappy` used by BottomBarActivePill
vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		spring: {
			bar: { damping: 25, stiffness: 300 },
			snappy: { damping: 35, stiffness: 500, mass: 0.3 },
		},
	},
}));

import { BottomBar, ActiveDot, BottomBarActivePill } from "../bottom-bar";
import {
	bottomBarContainerClass,
	bottomBarItemClass,
	bottomBarActiveItemClass,
	bottomBarIconClass,
	bottomBarLabelClass,
	bottomBarBadgeClass,
} from "../bottom-bar.styles";

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
			</BottomBar>,
		);

		expect(screen.getByTestId("child")).toBeInTheDocument();
	});

	it("renders as div by default", () => {
		render(
			<BottomBar aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		const el = screen.getByLabelText("bar");
		expect(el.tagName).toBe("DIV");
	});

	it('renders as nav when as="nav"', () => {
		render(
			<BottomBar as="nav" aria-label="navigation">
				<span>content</span>
			</BottomBar>,
		);

		const el = screen.getByLabelText("navigation");
		expect(el.tagName).toBe("NAV");
	});

	it("applies aria-label", () => {
		render(
			<BottomBar aria-label="test label">
				<span>content</span>
			</BottomBar>,
		);

		expect(screen.getByLabelText("test label")).toBeInTheDocument();
	});

	it("applies pointer-events-none and inert when isHidden", () => {
		render(
			<BottomBar isHidden aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		const el = screen.getByLabelText("bar");
		expect(el.className).toContain("pointer-events-none");
		expect(el).toHaveAttribute("inert");
	});

	it("does not apply pointer-events-none or inert when visible", () => {
		render(
			<BottomBar aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		const el = screen.getByLabelText("bar");
		expect(el.className).not.toContain("pointer-events-none");
		expect(el).not.toHaveAttribute("inert");
	});

	it("hides at md by default", () => {
		render(
			<BottomBar aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		const el = screen.getByLabelText("bar");
		expect(el.className).toContain("md:hidden");
		expect(el.className).not.toContain("lg:hidden");
	});

	it('hides at lg when breakpoint="lg"', () => {
		render(
			<BottomBar breakpoint="lg" aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		const el = screen.getByLabelText("bar");
		expect(el.className).toContain("lg:hidden");
		expect(el.className).not.toContain("md:hidden");
	});

	// La classe Tailwind et la media query interrogée doivent dériver du MÊME
	// prop : deux seuils indépendants, c'est la désynchronisation qui a laissé
	// `--bottom-bar-height` à 56px pour une barre invisible.
	it("derives the matchMedia query from the same breakpoint as the hide class", () => {
		render(
			<BottomBar breakpoint="lg" aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		expect(useMediaQueryMock).toHaveBeenCalledWith("(width < 64rem)");
	});

	it("uses a rem-based query for the default md breakpoint", () => {
		render(
			<BottomBar aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		expect(useMediaQueryMock).toHaveBeenCalledWith("(width < 48rem)");
	});

	it("uses default z-(--z-bar) zIndex", () => {
		render(
			<BottomBar aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		const el = screen.getByLabelText("bar");
		expect(el.className).toContain("z-(--z-bar)");
	});

	it("uses custom zIndex", () => {
		render(
			<BottomBar zIndex="z-50" aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		const el = screen.getByLabelText("bar");
		expect(el.className).toContain("z-50");
		expect(el.className).not.toContain("z-(--z-bar)");
	});

	it("passes custom className", () => {
		render(
			<BottomBar className="custom-class" aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		const el = screen.getByLabelText("bar");
		expect(el.className).toContain("custom-class");
	});

	it("calls useBottomBarHeight with height and enabled", () => {
		render(
			<BottomBar height={64} enabled>
				<span>content</span>
			</BottomBar>,
		);

		expect(useBottomBarHeightMock).toHaveBeenCalledWith(64, true);
	});

	it("disables height registration when isHidden", () => {
		render(
			<BottomBar isHidden enabled>
				<span>content</span>
			</BottomBar>,
		);

		expect(useBottomBarHeightMock).toHaveBeenCalledWith(56, false);
	});

	it("disables height registration when not enabled", () => {
		render(
			<BottomBar enabled={false}>
				<span>content</span>
			</BottomBar>,
		);

		expect(useBottomBarHeightMock).toHaveBeenCalledWith(56, false);
	});

	// Régression : la barre n'est masquée qu'en CSS, donc le composant reste
	// monté au-dessus du breakpoint. Publier `--bottom-bar-height` malgré tout
	// réservait 56px pour une barre invisible, et chaque consommateur devait
	// annuler l'offset avec un override de breakpoint codé en dur.
	it("does not publish its height above the breakpoint (bar hidden by CSS)", () => {
		useMediaQueryMock.mockReturnValue(false);

		render(
			<BottomBar aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		expect(useBottomBarHeightMock).toHaveBeenCalledWith(56, false);
		useMediaQueryMock.mockReturnValue(true);
	});

	it("renders native element with hidden attribute when reduced motion + isHidden", () => {
		useReducedMotionMock.mockReturnValueOnce(true);
		const { container } = render(
			<BottomBar as="nav" isHidden aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		// `hidden` attribute makes the element non-accessible; query DOM directly.
		const el = container.querySelector("nav")!;
		expect(el).toHaveAttribute("hidden");
		expect(el).toHaveAttribute("inert");
		expect(el).toHaveAttribute("aria-label", "bar");
		// Native path: no Framer data attrs forwarded.
		expect(el).not.toHaveAttribute("data-transition");
	});

	it("animates to y:'100%' when hidden (full slide-out, robust to safe-area)", () => {
		render(
			<BottomBar isHidden aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		const el = screen.getByLabelText("bar");
		expect(JSON.parse(el.getAttribute("data-animate")!)).toMatchObject({ y: "100%", opacity: 0 });
		// Initial entrance also offscreen via percentage (not a fixed 100px).
		expect(JSON.parse(el.getAttribute("data-initial")!)).toMatchObject({ y: "100%" });
	});

	it("animates to y:0 when visible", () => {
		render(
			<BottomBar aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		const el = screen.getByLabelText("bar");
		expect(JSON.parse(el.getAttribute("data-animate")!)).toMatchObject({ y: 0, opacity: 1 });
	});

	it("slides out + becomes inert when the soft keyboard opens (motion path)", () => {
		useKeyboardOpenMock.mockReturnValueOnce(true);
		render(
			<BottomBar aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		const el = screen.getByLabelText("bar");
		expect(JSON.parse(el.getAttribute("data-animate")!)).toMatchObject({ y: "100%", opacity: 0 });
		expect(el).toHaveAttribute("inert");
		expect(el.className).toContain("pointer-events-none");
	});

	it("snaps hidden via `hidden` attribute when keyboard opens (reduced motion)", () => {
		useReducedMotionMock.mockReturnValueOnce(true);
		useKeyboardOpenMock.mockReturnValueOnce(true);
		const { container } = render(
			<BottomBar as="nav" aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		const el = container.querySelector("nav")!;
		expect(el).toHaveAttribute("hidden");
		expect(el).toHaveAttribute("inert");
	});

	it("does not register height while hidden (keyboard does not thrash layout offset)", () => {
		// Height stays tied to isHidden only, not the transient keyboard state.
		render(
			<BottomBar aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);
		expect(useBottomBarHeightMock).toHaveBeenCalledWith(56, true);
	});
});

// ---------------------------------------------------------------------------
// ActiveDot
// ---------------------------------------------------------------------------

describe("ActiveDot", () => {
	it("renders with aria-hidden", () => {
		render(<ActiveDot />);

		const dot = document.querySelector("[aria-hidden='true']");
		expect(dot).toBeInTheDocument();
		expect(dot).not.toBeNull();
	});

	it("renders as a span", () => {
		const { container } = render(<ActiveDot />);

		const span = container.querySelector("span");
		expect(span).not.toBeNull();
	});
});

// ---------------------------------------------------------------------------
// BottomBarActivePill
// ---------------------------------------------------------------------------

describe("BottomBarActivePill", () => {
	it("renders as a span with aria-hidden", () => {
		const { container } = render(<BottomBarActivePill groupId="nav" />);
		const span = container.querySelector("span");
		expect(span).not.toBeNull();
		expect(span).toHaveAttribute("aria-hidden", "true");
	});

	it("applies pill base classes", () => {
		const { container } = render(<BottomBarActivePill groupId="nav" />);
		const span = container.querySelector("span")!;
		expect(span.className).toContain("bg-primary");
		expect(span.className).toContain("rounded-full");
	});

	it("includes forced-colors fallback color", () => {
		const { container } = render(<BottomBarActivePill groupId="nav" />);
		const span = container.querySelector("span")!;
		expect(span.className).toContain("forced-colors:bg-[Highlight]");
	});

	it("merges custom className", () => {
		const { container } = render(<BottomBarActivePill groupId="nav" className="h-2 w-10" />);
		const span = container.querySelector("span")!;
		expect(span.className).toContain("w-10");
		expect(span.className).toContain("h-2");
	});

	it("renders static span (no layoutId) when reduced motion", () => {
		useReducedMotionMock.mockReturnValueOnce(true);
		const { container } = render(<BottomBarActivePill groupId="nav" />);
		const span = container.querySelector("span")!;
		expect(span).not.toHaveAttribute("layoutid");
		expect(span).not.toHaveAttribute("data-layout-id");
	});

	it("forwards layoutId via Framer (pill morph wiring across tabs)", () => {
		const { container } = render(<BottomBarActivePill groupId="shop-nav" />);
		const span = container.querySelector("span")!;
		expect(span).toHaveAttribute("data-layout-id", "shop-nav");
	});

	it("uses spring.snappy transition for iOS-18 morph feel", () => {
		const { container } = render(<BottomBarActivePill groupId="admin-nav" />);
		const span = container.querySelector("span")!;
		const raw = span.getAttribute("data-transition");
		expect(raw).not.toBeNull();
		expect(JSON.parse(raw!)).toMatchObject({ damping: 35, stiffness: 500 });
	});
});

// ---------------------------------------------------------------------------
// Exported class constants
// ---------------------------------------------------------------------------

describe("Exported class constants", () => {
	it("bottomBarContainerClass contains flex", () => {
		expect(bottomBarContainerClass).toContain("flex");
	});

	it("bottomBarItemClass uses focus-ring SSOT utility (globals.css)", () => {
		expect(bottomBarItemClass).toContain("focus-ring");
	});

	it("bottomBarItemClass contains min touch target", () => {
		expect(bottomBarItemClass).toContain("min-h-14");
	});

	it("bottomBarItemClass contains min-width", () => {
		expect(bottomBarItemClass).toContain("min-w-16");
	});

	it("bottomBarActiveItemClass contains active styles", () => {
		expect(bottomBarActiveItemClass).toContain("text-foreground");
	});

	it("bottomBarActiveItemClass does not add background tint (refined 2026)", () => {
		expect(bottomBarActiveItemClass).not.toContain("bg-primary/5");
	});

	it("bottomBarActiveItemClass includes forced-colors outline", () => {
		expect(bottomBarActiveItemClass).toContain("forced-colors:outline");
		expect(bottomBarActiveItemClass).toContain("forced-colors:outline-[Highlight]");
	});

	it("bottomBarActiveItemClass includes contrast-more outline", () => {
		expect(bottomBarActiveItemClass).toContain("contrast-more:outline");
	});

	it("bottomBarBadgeClass contains badge styles", () => {
		expect(bottomBarBadgeClass).toContain("rounded-full");
		expect(bottomBarBadgeClass).toContain("bg-destructive");
		expect(bottomBarBadgeClass).toContain("ring-2");
	});

	it("bottomBarBadgeClass includes forced-colors outline", () => {
		expect(bottomBarBadgeClass).toContain("forced-colors:outline");
	});

	it("bottomBarIconClass defines size", () => {
		expect(bottomBarIconClass).toContain("size-5");
	});

	it("bottomBarLabelClass defines text size and truncation", () => {
		expect(bottomBarLabelClass).toContain("text-xs");
		expect(bottomBarLabelClass).toContain("truncate");
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
		const { useBottomBarHeight: realHook } = await vi.importActual<typeof UseBottomBarHeightModule>(
			"@/shared/hooks/use-bottom-bar-height",
		);

		function TestComponent({ height, enabled }: { height: number; enabled: boolean }) {
			realHook(height, enabled);
			return <div data-testid="test" />;
		}

		render(<TestComponent height={56} enabled />);

		expect(document.documentElement.style.getPropertyValue(CSS_VAR)).toBe("56px");
	});

	it("removes CSS variable when disabled", async () => {
		const { useBottomBarHeight: realHook } = await vi.importActual<typeof UseBottomBarHeightModule>(
			"@/shared/hooks/use-bottom-bar-height",
		);

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
		const { useBottomBarHeight: realHook } = await vi.importActual<typeof UseBottomBarHeightModule>(
			"@/shared/hooks/use-bottom-bar-height",
		);

		function TestComponent() {
			realHook(56, true);
			return <div />;
		}

		const { unmount } = render(<TestComponent />);
		expect(document.documentElement.style.getPropertyValue(CSS_VAR)).toBe("56px");

		unmount();
		expect(document.documentElement.style.getPropertyValue(CSS_VAR)).toBe("");
	});

	it("uses max height when multiple bars registered", async () => {
		const { useBottomBarHeight: realHook } = await vi.importActual<typeof UseBottomBarHeightModule>(
			"@/shared/hooks/use-bottom-bar-height",
		);

		function Bar({ height }: { height: number }) {
			realHook(height, true);
			return <div />;
		}

		render(
			<>
				<Bar height={56} />
				<Bar height={72} />
			</>,
		);

		expect(document.documentElement.style.getPropertyValue(CSS_VAR)).toBe("72px");
	});

	it("preserves CSS variable when one of two bars unmounts", async () => {
		const { useBottomBarHeight: realHook, _registry } = await vi.importActual<
			typeof UseBottomBarHeightModule
		>("@/shared/hooks/use-bottom-bar-height");

		function Bar({ height }: { height: number }) {
			realHook(height, true);
			return <div />;
		}

		const { unmount: unmountFirst } = render(<Bar height={56} />);
		render(<Bar height={72} />);

		expect(document.documentElement.style.getPropertyValue(CSS_VAR)).toBe("72px");

		unmountFirst();

		expect(document.documentElement.style.getPropertyValue(CSS_VAR)).toBe("72px");
		expect(_registry.size).toBe(1);
	});

	it("updates CSS variable when height changes", async () => {
		const { useBottomBarHeight: realHook } = await vi.importActual<typeof UseBottomBarHeightModule>(
			"@/shared/hooks/use-bottom-bar-height",
		);

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
