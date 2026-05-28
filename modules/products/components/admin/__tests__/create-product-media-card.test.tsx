import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockUseIsMobile, mockTriggerHaptic } = vi.hoisted(() => ({
	mockUseIsMobile: vi.fn(() => false),
	mockTriggerHaptic: vi.fn(() => true),
}));

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

// `PendingUploadsGrid` imports @dnd-kit/react which uses ResizeObserver (missing in JSDOM).
// Mock to avoid environment setup overhead — the pending mode is exercised elsewhere.
vi.mock("@/shared/components/media-upload/pending-uploads-grid", () => ({
	PendingUploadsGrid: ({
		files,
		onConfirm,
		onCancel,
	}: {
		files: File[];
		onConfirm: () => void;
		onCancel: () => void;
	}) => (
		<div data-testid="pending-uploads-grid" data-count={files.length}>
			<button onClick={onConfirm}>Confirmer</button>
			<button onClick={onCancel}>Annuler</button>
		</div>
	),
}));

vi.mock("@/shared/components/media-upload/upload-progress", () => ({
	UploadProgress: ({
		progress,
		phase,
		queuedCount,
		currentFileName,
		onCancel,
	}: {
		progress: number;
		phase?: string;
		queuedCount?: number;
		currentFileName?: string;
		onCancel?: () => void;
	}) => (
		<div
			data-testid="upload-progress-bar"
			data-progress={progress}
			data-phase={phase}
			data-queued={queuedCount}
			data-current={currentFileName}
		>
			{onCancel && (
				<button data-testid="upload-cancel" onClick={onCancel}>
					Annuler
				</button>
			)}
		</div>
	),
	UploadErrorBanner: ({
		failedFiles,
		onRetry,
		onDismiss,
	}: {
		failedFiles: Array<{ fileName: string; error: string }>;
		onRetry: () => void;
		onDismiss: () => void;
	}) => (
		<div data-testid="upload-error-banner" data-count={failedFiles.length}>
			<button data-testid="banner-retry" onClick={onRetry}>
				Réessayer
			</button>
			<button data-testid="banner-dismiss" onClick={onDismiss}>
				Ignorer
			</button>
		</div>
	),
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

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		disabled,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		disabled?: boolean;
		"aria-label"?: string;
	}) => (
		<button data-testid="button" onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: mockUseIsMobile,
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockTriggerHaptic,
	triggerHaptic: mockTriggerHaptic,
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

vi.mock("@/shared/components/media-upload/upload-action-sheet", () => ({
	UploadActionSheet: ({
		desktopFallback,
		triggerLabel,
	}: {
		desktopFallback?: React.ReactNode;
		triggerLabel?: string;
	}) => (
		<div data-testid="upload-action-sheet" data-trigger-label={triggerLabel}>
			{desktopFallback}
		</div>
	),
}));

vi.mock("@/shared/constants/validation-limits", () => ({
	ARRAY_LIMITS: { SKU_MEDIA: 10 },
}));

vi.mock("lucide-react", () => ({
	Camera: (props: Record<string, unknown>) => <svg data-testid="icon-camera" {...props} />,
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
	failedFiles: [],
	onCancel: vi.fn(),
	onRetry: vi.fn(),
	onDismissErrors: vi.fn(),
};

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	mockUseIsMobile.mockReturnValue(false);
	mockTriggerHaptic.mockClear();
});

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
				screen.getByText(
					"La première image sera l'image principale. Glissez-déposez pour réorganiser.",
				),
			).toBeInTheDocument();
		});
	});

	describe("empty state", () => {
		it("shows upload hint text in empty state", () => {
			const form = createMediaForm();
			render(<CreateProductMediaCard form={form as never} {...defaultProps} />);
			expect(
				screen.getByText("Confiez jusqu'à 10 médias de votre bijou à l'atelier"),
			).toBeInTheDocument();
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

	describe("upload progress (shared component)", () => {
		it("renders shared UploadProgress bar with computed percent during upload", () => {
			const form = createMediaForm();
			render(
				<CreateProductMediaCard
					form={form as never}
					{...defaultProps}
					isMediaUploading={true}
					uploadProgress={{
						phase: "uploading",
						completed: 1,
						total: 4,
						queued: 0,
					}}
				/>,
			);
			const bar = screen.getByTestId("upload-progress-bar");
			expect(bar).toBeInTheDocument();
			expect(bar).toHaveAttribute("data-progress", "25");
			expect(bar).toHaveAttribute("data-phase", "uploading");
		});

		it("propagates queued count to UploadProgress", () => {
			const form = createMediaForm();
			render(
				<CreateProductMediaCard
					form={form as never}
					{...defaultProps}
					isMediaUploading={true}
					uploadProgress={{
						phase: "uploading",
						completed: 1,
						total: 3,
						queued: 2,
					}}
				/>,
			);
			expect(screen.getByTestId("upload-progress-bar")).toHaveAttribute("data-queued", "2");
		});

		it("propagates current file name to UploadProgress", () => {
			const form = createMediaForm();
			render(
				<CreateProductMediaCard
					form={form as never}
					{...defaultProps}
					isMediaUploading={true}
					uploadProgress={{
						phase: "compressing",
						completed: 0,
						total: 2,
						queued: 0,
						current: "photo.heic",
					}}
				/>,
			);
			const bar = screen.getByTestId("upload-progress-bar");
			expect(bar).toHaveAttribute("data-phase", "compressing");
			expect(bar).toHaveAttribute("data-current", "photo.heic");
		});

		it("renders cancel button wired to onCancel", () => {
			const form = createMediaForm();
			const onCancel = vi.fn();
			render(
				<CreateProductMediaCard
					form={form as never}
					{...defaultProps}
					onCancel={onCancel}
					isMediaUploading={true}
					uploadProgress={{
						phase: "uploading",
						completed: 0,
						total: 1,
						queued: 0,
					}}
				/>,
			);
			fireEvent.click(screen.getByTestId("upload-cancel"));
			expect(onCancel).toHaveBeenCalledTimes(1);
		});
	});

	describe("error banner", () => {
		it("renders UploadErrorBanner when failedFiles has entries", () => {
			const form = createMediaForm();
			render(
				<CreateProductMediaCard
					form={form as never}
					{...defaultProps}
					failedFiles={[
						{ fileName: "a.jpg", error: "boom", file: new File([], "a.jpg") },
						{ fileName: "b.jpg", error: "boom", file: new File([], "b.jpg") },
					]}
				/>,
			);
			const banner = screen.getByTestId("upload-error-banner");
			expect(banner).toHaveAttribute("data-count", "2");
		});

		it("does not render UploadErrorBanner when failedFiles is empty", () => {
			const form = createMediaForm();
			render(<CreateProductMediaCard form={form as never} {...defaultProps} />);
			expect(screen.queryByTestId("upload-error-banner")).not.toBeInTheDocument();
		});

		it("wires retry callback", () => {
			const form = createMediaForm();
			const onRetry = vi.fn();
			render(
				<CreateProductMediaCard
					form={form as never}
					{...defaultProps}
					onRetry={onRetry}
					failedFiles={[{ fileName: "a.jpg", error: "boom", file: new File([], "a.jpg") }]}
				/>,
			);
			fireEvent.click(screen.getByTestId("banner-retry"));
			expect(onRetry).toHaveBeenCalledTimes(1);
		});

		it("wires dismiss callback", () => {
			const form = createMediaForm();
			const onDismissErrors = vi.fn();
			render(
				<CreateProductMediaCard
					form={form as never}
					{...defaultProps}
					onDismissErrors={onDismissErrors}
					failedFiles={[{ fileName: "a.jpg", error: "boom", file: new File([], "a.jpg") }]}
				/>,
			);
			fireEvent.click(screen.getByTestId("banner-dismiss"));
			expect(onDismissErrors).toHaveBeenCalledTimes(1);
		});
	});

	describe("upload action sheet (drawer mobile + dropzone desktop)", () => {
		it("renders UploadActionSheet wrapping the dropzone", () => {
			const form = createMediaForm();
			render(<CreateProductMediaCard form={form as never} {...defaultProps} />);
			expect(screen.getByTestId("upload-action-sheet")).toBeInTheDocument();
		});

		it("UploadActionSheet trigger label is 'Ajouter des médias' in empty state", () => {
			const form = createMediaForm();
			render(<CreateProductMediaCard form={form as never} {...defaultProps} />);
			const sheet = screen.getByTestId("upload-action-sheet");
			expect(sheet).toHaveAttribute("data-trigger-label", "Ajouter des médias");
		});

		it("UploadActionSheet exposes UploadDropzone as desktop fallback", () => {
			const form = createMediaForm();
			render(<CreateProductMediaCard form={form as never} {...defaultProps} />);
			const sheet = screen.getByTestId("upload-action-sheet");
			expect(sheet.querySelector("[data-testid='upload-dropzone']")).not.toBeNull();
		});
	});
});
