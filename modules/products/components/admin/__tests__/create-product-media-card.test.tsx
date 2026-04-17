import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/components/media-upload/media-counter-badge", () => ({
	MediaCounterBadge: ({ count, max }: { count: number; max: number }) => (
		<span data-testid="media-counter">
			{count}/{max}
		</span>
	),
}));

vi.mock("@/shared/components/media-upload/media-upload-grid", () => ({
	MediaUploadGrid: ({
		media,
	}: {
		media: Array<{ url: string; mediaType: string }>;
		onChange: (media: Array<{ url: string; mediaType: string }>) => void;
		maxItems?: number;
		renderUploadZone?: (() => React.ReactNode) | undefined;
	}) => <div data-testid="media-upload-grid" data-count={media.length} />,
}));

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
	CardContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="card-content">{children}</div>
	),
	CardHeader: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="card-header">{children}</div>
	),
	CardTitle: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="card-title">{children}</div>
	),
}));

vi.mock("@/modules/media/utils/uploadthing", () => ({
	UploadDropzone: ({
		endpoint,
		"aria-label": ariaLabel,
	}: {
		endpoint: string;
		onChange?: (files: File[]) => void;
		onUploadError?: (error: Error) => void;
		"aria-label"?: string;
		className?: string;
		appearance?: unknown;
		content?: unknown;
	}) => (
		<button
			data-testid="upload-dropzone"
			data-endpoint={endpoint}
			aria-label={ariaLabel ?? "Zone d'upload"}
		>
			Upload
		</button>
	),
}));

vi.mock("@/shared/constants/validation-limits", () => ({
	ARRAY_LIMITS: { SKU_MEDIA: 10 },
}));

vi.mock("lucide-react", () => ({
	ImagePlus: (props: Record<string, unknown>) => <svg data-testid="icon-image-plus" {...props} />,
	Info: (props: Record<string, unknown>) => <svg data-testid="icon-info" {...props} />,
	Upload: (props: Record<string, unknown>) => <svg data-testid="icon-upload" {...props} />,
}));

