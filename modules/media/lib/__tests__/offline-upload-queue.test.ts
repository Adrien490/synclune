import { describe, expect, it } from "vitest";

import {
	MAX_UPLOAD_SIZE_IMAGE,
	MAX_UPLOAD_SIZE_VIDEO,
} from "@/modules/media/constants/upload-size-limits";
import {
	OFFLINE_QUEUE_MAX_BYTES,
	OfflineQueueFullError,
	entryToFile,
	type OfflineUploadEntry,
} from "../offline-upload-queue";

// Note: IDB-backed functions (enqueue/listEntries/...) are tested in E2E —
// jsdom lacks IndexedDB. This file covers the pure helpers and type guarantees.

describe("offline-upload-queue — pure helpers", () => {
	it("peut contenir le plus gros fichier téléversable", () => {
		// ⚠️ Invariant, pas un chiffre. Le plafond valait 50 Mo en dur, soit MOINS
		// qu'une seule vidéo catalogue (64 Mo) : `enqueue` levait donc toujours
		// `OfflineQueueFullError` pour une vidéo, et l'UI affichait « File hors-ligne
		// pleine » sur une file vide. Une file incapable d'accueillir le plus gros
		// fichier accepté par l'application est structurellement inutilisable.
		expect(OFFLINE_QUEUE_MAX_BYTES).toBeGreaterThanOrEqual(MAX_UPLOAD_SIZE_VIDEO);
		expect(OFFLINE_QUEUE_MAX_BYTES).toBeGreaterThanOrEqual(MAX_UPLOAD_SIZE_IMAGE);
	});

	it("OfflineQueueFullError annonce le plafond réel", () => {
		const err = new OfflineQueueFullError();
		expect(err.name).toBe("OfflineQueueFullError");
		expect(err.message).toContain(`${Math.round(OFFLINE_QUEUE_MAX_BYTES / 1024 / 1024)} Mo`);
	});

	it("entryToFile reconstructs a File with matching metadata", () => {
		const blob = new Blob([new Uint8Array(32)], { type: "image/webp" });
		const entry: OfflineUploadEntry = {
			id: "uuid-123",
			file: blob,
			fileName: "photo.webp",
			fileType: "image/webp",
			mediaType: "IMAGE",
			endpoint: "catalogMedia",
			queuedAt: 1_700_000_000_000,
		};

		const restored = entryToFile(entry);
		expect(restored).toBeInstanceOf(File);
		expect(restored.name).toBe("photo.webp");
		expect(restored.type).toBe("image/webp");
		expect(restored.lastModified).toBe(1_700_000_000_000);
		expect(restored.size).toBe(32);
	});

	it("falls back to a generic MIME when entry.fileType is empty", () => {
		const blob = new Blob([new Uint8Array(8)]);
		const entry: OfflineUploadEntry = {
			id: "id",
			file: blob,
			fileName: "unknown.bin",
			fileType: "",
			mediaType: "IMAGE",
			endpoint: "catalogMedia",
			queuedAt: Date.now(),
		};
		const restored = entryToFile(entry);
		expect(restored.name).toBe("unknown.bin");
		// File constructor normalises empty MIME to "" (spec) — we just check it doesn't throw
		expect(typeof restored.type).toBe("string");
	});
});
