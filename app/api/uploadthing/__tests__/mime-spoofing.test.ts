/**
 * MIME spoofing defense — integration tests.
 *
 * Vérifie que la chaîne de validation côté serveur (`validateImageDimensions`
 * → Sharp metadata) rejette un fichier non-image renommé avec une extension
 * d'image et un MIME type spoofé.
 *
 * Couvre 2 vecteurs courants :
 * 1. Exécutable Windows PE32 (`.exe`) avec magic bytes "MZ" (0x4D 0x5A) renommé `.jpg`.
 * 2. MP3 LAME avec header ID3 renommé `.jpg`.
 *
 * Sharp lit l'en-tête réel et throw si le contenu n'est pas un format image
 * supporté. C'est la défense critique en complément du `validateMimeType()`
 * du middleware UploadThing (qui ne se base que sur `file.type` déclaré).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDownloadImage } = vi.hoisted(() => ({
	mockDownloadImage: vi.fn(),
}));

vi.mock("@/modules/media/services/image-downloader.service", async (importOriginal) => {
	const actual = await importOriginal<Record<string, unknown>>();
	return { ...actual, downloadImage: mockDownloadImage };
});

vi.mock("@/modules/media/utils/validate-media-file", () => ({
	isValidUploadThingUrl: vi.fn(() => true),
}));

// On laisse Sharp réel — c'est le coeur de la défense.
import { validateImageDimensions } from "@/modules/media/services/validate-image-dimensions.service";

const SPOOFED_URL = "https://utfs.io/f/spoofed.jpg";

beforeEach(() => {
	vi.clearAllMocks();
});

describe("MIME spoofing — Sharp header validation", () => {
	it("rejette un .exe renommé .jpg (PE32 magic bytes MZ)", async () => {
		// Magic bytes "MZ" (0x4D 0x5A) + padding PE stub
		const peStub = Buffer.from([
			0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00,
			0x00, 0xb8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00, 0x00, 0x00,
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0x00, 0x00, 0x00, 0x00,
		]);
		mockDownloadImage.mockResolvedValue(peStub);

		await expect(validateImageDimensions(SPOOFED_URL)).rejects.toThrow();
	});

	it("rejette un MP3 avec header ID3 renommé .jpg", async () => {
		// "ID3" + version 2.3.0 + flags + size
		const id3Header = Buffer.from([
			0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xfb, 0x90, 0x00,
		]);
		mockDownloadImage.mockResolvedValue(id3Header);

		await expect(validateImageDimensions(SPOOFED_URL)).rejects.toThrow();
	});

	it("rejette un fichier texte ASCII renommé .jpg (HTML / phishing)", async () => {
		const htmlPayload = Buffer.from("<!DOCTYPE html><script>alert(1)</script>");
		mockDownloadImage.mockResolvedValue(htmlPayload);

		await expect(validateImageDimensions(SPOOFED_URL)).rejects.toThrow();
	});

	it("rejette un buffer vide", async () => {
		mockDownloadImage.mockResolvedValue(Buffer.alloc(0));

		await expect(validateImageDimensions(SPOOFED_URL)).rejects.toThrow();
	});
});
