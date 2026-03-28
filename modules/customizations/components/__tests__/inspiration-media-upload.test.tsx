import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockOnMediasChange, mockOnDeleteMedia } = vi.hoisted(() => ({
	mockOnMediasChange: vi.fn(),
	mockOnDeleteMedia: vi.fn(),
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/modules/media/utils/uploadthing", () => ({
	UploadDropzone: ({
		"aria-label": ariaLabel,
	}: {
		endpoint: string;
		onClientUploadComplete?: (res: unknown[]) => void;
		onUploadError?: (error: Error) => void;
		config?: unknown;
		"aria-label"?: string;
		appearance?: unknown;
		content?: unknown;
	}) => <div data-testid="upload-dropzone" aria-label={ariaLabel} />,
}));

vi.mock("@/shared/components/media-upload/upload-progress", () => ({
	UploadProgress: () => <div data-testid="upload-progress" />,
}));

vi.mock("@/shared/components/forms", () => ({
	FieldLabel: ({
		children,
		htmlFor,
		optional,
	}: {
		children: React.ReactNode;
		htmlFor?: string;
		optional?: boolean;
	}) => (
		<label htmlFor={htmlFor}>
			{children}
			{optional && <span> (optionnel)</span>}
		</label>
	),
}));

vi.mock("next/image", () => ({
	default: ({
		src,
		alt,
		fill,
		className,
	}: {
		src: string;
		alt: string;
		fill?: boolean;
		className?: string;
		sizes?: string;
		placeholder?: string;
		blurDataURL?: string;
	}) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} data-fill={fill} className={className} />
	),
}));

vi.mock("lucide-react", () => ({
	Upload: ({ className }: { className?: string }) => (
		<svg data-testid="icon-upload" className={className} />
	),
	X: ({ className }: { className?: string }) => <svg data-testid="icon-x" className={className} />,
}));

vi.mock("sonner", () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

import { InspirationMediaUpload } from "../inspiration-media-upload";
import type { InspirationMediaItem } from "../inspiration-media-upload";

// ============================================================================
// HELPERS
// ============================================================================

function createMedia(overrides: Partial<InspirationMediaItem> = {}): InspirationMediaItem {
	return {
		url: "https://example.com/image.jpg",
		altText: "Inspiration",
		...overrides,
	};
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("InspirationMediaUpload", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── Basic rendering ──────────────────────────────────────────────────────

	it("renders the field label", () => {
		render(
			<InspirationMediaUpload
				medias={[]}
				onMediasChange={mockOnMediasChange}
				onDeleteMedia={mockOnDeleteMedia}
			/>,
		);
		expect(screen.getByText("Images d'inspiration")).toBeInTheDocument();
	});

	it("renders the description with max count", () => {
		render(
			<InspirationMediaUpload
				medias={[]}
				onMediasChange={mockOnMediasChange}
				onDeleteMedia={mockOnDeleteMedia}
			/>,
		);
		expect(screen.getByText(/Ajoutez jusqu'à 5 images/)).toBeInTheDocument();
	});

	it("renders the upload dropzone when medias is empty", () => {
		render(
			<InspirationMediaUpload
				medias={[]}
				onMediasChange={mockOnMediasChange}
				onDeleteMedia={mockOnDeleteMedia}
			/>,
		);
		expect(screen.getByTestId("upload-dropzone")).toBeInTheDocument();
	});

	it("renders the upload dropzone with accessible label", () => {
		render(
			<InspirationMediaUpload
				medias={[]}
				onMediasChange={mockOnMediasChange}
				onDeleteMedia={mockOnDeleteMedia}
			/>,
		);
		expect(screen.getByLabelText("Zone d'upload pour images d'inspiration")).toBeInTheDocument();
	});

	it("renders the hidden input for media data", () => {
		const { container } = render(
			<InspirationMediaUpload
				medias={[]}
				onMediasChange={mockOnMediasChange}
				onDeleteMedia={mockOnDeleteMedia}
			/>,
		);
		const hidden = container.querySelector('input[name="inspirationMedias"]');
		expect(hidden).toBeInTheDocument();
		expect(hidden).toHaveAttribute("type", "hidden");
	});

	// ─── With media items ─────────────────────────────────────────────────────

	it("renders image previews when medias are provided", () => {
		const medias = [
			createMedia({ url: "https://example.com/img1.jpg", altText: "Image 1" }),
			createMedia({ url: "https://example.com/img2.jpg", altText: "Image 2" }),
		];
		render(
			<InspirationMediaUpload
				medias={medias}
				onMediasChange={mockOnMediasChange}
				onDeleteMedia={mockOnDeleteMedia}
			/>,
		);
		expect(screen.getByAltText("Image 1")).toBeInTheDocument();
		expect(screen.getByAltText("Image 2")).toBeInTheDocument();
	});

	it("renders delete buttons for each media", () => {
		const medias = [createMedia({ url: "https://example.com/img1.jpg" })];
		render(
			<InspirationMediaUpload
				medias={medias}
				onMediasChange={mockOnMediasChange}
				onDeleteMedia={mockOnDeleteMedia}
			/>,
		);
		expect(screen.getByRole("button", { name: "Supprimer l'image 1" })).toBeInTheDocument();
	});

	it("calls onMediasChange and onDeleteMedia when delete is clicked", async () => {
		const user = userEvent.setup();
		const medias = [createMedia({ url: "https://example.com/img1.jpg" })];
		render(
			<InspirationMediaUpload
				medias={medias}
				onMediasChange={mockOnMediasChange}
				onDeleteMedia={mockOnDeleteMedia}
			/>,
		);
		await user.click(screen.getByRole("button", { name: "Supprimer l'image 1" }));
		expect(mockOnMediasChange).toHaveBeenCalledWith([]);
		expect(mockOnDeleteMedia).toHaveBeenCalledWith("https://example.com/img1.jpg");
	});

	// ─── Max reached ─────────────────────────────────────────────────────────

	it("hides dropzone when max (5) medias are reached", () => {
		const medias = Array.from({ length: 5 }, (_, i) =>
			createMedia({ url: `https://example.com/img${i + 1}.jpg` }),
		);
		render(
			<InspirationMediaUpload
				medias={medias}
				onMediasChange={mockOnMediasChange}
				onDeleteMedia={mockOnDeleteMedia}
			/>,
		);
		expect(screen.queryByTestId("upload-dropzone")).not.toBeInTheDocument();
	});

	it("uses default alt text when altText is not provided", () => {
		const medias = [createMedia({ url: "https://example.com/img1.jpg", altText: undefined })];
		render(
			<InspirationMediaUpload
				medias={medias}
				onMediasChange={mockOnMediasChange}
				onDeleteMedia={mockOnDeleteMedia}
			/>,
		);
		expect(screen.getByAltText("Inspiration 1")).toBeInTheDocument();
	});
});
