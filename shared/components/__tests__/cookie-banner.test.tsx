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

const { mockHasOverlay } = vi.hoisted(() => ({
	mockHasOverlay: { value: false },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/providers/cookie-consent-store-provider", () => ({
	useCookieConsentStore: (selector: (state: typeof mockStore) => unknown) => selector(mockStore),
	useHasConsented: () => mockHasConsented.value,
}));

vi.mock("@/shared/stores/use-overlay-stack-store", () => ({
	useHasOverlay: () => mockHasOverlay.value,
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
	maybeReduceMotion: (transition: unknown) => transition ?? {},
}));

// `data-variant` exposé pour verrouiller le poids visuel égal des deux boutons
// (CNIL) — la décision de l'audit 2026-05-19 avait été écrasée par un commit
// sans rapport précisément parce qu'aucun test n'assertait les variants.
vi.mock("@/shared/components/ui/button", () => {
	const { forwardRef, createElement } = require("react");
	const Button = forwardRef(
		(
			{ children, variant, size: _s, ...props }: Record<string, unknown> & { children?: unknown },
			ref: unknown,
		) => createElement("button", { ref, "data-variant": variant, ...props }, children),
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
	mockHasOverlay.value = false;
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

	/**
	 * @regression cookie-banner-overlay-2026-08-05
	 *
	 * Bug : l'encart (`--z-alert: 80`) se peignait PAR-DESSUS les overlays modaux
	 * (`--z-overlay: 75`). À la première visite — sans consentement posé — il
	 * couvrait 285 px du menu mobile ouvert : tout le bas du volet était
	 * inatteignable sans traiter le bandeau d'abord (P1, audit menu-sheet
	 * 2026-08-05). Correctif : suspension tant qu'un overlay est enregistré dans
	 * l'overlay-stack, sans toucher au z-index.
	 */
	describe("suspension pendant un overlay modal (@regression cookie-banner-overlay)", () => {
		it("ne rend rien tant qu'un overlay est enregistré, même les 3 conditions réunies", () => {
			mockHasOverlay.value = true;
			const { container } = render(<CookieBanner />);

			expect(container.innerHTML).toBe("");
		});

		it("réapparaît à la fermeture de l'overlay — la suspension n'écrit RIEN dans le store", () => {
			mockHasOverlay.value = true;
			const { container, rerender } = render(<CookieBanner />);
			expect(container.innerHTML).toBe("");

			mockHasOverlay.value = false;
			rerender(<CookieBanner />);

			// Le bandeau revient : le choix reste posé, seul l'affichage était suspendu.
			expect(screen.getByText("Cookies")).toBeInTheDocument();
			// Aucune écriture de consentement ni de bannerVisible pendant la suspension.
			expect(mockStore.acceptCookies).not.toHaveBeenCalled();
			expect(mockStore.rejectCookies).not.toHaveBeenCalled();
			expect(mockStore.bannerVisible).toBe(true);
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

		it("gives Accepter and Refuser the same outline variant (CNIL: equal visual weight)", () => {
			render(<CookieBanner />);

			expect(screen.getByRole("button", { name: "Accepter" })).toHaveAttribute(
				"data-variant",
				"outline",
			);
			expect(screen.getByRole("button", { name: "Refuser" })).toHaveAttribute(
				"data-variant",
				"outline",
			);
		});

		it("shows the 6-month retention mention visibly (not sr-only)", () => {
			render(<CookieBanner />);

			const mention = screen.getByText("Ton choix sera mémorisé pendant 6 mois.");
			expect(mention).toBeInTheDocument();
			expect(mention).not.toHaveClass("sr-only");
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
		it("does not dismiss the banner on Escape key (CNIL: explicit choice required)", () => {
			render(<CookieBanner />);

			act(() => {
				fireEvent.keyDown(document, { key: "Escape" });
			});
			expect(mockStore.rejectCookies).not.toHaveBeenCalled();
			expect(mockStore.acceptCookies).not.toHaveBeenCalled();
			expect(screen.getByText("Cookies")).toBeInTheDocument();
		});
	});

	describe("accessibility", () => {
		it("has role='region' (non-blocking banner)", () => {
			render(<CookieBanner />);

			expect(screen.getByRole("region", { name: "Cookies" })).toBeInTheDocument();
		});

		it("does not declare aria-modal (banner is non-blocking)", () => {
			render(<CookieBanner />);

			expect(screen.getByRole("region", { name: "Cookies" })).not.toHaveAttribute("aria-modal");
		});

		it("does not declare aria-live (region mounted WITH its content is never vocalized)", () => {
			render(<CookieBanner />);

			expect(screen.getByRole("region", { name: "Cookies" })).not.toHaveAttribute("aria-live");
		});

		it("has aria-labelledby pointing to the h2 title", () => {
			render(<CookieBanner />);

			const region = screen.getByRole("region", { name: "Cookies" });
			expect(region).toHaveAttribute("aria-labelledby", "cookie-title");
			expect(document.getElementById("cookie-title")?.tagName).toBe("H2");
		});

		it("has aria-describedby pointing to cookie-description", () => {
			render(<CookieBanner />);

			const region = screen.getByRole("region", { name: "Cookies" });
			expect(region).toHaveAttribute("aria-describedby", "cookie-description");
			expect(document.getElementById("cookie-description")).toBeInTheDocument();
		});

		it("renders the title as a heading (h2)", () => {
			render(<CookieBanner />);

			expect(screen.getByRole("heading", { level: 2, name: "Cookies" })).toBeInTheDocument();
		});
	});
});
