import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockHaptic } = vi.hoisted(() => ({
	mockHaptic: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("motion/react", () => ({
	useReducedMotion: () => false,
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
}));

vi.mock("next/image", () => ({
	default: ({ src, alt }: { src: string; alt: string }) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} />
	),
}));

vi.mock("@/modules/media/constants/image-config.constants", () => ({
	MAIN_IMAGE_QUALITY: 90,
	GALLERY_MAIN_SIZES: "(min-width: 768px) 700px, 100vw",
}));

vi.mock("@/modules/media/constants/gallery.constants", () => ({
	PINCH_ZOOM_CONFIG: { minScale: 1, maxScale: 3 },
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/utils/touch-geometry", () => ({
	getDistance: () => 100,
	getCenter: () => ({ x: 0, y: 0 }),
	clampPosition: (p: { x: number; y: number }) => p,
	getZoomToPointPosition: () => ({ x: 0, y: 0 }),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { GalleryPinchZoom } from "../pinch-zoom";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("GalleryPinchZoom", () => {
	const defaultProps = {
		src: "https://example.com/photo.jpg",
		alt: "Photo de bague",
		isActive: true,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── Initial render ──────────────────────────────────────────────────────

	it("renders a container with role=application", () => {
		render(<GalleryPinchZoom {...defaultProps} />);
		expect(screen.getByRole("application")).toBeInTheDocument();
	});

	it("renders aria-label with alt text", () => {
		render(<GalleryPinchZoom {...defaultProps} />);
		const container = screen.getByRole("application");
		expect(container).toHaveAttribute("aria-label", expect.stringContaining("Photo de bague"));
	});

	it("includes zoom instructions in aria-label when not zoomed", () => {
		render(<GalleryPinchZoom {...defaultProps} />);
		expect(screen.getByRole("application")).toHaveAttribute(
			"aria-label",
			expect.stringContaining("zoomer"),
		);
	});

	it("hides zoom percentage indicator when not zoomed", () => {
		render(<GalleryPinchZoom {...defaultProps} />);
		expect(screen.queryByText(/\d+%/)).not.toBeInTheDocument();
	});

	it("renders the image with correct src", () => {
		const { container } = render(<GalleryPinchZoom {...defaultProps} />);
		const img = container.querySelector("img");
		expect(img).toHaveAttribute("src", "https://example.com/photo.jpg");
	});

	// ─── Keyboard zoom interactions ──────────────────────────────────────────

	it("zooms in when pressing + key and shows percentage indicator", () => {
		render(<GalleryPinchZoom {...defaultProps} />);
		const container = screen.getByRole("application");
		fireEvent.keyDown(container, { key: "+" });
		// scale 1 + 0.5 step = 1.5 → 150%
		expect(screen.getByText("150%")).toBeInTheDocument();
	});

	it("includes zoom percentage in aria-label when zoomed", () => {
		render(<GalleryPinchZoom {...defaultProps} />);
		const container = screen.getByRole("application");
		fireEvent.keyDown(container, { key: "+" });
		fireEvent.keyDown(container, { key: "+" });
		// scale 2 → 200%
		expect(container).toHaveAttribute("aria-label", expect.stringContaining("200%"));
	});

	it("shows sr-only status announcement when zoomed", () => {
		render(<GalleryPinchZoom {...defaultProps} />);
		const container = screen.getByRole("application");
		fireEvent.keyDown(container, { key: "+" });
		const status = screen.getByRole("status");
		expect(status).toBeInTheDocument();
		expect(status).toHaveTextContent(/150/);
	});

	it("resets zoom on Escape key", () => {
		render(<GalleryPinchZoom {...defaultProps} />);
		const container = screen.getByRole("application");
		fireEvent.keyDown(container, { key: "+" });
		expect(screen.getByText("150%")).toBeInTheDocument();
		fireEvent.keyDown(container, { key: "Escape" });
		expect(screen.queryByText(/\d+%/)).not.toBeInTheDocument();
	});

	// ─── Zoom entry announcement (P1.4) ──────────────────────────────────────

	it("announces assertive zoom entry hint on transition to zoomed", async () => {
		render(<GalleryPinchZoom {...defaultProps} />);
		const container = screen.getByRole("application");
		await act(async () => {
			fireEvent.keyDown(container, { key: "+" });
		});
		await waitFor(() => {
			const alert = screen.getByRole("alert");
			expect(alert).toHaveTextContent(/Zoom activé/);
			expect(alert).toHaveTextContent(/Échap/);
		});
	});

	it("fires haptic selection on zoom transition", async () => {
		render(<GalleryPinchZoom {...defaultProps} />);
		const container = screen.getByRole("application");
		mockHaptic.mockClear();
		await act(async () => {
			fireEvent.keyDown(container, { key: "+" });
		});
		expect(mockHaptic).toHaveBeenCalledWith("selection");
	});
});
