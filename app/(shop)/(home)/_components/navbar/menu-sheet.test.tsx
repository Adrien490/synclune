import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { renderPropMock, type RenderPropMockProps } from "@/test/mocks/render-prop";

// Stub window.matchMedia (needed by useEdgeSwipe)
beforeAll(() => {
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		value: vi.fn().mockImplementation((query: string) => ({
			matches: query === "(min-width: 1024px)",
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
	});
});

// Mock next/font/google (imported transitively via fonts.ts)
vi.mock("next/font/google", () => {
	const fontMock = () => ({
		className: "mock-font",
		variable: "--mock-font",
		style: { fontFamily: "mock" },
	});
	return {
		Onest: fontMock,
		Winky_Sans: fontMock,
		Kalam: fontMock,
	};
});

// Mock next/link
vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		...props
	}: {
		href: string;
		children: React.ReactNode;
		[key: string]: unknown;
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

// Mock motion/react — pass-through rendering
vi.mock("motion/react", () => {
	const handler = {
		get(_target: Record<string, unknown>, prop: string) {
			// Return a component that renders the HTML element with non-motion props
			return function MotionProxy({
				children,
				animate: _animate,
				initial: _initial,
				exit: _exit,
				custom: _custom,
				variants: _variants,
				transition: _transition,
				...rest
			}: Record<string, unknown>) {
				const El = prop as unknown as React.ElementType;
				return <El {...rest}>{children as React.ReactNode}</El>;
			};
		},
	};
	return {
		motion: new Proxy({} as Record<string, unknown>, handler),
		m: new Proxy({} as Record<string, unknown>, handler),
		useReducedMotion: () => false,
		AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	};
});

// Capture latest onOpenChange handler so tests can fire close events directly.
let lastOnOpenChange: ((open: boolean) => void) | undefined;
// Capture the onCloseAutoFocus handler (focus restoration on close).
let lastFinalFocus: React.RefObject<HTMLElement | null> | undefined;

// Mock Sheet components — forward key props (scrollLockTimeout, onOpenChange,
// onOverlayClick, id on SheetContent) so tests can assert on them.
vi.mock("@/shared/components/ui/sheet", () => ({
	Sheet: ({
		children,
		onOpenChange,
		scrollLockTimeout,
	}: {
		children: React.ReactNode;
		onOpenChange?: (open: boolean) => void;
		scrollLockTimeout?: number;
	}) => {
		lastOnOpenChange = onOpenChange;
		return (
			<div data-testid="sheet" data-scroll-lock-timeout={scrollLockTimeout}>
				<button type="button" data-testid="sheet-toggle" onClick={() => onOpenChange?.(true)}>
					toggle
				</button>
				{children}
			</div>
		);
	},
	SheetTrigger: (props: RenderPropMockProps) => renderPropMock("div", props),
	SheetContent: ({
		children,
		onOverlayClick,
		finalFocus,
		id,
	}: {
		children: React.ReactNode;
		onOverlayClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
		finalFocus?: React.RefObject<HTMLElement | null>;
		id?: string;
	}) => {
		lastFinalFocus = finalFocus;
		return (
			<div data-testid="sheet-content" id={id} data-slot="sheet-content">
				<button type="button" data-testid="sheet-overlay" onClick={onOverlayClick as never}>
					overlay
				</button>
				{children}
			</div>
		);
	},
	SheetHeader: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
		<div {...props}>{children}</div>
	),
	SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock LogoutAlertDialog — expose `open` as data attribute for assertions
vi.mock("@/modules/auth/components/logout-alert-dialog", () => ({
	LogoutAlertDialog: ({ open }: { open: boolean }) => (
		<div data-testid="logout-alert-dialog" data-open={open} />
	),
}));

// Mock sub-components
vi.mock("./menu-sheet-nav", () => ({
	MenuSheetNav: ({
		onLogoutClick,
		onCartClick,
	}: {
		onLogoutClick?: () => void;
		onCartClick?: () => void;
	}) => (
		<div data-testid="menu-sheet-nav">
			<button type="button" data-testid="logout-button" onClick={onLogoutClick}>
				logout
			</button>
			<button type="button" data-testid="cart-shortcut-button" onClick={onCartClick}>
				panier
			</button>
		</div>
	),
}));

vi.mock("./menu-sheet-footer", () => ({
	MenuSheetFooter: () => <div data-testid="menu-sheet-footer" />,
}));

// Mock EdgeSwipeIndicator — le vrai composant ne prend PAS de prop `progress` :
// le parent écrit `style.opacity` sur le nœud depuis `onProgress` (un `useState`
// re-rendait tout le sheet à chaque frame de `touchmove`). Le mock doit donc
// exposer le même ref pour que l'écriture ait une cible.
vi.mock("./edge-swipe-indicator", () => ({
	EdgeSwipeIndicator: ({ ref, hidden }: { ref?: React.Ref<HTMLDivElement>; hidden?: boolean }) => (
		<div ref={ref} data-testid="edge-swipe-indicator" data-hidden={hidden} style={{ opacity: 0 }} />
	),
}));

// Mock useEdgeSwipe — capture onProgress so tests can simulate drag, et le
// breakpoint pour vérifier qu'il reste aligné sur le seuil du trigger burger.
let lastOnProgress: ((p: number) => void) | undefined;
let lastDisabledFrom: string | undefined;
vi.mock("@/shared/hooks/use-edge-swipe", () => ({
	useEdgeSwipe: (
		_onOpen: () => void,
		_isOpen: boolean,
		options?: { disabledFrom?: string; onProgress?: (p: number) => void },
	) => {
		lastOnProgress = options?.onProgress;
		lastDisabledFrom = options?.disabledFrom;
	},
}));

// Mock useDialog
const mockOpen = vi.fn();
const mockClose = vi.fn();
let mockIsOpen = false;
vi.mock("@/shared/providers/overlay-store-provider", () => ({
	useDialog: () => ({
		isOpen: mockIsOpen,
		open: mockOpen,
		close: mockClose,
	}),
	useSheetStore: (selector: (s: { open: (id: string) => void }) => unknown) =>
		selector({ open: mockOpenSheet }),
}));

// Mock sheet-store — le raccourci « Panier » ouvre le cart sheet après la
// transition de sortie du menu (même mécanique différée que la déconnexion).
const mockOpenSheet = vi.fn();

// Mock useHaptic — capture all triggerHaptic calls for assertions
const mockHaptic = vi.fn();
vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
	triggerHaptic: (...args: unknown[]) => mockHaptic(...args),
}));

