import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

// Separate hoisted blocks to avoid TDZ issues when accessing multiple objects
const { mockStore } = vi.hoisted(() => ({
	mockStore: {
		bannerVisible: true,
		acceptCookies: vi.fn(),
		rejectCookies: vi.fn(),
		_hasHydrated: true,
	},
}));

const { mockHasConsented } = vi.hoisted(() => ({
	mockHasConsented: { value: false },
}));

const { mockReducedMotion } = vi.hoisted(() => ({
	mockReducedMotion: { value: false },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/providers/cookie-consent-store-provider", () => ({
	useCookieConsentStore: (selector: (state: typeof mockStore) => unknown) => selector(mockStore),
	useHasConsented: () => mockHasConsented.value,
}));

vi.mock("motion/react", () => {
	const { forwardRef: fRef } = require("react");
	return {
		AnimatePresence: ({ children }: { children: unknown }) => children,
		m: {
			div: fRef(
				(
					{
						children,
						initial,
						animate,
						exit,
						transition,
						...props
					}: Record<string, unknown> & { children?: unknown },
					ref: unknown,
				) => {
					const { createElement } = require("react");
					return createElement(
						"div",
						{
							ref,
							"data-initial": initial ? JSON.stringify(initial) : undefined,
							"data-animate": animate ? JSON.stringify(animate) : undefined,
							"data-exit": exit ? JSON.stringify(exit) : undefined,
							"data-transition": transition ? JSON.stringify(transition) : undefined,
							...props,
						},
						children,
					);
				},
			),
		},
		useReducedMotion: () => mockReducedMotion.value,
	};
});

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		duration: { slow: 0.3 },
		easing: { easeOut: [0, 0, 0.2, 1] },
	},
}));

vi.mock("@/shared/components/ui/button", () => {
	const { forwardRef, createElement } = require("react");
	const Button = forwardRef(
		(
			{
				children,
				variant: _v,
				size: _s,
				...props
			}: Record<string, unknown> & { children?: unknown },
			ref: unknown,
		) => createElement("button", { ref, ...props }, children),
	);
	Button.displayName = "Button";
	return { Button };
});

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		...props
	}: Record<string, unknown> & { children?: unknown; href: string }) => {
		const { createElement } = require("react");
		return createElement("a", { href, ...props }, children);
	},
}));

vi.mock("@radix-ui/react-focus-scope", () => ({
	FocusScope: ({ children }: { children: unknown }) => children,
}));

// ============================================================================
// IMPORT UNDER TEST
// ============================================================================

import { CookieBanner } from "../cookie-banner";

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
	vi.useFakeTimers();
	mockStore.bannerVisible = true;
	mockStore._hasHydrated = true;
	mockHasConsented.value = false;
	mockReducedMotion.value = false;
});

afterEach(() => {
	vi.useRealTimers();
	cleanup();
});

// ============================================================================
// TESTS
// ============================================================================

