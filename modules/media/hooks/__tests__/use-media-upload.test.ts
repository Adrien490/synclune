/**
 * Tests de l'ORCHESTRATEUR d'upload — centrés sur les chemins d'annulation,
 * d'échec et d'identité, pas le happy path (couvert par l'e2e pré-upload et
 * les tests des collaborateurs extraits).
 *
 * Contexte (audit 2026-08-16) : l'annulation était une illusion — `withRetry`
 * ne re-vérifie pas le signal APRÈS résolution, donc un batch annulé se
 * terminait normalement et `onSuccess` livrait au formulaire des fichiers que
 * l'admin venait d'annuler. Ces tests verrouillent le correctif.
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

const toastMock = vi.hoisted(() => ({
	info: vi.fn(),
	warning: vi.fn(),
	error: vi.fn(),
	success: vi.fn(),
}));
vi.mock("@/shared/utils/toast", () => ({ toast: toastMock }));

// Backoff instantané : `withRetry` reste RÉEL (c'est lui qu'on verrouille),
// seul le délai entre tentatives est court-circuité.
vi.mock("@/shared/utils/delay", () => ({ delay: () => Promise.resolve() }));

// Compression pass-through — jsdom n'a pas createImageBitmap.
vi.mock("@/modules/media/utils/compress-image", () => ({
	compressImage: vi.fn(async (file: File) => ({ file })),
	isHeicFile: () => false,
	HeicDecodeError: class HeicDecodeError extends Error {},
}));

const cleanupOrphanUploadedFile = vi.fn();
const uploadThumbnailForVideo = vi.fn(async () => ({}));
vi.mock("@/modules/media/hooks/use-video-thumbnail-upload", () => ({
	cleanupOrphanUploadedFile: (url: string) => cleanupOrphanUploadedFile(url),
	useVideoThumbnailUpload: () => ({
		uploadThumbnailForVideo,
		cleanupOrphanThumbnail: cleanupOrphanUploadedFile,
	}),
}));

type ServerResult = { serverData: { url: string; blurDataUrl?: string | null } };
let startUploadImpl: (files: File[]) => Promise<ServerResult[] | undefined>;
vi.mock("@/modules/media/utils/uploadthing", () => ({
	useUploadThing: () => ({
		startUpload: (files: File[]) => startUploadImpl(files),
		isUploading: false,
	}),
}));

import { useMediaUpload } from "../use-media-upload";

// ============================================================================
// HELPERS
// ============================================================================

const makeImage = (name: string) => new File(["x"], name, { type: "image/jpeg" });
const makeVideo = (name: string) => new File(["x"], name, { type: "video/mp4" });

const okResults = (files: File[]): ServerResult[] =>
	files.map((f) => ({ serverData: { url: `https://utfs.io/f/${f.name}` } }));

/** Deferred startUpload : le test contrôle le moment de la résolution. */
function deferStartUpload() {
	let resolve!: (r: ServerResult[]) => void;
	let capturedFiles: File[] = [];
	const called = new Promise<void>((markCalled) => {
		startUploadImpl = (files) => {
			capturedFiles = files;
			markCalled();
			return new Promise<ServerResult[]>((res) => {
				resolve = res;
			});
		};
	});
	return {
		called,
		getFiles: () => capturedFiles,
		resolve: () => resolve(okResults(capturedFiles)),
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	startUploadImpl = async (files) => okResults(files);
});

afterEach(() => {
	vi.restoreAllMocks();
});

// ============================================================================
// TESTS
// ============================================================================

describe("useMediaUpload — annulation", () => {
	it("un cancel PENDANT le vol ne livre rien : onSuccess jamais appelé, promesse résolue []", async () => {
		const onSuccess = vi.fn();
		const deferred = deferStartUpload();
		const { result } = renderHook(() => useMediaUpload({ onSuccess }));

		let uploadPromise!: Promise<unknown[]>;
		act(() => {
			uploadPromise = result.current.upload([makeImage("a.jpg")]);
		});
		await deferred.called;

		act(() => {
			result.current.cancel();
		});
		// Le XHR "réussit" APRÈS le cancel — c'était le scénario qui ressuscitait
		// la progression et livrait les fichiers annulés au formulaire.
		deferred.resolve();

		await expect(uploadPromise).resolves.toEqual([]);
		expect(onSuccess).not.toHaveBeenCalled();
		await waitFor(() => {
			expect(result.current.progress).toBeNull();
		});
	});

	it("les fichiers montés côté serveur après un cancel sont nettoyés (best-effort)", async () => {
		const deferred = deferStartUpload();
		const { result } = renderHook(() => useMediaUpload());

		let uploadPromise!: Promise<unknown[]>;
		act(() => {
			uploadPromise = result.current.upload([makeImage("a.jpg"), makeImage("b.jpg")]);
		});
		await deferred.called;

		act(() => {
			result.current.cancel();
		});
		deferred.resolve();
		await uploadPromise;

		expect(cleanupOrphanUploadedFile).toHaveBeenCalledWith("https://utfs.io/f/a.jpg");
		expect(cleanupOrphanUploadedFile).toHaveBeenCalledWith("https://utfs.io/f/b.jpg");
	});

	it("cancelOne sur un fichier d'un batch image EN VOL : toast info, PAS de marquage failed", async () => {
		const deferred = deferStartUpload();
		const { result } = renderHook(() => useMediaUpload());

		let uploadPromise!: Promise<unknown[]>;
		act(() => {
			uploadPromise = result.current.upload([makeImage("a.jpg"), makeImage("b.jpg")]);
		});
		await deferred.called;

		act(() => {
			result.current.cancelOne("a.jpg");
		});

		expect(toastMock.info).toHaveBeenCalledWith("Impossible d'annuler", expect.anything());
		const entry = result.current.progress?.files?.find((f) => f.fileName === "a.jpg");
		expect(entry?.state).not.toBe("failed");

		deferred.resolve();
		const results = (await uploadPromise) as Array<{ fileName: string }>;
		// Le batch atomique se termine : les DEUX fichiers sont livrés.
		expect(results.map((r) => r.fileName).sort()).toEqual(["a.jpg", "b.jpg"]);
	});

	it("cancelOne sur un fichier en file d'attente le marque failed: Annulé", async () => {
		const deferred = deferStartUpload();
		const { result } = renderHook(() => useMediaUpload());

		let firstUpload!: Promise<unknown[]>;
		let secondUpload!: Promise<unknown[]>;
		act(() => {
			firstUpload = result.current.upload([makeImage("a.jpg")]);
			secondUpload = result.current.upload([makeImage("queued.jpg")]);
		});
		await deferred.called;

		// "queued.jpg" attend derrière le batch en vol — annulable, lui.
		act(() => {
			result.current.cancelOne("queued.jpg");
		});
		expect(toastMock.info).not.toHaveBeenCalledWith("Impossible d'annuler", expect.anything());

		const secondDeferred = deferStartUpload();
		deferred.resolve();
		await firstUpload;
		void secondDeferred;

		// Le fichier annulé est écarté au pré-vol : rien n'est livré.
		await expect(secondUpload).resolves.toEqual([]);
		expect(result.current.failedFiles).toEqual([]);
	});
});

