import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockIsDesktop, mockHaptic } = vi.hoisted(() => ({
	mockIsDesktop: { value: true },
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

vi.mock("@/shared/hooks", () => ({
	useMediaQuery: () => mockIsDesktop.value,
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
}));

vi.mock("@/modules/media/utils/media-utils", () => ({
	getVideoMimeType: () => "video/mp4",
}));

vi.mock("@/modules/media/constants/image-config.constants", () => ({
	MAIN_IMAGE_QUALITY: 90,
}));

vi.mock("@/modules/media/constants/gallery.constants", () => ({
	GALLERY_ZOOM_LEVEL: 2,
	VIDEO_LOAD_TIMEOUT: 10000,
}));

vi.mock("@/modules/products/constants/product-texts.constants", () => ({
	PRODUCT_TEXTS: {
		IMAGES: {
			GALLERY_MAIN_ALT: (title: string, index: number) => `${title} - Photo ${index}`,
		},
	},
}));

vi.mock("@/shared/components/gallery/hover-zoom", () => ({
	GalleryHoverZoom: ({ src, alt }: { src: string; alt: string; [key: string]: unknown }) => (
		<div data-testid="hover-zoom" data-src={src} data-alt={alt} />
	),
}));

vi.mock("@/modules/media/components/gallery/pinch-zoom", () => ({
	GalleryPinchZoom: ({ src, alt }: { src: string; alt: string; [key: string]: unknown }) => (
		<div data-testid="pinch-zoom" data-src={src} data-alt={alt} />
	),
}));

vi.mock("lucide-react", () => ({
	CircleAlert: ({ className }: { className?: string }) => (
		<svg data-testid="icon-circle-alert" className={className} />
	),
	RefreshCw: ({ className }: { className?: string }) => (
		<svg data-testid="icon-refresh" className={className} />
	),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { GallerySlide } from "../slide";

// Mock HTMLMediaElement play/pause (jsdom doesn't implement them)
beforeAll(() => {
	Object.defineProperty(HTMLMediaElement.prototype, "play", {
		writable: true,
		value: vi.fn().mockResolvedValue(undefined),
	});
	Object.defineProperty(HTMLMediaElement.prototype, "pause", {
		writable: true,
		value: vi.fn(),
	});
	Object.defineProperty(HTMLMediaElement.prototype, "load", {
		writable: true,
		value: vi.fn(),
	});
});
import type { ProductMedia } from "@/modules/media/types/product-media.types";

// ============================================================================
// HELPERS
// ============================================================================

function createImageMedia(overrides: Partial<ProductMedia> = {}): ProductMedia {
	return {
		id: "m-1",
		url: "https://example.com/photo.jpg",
		thumbnailUrl: null,
		mediaType: "IMAGE",
		alt: null,
		blurDataUrl: null,
		...overrides,
	} as unknown as ProductMedia;
}

function createVideoMedia(overrides: Partial<ProductMedia> = {}): ProductMedia {
	return {
		id: "m-2",
		url: "https://example.com/video.mp4",
		thumbnailUrl: "https://example.com/thumb.jpg",
		mediaType: "VIDEO",
		alt: null,
		blurDataUrl: null,
		...overrides,
	} as unknown as ProductMedia;
}

const defaultImageProps = {
	media: createImageMedia(),
	index: 0,
	title: "Bague étoile",
	totalImages: 3,
	isActive: true,
	onOpen: vi.fn(),
};

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("GallerySlide", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsDesktop.value = true;
	});

	// ─── Image - desktop ──────────────────────────────────────────────────────

	it("renders a button for image slide on desktop", () => {
		render(<GallerySlide {...defaultImageProps} />);
		expect(screen.getByRole("button")).toBeInTheDocument();
	});

	it("renders GalleryHoverZoom on desktop", () => {
		render(<GallerySlide {...defaultImageProps} />);
		expect(screen.getByTestId("hover-zoom")).toBeInTheDocument();
	});

	it("does not render GalleryPinchZoom on desktop", () => {
		render(<GallerySlide {...defaultImageProps} />);
		expect(screen.queryByTestId("pinch-zoom")).not.toBeInTheDocument();
	});

	it("applies id prop to slide container on desktop", () => {
		render(<GallerySlide {...defaultImageProps} id="gallery-panel-0" />);
		expect(screen.getByRole("button")).toHaveAttribute("id", "gallery-panel-0");
	});

	it("calls onOpen when image slide clicked on desktop", async () => {
		const onOpen = vi.fn();
		render(<GallerySlide {...defaultImageProps} onOpen={onOpen} />);
		screen.getByRole("button").click();
		expect(onOpen).toHaveBeenCalledOnce();
	});

	// ─── Image - mobile ───────────────────────────────────────────────────────

	it("renders GalleryPinchZoom on mobile", () => {
		mockIsDesktop.value = false;
		render(<GallerySlide {...defaultImageProps} />);
		expect(screen.getByTestId("pinch-zoom")).toBeInTheDocument();
	});

	it("renders tabpanel for mobile image slide", () => {
		mockIsDesktop.value = false;
		render(<GallerySlide {...defaultImageProps} />);
		expect(screen.getByRole("tabpanel")).toBeInTheDocument();
	});

	// ─── Video ────────────────────────────────────────────────────────────────

	it("renders tabpanel for video slide", () => {
		render(<GallerySlide {...defaultImageProps} media={createVideoMedia()} />);
		expect(screen.getByRole("tabpanel")).toBeInTheDocument();
	});

	it("renders a video element for video media", () => {
		const { container } = render(
			<GallerySlide {...defaultImageProps} media={createVideoMedia()} />,
		);
		expect(container.querySelector("video")).toBeInTheDocument();
	});

	it("renders aria-label on video open button", () => {
		render(<GallerySlide {...defaultImageProps} media={createVideoMedia()} />);
		expect(screen.getByRole("button", { name: /plein écran/i })).toBeInTheDocument();
	});

	it("shows loading spinner initially for video", () => {
		render(<GallerySlide {...defaultImageProps} media={createVideoMedia()} />);
		expect(screen.getByRole("status", { name: /Chargement de la vidéo/i })).toBeInTheDocument();
	});

	// ─── Video error fallback (P1.2) ─────────────────────────────────────────

	it("retry button has min-h-11 touch target after video error", () => {
		const { container } = render(
			<GallerySlide {...defaultImageProps} media={createVideoMedia()} />,
		);
		const video = container.querySelector("video")!;
		fireEvent.error(video);
		const retryBtn = screen.getByRole("button", { name: /Réessayer/i });
		expect(retryBtn.className).toMatch(/min-h-11/);
		expect(retryBtn.className).toMatch(/touch-manipulation/);
	});

	it("fires haptic medium when retry button clicked", () => {
		const { container } = render(
			<GallerySlide {...defaultImageProps} media={createVideoMedia()} />,
		);
		const video = container.querySelector("video")!;
		fireEvent.error(video);
		mockHaptic.mockClear();
		screen.getByRole("button", { name: /Réessayer/i }).click();
		expect(mockHaptic).toHaveBeenCalledWith("medium");
	});
});