describe("CookieBanner — animation behavior", () => {
	describe("slide-in animation (motion enabled)", () => {
		it("m.div is rendered with data-initial when banner should show", () => {
			render(<CookieBanner />);

			const motionDiv = screen.getByRole("region");
			expect(motionDiv).toHaveAttribute("data-initial");
		});

		it("initial state has opacity:0 and y:20 when motion is enabled", () => {
			render(<CookieBanner />);

			const motionDiv = screen.getByRole("region");
			const initial = JSON.parse(motionDiv.getAttribute("data-initial")!);
			expect(initial.opacity).toBe(0);
			expect(initial.y).toBe(20);
		});

		it("animate state reaches opacity:1 and y:0", () => {
			render(<CookieBanner />);

			const motionDiv = screen.getByRole("region");
			const animate = JSON.parse(motionDiv.getAttribute("data-animate")!);
			expect(animate.opacity).toBe(1);
			expect(animate.y).toBe(0);
		});

		it("exit state uses opacity:0 and y:20 (slides back down on dismiss)", () => {
			render(<CookieBanner />);

			const motionDiv = screen.getByRole("region");
			const exit = JSON.parse(motionDiv.getAttribute("data-exit")!);
			expect(exit.opacity).toBe(0);
			expect(exit.y).toBe(20);
		});

		it("transition uses MOTION_CONFIG.duration.slow", () => {
			render(<CookieBanner />);

			const motionDiv = screen.getByRole("region");
			const transition = JSON.parse(motionDiv.getAttribute("data-transition")!);
			expect(transition.duration).toBe(0.3);
		});

		it("transition uses MOTION_CONFIG.easing.easeOut", () => {
			render(<CookieBanner />);

			const motionDiv = screen.getByRole("region");
			const transition = JSON.parse(motionDiv.getAttribute("data-transition")!);
			expect(transition.ease).toEqual([0, 0, 0.2, 1]);
		});
	});

	describe("reduced motion behavior", () => {
		it("initial has opacity:1 (no fade) when reduced motion is on", () => {
			mockReducedMotion.value = true;
			render(<CookieBanner />);

			const motionDiv = screen.getByRole("region");
			const initial = JSON.parse(motionDiv.getAttribute("data-initial")!);
			expect(initial.opacity).toBe(1);
		});

		it("initial has no y offset when reduced motion is on", () => {
			mockReducedMotion.value = true;
			render(<CookieBanner />);

			const motionDiv = screen.getByRole("region");
			const initial = JSON.parse(motionDiv.getAttribute("data-initial")!);
			expect(initial.y).toBeUndefined();
		});

		it("exit has opacity:1 (no fade-out) when reduced motion is on", () => {
			mockReducedMotion.value = true;
			render(<CookieBanner />);

			const motionDiv = screen.getByRole("region");
			const exit = JSON.parse(motionDiv.getAttribute("data-exit")!);
			expect(exit.opacity).toBe(1);
		});

		it("exit has no y offset when reduced motion is on", () => {
			mockReducedMotion.value = true;
			render(<CookieBanner />);

			const motionDiv = screen.getByRole("region");
			const exit = JSON.parse(motionDiv.getAttribute("data-exit")!);
			expect(exit.y).toBeUndefined();
		});

		it("transition duration is 0 when reduced motion is on", () => {
			mockReducedMotion.value = true;
			render(<CookieBanner />);

			const motionDiv = screen.getByRole("region");
			const transition = JSON.parse(motionDiv.getAttribute("data-transition")!);
			expect(transition.duration).toBe(0);
		});

		it("banner still shows all content when reduced motion is on", () => {
			mockReducedMotion.value = true;
			render(<CookieBanner />);

			expect(screen.getByText("Cookies")).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Accepter" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Refuser" })).toBeInTheDocument();
		});
	});

	describe("animate state is consistent regardless of reduced motion", () => {
		it("animate is always opacity:1, y:0 with motion on", () => {
			render(<CookieBanner />);

			const motionDiv = screen.getByRole("region");
			const animate = JSON.parse(motionDiv.getAttribute("data-animate")!);
			expect(animate.opacity).toBe(1);
			expect(animate.y).toBe(0);
		});

		it("animate is opacity:1, y:0 with reduced motion on", () => {
			mockReducedMotion.value = true;
			render(<CookieBanner />);

			const motionDiv = screen.getByRole("region");
			const animate = JSON.parse(motionDiv.getAttribute("data-animate")!);
			expect(animate.opacity).toBe(1);
			expect(animate.y).toBe(0);
		});
	});

	describe("AnimatePresence — conditional rendering", () => {
		it("banner is absent from DOM when not hydrated (pre-mount guard)", () => {
			mockStore._hasHydrated = false;
			const { container } = render(<CookieBanner />);

			expect(container.innerHTML).toBe("");
		});

		it("banner motion wrapper is absent when shouldShow is false (already consented)", () => {
			mockHasConsented.value = true;
			const { container } = render(<CookieBanner />);

			// _hasHydrated=true but hasConsented=true → shouldShow=false → AnimatePresence renders null
			expect(container.querySelectorAll("[data-initial]").length).toBe(0);
		});

		it("banner motion wrapper is absent when bannerVisible is false", () => {
			mockStore.bannerVisible = false;
			const { container } = render(<CookieBanner />);

			expect(container.querySelectorAll("[data-initial]").length).toBe(0);
		});

		it("banner motion wrapper is present when all conditions are met", () => {
			const { container } = render(<CookieBanner />);

			expect(container.querySelectorAll("[data-initial]").length).toBe(1);
		});
	});
});
