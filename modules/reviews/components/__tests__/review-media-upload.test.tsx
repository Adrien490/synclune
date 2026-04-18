import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({}));

vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
		warning: vi.fn(),
	},
}));

vi.mock("next/image", () => ({
	default: ({ src, alt }: { src: string; alt: string; fill?: boolean }) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} />
	),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/scroll-fade", () => ({
	default: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="scroll-fade">{children}</div>
	),
}));

vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: () => false,
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => () => true,
	triggerHaptic: () => true,
}));

vi.mock("@/shared/components/media-upload/upload-progress", () => ({
	UploadProgress: ({ progress }: { progress?: number }) => (
		<div data-testid="upload-progress" data-progress={progress} />
	),
	UploadErrorBanner: () => null,
}));

vi.mock("@/shared/components/media-upload/upload-action-sheet", () => ({
	UploadActionSheet: ({
		desktopFallback,
		triggerLabel,
	}: {
		desktopFallback?: React.ReactNode;
		triggerLabel?: string;
	}) => (
		<div data-testid="upload-action-sheet" aria-label={triggerLabel}>
			{desktopFallback}
		</div>
	),
}));

vi.mock("@/shared/components/media-upload/pending-uploads-grid", () => ({
	PendingUploadsGrid: ({ files }: { files: File[] }) => (
		<div data-testid="pending-grid" data-count={files.length} />
	),
}));

vi.mock("@/modules/media/utils/uploadthing", () => ({
	UploadDropzone: ({
		"aria-label": ariaLabel,
		content,
	}: {
		"aria-label"?: string;
		content?: {
			label?: (args: { isUploading: boolean; isDragActive?: boolean }) => React.ReactNode;
			button?: () => React.ReactNode;
		};
	}) => (
		<div data-testid="upload-dropzone" aria-label={ariaLabel}>
			{content?.label?.({ isUploading: false })}
			{content?.button?.()}
		</div>
	),
	useUploadThing: () => ({
		startUpload: vi.fn(),
		isUploading: false,
	}),
}));

vi.mock("@/modules/media/hooks/use-media-upload", () => ({
	useMediaUpload: () => ({
		upload: vi.fn(),
		uploadSingle: vi.fn(),
		validateFiles: vi.fn(),
		cancel: vi.fn(),
		retryFailed: vi.fn(),
		clearFailed: vi.fn(),
		isUploading: false,
		progress: null,
		queuedCount: 0,
		failedFiles: [],
		getMediaType: () => "IMAGE",
		isOversized: () => false,
	}),
}));

import { ReviewMediaUpload } from "../review-media-upload";
import type { ReviewMediaItem } from "../review-media-upload";

// ============================================================================
// HELPERS
// ============================================================================

function createMedia(index: number): ReviewMediaItem {
	return {
		url: `https://example.com/photo-${index}.jpg`,
		blurDataUrl: undefined,
		altText: `Photo ${index}`,
	};
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ReviewMediaUpload", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders without error with empty media", () => {
		render(<ReviewMediaUpload media={[]} onChange={vi.fn()} />);
		expect(document.body).toBeTruthy();
	});

	it("renders the upload action sheet when media count is below limit", () => {
		render(<ReviewMediaUpload media={[]} onChange={vi.fn()} />);
		expect(screen.getByTestId("upload-action-sheet")).toBeInTheDocument();
	});

	it("desktop fallback dropzone has correct aria-label", () => {
		render(<ReviewMediaUpload media={[]} onChange={vi.fn()} />);
		expect(screen.getByTestId("upload-dropzone")).toHaveAttribute(
			"aria-label",
			"Zone d'upload des photos pour l'avis",
		);
	});

	it("does not render upload trigger when at max limit (3 media)", () => {
		const media = [createMedia(1), createMedia(2), createMedia(3)];
		render(<ReviewMediaUpload media={media} onChange={vi.fn()} />);
		expect(screen.queryByTestId("upload-action-sheet")).toBeNull();
	});

	it("shows limit reached message when at max", () => {
		const media = [createMedia(1), createMedia(2), createMedia(3)];
		render(<ReviewMediaUpload media={media} onChange={vi.fn()} />);
		expect(screen.getByText(/Limite de 3 photos atteinte/)).toBeInTheDocument();
	});

	it("renders photo list when media are present", () => {
		const media = [createMedia(1), createMedia(2)];
		render(<ReviewMediaUpload media={media} onChange={vi.fn()} />);
		expect(screen.getByRole("list", { name: "Photos ajoutées" })).toBeInTheDocument();
	});

	it("renders a listitem for each media", () => {
		const media = [createMedia(1), createMedia(2)];
		render(<ReviewMediaUpload media={media} onChange={vi.fn()} />);
		const items = screen.getAllByRole("listitem");
		expect(items.length).toBe(2);
	});

	it("does not render photo list when no media", () => {
		render(<ReviewMediaUpload media={[]} onChange={vi.fn()} />);
		expect(screen.queryByRole("list", { name: "Photos ajoutées" })).toBeNull();
	});

	it("renders remove button for each media", () => {
		const media = [createMedia(1), createMedia(2)];
		render(<ReviewMediaUpload media={media} onChange={vi.fn()} />);
		expect(screen.getByRole("button", { name: "Supprimer la photo 1" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Supprimer la photo 2" })).toBeInTheDocument();
	});

	it("calls onChange with filtered media when remove button is clicked", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		const media = [createMedia(1), createMedia(2)];
		render(<ReviewMediaUpload media={media} onChange={onChange} />);
		const removeButton = screen.getByRole("button", { name: "Supprimer la photo 1" });
		await user.click(removeButton);
		expect(onChange).toHaveBeenCalledWith([media[1]]);
	});

	it("calls onMediaRemoved with the URL when removing a media", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		const onMediaRemoved = vi.fn();
		const media = [createMedia(1)];
		render(<ReviewMediaUpload media={media} onChange={onChange} onMediaRemoved={onMediaRemoved} />);
		await user.click(screen.getByRole("button", { name: "Supprimer la photo 1" }));
		expect(onMediaRemoved).toHaveBeenCalledWith("https://example.com/photo-1.jpg");
	});

	it("disables remove buttons when disabled prop is true", () => {
		const media = [createMedia(1)];
		render(<ReviewMediaUpload media={media} onChange={vi.fn()} disabled={true} />);
		const removeButton = screen.getByRole("button", { name: "Supprimer la photo 1" });
		expect(removeButton).toBeDisabled();
	});

	it("does not render upload trigger when disabled", () => {
		render(<ReviewMediaUpload media={[]} onChange={vi.fn()} disabled={true} />);
		expect(screen.queryByTestId("upload-action-sheet")).toBeNull();
	});

	it("action sheet trigger label mentions adding photos", () => {
		render(<ReviewMediaUpload media={[]} onChange={vi.fn()} />);
		expect(screen.getByTestId("upload-action-sheet")).toHaveAttribute(
			"aria-label",
			"Ajouter des photos",
		);
	});
});
