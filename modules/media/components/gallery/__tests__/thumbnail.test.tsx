import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("motion/react", () => ({
	useReducedMotion: () => false,
}));

vi.mock("next/image", () => ({
	default: ({
		src,
		alt,
		onError,
	}: {
		src: string;
		alt: string;
		fill?: boolean;
		onError?: () => void;
		[key: string]: unknown;
	}) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} onError={onError} data-testid="thumbnail-image" />
	),
}));

vi.mock("@/modules/media/components/media-error-fallback", () => ({
	MediaErrorFallback: ({ type, size }: { type: string; size?: string }) => (
		<div data-testid="media-error-fallback" data-type={type} data-size={size} />
	),
}));

vi.mock("@/shared/components/ui/video-play-badge", () => ({
	VideoPlayBadge: () => <div data-testid="video-play-badge" />,
}));

vi.mock("@/modules/media/constants/image-config.constants", () => ({
	THUMBNAIL_IMAGE_QUALITY: 70,
	EAGER_LOAD_THUMBNAILS: 2,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { GalleryThumbnail } from "../thumbnail";
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
		alt: "Photo test",
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

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("GalleryThumbnail", () => {
	const defaultProps = {
		media: createImageMedia(),
		index: 0,
		isActive: false,
		hasError: false,
		title: "Bague étoile",
		onClick: vi.fn(),
		onError: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders a button with role=tab", () => {
		render(<GalleryThumbnail {...defaultProps} />);
		expect(screen.getByRole("tab")).toBeInTheDocument();
	});

	it("renders the thumbnail image for image media", () => {
		render(<GalleryThumbnail {...defaultProps} />);
		expect(screen.getByTestId("thumbnail-image")).toBeInTheDocument();
	});

	it("renders aria-label for image", () => {
		render(<GalleryThumbnail {...defaultProps} index={2} />);
		expect(screen.getByRole("tab")).toHaveAttribute(
			"aria-label",
			expect.stringContaining("photo 3"),
		);
	});

	it("marks aria-selected=true when active", () => {
		render(<GalleryThumbnail {...defaultProps} isActive={true} />);
		expect(screen.getByRole("tab")).toHaveAttribute("aria-selected", "true");
	});

	it("marks aria-selected=false when not active", () => {
		render(<GalleryThumbnail {...defaultProps} isActive={false} />);
		expect(screen.getByRole("tab")).toHaveAttribute("aria-selected", "false");
	});

	it("aria-label includes '(sélectionnée)' when active", () => {
		render(<GalleryThumbnail {...defaultProps} isActive={true} />);
		expect(screen.getByRole("tab")).toHaveAttribute(
			"aria-label",
			expect.stringContaining("sélectionnée"),
		);
	});

	// ─── Video ────────────────────────────────────────────────────────────────

	it("renders video play badge for video media", () => {
		render(<GalleryThumbnail {...defaultProps} media={createVideoMedia()} />);
		expect(screen.getByTestId("video-play-badge")).toBeInTheDocument();
	});

	it("uses thumbnailUrl as image src for video", () => {
		const media = createVideoMedia({ thumbnailUrl: "https://example.com/thumb.jpg" });
		render(<GalleryThumbnail {...defaultProps} media={media} />);
		expect(screen.getByTestId("thumbnail-image")).toHaveAttribute(
			"src",
			"https://example.com/thumb.jpg",
		);
	});

	// ─── Error state ─────────────────────────────────────────────────────────

	it("renders MediaErrorFallback when hasError=true", () => {
		render(<GalleryThumbnail {...defaultProps} hasError={true} />);
		expect(screen.getByTestId("media-error-fallback")).toBeInTheDocument();
	});

	it("shows error label when hasError=true", () => {
		render(<GalleryThumbnail {...defaultProps} hasError={true} />);
		expect(screen.getByRole("tab")).toHaveAttribute(
			"aria-label",
			expect.stringContaining("erreur de chargement"),
		);
	});

	// ─── Interaction ─────────────────────────────────────────────────────────

	it("calls onClick when clicked", async () => {
		const onClick = vi.fn();
		render(<GalleryThumbnail {...defaultProps} onClick={onClick} />);
		await userEvent.click(screen.getByRole("tab"));
		expect(onClick).toHaveBeenCalledOnce();
	});

	// ─── aria-controls ────────────────────────────────────────────────────────

	it("sets aria-controls to gallery-panel-{index}", () => {
		render(<GalleryThumbnail {...defaultProps} index={3} />);
		expect(screen.getByRole("tab")).toHaveAttribute("aria-controls", "gallery-panel-3");
	});
});
