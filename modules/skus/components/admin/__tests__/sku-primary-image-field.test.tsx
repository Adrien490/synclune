import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/components/ui/label", () => ({
	Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
		<label htmlFor={htmlFor}>{children}</label>
	),
}));

vi.mock("@/modules/media/components/admin/primary-image-upload", () => ({
	PrimaryImageUpload: ({
		imageUrl,
		renderUploadZone,
	}: {
		imageUrl?: string;
		mediaType?: string;
		onRemove?: () => void;
		skipUtapiDelete?: boolean;
		productName?: string;
		renderUploadZone?: () => React.ReactNode;
	}) => (
		<div data-testid="primary-image-upload">
			{imageUrl ? (
				/* eslint-disable-next-line @next/next/no-img-element */
				<img src={imageUrl} alt="primary" data-testid="primary-image" />
			) : (
				renderUploadZone?.()
			)}
		</div>
	),
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
	toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
	Upload: ({ className }: { className?: string }) => (
		<span data-testid="icon-upload" className={className} />
	),
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { SkuPrimaryImageField } from "../sku-primary-image-field";
import type { MediaData } from "@/modules/skus/types/sku-form.types";

// ============================================================================
// FIXTURES
// ============================================================================

const defaultProps = {
	value: undefined,
	onChange: vi.fn(),
	productName: "Bague Or",
	startUpload: vi.fn().mockResolvedValue([]),
	isUploading: false,
};

const imageValue: MediaData = {
	url: "https://example.com/image.jpg",
	thumbnailUrl: undefined,
	blurDataUrl: undefined,
	altText: "Bague Or",
	mediaType: "IMAGE",
};

// ============================================================================
// TESTS
// ============================================================================

describe("SkuPrimaryImageField", () => {
	beforeEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	// ─── Smoke: render ────────────────────────────────────────────────────────

	it("renders without crash", () => {
		render(<SkuPrimaryImageField {...defaultProps} />);

		expect(screen.getByTestId("primary-image-upload")).toBeInTheDocument();
	});

	it("renders 'Image principale' label", () => {
		render(<SkuPrimaryImageField {...defaultProps} />);

		expect(screen.getByText("Image principale")).toBeInTheDocument();
	});

	// ─── No image ─────────────────────────────────────────────────────────────

	it("shows upload dropzone when value is undefined", () => {
		render(<SkuPrimaryImageField {...defaultProps} value={undefined} />);

		expect(screen.getByTestId("upload-dropzone")).toBeInTheDocument();
	});

	it("does not show image when value is undefined", () => {
		render(<SkuPrimaryImageField {...defaultProps} value={undefined} />);

		expect(screen.queryByTestId("primary-image")).not.toBeInTheDocument();
	});

	// ─── With image ───────────────────────────────────────────────────────────

	it("shows image when value has url", () => {
		render(<SkuPrimaryImageField {...defaultProps} value={imageValue} />);

		expect(screen.getByTestId("primary-image")).toBeInTheDocument();
	});

	it("does not show upload dropzone when value has url", () => {
		render(<SkuPrimaryImageField {...defaultProps} value={imageValue} />);

		expect(screen.queryByTestId("upload-dropzone")).not.toBeInTheDocument();
	});

	it("passes correct image url to PrimaryImageUpload", () => {
		render(<SkuPrimaryImageField {...defaultProps} value={imageValue} />);

		const img = screen.getByTestId("primary-image") as HTMLImageElement;
		expect(img.src).toContain("example.com/image.jpg");
	});
});
