import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";

const {
	mockGenerateVideoThumbnail,
	mockIsThumbnailGenerationSupported,
	mockDeleteUploadThingFile,
	mockWithRetry,
	mockRevokeObjectURL,
} = vi.hoisted(() => ({
	mockGenerateVideoThumbnail: vi.fn(),
	mockIsThumbnailGenerationSupported: vi.fn(() => true),
	mockDeleteUploadThingFile: vi.fn().mockResolvedValue({ status: "success" }),
	mockWithRetry: vi.fn((fn: () => unknown) => fn()),
	mockRevokeObjectURL: vi.fn(),
}));

vi.mock("@/modules/media/hooks/use-video-thumbnail", () => ({
	generateVideoThumbnail: (...args: unknown[]) => mockGenerateVideoThumbnail(...args),
	isThumbnailGenerationSupported: () => mockIsThumbnailGenerationSupported(),
}));

vi.mock("@/modules/media/actions/delete-uploadthing-file", () => ({
	deleteUploadThingFile: (...args: unknown[]) => mockDeleteUploadThingFile(...args),
}));

vi.mock("@/shared/utils/with-retry", () => ({
	withRetry: (fn: () => unknown) => mockWithRetry(fn),
}));

import { useVideoThumbnailUpload } from "../use-video-thumbnail-upload";

beforeEach(() => {
	vi.stubGlobal("URL", { revokeObjectURL: mockRevokeObjectURL, createObjectURL: vi.fn() });
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	vi.unstubAllGlobals();
});

function makeFakeVideo() {
	return new File(["video-bytes"], "clip.mp4", { type: "video/mp4" });
}

describe("useVideoThumbnailUpload", () => {
	it("retourne {} si la génération de thumbnail n'est pas supportée", async () => {
		mockIsThumbnailGenerationSupported.mockReturnValueOnce(false);
		const startUpload = vi.fn();
		const { result } = renderHook(() => useVideoThumbnailUpload({ startUpload }));

		const out = await result.current.uploadThumbnailForVideo(
			makeFakeVideo(),
			new AbortController().signal,
		);

		expect(out).toEqual({});
		expect(startUpload).not.toHaveBeenCalled();
	});

	it("génère, uploade et retourne thumbnailUrl + blurDataUrl", async () => {
		const thumbnailFile = new File(["thumb"], "thumb.jpg", { type: "image/jpeg" });
		mockGenerateVideoThumbnail.mockResolvedValue({
			thumbnailFile,
			blurDataUrl: "data:image/png;base64,XXX",
			previewUrl: "blob:preview",
		});
		const startUpload = vi
			.fn()
			.mockResolvedValue([{ serverData: { url: "https://utfs.io/f/thumb.jpg" } }]);

		const { result } = renderHook(() => useVideoThumbnailUpload({ startUpload }));
		const out = await result.current.uploadThumbnailForVideo(
			makeFakeVideo(),
			new AbortController().signal,
		);

		expect(out).toEqual({
			thumbnailUrl: "https://utfs.io/f/thumb.jpg",
			blurDataUrl: "data:image/png;base64,XXX",
		});
		expect(startUpload).toHaveBeenCalledWith([thumbnailFile]);
		expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:preview");
	});

	it("retourne {} et revoke la preview si la génération throw (non-abort)", async () => {
		mockGenerateVideoThumbnail.mockRejectedValue(new Error("Canvas indisponible"));
		const startUpload = vi.fn();

		const { result } = renderHook(() => useVideoThumbnailUpload({ startUpload }));
		const out = await result.current.uploadThumbnailForVideo(
			makeFakeVideo(),
			new AbortController().signal,
		);

		expect(out).toEqual({});
		expect(startUpload).not.toHaveBeenCalled();
	});

	it("rethrow AbortError pour propager l'annulation parent", async () => {
		mockGenerateVideoThumbnail.mockRejectedValue(new DOMException("Aborted", "AbortError"));
		const startUpload = vi.fn();

		const { result } = renderHook(() => useVideoThumbnailUpload({ startUpload }));

		await expect(
			result.current.uploadThumbnailForVideo(makeFakeVideo(), new AbortController().signal),
		).rejects.toThrow("Aborted");
	});

	it("revoke la preview même quand l'upload thumbnail throw", async () => {
		mockGenerateVideoThumbnail.mockResolvedValue({
			thumbnailFile: new File([""], "t.jpg", { type: "image/jpeg" }),
			blurDataUrl: "blur",
			previewUrl: "blob:preview-error",
		});
		const startUpload = vi.fn().mockRejectedValue(new Error("UploadThing 500"));

		const { result } = renderHook(() => useVideoThumbnailUpload({ startUpload }));
		const out = await result.current.uploadThumbnailForVideo(
			makeFakeVideo(),
			new AbortController().signal,
		);

		expect(out).toEqual({});
		expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:preview-error");
	});

	it("cleanupOrphanThumbnail appelle deleteUploadThingFile en fire-and-forget", async () => {
		const { result } = renderHook(() => useVideoThumbnailUpload({ startUpload: vi.fn() }));

		result.current.cleanupOrphanThumbnail("https://utfs.io/f/orphan.jpg");

		// fire-and-forget : on attend une microtask pour que le void async exécute
		await Promise.resolve();
		await Promise.resolve();

		expect(mockDeleteUploadThingFile).toHaveBeenCalledTimes(1);
		const [prev, formData] = mockDeleteUploadThingFile.mock.calls[0]!;
		expect(prev).toBeUndefined();
		expect(formData.get("fileUrl")).toBe("https://utfs.io/f/orphan.jpg");
	});

	it("cleanupOrphanThumbnail ne throw pas si l'action delete rejette", async () => {
		mockDeleteUploadThingFile.mockRejectedValueOnce(new Error("UploadThing down"));
		const { result } = renderHook(() => useVideoThumbnailUpload({ startUpload: vi.fn() }));

		// Doit pas throw sync ni async
		expect(() =>
			result.current.cleanupOrphanThumbnail("https://utfs.io/f/orphan.jpg"),
		).not.toThrow();
		await Promise.resolve();
		await Promise.resolve();
	});
});
