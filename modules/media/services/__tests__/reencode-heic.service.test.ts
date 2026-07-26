import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Mocks
// ============================================================================

const { mockSharp, mockRotate, mockWebp, mockToBuffer, mockUploadFiles, mockDeleteFiles } =
	vi.hoisted(() => ({
		mockSharp: vi.fn(),
		mockRotate: vi.fn(),
		mockWebp: vi.fn(),
		mockToBuffer: vi.fn(),
		mockUploadFiles: vi.fn(),
		mockDeleteFiles: vi.fn(),
	}));

vi.mock("sharp", () => ({ default: mockSharp }));

vi.mock("@/shared/lib/uploadthing", () => ({
	utapi: {
		uploadFiles: mockUploadFiles,
		deleteFiles: mockDeleteFiles,
	},
}));

import { isHeicMimeType, reencodeHeicToWebp } from "../reencode-heic.service";
import { ImageDecodeError } from "../image-downloader.service";

const HEIC_FILE = {
	key: "heic-key",
	name: "IMG_1234.HEIC",
};

const HEIC_BUFFER = Buffer.from("heic-bytes");

function setupSharp(webpBuffer: Buffer) {
	mockToBuffer.mockResolvedValue(webpBuffer);
	mockWebp.mockReturnValue({ toBuffer: mockToBuffer });
	mockRotate.mockReturnValue({ webp: mockWebp });
	mockSharp.mockReturnValue({ rotate: mockRotate });
}

beforeEach(() => {
	vi.clearAllMocks();
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
	it("re-encodes to WebP, uploads, deletes original and returns url/key/buffer", async () => {
		const webpBuffer = Buffer.from("webp-bytes");
		setupSharp(webpBuffer);
		mockUploadFiles.mockResolvedValue([
			{ data: { ufsUrl: "https://utfs.io/f/new-key.webp", key: "new-key" } },
		]);
		mockDeleteFiles.mockResolvedValue({ success: true });

		const result = await reencodeHeicToWebp(HEIC_BUFFER, HEIC_FILE);

		expect(mockSharp).toHaveBeenCalledWith(HEIC_BUFFER);
		expect(mockWebp).toHaveBeenCalled();
		// Le buffer re-encodé est renvoyé : le ThumbHash s'en sert sans re-télécharger.
		expect(result).toEqual({
			url: "https://utfs.io/f/new-key.webp",
			key: "new-key",
			buffer: webpBuffer,
		});
		// l'original HEIC est supprimé après le succès de l'upload WebP
		expect(mockDeleteFiles).toHaveBeenCalledWith(["heic-key"]);
		// le fichier uploadé porte l'extension .webp et le bon MIME
		const uploadedArg = mockUploadFiles.mock.calls[0]?.[0] as File[] | undefined;
		const uploadedFile = uploadedArg?.[0];
		expect(uploadedFile?.name).toBe("IMG_1234.webp");
		expect(uploadedFile?.type).toBe("image/webp");
	});

	it("throws ImageDecodeError when Sharp cannot decode the HEIC (no libheif codec)", async () => {
		mockSharp.mockReturnValue({
			rotate: () => ({
				webp: () => ({
					toBuffer: () => Promise.reject(new Error("heif: unsupported")),
				}),
			}),
		});

		await expect(reencodeHeicToWebp(HEIC_BUFFER, HEIC_FILE)).rejects.toBeInstanceOf(
			ImageDecodeError,
		);
		// pas de suppression du blob (l'appelant gère le rejet + cleanup)
		expect(mockDeleteFiles).not.toHaveBeenCalled();
	});

	it("throws when the re-upload returns no URL", async () => {
		setupSharp(Buffer.from("webp-bytes"));
		mockUploadFiles.mockResolvedValue([{ data: null }]);

		await expect(reencodeHeicToWebp(HEIC_BUFFER, HEIC_FILE)).rejects.toThrow(
			/re-upload returned no URL/,
		);
		expect(mockDeleteFiles).not.toHaveBeenCalled();
	});
});
