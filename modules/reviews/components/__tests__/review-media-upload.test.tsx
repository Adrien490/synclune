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
	},
}));

vi.mock("next/image", () => ({
	default: ({ src, alt }: { src: string; alt: string; fill?: boolean }) => (
		<img src={src} alt={alt} />
	),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/media-upload/upload-progress", () => ({
	UploadProgress: ({
		progress,
		variant,
	}: {
		progress?: number;
		variant?: string;
		isProcessing?: boolean;
	}) => <div data-testid="upload-progress" data-progress={progress} data-variant={variant} />,
}));

vi.mock("@/modules/media/utils/uploadthing", () => ({
	UploadDropzone: ({
		"aria-label": ariaLabel,
		content,
	}: {
		endpoint: string;
		"aria-label"?: string;
		onUploadBegin?: () => void;
		onClientUploadComplete?: (res: unknown[]) => void;
		onUploadError?: (error: { message: string }) => void;
		config?: unknown;
		appearance?: unknown;
		content?: {
			label?: (args: { isUploading: boolean }) => React.ReactNode;
			uploadIcon?: (args: { isUploading: boolean; uploadProgress: number }) => React.ReactNode;
			allowedContent?: () => null;
			button?: () => React.ReactNode;
		};
	}) => (
		<div data-testid="upload-dropzone" aria-label={ariaLabel}>
			{content?.label?.({ isUploading: false })}
			{content?.button?.()}
		</div>
	),
}));

vi.mock("lucide-react", () => ({
	Camera: () => <svg data-testid="icon-camera" />,
	X: () => <svg data-testid="icon-x" />,
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

	it("renders the upload dropzone when media count is below limit", () => {
		render(<ReviewMediaUpload media={[]} onChange={vi.fn()} />);
		expect(screen.getByTestId("upload-dropzone")).toBeInTheDocument();
	});

	it("renders dropzone with correct aria-label", () => {
		render(<ReviewMediaUpload media={[]} onChange={vi.fn()} />);
		expect(screen.getByTestId("upload-dropzone")).toHaveAttribute(
			"aria-label",
			"Zone d'upload des photos pour l'avis",
		);
	});

	it("does not render upload dropzone when at max limit (3 media)", () => {
		const media = [createMedia(1), createMedia(2), createMedia(3)];
		render(<ReviewMediaUpload media={media} onChange={vi.fn()} />);
		expect(screen.queryByTestId("upload-dropzone")).toBeNull();
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

	it("does not render dropzone when disabled", () => {
		render(<ReviewMediaUpload media={[]} onChange={vi.fn()} disabled={true} />);
		expect(screen.queryByTestId("upload-dropzone")).toBeNull();
	});

	it("renders 'Ajouter des photos' text in dropzone", () => {
		render(<ReviewMediaUpload media={[]} onChange={vi.fn()} />);
		expect(screen.getAllByText("Ajouter des photos").length).toBeGreaterThan(0);
	});

	it("renders remaining count text correctly when 1 media present", () => {
		render(<ReviewMediaUpload media={[createMedia(1)]} onChange={vi.fn()} />);
		expect(screen.getByText(/2 restantes/)).toBeInTheDocument();
	});

	it("renders remaining count text correctly when no media present", () => {
		render(<ReviewMediaUpload media={[]} onChange={vi.fn()} />);
		expect(screen.getByText(/3 restantes/)).toBeInTheDocument();
	});
});
