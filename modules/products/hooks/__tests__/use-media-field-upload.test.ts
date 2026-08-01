import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook, act } from "@testing-library/react";

// ============================================================================
// MOCKS — declared before imports that depend on them
// ============================================================================

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		warning: vi.fn(),
	},
}));

import { toast } from "sonner";
import { useMediaFieldUpload } from "../use-media-field-upload";

// ============================================================================
// HELPERS
// ============================================================================

interface MediaValue {
	url: string;
	mediaType: "IMAGE" | "VIDEO";
	altText?: string;
	thumbnailUrl?: string | null;
	blurDataUrl?: string;
}

function createFile(name: string, type: string): File {
	return new File(["content"], name, { type });
}

function createImageFile(name = "photo.jpg"): File {
	return createFile(name, "image/jpeg");
}

function createVideoFile(name = "video.mp4"): File {
	return createFile(name, "video/mp4");
}

function createMockField(initialValues: MediaValue[] = []) {
	return {
		state: { value: [...initialValues] as MediaValue[] },
		pushValue: vi.fn(),
	};
}

function createUploadResult(url: string, mediaType: "IMAGE" | "VIDEO" = "IMAGE") {
	return { url, mediaType };
}

// ============================================================================
// TESTS
// ============================================================================

describe("useMediaFieldUpload", () => {
	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it("retourne une fonction handleUpload", () => {
		const mockUploadMedia = vi.fn().mockResolvedValue([]);
		const { result } = renderHook(() =>
			useMediaFieldUpload({
				uploadMedia: mockUploadMedia,
				getAltText: () => undefined,
			}),
		);

		expect(typeof result.current.handleUpload).toBe("function");
	});

	describe("upload d'images", () => {
		it("appelle uploadMedia et pushValue pour chaque résultat", async () => {
			const mockUploadMedia = vi
				.fn()
				.mockResolvedValue([
					createUploadResult("https://cdn.example.com/img1.jpg", "IMAGE"),
					createUploadResult("https://cdn.example.com/img2.jpg", "IMAGE"),
				]);
			const field = createMockField();

			const { result } = renderHook(() =>
				useMediaFieldUpload({
					uploadMedia: mockUploadMedia,
					getAltText: () => undefined,
				}),
			);

			await act(async () => {
				await result.current.handleUpload(
					[createImageFile("img1.jpg"), createImageFile("img2.jpg")],
					field,
				);
			});

			expect(mockUploadMedia).toHaveBeenCalledOnce();
			expect(field.pushValue).toHaveBeenCalledTimes(2);
			expect(field.pushValue).toHaveBeenCalledWith(
				expect.objectContaining({ url: "https://cdn.example.com/img1.jpg", mediaType: "IMAGE" }),
			);
			expect(field.pushValue).toHaveBeenCalledWith(
				expect.objectContaining({ url: "https://cdn.example.com/img2.jpg", mediaType: "IMAGE" }),
			);
		});

		// Le serveur mesure width/height à l'upload ; un pushValue qui les omet
		// les perdait dès l'ajout, et l'action les persistait à NULL.
		it("transmet width/height du résultat d'upload à pushValue", async () => {
			const mockUploadMedia = vi.fn().mockResolvedValue([
				{
					...createUploadResult("https://cdn.example.com/img1.jpg", "IMAGE"),
					width: 1600,
					height: 1200,
				},
			]);
			const field = createMockField();

			const { result } = renderHook(() =>
				useMediaFieldUpload({
					uploadMedia: mockUploadMedia,
					getAltText: () => undefined,
				}),
			);

			await act(async () => {
				await result.current.handleUpload([createImageFile("img1.jpg")], field);
			});

			expect(field.pushValue).toHaveBeenCalledWith(
				expect.objectContaining({ width: 1600, height: 1200 }),
			);
		});
	});

	describe("vidéo en première position sur un champ vide", () => {
		it("affiche une erreur toast et n'appelle pas uploadMedia", async () => {
			const mockUploadMedia = vi.fn().mockResolvedValue([]);
			// Empty field: length === 0
			const field = createMockField([]);

			const { result } = renderHook(() =>
				useMediaFieldUpload({
					uploadMedia: mockUploadMedia,
					getAltText: () => undefined,
				}),
			);

			await act(async () => {
				await result.current.handleUpload([createVideoFile()], field);
			});

			expect(toast.error).toHaveBeenCalledOnce();
			expect(mockUploadMedia).not.toHaveBeenCalled();
			expect(field.pushValue).not.toHaveBeenCalled();
		});
	});

	describe("upload mixte images + vidéos", () => {
		it("trie les images avant les vidéos dans le tableau envoyé à uploadMedia", async () => {
			// Capture the files array passed to uploadMedia
			let capturedFiles: File[] = [];
			const mockUploadMedia = vi.fn().mockImplementation(async (files: File[]) => {
				capturedFiles = files;
				return [];
			});
			// Field already has one image so video-first guard does not trigger
			const existingImage: MediaValue = {
				url: "https://cdn.example.com/existing.jpg",
				mediaType: "IMAGE",
			};
			const field = createMockField([existingImage]);

			const { result } = renderHook(() =>
				useMediaFieldUpload({
					uploadMedia: mockUploadMedia,
					getAltText: () => undefined,
				}),
			);

			const video = createVideoFile("clip.mp4");
			const image = createImageFile("new.jpg");

			await act(async () => {
				// Pass video first intentionally — hook should reorder
				await result.current.handleUpload([video, image], field);
			});

			expect(mockUploadMedia).toHaveBeenCalledOnce();
			// Image must come before video in the sorted array
			expect(capturedFiles[0]?.type).toBe("image/jpeg");
			expect(capturedFiles[1]?.type).toBe("video/mp4");
		});
	});

	describe("enforcement de la limite", () => {
		it("n'uploade que les créneaux restants et affiche un toast warning pour les fichiers ignorés", async () => {
			const MAX = 6;
			// 4 slots already used → 2 remaining
			const existing: MediaValue[] = Array.from({ length: 4 }, (_, i) => ({
				url: `https://cdn.example.com/img${i}.jpg`,
				mediaType: "IMAGE",
			}));
			const field = createMockField(existing);

			const mockUploadMedia = vi
				.fn()
				.mockResolvedValue([
					createUploadResult("https://cdn.example.com/new1.jpg", "IMAGE"),
					createUploadResult("https://cdn.example.com/new2.jpg", "IMAGE"),
				]);

			const { result } = renderHook(() =>
				useMediaFieldUpload({
					uploadMedia: mockUploadMedia,
					getAltText: () => undefined,
					maxCount: MAX,
				}),
			);

			// Attempt to upload 4 files when only 2 slots remain
			const files = [
				createImageFile("a.jpg"),
				createImageFile("b.jpg"),
				createImageFile("c.jpg"),
				createImageFile("d.jpg"),
			];

			await act(async () => {
				await result.current.handleUpload(files, field);
			});

			// Only 2 files sent to uploadMedia
			const [uploadedFiles] = mockUploadMedia.mock.calls[0] as [File[]];
			expect(uploadedFiles).toHaveLength(2);

			// Warning shown for the 2 dropped files
			expect(toast.warning).toHaveBeenCalledOnce();

			// pushValue called for each result (2)
			expect(field.pushValue).toHaveBeenCalledTimes(2);
		});

		it("n'appelle pas uploadMedia si tous les créneaux sont occupés", async () => {
			const MAX = 6;
			const existing: MediaValue[] = Array.from({ length: 6 }, (_, i) => ({
				url: `https://cdn.example.com/img${i}.jpg`,
				mediaType: "IMAGE",
			}));
			const field = createMockField(existing);

			const mockUploadMedia = vi.fn().mockResolvedValue([]);

			const { result } = renderHook(() =>
				useMediaFieldUpload({
					uploadMedia: mockUploadMedia,
					getAltText: () => undefined,
					maxCount: MAX,
				}),
			);

			await act(async () => {
				await result.current.handleUpload([createImageFile()], field);
			});

			// Warning shown (0 remaining, 1 file dropped)
			expect(toast.warning).toHaveBeenCalledOnce();
			// uploadMedia must not be called (filesToUpload is empty after slice(0, 0))
			expect(mockUploadMedia).not.toHaveBeenCalled();
			expect(field.pushValue).not.toHaveBeenCalled();
		});
	});

	describe("transmission du altText", () => {
		it("lit le altText depuis getAltText() et le passe à chaque pushValue", async () => {
			const mockUploadMedia = vi
				.fn()
				.mockResolvedValue([createUploadResult("https://cdn.example.com/ring.jpg", "IMAGE")]);
			const field = createMockField();

			const { result } = renderHook(() =>
				useMediaFieldUpload({
					uploadMedia: mockUploadMedia,
					getAltText: () => "Bague en or rose",
				}),
			);

			await act(async () => {
				await result.current.handleUpload([createImageFile("ring.jpg")], field);
			});

			expect(field.pushValue).toHaveBeenCalledWith(
				expect.objectContaining({ altText: "Bague en or rose" }),
			);
		});

		it("passe altText undefined quand getAltText retourne undefined", async () => {
			const mockUploadMedia = vi
				.fn()
				.mockResolvedValue([createUploadResult("https://cdn.example.com/img.jpg", "IMAGE")]);
			const field = createMockField();

			const { result } = renderHook(() =>
				useMediaFieldUpload({
					uploadMedia: mockUploadMedia,
					getAltText: () => undefined,
				}),
			);

			await act(async () => {
				await result.current.handleUpload([createImageFile()], field);
			});

			expect(field.pushValue).toHaveBeenCalledWith(expect.objectContaining({ altText: undefined }));
		});
	});
});
