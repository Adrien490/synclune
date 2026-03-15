import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

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
	MOTION_CONFIG: { duration: { slow: 0.3 }, easing: { easeOut: [0, 0, 0.2, 1] } },
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

// Import AFTER mocks
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
});

afterEach(() => {
	vi.useRealTimers();
	cleanup();
});

// ============================================================================
// TESTS
// ============================================================================

describe("CookieBanner", () => {
	describe("visibility conditions", () => {
		it("renders nothing before hydration", () => {
			mockStore._hasHydrated = false;
			const { container } = render(<CookieBanner />);

			expect(container.innerHTML).toBe("");
		});

		it("renders nothing when user has already consented", () => {
			mockHasConsented.value = true;
			const { container } = render(<CookieBanner />);

			expect(container.innerHTML).toBe("");
		});

		it("renders nothing when bannerVisible is false", () => {
			mockStore.bannerVisible = false;
			const { container } = render(<CookieBanner />);

			expect(container.innerHTML).toBe("");
		});

		it("renders when all 3 conditions are met (hydrated, no consent, banner visible)", () => {
			render(<CookieBanner />);

			expect(screen.getByText("Cookies")).toBeInTheDocument();
		});
	});

	describe("content", () => {
		it("renders title 'Cookies'", () => {
			render(<CookieBanner />);

			expect(screen.getByText("Cookies")).toBeInTheDocument();
		});

		it("renders link to /cookies", () => {
			render(<CookieBanner />);

			const link = screen.getByRole("link", { name: "En savoir plus sur les cookies" });
			expect(link).toHaveAttribute("href", "/cookies");
		});

		it("renders link to /confidentialite", () => {
			render(<CookieBanner />);

			const link = screen.getByRole("link", { name: "Politique de confidentialité" });
			expect(link).toHaveAttribute("href", "/confidentialite");
		});

		it("renders Accepter button", () => {
			render(<CookieBanner />);

			expect(screen.getByRole("button", { name: "Accepter" })).toBeInTheDocument();
		});

		it("renders Refuser button", () => {
			render(<CookieBanner />);

			expect(screen.getByRole("button", { name: "Refuser" })).toBeInTheDocument();
		});
	});

	describe("actions", () => {
		it("calls acceptCookies on Accepter click", () => {
			render(<CookieBanner />);

			fireEvent.click(screen.getByRole("button", { name: "Accepter" }));
			expect(mockStore.acceptCookies).toHaveBeenCalledOnce();
		});

		it("calls rejectCookies on Refuser click", () => {
			render(<CookieBanner />);

			fireEvent.click(screen.getByRole("button", { name: "Refuser" }));
			expect(mockStore.rejectCookies).toHaveBeenCalledOnce();
		});
	});

	describe("keyboard", () => {
		it("calls rejectCookies on Escape key", () => {
			render(<CookieBanner />);

			act(() => {
				fireEvent.keyDown(document, { key: "Escape" });
			});
			expect(mockStore.rejectCookies).toHaveBeenCalledOnce();
		});
	});

	describe("accessibility", () => {
		it("has role='alertdialog'", () => {
			render(<CookieBanner />);

			expect(screen.getByRole("alertdialog")).toBeInTheDocument();
		});

		it("has aria-modal='true'", () => {
			render(<CookieBanner />);

			expect(screen.getByRole("alertdialog")).toHaveAttribute("aria-modal", "true");
		});

		it("has aria-label='Consentement cookies'", () => {
			render(<CookieBanner />);

			expect(screen.getByRole("alertdialog")).toHaveAttribute("aria-label", "Consentement cookies");
		});

		it("has aria-describedby pointing to cookie-description", () => {
			render(<CookieBanner />);

			expect(screen.getByRole("alertdialog")).toHaveAttribute(
				"aria-describedby",
				"cookie-description",
			);
			expect(document.getElementById("cookie-description")).toBeInTheDocument();
		});
	});
});