import { MenuSheet } from "./menu-sheet";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockIsOpen = false;
	lastOnProgress = undefined;
	lastOnOpenChange = undefined;
});

const baseProps = {
	navItems: [{ href: "/", label: "Accueil", icon: "home" as const }],
	productTypes: [{ slug: "bagues", label: "Bagues" }],
	collections: [] as Array<{
		slug: string;
		label: string;
		images: Array<{ url: string; blurDataUrl: string | null; alt: string | null }>;
	}>,
	isAdmin: false,
	session: null,
};

describe("MenuSheet", () => {
	describe("trigger button", () => {
		it("renders a trigger button with a stable aria-label and correct aria attributes", () => {
			render(<MenuSheet {...baseProps} />);

			const trigger = screen.getByRole("button", { name: "Menu de navigation" });
			expect(trigger).toBeInTheDocument();
			expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
			expect(trigger.getAttribute("aria-expanded")).toBe("false");
		});

		it("is hidden on desktop (lg:hidden class)", () => {
			render(<MenuSheet {...baseProps} />);

			const trigger = screen.getByRole("button", { name: "Menu de navigation" });
			expect(trigger.className).toContain("lg:hidden");
		});

		it("has touch-manipulation + active:scale parity with footer/bottom-bar tap feedback", () => {
			render(<MenuSheet {...baseProps} />);

			const trigger = screen.getByRole("button", { name: "Menu de navigation" });
			expect(trigger.className).toContain("touch-manipulation");
			expect(trigger.className).toContain("active:scale-[0.95]");
		});

		it("restitue le focus sur le burger à la fermeture (WCAG 2.4.3)", () => {
			// Régression : `onOpenChange(true)` blur `document.activeElement` avant que
			// le SheetContent ne monte, donc la restauration automatique ne mémorisait
			// que `<body>` et le focus retombait là à la fermeture.
			//
			// Le mécanisme a changé de forme à la migration : Base UI expose
			// `finalFocus` (l'ÉLÉMENT à focuser), là où Radix demandait d'intercepter
			// `onCloseAutoFocus` et d'appeler `preventDefault`. On vérifie donc que la
			// ref pointe bien sur le burger — la garantie, elle, est identique.
			render(<MenuSheet {...baseProps} />);

			const trigger = screen.getByRole("button", { name: "Menu de navigation" });
			expect(lastFinalFocus?.current).toBe(trigger);
		});

		it("wires aria-controls to the sheet content id quand le sheet est OUVERT (WCAG 4.1.2)", () => {
			mockIsOpen = true;
			render(<MenuSheet {...baseProps} />);

			const trigger = screen.getByRole("button", { name: "Fermer le menu de navigation" });
			const sheetContent = screen.getByTestId("sheet-content");
			const ariaControls = trigger.getAttribute("aria-controls");
			expect(ariaControls).toBeTruthy();
			expect(sheetContent.getAttribute("id")).toBe(ariaControls);
		});
	});

	describe("sheet structure", () => {
		it("renders sr-only sheet header with title and description", () => {
			render(<MenuSheet {...baseProps} />);

			// Tutoiement + première personne — le vouvoiement « Découvrez nos
			// bijoux » n'était servi qu'aux lecteurs d'écran (lot 0, 2026-08-05).
			expect(
				screen.getByText(/Menu de navigation — découvre mes créations et mes collections/),
			).toBeInTheDocument();
		});

		it("renders footer", () => {
			render(<MenuSheet {...baseProps} />);

			expect(screen.getByTestId("menu-sheet-footer")).toBeInTheDocument();
		});

		it("renders the brand title as a link to the home page (closes sheet on tap)", () => {
			render(<MenuSheet {...baseProps} />);

			const brandLink = screen.getByRole("link", { name: /Synclune/ });
			expect(brandLink.getAttribute("href")).toBe("/");
		});

		it("renders nav component", () => {
			render(<MenuSheet {...baseProps} />);

			expect(screen.getByTestId("menu-sheet-nav")).toBeInTheDocument();
		});

		it("n'annonce PAS `aria-controls` sheet fermé — l'id n'existe pas encore", () => {
			// Le `SheetContent` n'est monté par le portail qu'à l'ouverture : posé en
			// permanence, l'attribut désignait un id absent du document (axe le relève
			// en `aria-valid-attr-value`). C'est aussi la règle déjà écrite dans
			// `shop-mobile-bottom-nav.tsx` — « désigner un id absent est plus nuisible
			// que de l'omettre ».
			//
			// ⚠️ Ce test REMPLACE un « tags SheetContent with view-transition-name »
			// qui n'assertait rien de tel : son corps re-testait `aria-controls`, et
			// `menu-sheet.tsx` n'a jamais posé de `view-transition-name` sur le
			// contenu (c'est le `<header>` de `navbar-wrapper` qui en porte un).
			render(<MenuSheet {...baseProps} />);

			const trigger = screen.getByRole("button", { name: "Menu de navigation" });
			expect(trigger.getAttribute("aria-controls")).toBeNull();
			// `aria-haspopup` + `aria-expanded` portent seuls le pattern disclosure.
			expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
			expect(trigger.getAttribute("aria-expanded")).toBe("false");
		});
	});

	describe("hamburger icon", () => {
		it("renders an SVG icon inside the trigger with aria-hidden", () => {
			render(<MenuSheet {...baseProps} />);

			const trigger = screen.getByRole("button", { name: "Menu de navigation" });
			const svg = trigger.querySelector("svg");
			expect(svg).not.toBeNull();
			expect(svg?.getAttribute("aria-hidden")).toBe("true");
		});
	});

	describe("native 2026 mobile polish", () => {
		// `scrollLockTimeout` était un réglage Vaul (délai avant que le panneau
		// redevienne draggable après un scroll). Base UI arbitre scroll vs swipe par
		// la direction du geste, sans délai configurable : le prop a disparu avec la
		// migration, et le test avec lui.

		it("fires haptic 'light' when the sheet is toggled open", () => {
			render(<MenuSheet {...baseProps} />);

			fireEvent.click(screen.getByTestId("sheet-toggle"));
			expect(mockHaptic).toHaveBeenCalledWith("light");
		});

		it("fires haptic 'light' on overlay tap (scrim dismiss)", () => {
			render(<MenuSheet {...baseProps} />);

			// ⚠️ La séquence RÉELLE d'un tap sur le scrim est double : le `onClick` du
			// `Backdrop`, puis le dismiss de Base UI qui appelle `onOpenChange`. Tant
			// que `SheetContent` recevait un `onOverlayClick={() => haptic("light")}`,
			// elle produisait DEUX pulsations pour un geste — contre la règle
			// « haptique : pas d'abus » du dépôt. Le handler du scrim a été retiré ;
			// c'est `onOpenChange` qui vibre, une fois.
			fireEvent.click(screen.getByTestId("sheet-overlay"));
			act(() => lastOnOpenChange?.(false));

			expect(mockHaptic).toHaveBeenCalledWith("light");
			expect(mockHaptic).toHaveBeenCalledTimes(1);
		});

		it("closes the sheet directly without View Transition (avoids slide-out lag)", () => {
			render(<MenuSheet {...baseProps} />);

			// Simulate Vaul calling onOpenChange(false)
			act(() => lastOnOpenChange?.(false));
			expect(mockClose).toHaveBeenCalledTimes(1);
		});
	});

	describe("dialog announcement", () => {
		it("relies on SheetTitle + SheetDescription for screen-reader announcement (no redundant live region)", () => {
			render(<MenuSheet {...baseProps} />);

			// SheetDescription is rendered sr-only and announced as dialog content.
			expect(
				screen.getByText("Menu de navigation — découvre mes créations et mes collections"),
			).toBeInTheDocument();
			// The former <p role="status"> live region announcing nav item count has been removed.
			expect(screen.queryByText(/Menu ouvert,/)).not.toBeInTheDocument();
		});
	});

	describe("edge-swipe indicator", () => {
		it("mounts EdgeSwipeIndicator with hidden=false when sheet is closed", () => {
			render(<MenuSheet {...baseProps} />);

			const indicator = screen.getByTestId("edge-swipe-indicator");
			expect(indicator.getAttribute("data-hidden")).toBe("false");
			expect((indicator as HTMLElement).style.opacity).toBe("0");
		});

		it("forwards onProgress from useEdgeSwipe to the indicator", () => {
			render(<MenuSheet {...baseProps} />);

			// Simulate drag at 50% threshold
			expect(lastOnProgress).toBeTypeOf("function");
			act(() => lastOnProgress?.(0.5));

			// L'opacité est écrite sur le nœud, sans passer par un rendu React.
			const indicator = screen.getByTestId("edge-swipe-indicator");
			expect((indicator as HTMLElement).style.opacity).toBe("0.5");
		});

		// Le geste doit être désactivé exactement là où le trigger burger disparaît
		// (`lg:hidden`) et où `DesktopNav` prend le relais (`hidden lg:flex`). Un
		// seuil divergent laisserait le swipe armé sur une largeur où le mega-menu
		// est déjà affiché.
		it("disables the edge swipe at the same breakpoint as the burger trigger", () => {
			render(<MenuSheet {...baseProps} />);

			expect(lastDisabledFrom).toBe("lg");
		});
	});

	describe("logout deferred flow", () => {
		it("waits for sheet close transition before opening the alert dialog", () => {
			vi.useFakeTimers();
			try {
				render(<MenuSheet {...baseProps} />);

				const dialog = screen.getByTestId("logout-alert-dialog");
				expect(dialog.getAttribute("data-open")).toBe("false");

				// 1. User taps logout — pendingAction flips, closeMenu called
				act(() => screen.getByTestId("logout-button").click());
				expect(mockClose).toHaveBeenCalled();
				expect(dialog.getAttribute("data-open")).toBe("false");

				// 2. Fast-forward past the exit fallback (450ms)
				act(() => {
					vi.advanceTimersByTime(500);
				});

				expect(screen.getByTestId("logout-alert-dialog").getAttribute("data-open")).toBe("true");
			} finally {
				vi.useRealTimers();
			}
		});
	});

	describe("cart shortcut deferred flow", () => {
		it("ferme le menu PUIS ouvre le cart sheet après la transition de sortie", () => {
			// Même mécanique différée que la déconnexion : ouvrir le panier pendant
			// que le menu glisse encore empilerait deux overlays (M2).
			vi.useFakeTimers();
			try {
				render(<MenuSheet {...baseProps} />);

				act(() => screen.getByTestId("cart-shortcut-button").click());
				expect(mockClose).toHaveBeenCalled();
				expect(mockOpenSheet).not.toHaveBeenCalled();

				act(() => {
					vi.advanceTimersByTime(500);
				});

				expect(mockOpenSheet).toHaveBeenCalledWith("cart");
				expect(mockOpenSheet).toHaveBeenCalledTimes(1);
			} finally {
				vi.useRealTimers();
			}
		});

		// Sous prefers-reduced-motion, `pwa.css` neutralise la transition transform
		// du panneau : `transitionend` ne part jamais et seul le fallback de 450 ms
		// déclenchait — le chemin le PLUS lent pour qui demande MOINS de mouvement
		// (audit menu-sheet 2026-08-05). Le différé court-circuite en micro-délai.
		it("ouvre le cart sheet en micro-délai (pas 450 ms) sous prefers-reduced-motion", () => {
			vi.useFakeTimers();
			const originalMatchMedia = window.matchMedia;
			window.matchMedia = vi.fn().mockImplementation((query: string) => ({
				matches: query === "(prefers-reduced-motion: reduce)",
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			}));
			try {
				render(<MenuSheet {...baseProps} />);

				act(() => screen.getByTestId("cart-shortcut-button").click());
				expect(mockOpenSheet).not.toHaveBeenCalled();

				// Micro-délai (setTimeout 0) : le volet démonté doit se peindre avant
				// l'overlay suivant — mais aucun timer de 450 ms ne doit être nécessaire.
				act(() => {
					vi.advanceTimersByTime(0);
				});

				expect(mockOpenSheet).toHaveBeenCalledWith("cart");
			} finally {
				window.matchMedia = originalMatchMedia;
				vi.useRealTimers();
			}
		});
	});
});
