import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Mocks
// ============================================================================

const {
	mockDownloadImage,
	mockSharp,
	mockRotate,
	mockWebp,
	mockToBuffer,
	mockUploadFiles,
	mockDeleteFiles,
} = vi.hoisted(() => ({
	mockDownloadImage: vi.fn(),
	mockSharp: vi.fn(),
	mockRotate: vi.fn(),
	mockWebp: vi.fn(),
	mockToBuffer: vi.fn(),
	mockUploadFiles: vi.fn(),
	mockDeleteFiles: vi.fn(),
}));

vi.mock("sharp", () => ({ default: mockSharp }));

vi.mock("../image-downloader.service", async (importOriginal) => {
	const actual = await importOriginal<Record<string, unknown>>();
	return { ...actual, downloadImage: mockDownloadImage };
});

vi.mock("@/shared/lib/uploadthing", () => ({
	utapi: {
		uploadFiles: mockUploadFiles,
		deleteFiles: mockDeleteFiles,
	},
}));

vi.mock("@/modules/media/utils/validate-media-file", () => ({
	isValidUploadThingUrl: vi.fn(),
}));

import { isHeicMimeType, reencodeHeicToWebp } from "../reencode-heic.service";
import { isValidUploadThingUrl } from "@/modules/media/utils/validate-media-file";

const HEIC_FILE = {
	ufsUrl: "https://utfs.io/f/heic-key.heic",
	key: "heic-key",
	name: "IMG_1234.HEIC",
	type: "image/heic",
};

function setupSharp(webpBuffer: Buffer) {
	mockToBuffer.mockResolvedValue(webpBuffer);
	mockWebp.mockReturnValue({ toBuffer: mockToBuffer });
	mockRotate.mockReturnValue({ webp: mockWebp });
	mockSharp.mockReturnValue({ rotate: mockRotate });
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(isValidUploadThingUrl).mockReturnValue(true);
});

describe("isHeicMimeType", () => {
	it("detects heic/heif (case-insensitive)", () => {
		expect(isHeicMimeType("image/heic")).toBe(true);
		expect(isHeicMimeType("image/HEIF")).toBe(true);
		expect(isHeicMimeType("image/jpeg")).toBe(false);
		expect(isHeicMimeType("image/webp")).toBe(false);
	});
});

describe("reencodeHeicToWebp", () => {
	it("re-encodes to WebP, uploads, deletes original and returns the new url/key", async () => {
		mockDownloadImage.mockResolvedValue(Buffer.from("heic-bytes"));
		setupSharp(Buffer.from("webp-bytes"));
		mockUploadFiles.mockResolvedValue([
			{ data: { ufsUrl: "https://utfs.io/f/new-key.webp", key: "new-key" } },
		]);
		mockDeleteFiles.mockResolvedValue({ success: true });

		const result = await reencodeHeicToWebp(HEIC_FILE);

		expect(mockWebp).toHaveBeenCalled();
		expect(result).toEqual({ url: "https://utfs.io/f/new-key.webp", key: "new-key" });
		// l'original HEIC est supprimé après le succès de l'upload WebP
		expect(mockDeleteFiles).toHaveBeenCalledWith(["heic-key"]);
		// le fichier uploadé porte l'extension .webp et le bon MIME
		const uploadedArg = mockUploadFiles.mock.calls[0]?.[0] as File[] | undefined;
		const uploadedFile = uploadedArg?.[0];
		expect(uploadedFile?.name).toBe("IMG_1234.webp");
		expect(uploadedFile?.type).toBe("image/webp");
	});

	it("throws when Sharp cannot decode the HEIC (no libheif codec)", async () => {
		mockDownloadImage.mockResolvedValue(Buffer.from("heic-bytes"));
		mockSharp.mockReturnValue({
			rotate: () => ({
				webp: () => ({
					toBuffer: () => Promise.reject(new Error("heif: unsupported")),
				}),
			}),
		});

		await expect(reencodeHeicToWebp(HEIC_FILE)).rejects.toThrow();
		// pas de suppression du blob (l'appelant gère le rejet + cleanup)
		expect(mockDeleteFiles).not.toHaveBeenCalled();
	});

	it("throws when the re-upload returns no URL", async () => {
		mockDownloadImage.mockResolvedValue(Buffer.from("heic-bytes"));
		setupSharp(Buffer.from("webp-bytes"));
		mockUploadFiles.mockResolvedValue([{ data: null }]);

		await expect(reencodeHeicToWebp(HEIC_FILE)).rejects.toThrow();
	});

	it("rejects an unauthorized domain", async () => {
		vi.mocked(isValidUploadThingUrl).mockReturnValue(false);

		await expect(
			reencodeHeicToWebp({ ...HEIC_FILE, ufsUrl: "https://evil.example/f/x.heic" }),
		).rejects.toThrow();
		expect(mockDownloadImage).not.toHaveBeenCalled();
	});
});
