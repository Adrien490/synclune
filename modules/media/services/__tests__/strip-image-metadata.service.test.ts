import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Mocks
// ============================================================================

const { mockDownloadImage, mockSharp, mockRotate, mockToBuffer, mockUploadFiles, mockDeleteFiles } =
	vi.hoisted(() => ({
		mockDownloadImage: vi.fn(),
		mockSharp: vi.fn(),
		mockRotate: vi.fn(),
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

vi.mock("@sentry/nextjs", () => ({
	captureException: vi.fn(),
	captureMessage: vi.fn(),
}));

import { stripImageMetadata } from "../strip-image-metadata.service";
import { isValidUploadThingUrl } from "@/modules/media/utils/validate-media-file";

const ORIGINAL = {
	ufsUrl: "https://utfs.io/f/original-key.jpg",
	key: "original-key",
	name: "photo.jpg",
	type: "image/jpeg",
};

function setupSharp(cleanedBuffer: Buffer) {
	mockToBuffer.mockResolvedValue(cleanedBuffer);
	mockRotate.mockReturnValue({ toBuffer: mockToBuffer });
	mockSharp.mockReturnValue({ rotate: mockRotate });
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(isValidUploadThingUrl).mockReturnValue(true);
});

describe("stripImageMetadata", () => {
	it("retourne null sans appeler UTApi quand l'URL n'est pas UploadThing", async () => {
		vi.mocked(isValidUploadThingUrl).mockReturnValue(false);

		const result = await stripImageMetadata(ORIGINAL);

		expect(result).toBeNull();
		expect(mockDownloadImage).not.toHaveBeenCalled();
		expect(mockUploadFiles).not.toHaveBeenCalled();
	});

	it("strippe les métadonnées et remplace le blob via UTApi", async () => {
		const originalBuffer = Buffer.from("original-with-exif");
		const cleanedBuffer = Buffer.from("cleaned");
		mockDownloadImage.mockResolvedValue(originalBuffer);
		setupSharp(cleanedBuffer);
		mockUploadFiles.mockResolvedValue([
			{ data: { ufsUrl: "https://utfs.io/f/new-key.jpg", key: "new-key" } },
		]);
		mockDeleteFiles.mockResolvedValue({ success: true });

		const result = await stripImageMetadata(ORIGINAL);

		expect(mockSharp).toHaveBeenCalledWith(originalBuffer);
		expect(mockRotate).toHaveBeenCalledTimes(1);
		expect(mockToBuffer).toHaveBeenCalledTimes(1);
		expect(mockUploadFiles).toHaveBeenCalledTimes(1);
		const uploadedFile = mockUploadFiles.mock.calls[0]?.[0]?.[0];
		expect(uploadedFile).toBeInstanceOf(File);
		expect(uploadedFile.name).toBe("photo.jpg");
		expect(uploadedFile.type).toBe("image/jpeg");
		expect(mockDeleteFiles).toHaveBeenCalledWith(["original-key"]);
		expect(result).toEqual({ url: "https://utfs.io/f/new-key.jpg", key: "new-key" });
	});

	it("skip le re-upload si le buffer strippé est identique à l'original", async () => {
		const buffer = Buffer.from("no-metadata");
		mockDownloadImage.mockResolvedValue(buffer);
		setupSharp(Buffer.from("no-metadata"));

		const result = await stripImageMetadata(ORIGINAL);

		expect(result).toBeNull();
		expect(mockUploadFiles).not.toHaveBeenCalled();
		expect(mockDeleteFiles).not.toHaveBeenCalled();
	});

	it("retourne null si le re-upload ne renvoie pas d'URL", async () => {
		mockDownloadImage.mockResolvedValue(Buffer.from("original"));
		setupSharp(Buffer.from("cleaned"));
		mockUploadFiles.mockResolvedValue([{ data: undefined }]);

		const result = await stripImageMetadata(ORIGINAL);

		expect(result).toBeNull();
		expect(mockDeleteFiles).not.toHaveBeenCalled();
	});

	it("retourne null et capture Sentry si Sharp throw", async () => {
		mockDownloadImage.mockResolvedValue(Buffer.from("corrupted"));
		mockSharp.mockImplementation(() => {
			throw new Error("Input file is missing");
		});

		const result = await stripImageMetadata(ORIGINAL);

		expect(result).toBeNull();
		expect(mockUploadFiles).not.toHaveBeenCalled();
	});

	it("retourne quand même le nouveau blob si la suppression de l'original échoue", async () => {
		mockDownloadImage.mockResolvedValue(Buffer.from("original-with-exif"));
		setupSharp(Buffer.from("cleaned"));
		mockUploadFiles.mockResolvedValue([
			{ data: { ufsUrl: "https://utfs.io/f/new-key.jpg", key: "new-key" } },
		]);
		mockDeleteFiles.mockRejectedValue(new Error("UploadThing 500"));

		const result = await stripImageMetadata(ORIGINAL);

		// La perte du delete est non bloquante : l'orphelin sera ramassé par le cron
		expect(result).toEqual({ url: "https://utfs.io/f/new-key.jpg", key: "new-key" });
	});

	it("retourne null et capture Sentry si le download throw", async () => {
		mockDownloadImage.mockRejectedValue(new Error("ETIMEDOUT"));

		const result = await stripImageMetadata(ORIGINAL);

		expect(result).toBeNull();
		expect(mockSharp).not.toHaveBeenCalled();
		expect(mockUploadFiles).not.toHaveBeenCalled();
	});
});
