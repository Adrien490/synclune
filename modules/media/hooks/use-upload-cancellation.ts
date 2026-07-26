"use client";

/**
 * Per-file cancellation primitives for media uploads.
 *
 * Extrait de `useMediaUpload` (audit P1.4) pour isoler la préoccupation
 * "annulation fine + sub-abort vidéo" du reste de la pipeline.
 *
 * Cas d'usage :
 * - **File queued / pre-upload** : `markCancelled(name)` → le file sera skip
 *   au prochain check `isCancelled(name)`.
 * - **Video currently uploading** : `bindVideo(name, subAbort)` puis
 *   `abortCurrentVideo(name)` → le `subAbort` fire, la boucle séquentielle
 *   continue avec le fichier suivant.
 * - **File inside an in-flight image batch** : `isInActiveImageBatch(name)`
 *   retourne `true` → le caller surface une toast info, pas d'interruption
 *   possible (UploadThing batch atomique).
 *
 * Pas d'état React rendu (tout est en `useRef`) — le hook est inerte tant
 * que le consommateur ne pilote pas ses méthodes.
 */

import { useRef } from "react";

interface ActiveBatchInfo {
	mode: "image-batch" | "video-single";
	fileNames: ReadonlySet<string>;
}

export interface UseUploadCancellationReturn {
	/** Marque un fichier comme annulé (n'affecte pas un upload en cours). */
	markCancelled: (fileName: string) => void;
	/** True si le fichier est marqué annulé. */
	isCancelled: (fileName: string) => boolean;
	/** Retire un fichier du set (utilisé sur retry pour le réautoriser). */
	clearCancelled: (fileName: string) => void;
	/** Vide complètement le set d'annulés (reset entre runs). */
	resetCancelled: () => void;
	/**
	 * Lie un fichier vidéo en cours d'upload à un `AbortController` "sub".
	 * Le sub-abort permet d'interrompre UNE vidéo sans tuer le run global.
	 */
	bindVideo: (fileName: string, subAbort: AbortController) => void;
	/** Libère le binding (à appeler dans le `finally` de l'upload vidéo). */
	releaseVideo: (fileName: string, subAbort: AbortController) => void;
	/**
	 * Abort la vidéo en cours si elle correspond au `fileName` fourni.
	 * Retourne `true` si l'abort a été émis.
	 */
	abortCurrentVideo: (fileName: string) => boolean;
	/** Abort la vidéo en cours peu importe son nom (cancel global). */
	abortAnyVideo: () => void;
	/** Décide si un nom est dans le batch image actif (toast info caller). */
	isInActiveImageBatch: (fileName: string, batch: ActiveBatchInfo | null) => boolean;
}

export function useUploadCancellation(): UseUploadCancellationReturn {
	const cancelledNamesRef = useRef<Set<string>>(new Set());
	const videoSubAbortRef = useRef<AbortController | null>(null);
	const currentVideoNameRef = useRef<string | null>(null);

	const markCancelled = (fileName: string) => {
		cancelledNamesRef.current.add(fileName);
	};

	const isCancelled = (fileName: string) => cancelledNamesRef.current.has(fileName);

	const clearCancelled = (fileName: string) => {
		cancelledNamesRef.current.delete(fileName);
	};

	const resetCancelled = () => {
		cancelledNamesRef.current = new Set();
	};

	const bindVideo = (fileName: string, subAbort: AbortController) => {
		videoSubAbortRef.current = subAbort;
		currentVideoNameRef.current = fileName;
	};

	const releaseVideo = (fileName: string, subAbort: AbortController) => {
		if (videoSubAbortRef.current === subAbort) videoSubAbortRef.current = null;
		if (currentVideoNameRef.current === fileName) currentVideoNameRef.current = null;
	};

	const abortCurrentVideo = (fileName: string): boolean => {
		if (currentVideoNameRef.current === fileName && videoSubAbortRef.current) {
			videoSubAbortRef.current.abort();
			return true;
		}
		return false;
	};

	const abortAnyVideo = () => {
		videoSubAbortRef.current?.abort();
	};

	const isInActiveImageBatch = (fileName: string, batch: ActiveBatchInfo | null): boolean =>
		batch?.mode === "image-batch" && batch.fileNames.has(fileName);

	return {
		markCancelled,
		isCancelled,
		clearCancelled,
		resetCancelled,
		bindVideo,
		releaseVideo,
		abortCurrentVideo,
		abortAnyVideo,
		isInActiveImageBatch,
	};
}
