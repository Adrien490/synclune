import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";

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
		onRemove,
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
				<>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={imageUrl} alt="primary" data-testid="primary-image" />
					<button data-testid="remove-button" onClick={onRemove}>
						Supprimer
					</button>
				</>
			) : (
				renderUploadZone?.()
			)}
		</div>
	),
}));

// Capture callbacks from UploadDropzone so tests can invoke them directly
let capturedOnChange: ((files: File[]) => Promise<void>) | undefined;
let capturedOnUploadError: ((error: Error) => void) | undefined;

vi.mock("@/modules/media/utils/uploadthing", () => ({
	UploadDropzone: (props: any) => {
		capturedOnChange = props.onChange;
		capturedOnUploadError = props.onUploadError;
		return <div data-testid="upload-dropzone" />;
	},
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
		capturedOnChange = undefined;
		capturedOnUploadError = undefined;
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

	// ─── onRemove ─────────────────────────────────────────────────────────────

	it("calls onChange with undefined when remove button is clicked", () => {
		const onChange = vi.fn();
		render(<SkuPrimaryImageField {...defaultProps} value={imageValue} onChange={onChange} />);

		screen.getByTestId("remove-button").click();

		expect(onChange).toHaveBeenCalledWith(undefined);
	});

	// ─── onChange: multiple files rejection ───────────────────────────────────

	it("shows toast.error when more than one file is provided", async () => {
		const { toast } = await import("sonner");
		render(<SkuPrimaryImageField {...defaultProps} />);

		const file1 = new File(["a"], "photo1.jpg", { type: "image/jpeg" });
		const file2 = new File(["b"], "photo2.jpg", { type: "image/jpeg" });

		await act(async () => {
			await capturedOnChange!([file1, file2]);
		});

		expect(toast.error).toHaveBeenCalledWith(
			"Vous ne pouvez uploader qu'une seule image principale",
		);
		expect(defaultProps.onChange).not.toHaveBeenCalled();
	});

	it("does not call startUpload when more than one file is provided", async () => {
		render(<SkuPrimaryImageField {...defaultProps} />);

		const file1 = new File(["a"], "photo1.jpg", { type: "image/jpeg" });
		const file2 = new File(["b"], "photo2.jpg", { type: "image/jpeg" });

		await act(async () => {
			await capturedOnChange!([file1, file2]);
		});

		expect(defaultProps.startUpload).not.toHaveBeenCalled();
	});

	// ─── onChange: video rejection ────────────────────────────────────────────

	it("shows toast.error when a video file is provided", async () => {
		const { toast } = await import("sonner");
		render(<SkuPrimaryImageField {...defaultProps} />);

		const videoFile = new File(["v"], "video.mp4", { type: "video/mp4" });

		await act(async () => {
			await capturedOnChange!([videoFile]);
		});

		expect(toast.error).toHaveBeenCalledWith(
			"Les vidéos ne peuvent pas être utilisées comme média principal",
		);
		expect(defaultProps.onChange).not.toHaveBeenCalled();
	});

	it("does not call startUpload when a video file is provided", async () => {
		render(<SkuPrimaryImageField {...defaultProps} />);

		const videoFile = new File(["v"], "video.mp4", { type: "video/mp4" });

		await act(async () => {
			await capturedOnChange!([videoFile]);
		});

		expect(defaultProps.startUpload).not.toHaveBeenCalled();
	});

	// ─── onChange: file size >16MB rejection ──────────────────────────────────

	it("shows toast.error when file exceeds 16MB", async () => {
		const { toast } = await import("sonner");
		render(<SkuPrimaryImageField {...defaultProps} />);

		const largeFile = new File(["x"], "large.jpg", { type: "image/jpeg" });
		Object.defineProperty(largeFile, "size", { value: 17 * 1024 * 1024 });

		await act(async () => {
			await capturedOnChange!([largeFile]);
		});

		expect(toast.error).toHaveBeenCalledWith("L'image dépasse la limite de 16MB");
		expect(defaultProps.onChange).not.toHaveBeenCalled();
	});

	it("does not call startUpload when file exceeds 16MB", async () => {
		render(<SkuPrimaryImageField {...defaultProps} />);

		const largeFile = new File(["x"], "large.jpg", { type: "image/jpeg" });
		Object.defineProperty(largeFile, "size", { value: 17 * 1024 * 1024 });

		await act(async () => {
			await capturedOnChange!([largeFile]);
		});

		expect(defaultProps.startUpload).not.toHaveBeenCalled();
	});

	it("accepts a file exactly at the 16MB limit", async () => {
		const { toast } = await import("sonner");
		const startUpload = vi
			.fn()
			.mockResolvedValue([
				{ serverData: { url: "https://cdn.example.com/img.jpg", blurDataUrl: null } },
			]);
		render(<SkuPrimaryImageField {...defaultProps} startUpload={startUpload} />);

		const edgeFile = new File(["x"], "edge.jpg", { type: "image/jpeg" });
		Object.defineProperty(edgeFile, "size", { value: 16 * 1024 * 1024 });

		await act(async () => {
			await capturedOnChange!([edgeFile]);
		});

		expect(toast.error).not.toHaveBeenCalled();
		expect(startUpload).toHaveBeenCalledWith([edgeFile]);
	});

	// ─── onChange: startUpload throws ────────────────────────────────────────

	it("shows toast.error when startUpload throws", async () => {
		const { toast } = await import("sonner");
		const startUpload = vi.fn().mockRejectedValue(new Error("network error"));
		render(<SkuPrimaryImageField {...defaultProps} startUpload={startUpload} />);

		const validFile = new File(["x"], "photo.jpg", { type: "image/jpeg" });

		await act(async () => {
			await capturedOnChange!([validFile]);
		});

		expect(toast.error).toHaveBeenCalledWith("Échec de l'upload");
		expect(defaultProps.onChange).not.toHaveBeenCalled();
	});

	// ─── onChange: successful upload ─────────────────────────────────────────

	it("calls onChange with MediaData on successful upload", async () => {
		const onChange = vi.fn();
		const startUpload = vi.fn().mockResolvedValue([
			{
				serverData: {
					url: "https://cdn.example.com/img.jpg",
					blurDataUrl: "data:image/jpeg;base64,blur",
				},
			},
		]);
		render(
			<SkuPrimaryImageField
				{...defaultProps}
				onChange={onChange}
				startUpload={startUpload}
				productName="Bague Or"
			/>,
		);

		const validFile = new File(["x"], "photo.jpg", { type: "image/jpeg" });

		await act(async () => {
			await capturedOnChange!([validFile]);
		});

		expect(onChange).toHaveBeenCalledWith({
			url: "https://cdn.example.com/img.jpg",
			thumbnailUrl: undefined,
			blurDataUrl: "data:image/jpeg;base64,blur",
			altText: "Bague Or",
			mediaType: "IMAGE",
		});
	});

	it("calls onChange with blurDataUrl undefined when server returns null", async () => {
		const onChange = vi.fn();
		const startUpload = vi
			.fn()
			.mockResolvedValue([
				{ serverData: { url: "https://cdn.example.com/img.jpg", blurDataUrl: null } },
			]);
		render(
			<SkuPrimaryImageField {...defaultProps} onChange={onChange} startUpload={startUpload} />,
		);

		const validFile = new File(["x"], "photo.jpg", { type: "image/jpeg" });

		await act(async () => {
			await capturedOnChange!([validFile]);
		});

		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ blurDataUrl: undefined }));
	});

	it("does not call onChange when startUpload returns empty array", async () => {
		const onChange = vi.fn();
		const startUpload = vi.fn().mockResolvedValue([]);
		render(
			<SkuPrimaryImageField {...defaultProps} onChange={onChange} startUpload={startUpload} />,
		);

		const validFile = new File(["x"], "photo.jpg", { type: "image/jpeg" });

		await act(async () => {
			await capturedOnChange!([validFile]);
		});

		expect(onChange).not.toHaveBeenCalled();
	});

	it("does not call onChange when startUpload returns undefined", async () => {
		const onChange = vi.fn();
		const startUpload = vi.fn().mockResolvedValue(undefined);
		render(
			<SkuPrimaryImageField {...defaultProps} onChange={onChange} startUpload={startUpload} />,
		);

		const validFile = new File(["x"], "photo.jpg", { type: "image/jpeg" });

		await act(async () => {
			await capturedOnChange!([validFile]);
		});

		expect(onChange).not.toHaveBeenCalled();
	});

	it("does not show toast.error on successful upload", async () => {
		const { toast } = await import("sonner");
		const startUpload = vi
			.fn()
			.mockResolvedValue([
				{ serverData: { url: "https://cdn.example.com/img.jpg", blurDataUrl: null } },
			]);
		render(<SkuPrimaryImageField {...defaultProps} startUpload={startUpload} />);

		const validFile = new File(["x"], "photo.jpg", { type: "image/jpeg" });

		await act(async () => {
			await capturedOnChange!([validFile]);
		});

		expect(toast.error).not.toHaveBeenCalled();
	});

	// ─── onChange: empty files array ─────────────────────────────────────────

	it("does nothing when files array is empty", async () => {
		const { toast } = await import("sonner");
		render(<SkuPrimaryImageField {...defaultProps} />);

		await act(async () => {
			await capturedOnChange!([]);
		});

		expect(toast.error).not.toHaveBeenCalled();
		expect(defaultProps.startUpload).not.toHaveBeenCalled();
		expect(defaultProps.onChange).not.toHaveBeenCalled();
	});

	// ─── onUploadError callback ───────────────────────────────────────────────

	it("shows toast.error with error message on upload error", async () => {
		const { toast } = await import("sonner");
		render(<SkuPrimaryImageField {...defaultProps} />);

		act(() => {
			capturedOnUploadError!(new Error("connexion refusée"));
		});

		expect(toast.error).toHaveBeenCalledWith("Erreur: connexion refusée");
	});

	it("shows toast.error with empty string when error has no message", async () => {
		const { toast } = await import("sonner");
		render(<SkuPrimaryImageField {...defaultProps} />);

		act(() => {
			capturedOnUploadError!(new Error(""));
		});

		expect(toast.error).toHaveBeenCalledWith("Erreur: ");
	});
});
