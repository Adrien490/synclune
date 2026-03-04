import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook, act, waitFor } from "@testing-library/react";

// ============================================================================
// MOCKS — vi.hoisted ensures variables are available when vi.mock factories run
// ============================================================================

const {
	mockStartUpload,
	mockIsUploadThingUploading,
	mockGenerateVideoThumbnail,
	mockIsThumbnailGenerationSupported,
	mockDeleteUploadThingFilesFromUrls,
	mockWithRetry,
} = vi.hoisted(() => ({
	mockStartUpload: vi.fn(),
	mockIsUploadThingUploading: vi.fn().mockReturnValue(false),
	mockGenerateVideoThumbnail: vi.fn(),
	mockIsThumbnailGenerationSupported: vi.fn().mockReturnValue(true),
	mockDeleteUploadThingFilesFromUrls: vi.fn().mockResolvedValue({ deleted: 0, failed: 0 }),
	mockWithRetry: vi.fn(),
}));

vi.mock("@/modules/media/utils/uploadthing", () => ({
	useUploadThing: () => ({
		startUpload: mockStartUpload,
		isUploading: mockIsUploadThingUploading(),
	}),
}));

vi.mock("../hooks/use-video-thumbnail", () => ({
	generateVideoThumbnail: (...args: unknown[]) => mockGenerateVideoThumbnail(...args),
	isThumbnailGenerationSupported: () => mockIsThumbnailGenerationSupported(),
}));

vi.mock("../services/delete-uploadthing-files.service", () => ({
	deleteUploadThingFilesFromUrls: (...args: unknown[]) =>
		mockDeleteUploadThingFilesFromUrls(...args),
}));

vi.mock("@/shared/utils/with-retry", () => ({
	withRetry: (fn: () => unknown, opts: unknown) => mockWithRetry(fn, opts),
}));

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		warning: vi.fn(),
	},
}));

import { toast } from "sonner";
import { useMediaUpload } from "../hooks/use-media-upload";

// ============================================================================
// HELPERS
// ============================================================================

function createFile(name: string, size: number, type: string): File {
	const buffer = new ArrayBuffer(size);
	return new File([buffer], name, { type });
}

function createImageFile(name = "photo.jpg", size = 1024): File {
	return createFile(name, size, "image/jpeg");
}

function createVideoFile(name = "video.mp4", size = 2048): File {
	return createFile(name, size, "video/mp4");
}

function createOversizedImageFile(): File {
	return createFile("huge.jpg", 20 * 1024 * 1024, "image/jpeg"); // 20MB > 16MB default
}

function createOversizedVideoFile(): File {
	return createFile("huge.mp4", 600 * 1024 * 1024, "video/mp4"); // 600MB > 512MB default
}

// ============================================================================
// TESTS
// ============================================================================

