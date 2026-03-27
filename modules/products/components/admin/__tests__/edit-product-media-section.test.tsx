import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockUploadMedia } = vi.hoisted(() => ({
	mockUploadMedia: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/components/media-upload/media-upload-grid", () => ({
	MediaUploadGrid: ({
		media,
		renderUploadZone,
	}: {
		media: unknown[];
		onChange?: (media: unknown[]) => void;
		renderUploadZone?: () => React.ReactNode;
		skipUtapiDelete?: boolean;
		maxItems?: number;
	}) => (
		<div data-testid="media-upload-grid" data-media-count={media.length}>
			{renderUploadZone?.()}
		</div>
	),
}));

vi.mock("@/modules/media/utils/uploadthing", () => ({
	UploadDropzone: ({
		"aria-label": ariaLabel,
	}: {
		endpoint?: string;
		onChange?: (files: File[]) => Promise<void>;
		onUploadError?: (error: Error) => void;
		className?: string;
		"aria-label"?: string;
		appearance?: unknown;
		content?: unknown;
	}) => <div data-testid="upload-dropzone" aria-label={ariaLabel} />,
}));

vi.mock("@/modules/media/utils/upload-dropzone-appearance", () => ({
	getCatalogDropzoneAppearance: () => ({}),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
	Upload: ({ className }: { className?: string }) => (
		<svg data-testid="icon-upload" className={className} />
	),
}));

vi.mock("sonner", () => ({
	toast: { error: vi.fn(), warning: vi.fn() },
}));

// ============================================================================
// COMPONENT IMPORT (after mocks)
// ============================================================================

import { EditProductMediaSection } from "../edit-product-media-section";
import type { AnyFieldApi } from "@tanstack/react-form";

// ============================================================================
// HELPERS
// ============================================================================

type MediaItem = {
	url: string;
	thumbnailUrl?: string | null;
	blurDataUrl?: string;
	altText?: string;
	mediaType: "IMAGE" | "VIDEO";
};

function createFieldMock(media: MediaItem[] = [], errors: string[] = []): AnyFieldApi {
	return {
		state: {
			value: media,
			meta: { errors },
		},
		removeValue: vi.fn(),
		pushValue: vi.fn(),
	} as unknown as AnyFieldApi;
}

const DEFAULT_PROPS = {
	productTitle: "Bague Lune",
	maxCount: 10,
	uploadMedia: mockUploadMedia,
	isMediaUploading: false,
};

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("EditProductMediaSection", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	describe("rendering", () => {
		it("renders the media upload grid", () => {
			const field = createFieldMock();
			render(<EditProductMediaSection field={field} {...DEFAULT_PROPS} />);
			expect(screen.getByTestId("media-upload-grid")).toBeInTheDocument();
		});

		it("renders the upload dropzone", () => {
			const field = createFieldMock();
			render(<EditProductMediaSection field={field} {...DEFAULT_PROPS} />);
			expect(screen.getByTestId("upload-dropzone")).toBeInTheDocument();
		});

		it("renders the dropzone with correct aria-label", () => {
			const field = createFieldMock();
			render(<EditProductMediaSection field={field} {...DEFAULT_PROPS} />);
			expect(screen.getByLabelText("Zone d'upload des médias")).toBeInTheDocument();
		});

		it("renders hint text about first position requirement", () => {
			const field = createFieldMock();
			render(<EditProductMediaSection field={field} {...DEFAULT_PROPS} />);
			expect(screen.getByText(/La première position doit être une image/)).toBeInTheDocument();
		});

		it("renders media count in the grid", () => {
			const media: MediaItem[] = [
				{ url: "https://example.com/img1.jpg", mediaType: "IMAGE" },
				{ url: "https://example.com/img2.jpg", mediaType: "IMAGE" },
			];
			const field = createFieldMock(media);
			render(<EditProductMediaSection field={field} {...DEFAULT_PROPS} />);
			expect(screen.getByTestId("media-upload-grid")).toHaveAttribute("data-media-count", "2");
		});
	});

	// ─── Upload in progress ────────────────────────────────────────────────────

	describe("upload in progress", () => {
		it("shows upload progress indicator when isMediaUploading is true", () => {
			const field = createFieldMock();
			render(<EditProductMediaSection field={field} {...DEFAULT_PROPS} isMediaUploading={true} />);
			expect(screen.getByText("Upload en cours...")).toBeInTheDocument();
		});

		it("does not show upload progress indicator when isMediaUploading is false", () => {
			const field = createFieldMock();
			render(<EditProductMediaSection field={field} {...DEFAULT_PROPS} isMediaUploading={false} />);
			expect(screen.queryByText("Upload en cours...")).not.toBeInTheDocument();
		});
	});

	// ─── Errors ───────────────────────────────────────────────────────────────

	describe("error display", () => {
		it("renders error messages when field has errors", () => {
			const field = createFieldMock([], ["Au moins une image est requise"]);
			render(<EditProductMediaSection field={field} {...DEFAULT_PROPS} />);
			expect(screen.getByText("Au moins une image est requise")).toBeInTheDocument();
		});

		it("renders error list with role=alert", () => {
			const field = createFieldMock([], ["Erreur de validation"]);
			render(<EditProductMediaSection field={field} {...DEFAULT_PROPS} />);
			expect(screen.getByRole("alert")).toBeInTheDocument();
		});

		it("does not render error list when no errors", () => {
			const field = createFieldMock([], []);
			render(<EditProductMediaSection field={field} {...DEFAULT_PROPS} />);
			expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		});

		it("renders multiple errors", () => {
			const field = createFieldMock([], ["Erreur 1", "Erreur 2"]);
			render(<EditProductMediaSection field={field} {...DEFAULT_PROPS} />);
			expect(screen.getByText("Erreur 1")).toBeInTheDocument();
			expect(screen.getByText("Erreur 2")).toBeInTheDocument();
		});
	});

	// ─── Empty state ──────────────────────────────────────────────────────────

	describe("empty media state", () => {
		it("renders grid with zero media count when field is empty", () => {
			const field = createFieldMock([]);
			render(<EditProductMediaSection field={field} {...DEFAULT_PROPS} />);
			expect(screen.getByTestId("media-upload-grid")).toHaveAttribute("data-media-count", "0");
		});
	});
});
