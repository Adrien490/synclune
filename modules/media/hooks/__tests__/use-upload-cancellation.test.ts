import { afterEach, describe, expect, it } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";
import { useUploadCancellation } from "../use-upload-cancellation";

afterEach(() => {
	cleanup();
});

describe("useUploadCancellation", () => {
	it("markCancelled puis isCancelled retourne true", () => {
		const { result } = renderHook(() => useUploadCancellation());

		expect(result.current.isCancelled("photo.jpg")).toBe(false);
		result.current.markCancelled("photo.jpg");
		expect(result.current.isCancelled("photo.jpg")).toBe(true);
	});

	it("clearCancelled retire un fichier du set", () => {
		const { result } = renderHook(() => useUploadCancellation());

		result.current.markCancelled("photo.jpg");
		result.current.clearCancelled("photo.jpg");
		expect(result.current.isCancelled("photo.jpg")).toBe(false);
	});

	it("resetCancelled vide tout le set", () => {
		const { result } = renderHook(() => useUploadCancellation());

		result.current.markCancelled("a.jpg");
		result.current.markCancelled("b.jpg");
		result.current.resetCancelled();
		expect(result.current.isCancelled("a.jpg")).toBe(false);
		expect(result.current.isCancelled("b.jpg")).toBe(false);
	});

	it("bindVideo + abortCurrentVideo abort le sub-controller quand le nom matche", () => {
		const { result } = renderHook(() => useUploadCancellation());
		const subAbort = new AbortController();

		result.current.bindVideo("video.mp4", subAbort);
		const aborted = result.current.abortCurrentVideo("video.mp4");

		expect(aborted).toBe(true);
		expect(subAbort.signal.aborted).toBe(true);
	});

	it("abortCurrentVideo no-op quand le nom ne matche pas", () => {
		const { result } = renderHook(() => useUploadCancellation());
		const subAbort = new AbortController();

		result.current.bindVideo("video.mp4", subAbort);
		const aborted = result.current.abortCurrentVideo("other.mp4");

		expect(aborted).toBe(false);
		expect(subAbort.signal.aborted).toBe(false);
	});

	it("releaseVideo libère le binding (abortCurrentVideo devient no-op)", () => {
		const { result } = renderHook(() => useUploadCancellation());
		const subAbort = new AbortController();

		result.current.bindVideo("video.mp4", subAbort);
		result.current.releaseVideo("video.mp4", subAbort);
		const aborted = result.current.abortCurrentVideo("video.mp4");

		expect(aborted).toBe(false);
		expect(subAbort.signal.aborted).toBe(false);
	});

	it("releaseVideo ne libère pas un binding différent (stale finally d'une vidéo précédente)", () => {
		const { result } = renderHook(() => useUploadCancellation());
		const oldAbort = new AbortController();
		const newAbort = new AbortController();

		result.current.bindVideo("v1.mp4", oldAbort);
		result.current.bindVideo("v2.mp4", newAbort);
		// v1.mp4 finally fires AFTER v2.mp4 starts (race condition)
		result.current.releaseVideo("v1.mp4", oldAbort);

		// v2.mp4 binding doit rester actif
		const aborted = result.current.abortCurrentVideo("v2.mp4");
		expect(aborted).toBe(true);
		expect(newAbort.signal.aborted).toBe(true);
	});

	it("abortAnyVideo abort le sub-controller en cours sans condition de nom", () => {
		const { result } = renderHook(() => useUploadCancellation());
		const subAbort = new AbortController();

		result.current.bindVideo("video.mp4", subAbort);
		result.current.abortAnyVideo();

		expect(subAbort.signal.aborted).toBe(true);
	});

	it("isInActiveImageBatch true uniquement si batch mode=image-batch et nom dans batch", () => {
		const { result } = renderHook(() => useUploadCancellation());

		expect(result.current.isInActiveImageBatch("a.jpg", null)).toBe(false);
		expect(
			result.current.isInActiveImageBatch("a.jpg", {
				mode: "video-single",
				fileNames: new Set(["a.jpg"]),
			}),
		).toBe(false);
		expect(
			result.current.isInActiveImageBatch("a.jpg", {
				mode: "image-batch",
				fileNames: new Set(["b.jpg"]),
			}),
		).toBe(false);
		expect(
			result.current.isInActiveImageBatch("a.jpg", {
				mode: "image-batch",
				fileNames: new Set(["a.jpg", "b.jpg"]),
			}),
		).toBe(true);
	});
});
