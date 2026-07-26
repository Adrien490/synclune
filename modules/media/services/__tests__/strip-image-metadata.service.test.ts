import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Mocks
// ============================================================================

const { mockSharp, mockRotate, mockToBuffer, mockMetadata, mockUploadFiles, mockDeleteFiles } =
	vi.hoisted(() => ({
		mockSharp: vi.fn(),
		mockRotate: vi.fn(),
		mockToBuffer: vi.fn(),
		mockMetadata: vi.fn(),
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

vi.mock("@sentry/nextjs", () => ({
	captureException: vi.fn(),
	captureMessage: vi.fn(),
}));

import { stripImageMetadata } from "../strip-image-metadata.service";

const ORIGINAL = {
	key: "original-key",
	name: "photo.jpg",
	type: "image/jpeg",
};

/**
 * @param pages - nombre de pages de l'image (>1 = animée : `rotate()` est alors omis)
 */
function setupSharp(cleanedBuffer: Buffer, pages = 1) {
	mockToBuffer.mockResolvedValue(cleanedBuffer);
	mockMetadata.mockResolvedValue({ pages });
	mockRotate.mockReturnValue({ toBuffer: mockToBuffer });
	mockSharp.mockReturnValue({
		rotate: mockRotate,
		metadata: mockMetadata,
		toBuffer: mockToBuffer,
	});
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("stripImageMetadata", () => {
	it("strippe les métadonnées et remplace le blob via UTApi", async () => {
		const originalBuffer = Buffer.from("original-with-exif");
		const cleanedBuffer = Buffer.from("cleaned");
		setupSharp(cleanedBuffer);
		mockUploadFiles.mockResolvedValue([
			{ data: { ufsUrl: "https://utfs.io/f/new-key.jpg", key: "new-key" } },
		]);
		mockDeleteFiles.mockResolvedValue({ success: true });

		const result = await stripImageMetadata(originalBuffer, ORIGINAL);

		// `animated: true` — audit média M5 : sans lui un GIF animé serait aplati.
		expect(mockSharp).toHaveBeenCalledWith(originalBuffer, { animated: true });
		expect(mockRotate).toHaveBeenCalledTimes(1);
		expect(mockUploadFiles).toHaveBeenCalledTimes(1);
		const uploadedFile = mockUploadFiles.mock.calls[0]?.[0]?.[0];
		expect(uploadedFile).toBeInstanceOf(File);
		expect(uploadedFile.name).toBe("photo.jpg");
		expect(uploadedFile.type).toBe("image/jpeg");
		expect(mockDeleteFiles).toHaveBeenCalledWith(["original-key"]);
		expect(result).toEqual({
			status: "stripped",
			url: "https://utfs.io/f/new-key.jpg",
			key: "new-key",
			buffer: cleanedBuffer,
		});
	});

	it("n'applique pas rotate() sur une image animée (libvips ne pivote pas une séquence)", async () => {
		setupSharp(Buffer.from("cleaned-gif"), 12);
		mockUploadFiles.mockResolvedValue([
			{ data: { ufsUrl: "https://utfs.io/f/new.gif", key: "new" } },
		]);
		mockDeleteFiles.mockResolvedValue({ success: true });

		const result = await stripImageMetadata(Buffer.from("animated-gif"), {
			...ORIGINAL,
			name: "loop.gif",
			type: "image/gif",
		});

		expect(mockRotate).not.toHaveBeenCalled();
		expect(result.status).toBe("stripped");
	});

	it("retourne `unchanged` si le buffer strippé est identique à l'original", async () => {
		const buffer = Buffer.from("no-metadata");
		setupSharp(Buffer.from("no-metadata"));

		const result = await stripImageMetadata(buffer, ORIGINAL);

		expect(result).toEqual({ status: "unchanged" });
		expect(mockUploadFiles).not.toHaveBeenCalled();
		expect(mockDeleteFiles).not.toHaveBeenCalled();
	});

	it("retourne `failed` si le re-upload ne renvoie pas d'URL", async () => {
		setupSharp(Buffer.from("cleaned"));
		mockUploadFiles.mockResolvedValue([{ data: undefined }]);

		const result = await stripImageMetadata(Buffer.from("original"), ORIGINAL);

		expect(result.status).toBe("failed");
		expect(mockDeleteFiles).not.toHaveBeenCalled();
	});

	it("retourne `failed` et capture Sentry si Sharp throw", async () => {
		mockSharp.mockImplementation(() => {
			throw new Error("Input file is missing");
		});

		const result = await stripImageMetadata(Buffer.from("corrupted"), ORIGINAL);

		expect(result.status).toBe("failed");
		expect(mockUploadFiles).not.toHaveBeenCalled();
	});

	it("retourne quand même le nouveau blob si la suppression de l'original échoue", async () => {
		setupSharp(Buffer.from("cleaned"));
		mockUploadFiles.mockResolvedValue([
			{ data: { ufsUrl: "https://utfs.io/f/new-key.jpg", key: "new-key" } },
		]);
		mockDeleteFiles.mockRejectedValue(new Error("UploadThing 500"));

		const result = await stripImageMetadata(Buffer.from("original-with-exif"), ORIGINAL);

		// La perte du delete est non bloquante : l'orphelin sera ramassé par le cron
		expect(result).toMatchObject({ status: "stripped", url: "https://utfs.io/f/new-key.jpg" });
	});

	/**
	 * Audit média M4 : la distinction `unchanged` / `failed` est ce qui permet à
	 * `reviewMedia` de bloquer une publication sans confondre « image déjà propre »
	 * et « strip EXIF cassé ». Un retour unique (`null`) rendait la garde impossible.
	 */
	it("distingue `unchanged` (rien à stripper) de `failed` (strip cassé)", async () => {
		const buffer = Buffer.from("identique");
		setupSharp(Buffer.from("identique"));
		const unchanged = await stripImageMetadata(buffer, ORIGINAL);

		vi.clearAllMocks();
		mockSharp.mockImplementation(() => {
			throw new Error("decode failure");
		});
		const failed = await stripImageMetadata(buffer, ORIGINAL);

		expect(unchanged.status).toBe("unchanged");
		expect(failed.status).toBe("failed");
	});
});
