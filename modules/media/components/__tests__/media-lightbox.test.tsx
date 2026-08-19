import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("motion/react", () => ({
	useReducedMotion: () => false,
}));

vi.mock("yet-another-react-lightbox", () => ({
	default: ({
		open,
		slides,
		close,
		render: renderSlots,
	}: {
		open: boolean;
		close: () => void;
		slides: unknown[];
		index: number;
		plugins: unknown[];
		render?: { controls?: () => React.ReactNode };
		[key: string]: unknown;
	}) =>
		open ? (
			<div data-testid="lightbox" data-slides={slides.length}>
				{/* YARL rend `render.controls` DANS son portail — reproduit ici */}
				{renderSlots?.controls?.()}
				<button data-testid="lightbox-close" onClick={close}>
					close
				</button>
			</div>
		) : null,
}));

vi.mock("yet-another-react-lightbox/plugins/zoom", () => ({ default: {} }));
vi.mock("yet-another-react-lightbox/plugins/counter", () => ({ default: {} }));
vi.mock("yet-another-react-lightbox/plugins/video", () => ({ default: {} }));
vi.mock("yet-another-react-lightbox/styles.css", () => ({}));
vi.mock("yet-another-react-lightbox/plugins/counter.css", () => ({}));

vi.mock("@/modules/media/constants/ui-interactions.constants", () => ({
	LIGHTBOX_CONFIG: {
		MAX_ZOOM_PIXEL_RATIO: 3,
		ZOOM_IN_MULTIPLIER: 2,
		DOUBLE_CLICK_MAX_STOPS: 2,
		KEYBOARD_MOVE_DISTANCE: 50,
		WHEEL_ZOOM_DISTANCE_FACTOR: 100,
		PINCH_ZOOM_DISTANCE_FACTOR: 100,
		COUNTER_BOTTOM_OFFSET: "16px",
		BACKDROP_OPACITY: 0.9,
		BACKDROP_BLUR: 8,
		CAROUSEL_PRELOAD: 2,
	},
	UI_DELAYS: {
		DOUBLE_TAP_DELAY_MS: 300,
		DOUBLE_CLICK_DELAY_MS: 300,
		ANIMATION_FADE_MS: 250,
		ANIMATION_SWIPE_MS: 500,
	},
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import MediaLightbox from "../media-lightbox";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("MediaLightbox", () => {
	const defaultProps = {
		open: true,
		close: vi.fn(),
		slides: [
			{ type: "image" as const, src: "https://example.com/photo.jpg" },
			{ type: "image" as const, src: "https://example.com/photo2.jpg" },
		],
		index: 0,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders null when open=false", () => {
		const { container } = render(<MediaLightbox {...defaultProps} open={false} />);
		expect(container.firstChild).toBeNull();
	});

	it("renders the lightbox component", () => {
		render(<MediaLightbox {...defaultProps} />);
		expect(screen.getByTestId("lightbox")).toBeInTheDocument();
	});

	/**
	 * YARL rend en PORTAIL vers document.body : un wrapper `role="dialog"` /
	 * FocusScope autour du composant ne contiendrait PAS la lightbox — le
	 * « piège » n'enfermait que le bouton d'aide (nasse clavier) et doublait
	 * l'`aria-modal` de YARL. Le composant ne doit rendre AUCUN wrapper : la
	 * lightbox est l'élément racine, et le chrome custom vit dans son portail
	 * via `render.controls`.
	 */
	it("renders the lightbox as root — no dialog/FocusScope wrapper around the portal", () => {
		const { container } = render(<MediaLightbox {...defaultProps} />);
		expect(container.firstChild).toBe(screen.getByTestId("lightbox"));
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("renders the aria-live announcement INSIDE the lightbox (render.controls)", () => {
		render(<MediaLightbox {...defaultProps} />);
		const status = screen.getByRole("status");
		expect(status).toHaveTextContent("Image 1 sur 2");
		expect(screen.getByTestId("lightbox")).toContainElement(status);
	});

	it("renders the keyboard help button INSIDE the lightbox (render.controls)", () => {
		render(<MediaLightbox {...defaultProps} />);
		// getByLabelText et non getByRole : le calcul de style de jsdom crashe
		// sur le `calc(env(safe-area-inset-top…))` inline du bouton.
		const helpButton = screen.getByLabelText("Afficher les raccourcis clavier");
		expect(screen.getByTestId("lightbox")).toContainElement(helpButton);
	});

	it("passes correct slide count to lightbox", () => {
		render(<MediaLightbox {...defaultProps} />);
		expect(screen.getByTestId("lightbox")).toHaveAttribute("data-slides", "2");
	});

	it("restores focus to the element captured by the CALLER (returnFocusRef)", async () => {
		const trigger = document.createElement("button");
		trigger.textContent = "Open gallery";
		document.body.appendChild(trigger);
		trigger.focus();
		expect(document.activeElement).toBe(trigger);

		const returnFocusRef = createRef<HTMLElement | null>();
		returnFocusRef.current = trigger;

		const close = vi.fn();
		render(<MediaLightbox {...defaultProps} close={close} returnFocusRef={returnFocusRef} />);

		fireEvent.click(screen.getByTestId("lightbox-close"));
		expect(close).toHaveBeenCalledTimes(1);

		// rAF callback fires on next frame
		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
		expect(document.activeElement).toBe(trigger);

		trigger.remove();
	});

	it("close is a no-op on focus restore when no returnFocusRef is provided", async () => {
		const close = vi.fn();
		render(<MediaLightbox {...defaultProps} close={close} />);

		fireEvent.click(screen.getByTestId("lightbox-close"));
		expect(close).toHaveBeenCalledTimes(1);

		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
		// Sans ref fournie, la restauration est déléguée au mécanisme interne
		// de YARL — aucune erreur ne doit être levée.
	});
});