describe("useMediaUpload", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Default: withRetry just calls fn() directly
		mockWithRetry.mockImplementation((fn: () => unknown) => fn());
		// Default: thumbnail generation supported
		mockIsThumbnailGenerationSupported.mockReturnValue(true);
		// Default: delete returns success
		mockDeleteUploadThingFilesFromUrls.mockResolvedValue({ deleted: 0, failed: 0 });
	});

	afterEach(() => {
		cleanup();
	});

	// ========================================================================
	// INITIALIZATION
	// ========================================================================

	describe("initialization", () => {
		it("should return the expected API shape", () => {
			const { result } = renderHook(() => useMediaUpload());

			expect(result.current.upload).toBeTypeOf("function");
			expect(result.current.uploadSingle).toBeTypeOf("function");
			expect(result.current.validateFiles).toBeTypeOf("function");
			expect(result.current.cancel).toBeTypeOf("function");
			expect(result.current.getMediaType).toBeTypeOf("function");
			expect(result.current.isOversized).toBeTypeOf("function");
			expect(result.current.isUploading).toBe(false);
			expect(result.current.progress).toBeNull();
		});
	});

	// ========================================================================
	// UTILITIES
	// ========================================================================

	describe("getMediaType", () => {
		it("should return IMAGE for image files", () => {
			const { result } = renderHook(() => useMediaUpload());
			expect(result.current.getMediaType(createImageFile())).toBe("IMAGE");
		});

		it("should return VIDEO for video files", () => {
			const { result } = renderHook(() => useMediaUpload());
			expect(result.current.getMediaType(createVideoFile())).toBe("VIDEO");
		});
	});

	describe("isOversized", () => {
		it("should return false for normal-sized images", () => {
			const { result } = renderHook(() => useMediaUpload());
			expect(result.current.isOversized(createImageFile())).toBe(false);
		});

		it("should return true for oversized images", () => {
			const { result } = renderHook(() => useMediaUpload());
			expect(result.current.isOversized(createOversizedImageFile())).toBe(true);
		});

		it("should return true for oversized videos", () => {
			const { result } = renderHook(() => useMediaUpload());
			expect(result.current.isOversized(createOversizedVideoFile())).toBe(true);
		});

		it("should respect custom maxSizeImage", () => {
			const { result } = renderHook(() => useMediaUpload({ maxSizeImage: 500 }));
			expect(result.current.isOversized(createImageFile("photo.jpg", 600))).toBe(true);
		});

		it("should respect custom maxSizeVideo", () => {
			const { result } = renderHook(() => useMediaUpload({ maxSizeVideo: 1000 }));
			expect(result.current.isOversized(createVideoFile("clip.mp4", 1100))).toBe(true);
		});
	});

	// ========================================================================
	// VALIDATION
	// ========================================================================

	describe("validateFiles", () => {
		it("should filter out oversized files and show a toast", () => {
			const { result } = renderHook(() => useMediaUpload());

			const files = [createImageFile("ok.jpg", 1024), createOversizedImageFile()];
			const valid = result.current.validateFiles(files);

			expect(valid).toHaveLength(1);
			expect(valid[0]!.name).toBe("ok.jpg");
			expect(toast.error).toHaveBeenCalledWith(
				expect.stringContaining("1 fichier(s) trop volumineux"),
				expect.any(Object),
			);
		});

		it("should truncate to maxFiles and show a warning toast", () => {
			const { result } = renderHook(() => useMediaUpload({ maxFiles: 2 }));

			const files = [createImageFile("a.jpg"), createImageFile("b.jpg"), createImageFile("c.jpg")];
			const valid = result.current.validateFiles(files);

			expect(valid).toHaveLength(2);
			expect(toast.warning).toHaveBeenCalledWith(
				expect.stringContaining("Maximum 2 fichiers"),
				expect.any(Object),
			);
		});

		it("should return all files when within limits", () => {
			const { result } = renderHook(() => useMediaUpload());
			const files = [createImageFile("a.jpg"), createImageFile("b.jpg")];
			const valid = result.current.validateFiles(files);

			expect(valid).toHaveLength(2);
			expect(toast.error).not.toHaveBeenCalled();
			expect(toast.warning).not.toHaveBeenCalled();
		});
	});

	// ========================================================================
	// IMAGE UPLOAD
	// ========================================================================

	describe("upload images", () => {
		it("should upload images in batch and return results", async () => {
			mockStartUpload.mockResolvedValue([
				{ serverData: { url: "https://utfs.io/f/img1.jpg", blurDataUrl: "blur1" } },
				{ serverData: { url: "https://utfs.io/f/img2.jpg", blurDataUrl: "blur2" } },
			]);

			const onSuccess = vi.fn();
			const { result } = renderHook(() => useMediaUpload({ onSuccess }));

			let results: unknown;
			await act(async () => {
				results = await result.current.upload([createImageFile("a.jpg"), createImageFile("b.jpg")]);
			});

			expect(results).toHaveLength(2);
			expect(results).toEqual([
				{
					url: "https://utfs.io/f/img1.jpg",
					mediaType: "IMAGE",
					fileName: "a.jpg",
					blurDataUrl: "blur1",
				},
				{
					url: "https://utfs.io/f/img2.jpg",
					mediaType: "IMAGE",
					fileName: "b.jpg",
					blurDataUrl: "blur2",
				},
			]);
			expect(onSuccess).toHaveBeenCalledWith(results);
		});

		it("should return empty array for empty input", async () => {
			const { result } = renderHook(() => useMediaUpload());

			let results: unknown;
			await act(async () => {
				results = await result.current.upload([]);
			});

			expect(results).toEqual([]);
			expect(mockStartUpload).not.toHaveBeenCalled();
		});
	});

	// ========================================================================
	// VIDEO UPLOAD
	// ========================================================================

	describe("upload videos", () => {
		it("should generate thumbnail and upload video", async () => {
			const thumbnailFile = createImageFile("thumb.jpg", 512);
			mockGenerateVideoThumbnail.mockResolvedValue({
				thumbnailFile,
				previewUrl: "blob:preview",
				blurDataUrl: "data:blur",
				capturedAt: 0.25,
			});

			// First call: thumbnail upload, Second call: video upload
			mockStartUpload
				.mockResolvedValueOnce([{ serverData: { url: "https://utfs.io/f/thumb.jpg" } }])
				.mockResolvedValueOnce([{ serverData: { url: "https://utfs.io/f/video.mp4" } }]);

			const revokeObjectURL = vi.fn();
			vi.stubGlobal("URL", { ...URL, revokeObjectURL });

			const { result } = renderHook(() => useMediaUpload());

			let results: unknown;
			await act(async () => {
				results = await result.current.upload([createVideoFile("clip.mp4")]);
			});

			expect(mockGenerateVideoThumbnail).toHaveBeenCalled();
			expect(results).toHaveLength(1);
			expect(results).toEqual([
				{
					url: "https://utfs.io/f/video.mp4",
					mediaType: "VIDEO",
					fileName: "clip.mp4",
					thumbnailUrl: "https://utfs.io/f/thumb.jpg",
					blurDataUrl: "data:blur",
				},
			]);

			vi.unstubAllGlobals();
		});

		it("should continue without thumbnail when generation fails", async () => {
			mockGenerateVideoThumbnail.mockRejectedValue(new Error("Canvas error"));

			mockStartUpload.mockResolvedValueOnce([
				{ serverData: { url: "https://utfs.io/f/video.mp4" } },
			]);

			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

			const { result } = renderHook(() => useMediaUpload());

			let results: unknown;
			await act(async () => {
				results = await result.current.upload([createVideoFile("clip.mp4")]);
			});

			expect(results).toHaveLength(1);
			expect((results as { thumbnailUrl?: string }[])[0]?.thumbnailUrl).toBeUndefined();

			warnSpy.mockRestore();
		});

		it("should skip thumbnail generation when not supported", async () => {
			mockIsThumbnailGenerationSupported.mockReturnValue(false);

			mockStartUpload.mockResolvedValueOnce([
				{ serverData: { url: "https://utfs.io/f/video.mp4" } },
			]);

			const { result } = renderHook(() => useMediaUpload());

			await act(async () => {
				await result.current.upload([createVideoFile("clip.mp4")]);
			});

			expect(mockGenerateVideoThumbnail).not.toHaveBeenCalled();
		});
	});

	// ========================================================================
	// MIXED MEDIA
	// ========================================================================

	describe("mixed media types", () => {
		it("should handle images and videos together", async () => {
			// Image batch upload
			mockStartUpload.mockResolvedValueOnce([
				{ serverData: { url: "https://utfs.io/f/img.jpg", blurDataUrl: "blur" } },
			]);

			// Thumbnail generation disabled to simplify
			mockIsThumbnailGenerationSupported.mockReturnValue(false);

			// Video upload
			mockStartUpload.mockResolvedValueOnce([
				{ serverData: { url: "https://utfs.io/f/video.mp4" } },
			]);

			const { result } = renderHook(() => useMediaUpload());

			let results: unknown;
			await act(async () => {
				results = await result.current.upload([
					createImageFile("photo.jpg"),
					createVideoFile("clip.mp4"),
				]);
			});

			expect(results).toHaveLength(2);
			expect((results as { mediaType: string }[])[0]?.mediaType).toBe("IMAGE");
			expect((results as { mediaType: string }[])[1]?.mediaType).toBe("VIDEO");
		});
	});

	// ========================================================================
	// UPLOAD SINGLE
	// ========================================================================

	describe("uploadSingle", () => {
		it("should upload a single file and return the result", async () => {
			mockStartUpload.mockResolvedValue([
				{ serverData: { url: "https://utfs.io/f/single.jpg", blurDataUrl: "blur" } },
			]);

			const { result } = renderHook(() => useMediaUpload());

			let uploadResult: unknown;
			await act(async () => {
				uploadResult = await result.current.uploadSingle(createImageFile("single.jpg"));
			});

			expect(uploadResult).toEqual({
				url: "https://utfs.io/f/single.jpg",
				mediaType: "IMAGE",
				fileName: "single.jpg",
				blurDataUrl: "blur",
			});
		});

		it("should return null when upload produces no results", async () => {
			mockStartUpload.mockResolvedValue([]);

			const { result } = renderHook(() => useMediaUpload());

			let uploadResult: unknown;
			await act(async () => {
				uploadResult = await result.current.uploadSingle(createImageFile("empty.jpg"));
			});

			expect(uploadResult).toBeNull();
		});
	});

	// ========================================================================
	// CANCELLATION
	// ========================================================================

	describe("cancellation", () => {
		it("should set progress to null when cancel is called", () => {
			const { result } = renderHook(() => useMediaUpload());

			act(() => {
				result.current.cancel();
			});

			expect(result.current.progress).toBeNull();
		});

		it("should cleanup on unmount without errors", () => {
			const { unmount } = renderHook(() => useMediaUpload());
			expect(() => unmount()).not.toThrow();
		});
	});

	// ========================================================================
	// ERROR HANDLING
	// ========================================================================

	describe("error handling", () => {
		it("should call onError and show toast on upload failure", async () => {
			mockWithRetry.mockRejectedValue(new Error("Network failure"));

			const onError = vi.fn();
			const { result } = renderHook(() => useMediaUpload({ onError }));

			await act(async () => {
				await result.current.upload([createImageFile("fail.jpg")]);
			});

			expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "Network failure" }));
			expect(toast.error).toHaveBeenCalledWith("Echec de l'upload", expect.any(Object));
		});

		it("should return partial results when error occurs after some uploads", async () => {
			// First call succeeds (images), second call fails (videos)
			let callCount = 0;
			mockWithRetry.mockImplementation((fn: () => unknown) => {
				callCount++;
				if (callCount > 1) {
					return Promise.reject(new Error("Video upload failed"));
				}
				return fn();
			});

			mockStartUpload.mockResolvedValueOnce([
				{ serverData: { url: "https://utfs.io/f/img.jpg", blurDataUrl: "blur" } },
			]);

			mockIsThumbnailGenerationSupported.mockReturnValue(false);

			const onError = vi.fn();
			const { result } = renderHook(() => useMediaUpload({ onError }));

			let results: unknown;
			await act(async () => {
				results = await result.current.upload([
					createImageFile("ok.jpg"),
					createVideoFile("fail.mp4"),
				]);
			});

			// Should return the image that was uploaded successfully
			expect(results).toHaveLength(1);
			expect((results as { fileName: string }[])[0]?.fileName).toBe("ok.jpg");
		});

		it("should cleanup orphan thumbnail when video upload fails", async () => {
			const thumbnailFile = createImageFile("thumb.jpg");
			mockGenerateVideoThumbnail.mockResolvedValue({
				thumbnailFile,
				previewUrl: "blob:preview",
				blurDataUrl: "data:blur",
				capturedAt: 0.25,
			});

			// startUpload: first call (thumbnail) succeeds, second call (video) rejects
			mockStartUpload
				.mockResolvedValueOnce([{ serverData: { url: "https://utfs.io/f/thumb.jpg" } }])
				.mockRejectedValueOnce(new Error("Video upload failed"));

			vi.stubGlobal("URL", { ...URL, revokeObjectURL: vi.fn() });
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

			const { result } = renderHook(() => useMediaUpload());

			await act(async () => {
				await result.current.upload([createVideoFile("fail.mp4")]);
			});

			// Fire-and-forget cleanup — flush microtasks before asserting
			await waitFor(() => {
				expect(mockDeleteUploadThingFilesFromUrls).toHaveBeenCalledWith([
					"https://utfs.io/f/thumb.jpg",
				]);
			});

			warnSpy.mockRestore();
			vi.unstubAllGlobals();
		});
	});

	// ========================================================================
	// PROGRESS TRACKING
	// ========================================================================

	describe("progress tracking", () => {
		it("should call onProgress with phase updates", async () => {
			mockStartUpload.mockResolvedValue([
				{ serverData: { url: "https://utfs.io/f/img.jpg", blurDataUrl: "blur" } },
			]);

			const phases: string[] = [];
			const onProgress = vi.fn((p: { phase: string }) => {
				phases.push(p.phase);
			});
			const { result } = renderHook(() => useMediaUpload({ onProgress }));

			await act(async () => {
				await result.current.upload([createImageFile("photo.jpg")]);
			});

			expect(phases).toContain("validating");
			expect(phases).toContain("uploading");
			expect(phases).toContain("done");
		});

		it("should reset progress after upload completes", async () => {
			mockStartUpload.mockResolvedValue([{ serverData: { url: "https://utfs.io/f/img.jpg" } }]);

			const { result } = renderHook(() => useMediaUpload());

			await act(async () => {
				await result.current.upload([createImageFile()]);
			});

			// Progress reset happens after a 1s timeout
			await waitFor(
				() => {
					expect(result.current.progress).toBeNull();
				},
				{ timeout: 2000 },
			);
		});
	});
});
