import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPinchZoom } = vi.hoisted(() => ({
	mockPinchZoom: {
		scale: 1,
		position: { x: 0, y: 0 },
		isZoomed: false,
		isInteracting: false,
		handleKeyDown: vi.fn(),
	},
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("motion/react", () => ({
	useReducedMotion: () => false,
}));

vi.mock("@/shared/hooks", () => ({
	usePinchZoom: () => mockPinchZoom,
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
		mockPinchZoom.scale = 1;
		mockPinchZoom.isZoomed = false;
		mockPinchZoom.isInteracting = false;
	});

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
		mockPinchZoom.isZoomed = false;
		render(<GalleryPinchZoom {...defaultProps} />);
		expect(screen.getByRole("application")).toHaveAttribute(
			"aria-label",
			expect.stringContaining("zoomer"),
		);
	});

	it("includes zoom percentage in aria-label when zoomed", () => {
		mockPinchZoom.isZoomed = true;
		mockPinchZoom.scale = 2;
		render(<GalleryPinchZoom {...defaultProps} />);
		expect(screen.getByRole("application")).toHaveAttribute(
			"aria-label",
			expect.stringContaining("200%"),
		);
	});

	it("shows zoom percentage indicator when zoomed", () => {
		mockPinchZoom.isZoomed = true;
		mockPinchZoom.scale = 2;
		render(<GalleryPinchZoom {...defaultProps} />);
		expect(screen.getByText("200%")).toBeInTheDocument();
	});

	it("hides zoom percentage indicator when not zoomed", () => {
		mockPinchZoom.isZoomed = false;
		render(<GalleryPinchZoom {...defaultProps} />);
		expect(screen.queryByText(/\d+%/)).not.toBeInTheDocument();
	});

	it("shows sr-only status announcement when zoomed", () => {
		mockPinchZoom.isZoomed = true;
		mockPinchZoom.scale = 1.5;
		render(<GalleryPinchZoom {...defaultProps} />);
		// sr-only status region
		const status = screen.getByRole("status");
		expect(status).toBeInTheDocument();
		expect(status).toHaveTextContent(/150/);
	});

	it("renders the image with correct src", () => {
		const { container } = render(<GalleryPinchZoom {...defaultProps} />);
		const img = container.querySelector("img");
		expect(img).toHaveAttribute("src", "https://example.com/photo.jpg");
	});
});
