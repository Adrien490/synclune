import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("motion/react", () => ({
	AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	m: {
		div: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => (
			<div {...props}>{children}</div>
		),
	},
}));

vi.mock("@/shared/components/ui/label", () => ({
	Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
		<label htmlFor={htmlFor}>{children}</label>
	),
}));

vi.mock("@/shared/components/media-upload/media-counter-badge", () => ({
	MediaCounterBadge: ({ count, max }: { count: number; max: number }) => (
		<span data-testid="media-counter-badge">
			{count}/{max}
		</span>
	),
}));

vi.mock("@/shared/components/media-upload/media-upload-grid", () => ({
	MediaUploadGrid: ({
		media,
	}: {
		media: unknown[];
		onChange?: (media: unknown[]) => void;
		skipUtapiDelete?: boolean;
	}) => <div data-testid="media-upload-grid" data-count={media.length} />,
}));

vi.mock("@/modules/media/utils/uploadthing", () => ({
	UploadDropzone: () => <div data-testid="upload-dropzone" />,
}));

vi.mock("@/shared/components/media-upload/upload-progress", () => ({
	UploadProgress: ({ progress }: { progress?: number; isProcessing?: boolean }) => (
		<div data-testid="upload-progress">{progress}</div>
	),
}));

vi.mock("sonner", () => ({
	toast: { error: vi.fn(), warning: vi.fn(), success: vi.fn() },
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
	Upload: ({ className }: { className?: string }) => (
		<span data-testid="icon-upload" className={className} />
	),
	ImagePlus: ({ className }: { className?: string }) => (
		<span data-testid="icon-image-plus" className={className} />
	),
	Info: ({ className }: { className?: string }) => (
		<span data-testid="icon-info" className={className} />
	),
}));

vi.mock("@/shared/constants/validation-limits", () => ({
	ARRAY_LIMITS: {
		SKU_GALLERY_MEDIA: 8,
	},
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { SkuGalleryField } from "../sku-gallery-field";
import type { MediaData } from "@/modules/skus/types/sku-form.types";

// ============================================================================
// FIXTURES
// ============================================================================

const defaultProps = {
	value: [] as MediaData[],
	setValue: vi.fn(),
	pushValue: vi.fn(),
	productName: "Bague Or",
	uploadMedia: vi.fn().mockResolvedValue([]),
	isUploading: false,
};

const mediaItem: MediaData = {
	url: "https://example.com/image.jpg",
	thumbnailUrl: undefined,
	blurDataUrl: undefined,
	altText: "Bague Or",
	mediaType: "IMAGE",
};

// ============================================================================
// TESTS
// ============================================================================

describe("SkuGalleryField", () => {
	beforeEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	// ─── Smoke: render ────────────────────────────────────────────────────────

	it("renders without crash", () => {
		render(<SkuGalleryField {...defaultProps} />);

		expect(screen.getByTestId("media-counter-badge")).toBeInTheDocument();
	});

	it("renders 'Galerie (optionnel)' label", () => {
		render(<SkuGalleryField {...defaultProps} />);

		expect(screen.getByText("Galerie (optionnel)")).toBeInTheDocument();
	});

	it("renders media counter badge", () => {
		render(<SkuGalleryField {...defaultProps} />);

		expect(screen.getByTestId("media-counter-badge")).toBeInTheDocument();
	});

	// ─── Empty gallery ────────────────────────────────────────────────────────

	it("does not render media grid when value is empty", () => {
		render(<SkuGalleryField {...defaultProps} value={[]} />);

		expect(screen.queryByTestId("media-upload-grid")).not.toBeInTheDocument();
	});

	it("shows 'Aucun média' placeholder when value is empty", () => {
		render(<SkuGalleryField {...defaultProps} value={[]} />);

		expect(screen.getByText("Aucun média")).toBeInTheDocument();
	});

	it("shows upload dropzone when value is empty (not at limit)", () => {
		render(<SkuGalleryField {...defaultProps} value={[]} />);

		expect(screen.getByTestId("upload-dropzone")).toBeInTheDocument();
	});

	// ─── With images ──────────────────────────────────────────────────────────

	it("renders media grid when value has items", () => {
		render(<SkuGalleryField {...defaultProps} value={[mediaItem]} />);

		expect(screen.getByTestId("media-upload-grid")).toBeInTheDocument();
	});

	it("passes correct count to media grid", () => {
		render(<SkuGalleryField {...defaultProps} value={[mediaItem, mediaItem]} />);

		const grid = screen.getByTestId("media-upload-grid");
		expect(grid.getAttribute("data-count")).toBe("2");
	});

	// ─── At limit ─────────────────────────────────────────────────────────────

	it("hides upload dropzone when at limit (8 items)", () => {
		const fullGallery = Array(8).fill(mediaItem) as MediaData[];
		render(<SkuGalleryField {...defaultProps} value={fullGallery} />);

		expect(screen.queryByTestId("upload-dropzone")).not.toBeInTheDocument();
	});

	it("shows 'Limite atteinte' message when at limit", () => {
		const fullGallery = Array(8).fill(mediaItem) as MediaData[];
		render(<SkuGalleryField {...defaultProps} value={fullGallery} />);

		expect(screen.getByText("Limite atteinte")).toBeInTheDocument();
	});
});
