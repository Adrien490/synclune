import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("motion/react", () => ({
	useReducedMotion: () => false,
}));

vi.mock("@radix-ui/react-focus-scope", () => ({
	Root: ({
		children,
		onMountAutoFocus,
	}: {
		children: React.ReactNode;
		trapped?: boolean;
		onMountAutoFocus?: (e: Event) => void;
	}) => {
		// Simulate mount
		onMountAutoFocus?.(new Event("focusMount"));
		return <div data-testid="focus-scope">{children}</div>;
	},
}));

vi.mock("yet-another-react-lightbox", () => ({
	default: ({
		open,
		slides,
	}: {
		open: boolean;
		close: () => void;
		slides: unknown[];
		index: number;
		plugins: unknown[];
		[key: string]: unknown;
	}) => (open ? <div data-testid="lightbox" data-slides={slides.length} /> : null),
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

	it("renders dialog with aria-modal when open", () => {
		render(<MediaLightbox {...defaultProps} />);
		const dialog = screen.getByRole("dialog");
		expect(dialog).toBeInTheDocument();
		expect(dialog).toHaveAttribute("aria-modal", "true");
	});

	it("has accessible label 'Galerie en plein écran'", () => {
		render(<MediaLightbox {...defaultProps} />);
		expect(screen.getByRole("dialog")).toHaveAttribute("aria-label", "Galerie en plein écran");
	});

	it("renders the FocusScope wrapper", () => {
		render(<MediaLightbox {...defaultProps} />);
		expect(screen.getByTestId("focus-scope")).toBeInTheDocument();
	});

	it("renders the lightbox component", () => {
		render(<MediaLightbox {...defaultProps} />);
		expect(screen.getByTestId("lightbox")).toBeInTheDocument();
	});

	it("passes correct slide count to lightbox", () => {
		render(<MediaLightbox {...defaultProps} />);
		expect(screen.getByTestId("lightbox")).toHaveAttribute("data-slides", "2");
	});
});