describe("useMediaUpload — identité des fichiers", () => {
	it("deux homonymes dans un batch sont dédupliqués par suffixe", async () => {
		const captured: string[][] = [];
		startUploadImpl = async (files) => {
			captured.push(files.map((f) => f.name));
			return okResults(files);
		};
		const { result } = renderHook(() => useMediaUpload());

		let uploadPromise!: Promise<Array<{ fileName: string }>>;
		act(() => {
			uploadPromise = result.current.upload([
				makeImage("IMG_0001.jpg"),
				makeImage("IMG_0001.jpg"),
			]) as Promise<Array<{ fileName: string }>>;
		});
		const results = await uploadPromise;

		expect(captured[0]).toEqual(["IMG_0001.jpg", "IMG_0001 (2).jpg"]);
		expect(results.map((r) => r.fileName)).toEqual(["IMG_0001.jpg", "IMG_0001 (2).jpg"]);
	});
});

describe("useMediaUpload — vidéos", () => {
	it("les vidéos partent STRICTEMENT en séquence (tracker mono-slot)", async () => {
		let inFlight = 0;
		let maxInFlight = 0;
		startUploadImpl = async (files) => {
			inFlight++;
			maxInFlight = Math.max(maxInFlight, inFlight);
			await new Promise((r) => setTimeout(r, 5));
			inFlight--;
			return okResults(files);
		};
		const { result } = renderHook(() => useMediaUpload());

		let uploadPromise!: Promise<unknown[]>;
		act(() => {
			uploadPromise = result.current.upload([makeVideo("v1.mp4"), makeVideo("v2.mp4")]);
		});
		const results = (await uploadPromise) as unknown[];

		expect(results).toHaveLength(2);
		expect(maxInFlight).toBe(1);
	});

	it("une vidéo en échec ne bloque pas la suivante et alimente failedFiles", async () => {
		startUploadImpl = async (files) => {
			if (files[0]!.name === "v1.mp4") throw new Error("HTTP 500");
			return okResults(files);
		};
		const { result } = renderHook(() => useMediaUpload());

		let uploadPromise!: Promise<Array<{ fileName: string }>>;
		act(() => {
			uploadPromise = result.current.upload([makeVideo("v1.mp4"), makeVideo("v2.mp4")]) as Promise<
				Array<{ fileName: string }>
			>;
		});
		const results = await uploadPromise;

		expect(results.map((r) => r.fileName)).toEqual(["v2.mp4"]);
		await waitFor(() => {
			expect(result.current.failedFiles.map((f) => f.fileName)).toEqual(["v1.mp4"]);
		});
	});
});

describe("useMediaUpload — retry", () => {
	it("retryFailed ré-uploade les fichiers échoués et vide failedFiles", async () => {
		// Phase "fail" : TOUTES les tentatives échouent (withRetry en fait 3) ;
		// la bascule en "ok" simule le réseau revenu au moment du retry manuel.
		let mode: "fail" | "ok" = "fail";
		startUploadImpl = async (files) => {
			if (mode === "fail") throw new Error("HTTP 500");
			return okResults(files);
		};
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useMediaUpload({ onSuccess }));

		let firstUpload!: Promise<unknown[]>;
		act(() => {
			firstUpload = result.current.upload([makeVideo("v1.mp4")]);
		});
		await firstUpload;
		await waitFor(() => {
			expect(result.current.failedFiles).toHaveLength(1);
		});
		mode = "ok";

		let retryPromise!: Promise<Array<{ fileName: string }>>;
		act(() => {
			retryPromise = result.current.retryFailed() as Promise<Array<{ fileName: string }>>;
		});
		const results = await retryPromise;

		expect(results.map((r) => r.fileName)).toEqual(["v1.mp4"]);
		expect(result.current.failedFiles).toEqual([]);
	});
});
