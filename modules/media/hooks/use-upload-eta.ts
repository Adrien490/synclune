"use client";

/**
 * Throughput sampling + ETA ticker for media uploads.
 *
 * Extrait de `useMediaUpload` (audit P1.4) pour isoler la préoccupation
 * "mesure de débit + projection ETA" du reste de la pipeline. Le hook expose
 * des méthodes impératives pilotées par `useMediaUpload`, ne possède pas
 * d'état React rendu (tout est en `useRef`), et reste donc inerte tant que
 * le consommateur n'appelle pas `recordSample` / `start` / `stop`.
 */

import { useEffect, useRef } from "react";
import {
	computeEtaSeconds,
	computeThroughput,
	type ThroughputSample,
} from "@/modules/media/utils/format-eta";
import { UI_DELAYS } from "@/modules/media/constants/ui-interactions.constants";

/** Sliding window cap — older samples are dropped to keep ETA responsive. */
const SAMPLE_BUFFER_CAP = 60;
/** Trim down to this size when cap is reached (cheap GC + smooth window). */
const SAMPLE_BUFFER_TRIM = 30;

interface EtaTick {
	/** Octets téléversés depuis le début du run (cumul). */
	bytesUploaded: number;
	/** Octets totaux du run (somme des fichiers en cours). */
	bytesTotal: number;
	/** Débit instantané fenêtré (octets/seconde). */
	bytesPerSecond: number;
	/** Estimation seconds restantes. `null` si non calculable. */
	etaSeconds: number | null;
}

export interface UseUploadEtaReturn {
	/** Enregistre un échantillon de bytes téléversés (à appeler à chaque progress UploadThing). */
	recordSample: (bytesUploaded: number) => void;
	/** Lance le ticker périodique qui appelle `onTick` toutes les `ETA_TICK_INTERVAL_MS`. */
	start: (
		read: () => { bytesUploaded: number; bytesTotal: number },
		onTick: (tick: EtaTick) => void,
	) => void;
	/** Stoppe le ticker. Safe to call plusieurs fois. */
	stop: () => void;
	/** Reset du buffer (entre deux runs). */
	reset: () => void;
}

export function useUploadEta(): UseUploadEtaReturn {
	const samplesRef = useRef<ThroughputSample[]>([]);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, []);

	const recordSample = (bytesUploaded: number) => {
		samplesRef.current.push({ bytes: bytesUploaded, timestamp: performance.now() });
		if (samplesRef.current.length > SAMPLE_BUFFER_CAP) {
			samplesRef.current = samplesRef.current.slice(-SAMPLE_BUFFER_TRIM);
		}
	};

	const stop = () => {
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
	};

	const start: UseUploadEtaReturn["start"] = (read, onTick) => {
		if (intervalRef.current) return;
		intervalRef.current = setInterval(() => {
			const { bytesUploaded, bytesTotal } = read();
			const bytesPerSecond = computeThroughput(samplesRef.current);
			const etaSeconds = computeEtaSeconds(bytesUploaded, bytesTotal, bytesPerSecond);
			onTick({ bytesUploaded, bytesTotal, bytesPerSecond, etaSeconds });
		}, UI_DELAYS.ETA_TICK_INTERVAL_MS);
	};

	const reset = () => {
		samplesRef.current = [];
	};

	return { recordSample, start, stop, reset };
}