vi.mock("sonner", () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { CreateProductMediaCard } from "../create-product-media-card";

// ============================================================================
// HELPERS
// ============================================================================

function createMediaForm(
	media: Array<{
		url: string;
		mediaType: "IMAGE" | "VIDEO";
		altText?: string;
		thumbnailUrl?: string | null;
		blurDataUrl?: string;
	}> = [],
) {
	return {
		Field: ({
			children,
		}: {
			name: string;
			mode?: string;
			children: (field: unknown) => React.ReactNode;
			validators?: unknown;
		}) =>
			children({
				state: { value: media, meta: { errors: [] } },
				handleChange: vi.fn(),
				pushValue: vi.fn(),
				removeValue: vi.fn(),
			}),
	};
}

const defaultProps = {
	isMediaUploading: false,
	uploadProgress: null,
	handleUpload: vi.fn(),
	setDeletedImageUrls: vi.fn(),
};

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("CreateProductMediaCard", () => {
	describe("rendering", () => {
		it("renders card title Médias", () => {
			const form = createMediaForm();
			render(<CreateProductMediaCard form={form as never} {...defaultProps} />);
			expect(screen.getByTestId("card-title")).toHaveTextContent("Médias");
		});

		it("renders media counter badge", () => {
			const form = createMediaForm();
			render(<CreateProductMediaCard form={form as never} {...defaultProps} />);
			expect(screen.getByTestId("media-counter")).toBeInTheDocument();
		});

		it("shows counter as 0/10 when no media", () => {
			const form = createMediaForm();
			render(<CreateProductMediaCard form={form as never} {...defaultProps} />);
			expect(screen.getByTestId("media-counter")).toHaveTextContent("0/10");
		});

		it("renders hint text about image ordering", () => {
			const form = createMediaForm();
			render(<CreateProductMediaCard form={form as never} {...defaultProps} />);
			expect(
				screen.getByText("La première image sera l'image principale. Glissez pour réordonner."),
			).toBeInTheDocument();
		});
	});

	describe("empty state", () => {
		it("shows upload hint text in empty state", () => {
			const form = createMediaForm();
			render(<CreateProductMediaCard form={form as never} {...defaultProps} />);
			expect(screen.getByText("Ajoutez jusqu'à 10 images et vidéos")).toBeInTheDocument();
		});

		it("renders ImagePlus icon in empty state", () => {
			const form = createMediaForm();
			render(<CreateProductMediaCard form={form as never} {...defaultProps} />);
			expect(screen.getByTestId("icon-image-plus")).toBeInTheDocument();
		});

		it("renders upload dropzone in empty state", () => {
			const form = createMediaForm();
			render(<CreateProductMediaCard form={form as never} {...defaultProps} />);
			expect(screen.getByTestId("upload-dropzone")).toBeInTheDocument();
		});

		it("renders upload dropzone with catalogMedia endpoint", () => {
			const form = createMediaForm();
			render(<CreateProductMediaCard form={form as never} {...defaultProps} />);
			expect(screen.getByTestId("upload-dropzone")).toHaveAttribute(
				"data-endpoint",
				"catalogMedia",
			);
		});

		it("does not render MediaUploadGrid when empty", () => {
			const form = createMediaForm();
			render(<CreateProductMediaCard form={form as never} {...defaultProps} />);
			expect(screen.queryByTestId("media-upload-grid")).not.toBeInTheDocument();
		});
	});

	describe("with media", () => {
		it("shows MediaUploadGrid when media items are present", () => {
			const media = [
				{ url: "https://example.com/img1.jpg", mediaType: "IMAGE" as const },
				{ url: "https://example.com/img2.jpg", mediaType: "IMAGE" as const },
			];
			const form = createMediaForm(media);
			render(<CreateProductMediaCard form={form as never} {...defaultProps} />);
			expect(screen.getByTestId("media-upload-grid")).toBeInTheDocument();
		});

		it("does not show dropzone directly in empty state when media present", () => {
			const media = [{ url: "https://example.com/img1.jpg", mediaType: "IMAGE" as const }];
			const form = createMediaForm(media);
			render(<CreateProductMediaCard form={form as never} {...defaultProps} />);
			expect(screen.queryByTestId("icon-image-plus")).not.toBeInTheDocument();
		});

		it("shows correct counter with media", () => {
			const media = Array.from({ length: 3 }, (_, i) => ({
				url: `https://example.com/img${i}.jpg`,
				mediaType: "IMAGE" as const,
			}));
			const form = createMediaForm(media);
			render(<CreateProductMediaCard form={form as never} {...defaultProps} />);
			expect(screen.getByTestId("media-counter")).toHaveTextContent("3/10");
		});
	});

	describe("limit warning", () => {
		it("shows limit warning when at max (10)", () => {
			const media = Array.from({ length: 10 }, (_, i) => ({
				url: `https://example.com/img${i}.jpg`,
				mediaType: "IMAGE" as const,
			}));
			const form = createMediaForm(media);
			render(<CreateProductMediaCard form={form as never} {...defaultProps} />);
			expect(screen.getByText("Limite de 10 médias atteinte")).toBeInTheDocument();
		});

		it("shows Info icon when at limit", () => {
			const media = Array.from({ length: 10 }, (_, i) => ({
				url: `https://example.com/img${i}.jpg`,
				mediaType: "IMAGE" as const,
			}));
			const form = createMediaForm(media);
			render(<CreateProductMediaCard form={form as never} {...defaultProps} />);
			expect(screen.getByTestId("icon-info")).toBeInTheDocument();
		});

		it("does not show limit warning when below max", () => {
			const media = Array.from({ length: 5 }, (_, i) => ({
				url: `https://example.com/img${i}.jpg`,
				mediaType: "IMAGE" as const,
			}));
			const form = createMediaForm(media);
			render(<CreateProductMediaCard form={form as never} {...defaultProps} />);
			expect(screen.queryByText("Limite de 10 médias atteinte")).not.toBeInTheDocument();
		});
	});

	describe("upload progress state", () => {
		it("shows uploading phase text when uploading in empty state", () => {
			const form = createMediaForm();
			render(
				<CreateProductMediaCard
					form={form as never}
					isMediaUploading={true}
					uploadProgress={{
						phase: "uploading",
						completed: 1,
						total: 3,
						queued: 0,
					}}
					handleUpload={vi.fn()}
					setDeletedImageUrls={vi.fn()}
				/>,
			);
			expect(screen.getByText("Upload en cours...")).toBeInTheDocument();
		});

		it("shows file count during upload", () => {
			const form = createMediaForm();
			render(
				<CreateProductMediaCard
					form={form as never}
					isMediaUploading={true}
					uploadProgress={{
						phase: "uploading",
						completed: 2,
						total: 5,
						queued: 0,
					}}
					handleUpload={vi.fn()}
					setDeletedImageUrls={vi.fn()}
				/>,
			);
			expect(screen.getByText("2 / 5 fichier(s)")).toBeInTheDocument();
		});

		it("shows validating phase text", () => {
			const form = createMediaForm();
			render(
				<CreateProductMediaCard
					form={form as never}
					isMediaUploading={true}
					uploadProgress={{
						phase: "validating",
						completed: 0,
						total: 2,
						queued: 0,
					}}
					handleUpload={vi.fn()}
					setDeletedImageUrls={vi.fn()}
				/>,
			);
			expect(screen.getByText("Validation des fichiers...")).toBeInTheDocument();
		});

		it("shows generating thumbnails phase text", () => {
			const form = createMediaForm();
			render(
				<CreateProductMediaCard
					form={form as never}
					isMediaUploading={true}
					uploadProgress={{
						phase: "generating-thumbnails",
						completed: 0,
						total: 1,
						queued: 0,
					}}
					handleUpload={vi.fn()}
					setDeletedImageUrls={vi.fn()}
				/>,
			);
			expect(screen.getByText("Génération des miniatures...")).toBeInTheDocument();
		});

		it("shows queued count when queued > 0", () => {
			const form = createMediaForm();
			render(
				<CreateProductMediaCard
					form={form as never}
					isMediaUploading={true}
					uploadProgress={{
						phase: "uploading",
						completed: 1,
						total: 3,
						queued: 2,
					}}
					handleUpload={vi.fn()}
					setDeletedImageUrls={vi.fn()}
				/>,
			);
			expect(screen.getByText("+2 en attente")).toBeInTheDocument();
		});

		it("shows role=status for a11y during upload", () => {
			const form = createMediaForm();
			render(
				<CreateProductMediaCard
					form={form as never}
					isMediaUploading={true}
					uploadProgress={{
						phase: "uploading",
						completed: 0,
						total: 1,
						queued: 0,
					}}
					handleUpload={vi.fn()}
					setDeletedImageUrls={vi.fn()}
				/>,
			);
			expect(screen.getByRole("status")).toBeInTheDocument();
		});
	});
});
