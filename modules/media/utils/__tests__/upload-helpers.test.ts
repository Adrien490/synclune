import { describe, it, expect } from "vitest";
import {
	MAX_UPLOAD_SIZE_VIDEO,
	MAX_UPLOAD_SIZE_IMAGE,
} from "@/modules/media/constants/upload-size-limits";
import {
	DEFAULT_MAX_SIZE_IMAGE,
	DEFAULT_MAX_SIZE_VIDEO,
	DEFAULT_MAX_FILES,
	DEFAULT_VIDEO_CONCURRENCY,
	describeRejectedFile,
	getMediaTypeFromFile,
	isValidMediaType,
	progressPercent,
} from "../upload-helpers";

// ============================================================================
// CONSTANTS
// ============================================================================

describe("constants", () => {
	it("DEFAULT_MAX_SIZE_IMAGE suit la SSOT des plafonds d'upload", () => {
		expect(DEFAULT_MAX_SIZE_IMAGE).toBe(MAX_UPLOAD_SIZE_IMAGE);
	});

	it("DEFAULT_MAX_SIZE_VIDEO suit la SSOT des plafonds d'upload", () => {
		// Ramené de 512 Mo à 64 Mo (audit coûts P2-2) : 512 × 6 = 3 Go en un
		// upload faisait sauter le quota UploadThing gratuit d'un coup.
		expect(DEFAULT_MAX_SIZE_VIDEO).toBe(MAX_UPLOAD_SIZE_VIDEO);
	});

	it("DEFAULT_MAX_FILES is 6", () => {
		expect(DEFAULT_MAX_FILES).toBe(6);
	});

	it("DEFAULT_VIDEO_CONCURRENCY is 2", () => {
		expect(DEFAULT_VIDEO_CONCURRENCY).toBe(2);
	});
});

// ============================================================================
// progressPercent
// ============================================================================

describe("progressPercent", () => {
	it("dérive le pourcentage des octets quand ils sont connus", () => {
		expect(
			progressPercent({
				completed: 0,
				total: 1,
				bytesUploaded: 5.6 * 1024 * 1024,
				bytesTotal: 12 * 1024 * 1024,
			}),
		).toBe(47);
	});

	it("ignore le compte de fichiers dès que les octets sont disponibles", () => {
		// Le cas dominant : `uploadImages()` envoie tout le lot en un seul
		// `startUpload()`, donc `completed` vaut 0 jusqu'à la toute fin. Se fier au
		// compte donnait une barre bloquée à 0 % pendant tout l'envoi.
		expect(
			progressPercent({
				completed: 0,
				total: 6,
				bytesUploaded: 3 * 1024 * 1024,
				bytesTotal: 6 * 1024 * 1024,
			}),
		).toBe(50);
	});

	it("retombe sur le compte de fichiers quand aucun octet n'est comptabilisé", () => {
		expect(progressPercent({ completed: 1, total: 4 })).toBe(25);
		expect(progressPercent({ completed: 1, total: 4, bytesTotal: 0 })).toBe(25);
	});

	it("borne le résultat entre 0 et 100", () => {
		expect(progressPercent({ completed: 9, total: 4 })).toBe(100);
		expect(progressPercent({ completed: 0, total: 1, bytesUploaded: 999, bytesTotal: 1 })).toBe(
			100,
		);
		expect(progressPercent({ completed: -3, total: 4 })).toBe(0);
	});

	it("renvoie 0 pour une progression absente ou un total nul", () => {
		expect(progressPercent(null)).toBe(0);
		expect(progressPercent({ completed: 0, total: 0 })).toBe(0);
	});
});

// ============================================================================
// getMediaTypeFromFile
// ============================================================================

describe("getMediaTypeFromFile", () => {
	function makeFile(type: string, name = "test"): File {
		return new File([""], name, { type });
	}

	it("returns VIDEO for video MIME types", () => {
		expect(getMediaTypeFromFile(makeFile("video/mp4"))).toBe("VIDEO");
		expect(getMediaTypeFromFile(makeFile("video/webm"))).toBe("VIDEO");
		expect(getMediaTypeFromFile(makeFile("video/quicktime"))).toBe("VIDEO");
	});

	it("returns IMAGE for image MIME types", () => {
		expect(getMediaTypeFromFile(makeFile("image/jpeg"))).toBe("IMAGE");
		expect(getMediaTypeFromFile(makeFile("image/png"))).toBe("IMAGE");
		expect(getMediaTypeFromFile(makeFile("image/webp"))).toBe("IMAGE");
		expect(getMediaTypeFromFile(makeFile("image/avif"))).toBe("IMAGE");
		expect(getMediaTypeFromFile(makeFile("image/gif"))).toBe("IMAGE");
	});

	it("classe un .mp4 sans MIME comme VIDEO (pellicule iOS)", () => {
		// Sans ce repli, un `.mp4` au MIME vide partait dans le lot d'IMAGES —
		// incohérent avec `isValidMediaType`, qui l'accepte par son extension.
		expect(getMediaTypeFromFile(makeFile("", "bijou.mp4"))).toBe("VIDEO");
	});

	it("returns IMAGE for non-media MIME types (fallback)", () => {
		expect(getMediaTypeFromFile(makeFile("application/pdf"))).toBe("IMAGE");
		expect(getMediaTypeFromFile(makeFile("text/plain"))).toBe("IMAGE");
		expect(getMediaTypeFromFile(makeFile(""))).toBe("IMAGE");
	});
});

