import { describe, expect, it } from "vitest";
import { detectMediaType, getVideoMimeType, isVideoUrl } from "../media-type-detection";

/**
 * UN seul parseur d'extension pour toute la détection par URL — trois régimes
 * coexistaient (`endsWith` aveugle aux query strings, regex sans fragment,
 * regex complète) ; `isImageUrl` et `getFileExtension` (zéro appelant hors
 * tests) sont partis avec la fusion, et `getVideoMimeType` a déménagé ici
 * depuis `media-utils.ts`.
 */

describe("isVideoUrl", () => {
	it("reconnaît .mp4, y compris avec query string ou fragment", () => {
		expect(isVideoUrl("https://utfs.io/f/video.mp4")).toBe(true);
		// L'ancien `endsWith(".mp4")` échouait sur ces deux formes.
		expect(isVideoUrl("https://utfs.io/f/video.mp4?v=1")).toBe(true);
		expect(isVideoUrl("https://utfs.io/f/video.mp4#t=2")).toBe(true);
		expect(isVideoUrl("https://utfs.io/f/VIDEO.MP4")).toBe(true);
	});

	it("refuse les images et les URLs sans extension", () => {
		expect(isVideoUrl("https://utfs.io/f/photo.jpg")).toBe(false);
		expect(isVideoUrl("https://utfs.io/f/abc123")).toBe(false);
		expect(isVideoUrl("https://utfs.io/f/mp4")).toBe(false);
	});
});

describe("detectMediaType", () => {
	it("classe une vidéo par extension", () => {
		expect(detectMediaType("https://utfs.io/f/demo.mp4")).toBe("VIDEO");
		expect(detectMediaType("https://utfs.io/f/demo.mp4?download=1")).toBe("VIDEO");
	});

	it("retombe sur IMAGE pour tout le reste — y compris les URLs extensionless", () => {
		// Limite documentée : les URLs UploadThing sont sans extension, ce
		// repli ne sert que quand le type du formulaire manque.
		expect(detectMediaType("https://utfs.io/f/photo.jpg")).toBe("IMAGE");
		expect(detectMediaType("https://utfs.io/f/abc123")).toBe("IMAGE");
	});
});

describe("getVideoMimeType", () => {
	it("mappe .mp4 vers video/mp4, query/fragment compris", () => {
		expect(getVideoMimeType("https://utfs.io/f/demo.mp4")).toBe("video/mp4");
		expect(getVideoMimeType("https://utfs.io/f/demo.mp4?v=2#t=1")).toBe("video/mp4");
	});

	it("retombe sur video/mp4 pour les URLs CDN sans extension (UploadThing)", () => {
		expect(getVideoMimeType("https://utfs.io/f/abc123")).toBe("video/mp4");
	});

	it("retombe sur video/mp4 pour une extension inconnue", () => {
		expect(getVideoMimeType("https://utfs.io/f/demo.mov")).toBe("video/mp4");
	});
});