// ============================================================================
// isValidMediaType
// ============================================================================

describe("isValidMediaType", () => {
	function makeFile(type: string, name = "test"): File {
		return new File([""], name, { type });
	}

	it("accepte les MIME image de l'allowlist serveur", () => {
		expect(isValidMediaType(makeFile("image/jpeg"))).toBe(true);
		expect(isValidMediaType(makeFile("image/png"))).toBe(true);
		expect(isValidMediaType(makeFile("image/webp"))).toBe(true);
		expect(isValidMediaType(makeFile("image/avif"))).toBe(true);
		expect(isValidMediaType(makeFile("image/gif"))).toBe(true);
		expect(isValidMediaType(makeFile("image/heic"))).toBe(true);
		expect(isValidMediaType(makeFile("image/heif"))).toBe(true);
	});

	it("accepte le MP4, et lui seul, en vidéo", () => {
		expect(isValidMediaType(makeFile("video/mp4"))).toBe(true);
	});

	it("refuse les formats vidéo que le serveur rejette", () => {
		// ⚠️ L'ancienne version retournait `true` ici (préfixe `video/`) et ce test
		// l'assertait explicitement. Un `.mov` montait donc jusqu'à 64 Mo avant le
		// rejet serveur — exactement le gaspillage que le correctif « M13 » disait
		// avoir fermé, alors qu'il n'avait touché que le repli par extension.
		expect(isValidMediaType(makeFile("video/quicktime", "bijou.mov"))).toBe(false);
		expect(isValidMediaType(makeFile("video/webm"))).toBe(false);
		expect(isValidMediaType(makeFile("video/x-msvideo", "bijou.avi"))).toBe(false);
	});

	it("refuse les formats image que le serveur rejette", () => {
		// SVG : vecteur XSS, exclu côté serveur. BMP/TIFF : non décodés en aval.
		expect(isValidMediaType(makeFile("image/svg+xml", "logo.svg"))).toBe(false);
		expect(isValidMediaType(makeFile("image/bmp"))).toBe(false);
		expect(isValidMediaType(makeFile("image/tiff"))).toBe(false);
	});

	it("rejects non-media MIME types", () => {
		expect(isValidMediaType(makeFile("application/pdf"))).toBe(false);
		expect(isValidMediaType(makeFile("text/plain"))).toBe(false);
		expect(isValidMediaType(makeFile("application/json"))).toBe(false);
		expect(isValidMediaType(makeFile("text/html"))).toBe(false);
	});

	it("retombe sur l'extension uniquement quand le MIME est vide (pellicule iOS)", () => {
		expect(isValidMediaType(makeFile("", "photo.heic"))).toBe(true);
		expect(isValidMediaType(makeFile("", "photo.jpg"))).toBe(true);
		expect(isValidMediaType(makeFile("", "bijou.mp4"))).toBe(true);
		expect(isValidMediaType(makeFile("", "bijou.mov"))).toBe(false);
		expect(isValidMediaType(makeFile(""))).toBe(false);
	});
});

// ============================================================================
// describeRejectedFile
// ============================================================================

describe("describeRejectedFile", () => {
	it("nomme le fichier, son type réel et les formats attendus", () => {
		const message = describeRejectedFile(new File([""], "bijou.mov", { type: "video/quicktime" }));
		expect(message).toContain("bijou.mov");
		expect(message).toContain("video/quicktime");
		expect(message).toContain("MP4");
	});

	it("cite les formats image quand le fichier n'est pas une vidéo", () => {
		const message = describeRejectedFile(new File([""], "logo.svg", { type: "image/svg+xml" }));
		expect(message).toContain("logo.svg");
		expect(message).toContain("JPEG");
	});

	it("dit « type inconnu » plutôt que rien quand le MIME est vide", () => {
		expect(describeRejectedFile(new File([""], "mystere.dat", { type: "" }))).toContain(
			"type inconnu",
		);
	});
});
